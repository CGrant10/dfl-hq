-- =====================================================================
-- DFL HQ - Sportsbook foundation
-- ---------------------------------------------------------------------
-- Fake league currency only. SIN has no cash value.
-- Run in Supabase SQL Editor. Safe to re-run.
--
-- Economy:
--   starting bankroll: 500 SIN
--   daily drip:        +50 SIN per elapsed 24 hours
--   catch-up cap:      10 days (500 SIN) per return
--
-- The daily drip is applied by sportsbook_touch_wallet(), which the app
-- calls when a member opens the Sportsbook. It advances the clock across
-- every elapsed day even when catch-up is capped, so leaving for a year does
-- not create a giant stored allowance.
-- =====================================================================

create table if not exists public.sportsbook_wallets (
  member_id bigint primary key references public.members(id) on delete cascade,
  balance int not null default 500 check (balance >= 0),
  last_daily_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sportsbook_ledger (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  amount int not null,
  kind text not null check (kind in ('starting','daily','bet','payout','refund','adjustment')),
  note text not null default '',
  market_id bigint,
  bet_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.sportsbook_markets (
  id bigint generated always as identity primary key,
  title text not null,
  category text not null default 'DFL',
  source text not null default 'commissioner' check (source in ('commissioner','lore')),
  lore_note text not null default '',
  status text not null default 'open' check (status in ('open','locked','settled','void')),
  closes_at timestamptz,
  created_by_member_id bigint references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists public.sportsbook_outcomes (
  id bigint generated always as identity primary key,
  market_id bigint not null references public.sportsbook_markets(id) on delete cascade,
  label text not null,
  odds_american int not null check (odds_american <= -100 or odds_american >= 100),
  is_winner boolean,
  sort_order int not null default 0
);

create table if not exists public.sportsbook_bets (
  id bigint generated always as identity primary key,
  market_id bigint not null references public.sportsbook_markets(id) on delete cascade,
  outcome_id bigint not null references public.sportsbook_outcomes(id) on delete cascade,
  member_id bigint not null references public.members(id) on delete cascade,
  stake int not null check (stake > 0),
  odds_american int not null,
  potential_payout int not null check (potential_payout > 0),
  status text not null default 'open' check (status in ('open','won','lost','void')),
  payout int not null default 0,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists idx_sportsbook_ledger_member on public.sportsbook_ledger(member_id, created_at desc);
create index if not exists idx_sportsbook_bets_member on public.sportsbook_bets(member_id, created_at desc);
create index if not exists idx_sportsbook_outcomes_market on public.sportsbook_outcomes(market_id, sort_order);

alter table public.sportsbook_wallets enable row level security;
alter table public.sportsbook_ledger enable row level security;
alter table public.sportsbook_markets enable row level security;
alter table public.sportsbook_outcomes enable row level security;
alter table public.sportsbook_bets enable row level security;

-- Public market board. Wallets, ledgers and bets remain private and are read
-- through safe RPCs below.
drop policy if exists "sportsbook markets public read" on public.sportsbook_markets;
create policy "sportsbook markets public read" on public.sportsbook_markets for select using (true);
drop policy if exists "sportsbook outcomes public read" on public.sportsbook_outcomes;
create policy "sportsbook outcomes public read" on public.sportsbook_outcomes for select using (true);

create or replace function public.sportsbook_member_id()
returns bigint language plpgsql stable as $$
declare raw_id text;
begin
  raw_id := nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-member-id';
  if raw_id is null or raw_id !~ '^[0-9]+$' then return null; end if;
  return raw_id::bigint;
exception when others then return null;
end;
$$;

-- Harmless public commissioner marker. Deliberately returns no PIN hashes,
-- permissions or owner distinction.
create or replace function public.public_commissioners()
returns table(member_id bigint)
language sql stable security definer set search_path = public
as $$
  select ca.member_id from public.commissioner_access ca where ca.active = true;
$$;
grant execute on function public.public_commissioners() to anon, authenticated;

create or replace function public.sportsbook_touch_wallet()
returns table(balance int, credited int, last_daily_at timestamptz, next_daily_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  mid bigint := public.sportsbook_member_id();
  w public.sportsbook_wallets%rowtype;
  elapsed_days int := 0;
  paid_days int := 0;
  credit int := 0;
begin
  if mid is null then raise exception 'Pick a DFL member first'; end if;

  insert into public.sportsbook_wallets(member_id, balance, last_daily_at)
  values (mid, 500, now())
  on conflict (member_id) do nothing;

  if found then
    insert into public.sportsbook_ledger(member_id, amount, kind, note)
    values (mid, 500, 'starting', 'Opening bankroll');
  end if;

  select * into w from public.sportsbook_wallets where member_id = mid for update;
  elapsed_days := greatest(0, floor(extract(epoch from (now() - w.last_daily_at)) / 86400)::int);

  if elapsed_days > 0 then
    paid_days := least(elapsed_days, 10);
    credit := paid_days * 50;
    update public.sportsbook_wallets
       set balance = sportsbook_wallets.balance + credit,
           last_daily_at = w.last_daily_at + (elapsed_days * interval '24 hours'),
           updated_at = now()
     where member_id = mid
     returning * into w;
    if credit > 0 then
      insert into public.sportsbook_ledger(member_id, amount, kind, note)
      values (mid, credit, 'daily', case when paid_days = 1 then 'Daily SIN' else paid_days || ' days of SIN' end);
    end if;
  end if;

  return query select w.balance, credit, w.last_daily_at, w.last_daily_at + interval '24 hours';
end;
$$;
grant execute on function public.sportsbook_touch_wallet() to anon, authenticated;

create or replace function public.sportsbook_my_ledger(row_limit int default 20)
returns table(id bigint, amount int, kind text, note text, market_id bigint, bet_id bigint, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select l.id,l.amount,l.kind,l.note,l.market_id,l.bet_id,l.created_at
    from public.sportsbook_ledger l
   where l.member_id = public.sportsbook_member_id()
   order by l.created_at desc
   limit greatest(1, least(coalesce(row_limit,20),100));
$$;
grant execute on function public.sportsbook_my_ledger(int) to anon, authenticated;

create or replace function public.sportsbook_my_bets(row_limit int default 20)
returns table(id bigint, market_id bigint, outcome_id bigint, stake int, odds_american int, potential_payout int, status text, payout int, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select b.id,b.market_id,b.outcome_id,b.stake,b.odds_american,b.potential_payout,b.status,b.payout,b.created_at
    from public.sportsbook_bets b
   where b.member_id = public.sportsbook_member_id()
   order by b.created_at desc
   limit greatest(1, least(coalesce(row_limit,20),100));
$$;
grant execute on function public.sportsbook_my_bets(int) to anon, authenticated;

create or replace function public.sportsbook_leaderboard()
returns table(member_id bigint, display_name text, balance int)
language sql stable security definer set search_path = public
as $$
  select w.member_id, m.display_name, w.balance
    from public.sportsbook_wallets w join public.members m on m.id = w.member_id
   where coalesce(m.active,true) = true
   order by w.balance desc, m.display_name asc;
$$;
grant execute on function public.sportsbook_leaderboard() to anon, authenticated;

create or replace function public.sportsbook_place_bet(target_outcome_id bigint, sin_stake int)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  mid bigint := public.sportsbook_member_id();
  o public.sportsbook_outcomes%rowtype;
  m public.sportsbook_markets%rowtype;
  w public.sportsbook_wallets%rowtype;
  payout int;
  new_bet bigint;
begin
  if mid is null then raise exception 'Pick a DFL member first'; end if;
  if sin_stake is null or sin_stake < 1 then raise exception 'Stake must be at least 1 SIN'; end if;
  perform public.sportsbook_touch_wallet();

  select * into o from public.sportsbook_outcomes where id = target_outcome_id;
  if not found then raise exception 'That line does not exist'; end if;
  select * into m from public.sportsbook_markets where id = o.market_id for update;
  if m.status <> 'open' or (m.closes_at is not null and m.closes_at <= now()) then raise exception 'That market is closed'; end if;

  select * into w from public.sportsbook_wallets where member_id = mid for update;
  if w.balance < sin_stake then raise exception 'Not enough SIN'; end if;

  payout := case when o.odds_american > 0
    then sin_stake + floor(sin_stake * o.odds_american / 100.0)::int
    else sin_stake + floor(sin_stake * 100.0 / abs(o.odds_american))::int end;

  update public.sportsbook_wallets set balance = balance - sin_stake, updated_at = now() where member_id = mid;
  insert into public.sportsbook_bets(market_id,outcome_id,member_id,stake,odds_american,potential_payout)
  values (m.id,o.id,mid,sin_stake,o.odds_american,payout) returning id into new_bet;
  insert into public.sportsbook_ledger(member_id,amount,kind,note,market_id,bet_id)
  values (mid,-sin_stake,'bet','Wager placed',m.id,new_bet);
  return new_bet;
end;
$$;
grant execute on function public.sportsbook_place_bet(bigint,int) to anon, authenticated;

-- Commissioner/Lore market creation. Lore will use this same market shape in
-- the next layer; source stays explicit so the UI can tell model lines from
-- commissioner specials.
create or replace function public.sportsbook_create_market(
  market_title text,
  market_category text,
  market_source text,
  market_closes_at timestamptz,
  market_lore_note text,
  market_outcomes jsonb
) returns bigint
language plpgsql security definer set search_path = public
as $$
declare mid bigint := public.sportsbook_member_id(); market_id bigint; item jsonb; n int := 0;
begin
  if not public.has_commissioner_permission('sportsbook') then raise exception 'Sportsbook commissioner access required'; end if;
  if market_source not in ('commissioner','lore') then raise exception 'Invalid market source'; end if;
  if jsonb_typeof(market_outcomes) <> 'array' or jsonb_array_length(market_outcomes) < 2 then raise exception 'At least two outcomes required'; end if;
  insert into public.sportsbook_markets(title,category,source,lore_note,closes_at,created_by_member_id)
  values (trim(market_title),coalesce(nullif(trim(market_category),''),'DFL'),market_source,coalesce(market_lore_note,''),market_closes_at,mid)
  returning id into market_id;
  for item in select * from jsonb_array_elements(market_outcomes) loop
    insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order)
    values (market_id,item->>'label',(item->>'odds')::int,n);
    n := n + 1;
  end loop;
  return market_id;
end;
$$;
grant execute on function public.sportsbook_create_market(text,text,text,timestamptz,text,jsonb) to anon, authenticated;

create or replace function public.sportsbook_settle_market(target_market_id bigint, winning_outcome_id bigint)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare b record;
begin
  if not public.has_commissioner_permission('sportsbook') then raise exception 'Sportsbook commissioner access required'; end if;
  if not exists(select 1 from public.sportsbook_outcomes where id = winning_outcome_id and market_id = target_market_id) then raise exception 'Winner is not in that market'; end if;
  if not exists(select 1 from public.sportsbook_markets where id = target_market_id and status in ('open','locked')) then raise exception 'Market cannot be settled'; end if;

  update public.sportsbook_outcomes set is_winner = (id = winning_outcome_id) where market_id = target_market_id;
  for b in select * from public.sportsbook_bets where market_id = target_market_id and status = 'open' for update loop
    if b.outcome_id = winning_outcome_id then
      update public.sportsbook_bets set status='won', payout=b.potential_payout, settled_at=now() where id=b.id;
      update public.sportsbook_wallets set balance=balance+b.potential_payout, updated_at=now() where member_id=b.member_id;
      insert into public.sportsbook_ledger(member_id,amount,kind,note,market_id,bet_id)
      values (b.member_id,b.potential_payout,'payout','Winning ticket',target_market_id,b.id);
    else
      update public.sportsbook_bets set status='lost', payout=0, settled_at=now() where id=b.id;
    end if;
  end loop;
  update public.sportsbook_markets set status='settled', settled_at=now() where id=target_market_id;
  return true;
end;
$$;
grant execute on function public.sportsbook_settle_market(bigint,bigint) to anon, authenticated;
