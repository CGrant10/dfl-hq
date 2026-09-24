-- =====================================================================
-- DFL HQ - automatic Sleeper sportsbook settlement
-- ---------------------------------------------------------------------
-- Run after sportsbook_entries_schema.sql and sleeper_schema.sql.
-- Safe to re-run.
--
-- Matchup markets carry auto_key matchup:<season>:<week>:<matchup_id>.
-- Every Tuesday at 7:00 AM America/Chicago, completed Sleeper matchup rows
-- grade those markets. Winning entries pay exactly once, losing entries are
-- closed, and a real tie voids/refunds the whole entry.
-- =====================================================================

create extension if not exists pg_cron;
create schema if not exists private;

alter table public.sportsbook_outcomes
  add column if not exists sleeper_roster_id int;

create index if not exists idx_sportsbook_outcomes_roster
  on public.sportsbook_outcomes(market_id, sleeper_roster_id);

-- One scheduled matchup may only have one board, even when two cron calls
-- overlap during the DST-safe sync window.
create unique index if not exists idx_sportsbook_matchup_auto_key
  on public.sportsbook_markets(auto_key)
  where auto_key ~ '^matchup:[0-9]+:[0-9]+:[0-9]+$';

create or replace function private.sportsbook_normalize_label(value text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select lower(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g'));
$$;

revoke all on function private.sportsbook_normalize_label(text)
  from public, anon, authenticated;

create or replace function public.sportsbook_settle_completed_matchups()
returns table(markets_graded int, tickets_won int, tickets_lost int, tickets_void int, markets_unmatched int)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  market_row record;
  side_row record;
  bet_row record;
  winning_roster int;
  winning_outcome bigint;
  final_status text;
  unmatched_outcomes int;
begin
  markets_graded := 0;
  tickets_won := 0;
  tickets_lost := 0;
  tickets_void := 0;
  markets_unmatched := 0;

  -- One grader at a time. This plus status='open' makes payout idempotent.
  perform pg_advisory_xact_lock(73910422);

  for market_row in
    select m.id, m.auto_key, sm.season, sm.week, sm.matchup_id,
           sm.roster1, sm.user1, sm.score1, sm.roster2, sm.user2, sm.score2
      from public.sportsbook_markets m
      join public.sleeper_matchups sm
        on sm.season = ((regexp_match(m.auto_key, '^matchup:([0-9]+):([0-9]+):([0-9]+)$'))[1])::int
       and sm.week = ((regexp_match(m.auto_key, '^matchup:([0-9]+):([0-9]+):([0-9]+)$'))[2])::int
       and sm.matchup_id = ((regexp_match(m.auto_key, '^matchup:([0-9]+):([0-9]+):([0-9]+)$'))[3])::int
     where m.status in ('open', 'locked')
       and m.auto_key ~ '^matchup:[0-9]+:[0-9]+:[0-9]+$'
       and sm.score1 is not null and sm.score2 is not null
     order by sm.season, sm.week, sm.matchup_id
  loop
    -- Attach both outcome labels to Sleeper roster ids. The member row keeps
    -- the name used when the market opened even if Sleeper has since renamed
    -- that team; the season roster and Sleeper user cover the current names.
    for side_row in
      select market_row.roster1 roster_id, market_row.user1 sleeper_user_id
      union all
      select market_row.roster2, market_row.user2
    loop
      update public.sportsbook_outcomes o
         set sleeper_roster_id = side_row.roster_id
       where o.market_id = market_row.id
         and o.sleeper_roster_id is null
         and private.sportsbook_normalize_label(o.label) in (
           select private.sportsbook_normalize_label(candidate)
             from (
               select sr.team_name candidate from public.sleeper_rosters sr
                where sr.season=market_row.season and sr.roster_id=side_row.roster_id
               union all
               select sr.display_name from public.sleeper_rosters sr
                where sr.season=market_row.season and sr.roster_id=side_row.roster_id
               union all
               select su.team_name from public.sleeper_users su
                where su.sleeper_user_id=side_row.sleeper_user_id
               union all
               select su.display_name from public.sleeper_users su
                where su.sleeper_user_id=side_row.sleeper_user_id
               union all
               select su.username from public.sleeper_users su
                where su.sleeper_user_id=side_row.sleeper_user_id
               union all
               select mm.team_name from public.members mm
                where mm.sleeper_user_id=side_row.sleeper_user_id
               union all
               select mm.display_name from public.members mm
                where mm.sleeper_user_id=side_row.sleeper_user_id
             ) names
            where nullif(btrim(candidate), '') is not null
         );
    end loop;

    -- A two-way moneyline only needs one positive identity match: if one side
    -- is known, the remaining outcome necessarily belongs to the other side.
    select count(*) into unmatched_outcomes
      from public.sportsbook_outcomes
     where market_id=market_row.id and sleeper_roster_id is null;
    if unmatched_outcomes = 1 and
       (select count(*) from public.sportsbook_outcomes where market_id=market_row.id) = 2 then
      update public.sportsbook_outcomes o
         set sleeper_roster_id = case
           when exists(select 1 from public.sportsbook_outcomes x where x.market_id=market_row.id and x.sleeper_roster_id=market_row.roster1)
             then market_row.roster2 else market_row.roster1 end
       where o.market_id=market_row.id and o.sleeper_roster_id is null;
    end if;

    if market_row.score1 = market_row.score2 then
      -- A tie has no moneyline winner. Match the existing book rule: refund
      -- the entire entry instead of silently re-pricing a parlay.
      update public.sportsbook_outcomes set is_winner=null where market_id=market_row.id;
      update public.sportsbook_bet_legs set status='void', settled_at=now()
       where market_id=market_row.id and status='open';
      for bet_row in
        select distinct b.id, b.member_id, b.stake, b.market_id, b.pick_count
          from public.sportsbook_bet_legs l
          join public.sportsbook_bets b on b.id=l.bet_id
         where l.market_id=market_row.id and b.status='open'
      loop
        update public.sportsbook_bets set status='void', payout=0, settled_at=now() where id=bet_row.id and status='open';
        if found then
          update public.sportsbook_wallets set balance=balance+bet_row.stake, updated_at=now() where member_id=bet_row.member_id;
          insert into public.sportsbook_ledger(member_id,amount,kind,note,market_id,bet_id)
          values(bet_row.member_id,bet_row.stake,'refund','Sleeper matchup ended tied',bet_row.market_id,bet_row.id);
          tickets_void := tickets_void + 1;
        end if;
      end loop;
      update public.sportsbook_markets set status='void', settled_at=now() where id=market_row.id;
      markets_graded := markets_graded + 1;
      continue;
    end if;

    winning_roster := case when market_row.score1 > market_row.score2 then market_row.roster1 else market_row.roster2 end;
    select id into winning_outcome
      from public.sportsbook_outcomes
     where market_id=market_row.id and sleeper_roster_id=winning_roster
     order by id limit 1;

    if winning_outcome is null then
      markets_unmatched := markets_unmatched + 1;
      continue;
    end if;

    update public.sportsbook_outcomes set is_winner=(id=winning_outcome) where market_id=market_row.id;
    update public.sportsbook_bet_legs
       set status=case when outcome_id=winning_outcome then 'won' else 'lost' end,
           settled_at=now()
     where market_id=market_row.id and status='open';

    for bet_row in
      select distinct b.id
        from public.sportsbook_bet_legs l
        join public.sportsbook_bets b on b.id=l.bet_id
       where l.market_id=market_row.id and b.status='open'
    loop
      final_status := public.sportsbook_roll_up_entry(bet_row.id);
      if final_status='won' then tickets_won := tickets_won + 1;
      elsif final_status='lost' then tickets_lost := tickets_lost + 1;
      elsif final_status='void' then tickets_void := tickets_void + 1;
      end if;
    end loop;

    update public.sportsbook_markets set status='settled', settled_at=now() where id=market_row.id;
    markets_graded := markets_graded + 1;
  end loop;

  return next;
end
$function$;

revoke all on function public.sportsbook_settle_completed_matchups()
  from public, anon, authenticated;
grant execute on function public.sportsbook_settle_completed_matchups()
  to service_role;

create or replace function private.sportsbook_grade_tuesday_morning()
returns int
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  chicago_now timestamp := now() at time zone 'America/Chicago';
  graded int := 0;
begin
  -- Two UTC hours are scheduled for DST. Exactly one is 07:00 Chicago time.
  if extract(dow from chicago_now) <> 2 or to_char(chicago_now,'HH24:MI') <> '07:00' then
    return 0;
  end if;
  select markets_graded into graded from public.sportsbook_settle_completed_matchups();
  return coalesce(graded,0);
end
$function$;

revoke all on function private.sportsbook_grade_tuesday_morning()
  from public, anon, authenticated;

select cron.schedule(
  'dfl-sportsbook-tuesday-settlement',
  '0 12,13 * * 2',
  'select private.sportsbook_grade_tuesday_morning();'
);

-- Catch up any already-finished tickets as soon as this migration lands.
select * from public.sportsbook_settle_completed_matchups();
