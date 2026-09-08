-- =====================================================================
-- DFL HQ - Sportsbook multi-pick entries, cancelling, and dismissing
-- ---------------------------------------------------------------------
-- Run LAST of the sportsbook files: after sportsbook_schema.sql,
-- sportsbook_claim_schema.sql and sportsbook_auto_schema.sql. It replaces
-- sportsbook_place_bet, sportsbook_settle_market and sportsbook_void_market,
-- so running an earlier file after this one puts the old bodies back.
-- Safe to re-run.
--
-- THREE THINGS, AND WHY THEY ARE ONE FILE
--
--   1. MULTI-PICK ENTRIES. Underdog's shape: two to six picks on ONE stake,
--      odds multiplied together, and every pick has to land. A one-pick
--      entry is just a straight bet, so this is not a second product beside
--      singles - it is the same product with pick_count = 1.
--   2. CANCELLING. A member could not pull a ticket back at all. Only a
--      commissioner could void an entire market, which refunds everybody on
--      it, so "I misclicked" had no answer short of asking the house.
--   3. DISMISSING. Settled tickets stacked up in My bets forever, so the one
--      live ticket sat under nine graded ones.
--
-- THE MODEL: sportsbook_bets IS THE ENTRY
--
-- The alternative was a new sportsbook_entries table beside the existing
-- bets, which would have meant two of everything downstream - two settle
-- paths, two lists in the UI, two share cards, two definitions of "open".
-- Instead the existing row becomes the entry (it already holds the stake,
-- the combined price, the payout and the status) and the picks move into
-- sportsbook_bet_legs. Every existing single is backfilled as a one-leg
-- entry below, so nothing that is already on the board changes meaning.
--
-- market_id and outcome_id stay on the entry and stay populated for one-pick
-- entries. They are the back-compatible read path, and they are null on a
-- multi-pick entry because it does not belong to a single market.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. THE ENTRY GROWS THREE COLUMNS AND LOSES TWO NOT-NULLS
-- ---------------------------------------------------------------------
alter table public.sportsbook_bets
  add column if not exists pick_count int not null default 1,
  add column if not exists cancelled_at timestamptz,
  add column if not exists dismissed_at timestamptz;

alter table public.sportsbook_bets alter column market_id drop not null;
alter table public.sportsbook_bets alter column outcome_id drop not null;

do $$ begin
  alter table public.sportsbook_bets
    add constraint sportsbook_bets_pick_count_range check (pick_count between 1 and 6);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. THE LEGS
--
-- odds_american is copied onto the leg at placement rather than read back
-- through the outcome. The price a member accepted is a fact about their
-- entry; the commissioner is free to move the line afterwards, and a card
-- shared next week must still show what was actually taken.
-- ---------------------------------------------------------------------
create table if not exists public.sportsbook_bet_legs (
  id bigint generated always as identity primary key,
  bet_id bigint not null references public.sportsbook_bets(id) on delete cascade,
  market_id bigint not null references public.sportsbook_markets(id) on delete cascade,
  outcome_id bigint not null references public.sportsbook_outcomes(id) on delete cascade,
  odds_american int not null,
  status text not null default 'open' check (status in ('open','won','lost','void')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists idx_sportsbook_legs_bet on public.sportsbook_bet_legs(bet_id, sort_order);
create index if not exists idx_sportsbook_legs_market on public.sportsbook_bet_legs(market_id, status);
-- One market cannot appear twice in one entry: you may not parlay both sides
-- of the same game against yourself.
create unique index if not exists uq_sportsbook_legs_bet_market
  on public.sportsbook_bet_legs(bet_id, market_id);

alter table public.sportsbook_bet_legs enable row level security;
-- No API policies. Everything reaches the client through the security definer
-- RPCs below, the same as wallets, the ledger and the entries themselves.

-- ---------------------------------------------------------------------
-- 3. BACKFILL - every existing single becomes a one-leg entry
-- ---------------------------------------------------------------------
insert into public.sportsbook_bet_legs(bet_id, market_id, outcome_id, odds_american, status, sort_order, created_at, settled_at)
select b.id, b.market_id, b.outcome_id, b.odds_american, b.status, 0, b.created_at, b.settled_at
  from public.sportsbook_bets b
 where b.market_id is not null
   and b.outcome_id is not null
   and not exists (select 1 from public.sportsbook_bet_legs l where l.bet_id = b.id);

-- ---------------------------------------------------------------------
-- 4. THE PRICE OF AN ENTRY
--
-- Combined American odds, then the payout from that ONE integer - not the
-- payout straight off the decimal product. Both halves of the app have to
-- agree on the number to the SIN, and js/sportsbook-slip.js cannot reproduce
-- Postgres numeric arithmetic. It CAN reproduce "round the product to six
-- places, convert to a whole American number, then apply the same floor rule
-- singles already use", which is what this does.
--
-- The floor rule itself is unchanged from sportsbook_place_bet, so a one-pick
-- entry prices identically to a straight bet placed the old way.
-- ---------------------------------------------------------------------
create or replace function public.sportsbook_decimal_odds(odds int)
returns numeric language sql immutable as $$
  select case when odds > 0 then 1 + odds / 100.0 else 1 + 100.0 / abs(odds) end;
$$;

create or replace function public.sportsbook_combine_odds(odds int[])
returns int language plpgsql immutable as $$
declare product numeric := 1; o int; edge numeric;
begin
  if odds is null or array_length(odds, 1) is null then return 100; end if;
  foreach o in array odds loop
    product := product * public.sportsbook_decimal_odds(o);
  end loop;
  product := round(product, 6);
  edge := product - 1;
  if edge <= 0 then return 100; end if;
  if product >= 2 then
    return greatest(100, round(edge * 100)::int);
  end if;
  return least(-100, -round(100 / edge)::int);
end;
$$;

create or replace function public.sportsbook_odds_payout(sin_stake int, odds int)
returns int language sql immutable as $$
  select case when odds > 0
    then sin_stake + floor(sin_stake * odds / 100.0)::int
    else sin_stake + floor(sin_stake * 100.0 / abs(odds))::int end;
$$;

grant execute on function public.sportsbook_decimal_odds(int) to anon, authenticated;
grant execute on function public.sportsbook_combine_odds(int[]) to anon, authenticated;
grant execute on function public.sportsbook_odds_payout(int,int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. PLACING AN ENTRY
--
-- Replaces sportsbook_place_bet for every new wager. That function stays in
-- place and keeps working (it now writes its own leg, see section 6) so a
-- client that has not been reloaded yet does not start failing mid-week.
-- ---------------------------------------------------------------------
create or replace function public.sportsbook_place_entry(entry_outcome_ids bigint[], sin_stake int)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  mid bigint := public.sportsbook_member_id();
  w public.sportsbook_wallets%rowtype;
  o public.sportsbook_outcomes%rowtype;
  m public.sportsbook_markets%rowtype;
  target bigint;
  picks int := 0;
  prices int[] := '{}';
  combined int;
  payout int;
  new_bet bigint;
  seen bigint[] := '{}';
  n int := 0;
begin
  if mid is null then raise exception 'Pick a DFL member first'; end if;
  if sin_stake is null or sin_stake < 1 then raise exception 'Stake must be at least 1 SIN'; end if;
  picks := coalesce(array_length(entry_outcome_ids, 1), 0);
  if picks < 1 then raise exception 'Choose at least one pick'; end if;
  if picks > 6 then raise exception 'Six picks is the most one entry can hold'; end if;

  perform public.sportsbook_touch_wallet();

  -- Validate and price every leg BEFORE any money moves.
  foreach target in array entry_outcome_ids loop
    select * into o from public.sportsbook_outcomes where id = target;
    if not found then raise exception 'That line does not exist'; end if;
    select * into m from public.sportsbook_markets where id = o.market_id for update;
    if m.status <> 'open' or (m.closes_at is not null and m.closes_at <= now()) then
      raise exception 'A market on this entry has closed: %', m.title;
    end if;
    if m.id = any(seen) then
      raise exception 'Two picks from the same market cannot share one entry: %', m.title;
    end if;
    seen := seen || m.id;
    prices := prices || o.odds_american;
  end loop;

  combined := public.sportsbook_combine_odds(prices);
  payout := public.sportsbook_odds_payout(sin_stake, combined);

  select * into w from public.sportsbook_wallets where member_id = mid for update;
  if w.balance < sin_stake then raise exception 'Not enough SIN'; end if;

  update public.sportsbook_wallets set balance = balance - sin_stake, updated_at = now() where member_id = mid;

  insert into public.sportsbook_bets(market_id, outcome_id, member_id, stake, odds_american, potential_payout, pick_count)
  values (
    /* A one-pick entry keeps the single-market shape, so everything that
       already reads bets.market_id keeps reading it. */
    case when picks = 1 then (select market_id from public.sportsbook_outcomes where id = entry_outcome_ids[1]) end,
    case when picks = 1 then entry_outcome_ids[1] end,
    mid, sin_stake, combined, payout, picks)
  returning id into new_bet;

  foreach target in array entry_outcome_ids loop
    insert into public.sportsbook_bet_legs(bet_id, market_id, outcome_id, odds_american, sort_order)
    select new_bet, o2.market_id, o2.id, o2.odds_american, n
      from public.sportsbook_outcomes o2 where o2.id = target;
    n := n + 1;
  end loop;

  insert into public.sportsbook_ledger(member_id, amount, kind, note, market_id, bet_id)
  values (mid, -sin_stake, 'bet',
          case when picks = 1 then 'Wager placed' else picks || '-pick entry placed' end,
          case when picks = 1 then (select market_id from public.sportsbook_outcomes where id = entry_outcome_ids[1]) end,
          new_bet);
  return new_bet;
end;
$$;
grant execute on function public.sportsbook_place_entry(bigint[],int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. THE OLD SINGLE-BET PATH STILL WORKS, AND NOW WRITES ITS LEG
--
-- A member with the app open from before this migration would otherwise
-- create entries with no legs, which the settle roll-up would then treat as
-- "no leg has lost, no leg is unresolved" and pay out. Delegating is the
-- only version of this that cannot drift.
-- ---------------------------------------------------------------------
create or replace function public.sportsbook_place_bet(target_outcome_id bigint, sin_stake int)
returns bigint
language plpgsql security definer set search_path = public
as $$
begin
  return public.sportsbook_place_entry(array[target_outcome_id], sin_stake);
end;
$$;
grant execute on function public.sportsbook_place_bet(bigint,int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. CANCELLING YOUR OWN ENTRY
--
-- Allowed only while EVERY market on it is still open and untouched. Once a
-- line locks, a cancel would be a free look at a result, so the answer has
-- to be no - and it is the entry's own legs that decide, not the clock alone.
--
-- The row is kept, marked void with cancelled_at set, rather than deleted:
-- the ledger already points at bet_id, and a receipt whose bet has vanished
-- is worse than a receipt for a cancelled one. cancelled_at is also what
-- lets the UI say "you pulled this" instead of "the house voided this".
-- ---------------------------------------------------------------------
create or replace function public.sportsbook_cancel_bet(target_bet_id bigint)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  mid bigint := public.sportsbook_member_id();
  b public.sportsbook_bets%rowtype;
  blocked text;
begin
  if mid is null then raise exception 'Pick a DFL member first'; end if;

  select * into b from public.sportsbook_bets
   where id = target_bet_id and member_id = mid for update;
  if not found then raise exception 'That ticket is not yours'; end if;
  if b.status <> 'open' then raise exception 'That ticket has already been graded'; end if;

  select m.title into blocked
    from public.sportsbook_bet_legs l
    join public.sportsbook_markets m on m.id = l.market_id
   where l.bet_id = b.id
     and (m.status <> 'open' or (m.closes_at is not null and m.closes_at <= now()))
   limit 1;
  if blocked is not null then
    raise exception 'This ticket can no longer be pulled: % has locked', blocked;
  end if;

  update public.sportsbook_bets
     set status = 'void', payout = 0, settled_at = now(), cancelled_at = now()
   where id = b.id;
  update public.sportsbook_bet_legs
     set status = 'void', settled_at = now()
   where bet_id = b.id;

  update public.sportsbook_wallets
     set balance = balance + b.stake, updated_at = now()
   where member_id = mid;
  insert into public.sportsbook_ledger(member_id, amount, kind, note, market_id, bet_id)
  values (mid, b.stake, 'refund',
          case when b.pick_count = 1 then 'Ticket pulled' else b.pick_count || '-pick entry pulled' end,
          b.market_id, b.id);
  return b.stake;
end;
$$;
grant execute on function public.sportsbook_cancel_bet(bigint) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. DISMISSING A GRADED ENTRY
--
-- Hides it from My bets and nothing else: no money moves, the row stays, and
-- Receipts still shows every SIN that changed hands. An open ticket cannot be
-- dismissed - that would be a way to lose track of live money.
-- ---------------------------------------------------------------------
create or replace function public.sportsbook_dismiss_bet(target_bet_id bigint, undo boolean default false)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare mid bigint := public.sportsbook_member_id(); b public.sportsbook_bets%rowtype;
begin
  if mid is null then raise exception 'Pick a DFL member first'; end if;
  select * into b from public.sportsbook_bets where id = target_bet_id and member_id = mid for update;
  if not found then raise exception 'That ticket is not yours'; end if;
  if not undo and b.status = 'open' then raise exception 'An open ticket stays on the board'; end if;
  update public.sportsbook_bets
     set dismissed_at = case when undo then null else now() end
   where id = b.id;
  return true;
end;
$$;
grant execute on function public.sportsbook_dismiss_bet(bigint,boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 9. READING MY ENTRIES
--
-- The legs come back nested rather than as a second query the client has to
-- join, because "my three picks" is one thing to a member and the card that
-- gets shared is one image.
--
-- Dropped and recreated rather than replaced: the return type changes, and
-- create or replace cannot do that.
-- ---------------------------------------------------------------------
drop function if exists public.sportsbook_my_bets(int);
create or replace function public.sportsbook_my_bets(row_limit int default 20, include_dismissed boolean default false)
returns table(
  id bigint, market_id bigint, outcome_id bigint, stake int, odds_american int,
  potential_payout int, status text, payout int, pick_count int,
  created_at timestamptz, settled_at timestamptz,
  cancelled_at timestamptz, dismissed_at timestamptz, legs jsonb
)
language sql stable security definer set search_path = public
as $$
  select b.id, b.market_id, b.outcome_id, b.stake, b.odds_american,
         b.potential_payout, b.status, b.payout, b.pick_count,
         b.created_at, b.settled_at, b.cancelled_at, b.dismissed_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'outcome_id', l.outcome_id,
                    'market_id', l.market_id,
                    'label', o.label,
                    'market', m.title,
                    'odds_american', l.odds_american,
                    'status', l.status
                  ) order by l.sort_order)
             from public.sportsbook_bet_legs l
             join public.sportsbook_outcomes o on o.id = l.outcome_id
             join public.sportsbook_markets m on m.id = l.market_id
            where l.bet_id = b.id
         ), '[]'::jsonb) as legs
    from public.sportsbook_bets b
   where b.member_id = public.sportsbook_member_id()
     and (include_dismissed or b.dismissed_at is null)
   order by (b.status = 'open') desc, b.created_at desc
   limit greatest(1, least(coalesce(row_limit, 20), 100));
$$;
grant execute on function public.sportsbook_my_bets(int,boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 10. SETTLING, WITH A ROLL-UP
--
-- One market grades its own legs; the ENTRY is then graded from all of its
-- legs together. An entry is lost the moment any leg loses - there is no
-- point waiting for the other two games - won only when every leg has won,
-- and otherwise it stays open.
-- ---------------------------------------------------------------------
create or replace function public.sportsbook_roll_up_entry(target_bet_id bigint)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  b public.sportsbook_bets%rowtype;
  total int; won int; lost int; voided int;
begin
  select * into b from public.sportsbook_bets where id = target_bet_id for update;
  if not found or b.status <> 'open' then return coalesce(b.status, 'missing'); end if;

  select count(*), count(*) filter (where status = 'won'),
         count(*) filter (where status = 'lost'), count(*) filter (where status = 'void')
    into total, won, lost, voided
    from public.sportsbook_bet_legs where bet_id = b.id;

  /* An entry with no legs at all predates this migration and was not caught
     by the backfill, which means its market row is gone. Refund rather than
     grade it: there is nothing left to grade it against. */
  if total = 0 or (voided > 0 and lost = 0 and won + voided = total) then
    update public.sportsbook_bets set status='void', payout=0, settled_at=now() where id=b.id;
    update public.sportsbook_wallets set balance=balance+b.stake, updated_at=now() where member_id=b.member_id;
    insert into public.sportsbook_ledger(member_id,amount,kind,note,market_id,bet_id)
    values (b.member_id,b.stake,'refund','Entry voided',b.market_id,b.id);
    return 'void';
  end if;

  if lost > 0 then
    update public.sportsbook_bets set status='lost', payout=0, settled_at=now() where id=b.id;
    return 'lost';
  end if;

  if won = total then
    update public.sportsbook_bets set status='won', payout=b.potential_payout, settled_at=now() where id=b.id;
    update public.sportsbook_wallets set balance=balance+b.potential_payout, updated_at=now() where member_id=b.member_id;
    insert into public.sportsbook_ledger(member_id,amount,kind,note,market_id,bet_id)
    values (b.member_id,b.potential_payout,'payout',
            case when b.pick_count = 1 then 'Winning ticket' else b.pick_count || '-pick entry cashed' end,
            b.market_id,b.id);
    return 'won';
  end if;

  return 'open';
end;
$$;

create or replace function public.sportsbook_settle_market(target_market_id bigint, winning_outcome_id bigint)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare touched bigint;
begin
  if not public.has_commissioner_permission('sportsbook') then raise exception 'Sportsbook commissioner access required'; end if;
  if not exists(select 1 from public.sportsbook_outcomes where id = winning_outcome_id and market_id = target_market_id) then raise exception 'Winner is not in that market'; end if;
  if not exists(select 1 from public.sportsbook_markets where id = target_market_id and status in ('open','locked')) then raise exception 'Market cannot be settled'; end if;

  update public.sportsbook_outcomes set is_winner = (id = winning_outcome_id) where market_id = target_market_id;

  update public.sportsbook_bet_legs
     set status = case when outcome_id = winning_outcome_id then 'won' else 'lost' end,
         settled_at = now()
   where market_id = target_market_id and status = 'open';

  for touched in
    select distinct l.bet_id from public.sportsbook_bet_legs l
      join public.sportsbook_bets b on b.id = l.bet_id
     where l.market_id = target_market_id and b.status = 'open'
  loop
    perform public.sportsbook_roll_up_entry(touched);
  end loop;

  update public.sportsbook_markets set status='settled', settled_at=now() where id=target_market_id;
  return true;
end;
$$;
grant execute on function public.sportsbook_settle_market(bigint,bigint) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 11. VOIDING A MARKET VOIDS THE WHOLE ENTRY
--
-- A real book drops the dead leg and re-prices the rest. This one refunds
-- the entry instead, and that is a deliberate choice: re-pricing means
-- telling somebody their 4-pick at +2200 is now a 3-pick at +900 after they
-- had already agreed a price, and the house here is a group chat. Refunding
-- the stake is the version nobody has to arbitrate.
-- ---------------------------------------------------------------------
create or replace function public.sportsbook_void_market(target_market_id bigint)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare touched bigint; b public.sportsbook_bets%rowtype;
begin
  if not public.has_commissioner_permission('sportsbook') then raise exception 'Sportsbook commissioner access required'; end if;

  update public.sportsbook_bet_legs set status='void', settled_at=now()
   where market_id = target_market_id and status = 'open';

  /* The ids first, then the row lock inside the loop: SELECT DISTINCT and
     FOR UPDATE cannot appear in the same query. */
  for touched in
    select distinct l.bet_id from public.sportsbook_bet_legs l
      join public.sportsbook_bets bb on bb.id = l.bet_id
     where l.market_id = target_market_id and bb.status = 'open'
  loop
    select * into b from public.sportsbook_bets where id = touched for update;
    if b.status <> 'open' then continue; end if;
    update public.sportsbook_bets set status='void', payout=0, settled_at=now() where id=b.id;
    update public.sportsbook_wallets set balance=balance+b.stake, updated_at=now() where member_id=b.member_id;
    insert into public.sportsbook_ledger(member_id,amount,kind,note,market_id,bet_id)
    values (b.member_id,b.stake,'refund',
            case when b.pick_count = 1 then 'Market voided' else 'Entry voided, market pulled' end,
            b.market_id,b.id);
  end loop;

  update public.sportsbook_markets set status='void', settled_at=now() where id=target_market_id;
  return true;
end;
$$;
grant execute on function public.sportsbook_void_market(bigint) to anon, authenticated;
