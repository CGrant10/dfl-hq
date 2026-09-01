-- =====================================================================
-- DFL HQ - the two lost titles, and the one that was never credited
-- ---------------------------------------------------------------------
-- Run in the Supabase SQL editor after sleeper_schema.sql,
-- historical_identity_schema.sql and season_result_override_schema.sql.
-- Safe to re-run; it converges rather than appends.
--
-- THREE FACTS SLEEPER CANNOT KNOW, AND WHY THEY BELONG IN THE DATABASE
-- RATHER THAN IN A CONSTANT IN config.js.
--
-- champion_user_id is read in fourteen files - the ticker, the stage deck,
-- fun facts, lore, history, home, profile, what's new. A hardcoded list of
-- legacy champions would have to be taught to every one of them, and the one
-- that got missed would disagree with the rest forever. Written here, every
-- reader is already correct and none of them change.
--
--   1. 2017 - azhee28 won the first DFL season.
--   2. 2018 - CimmeronG won the second.
--      Both seasons were played on a different app. There is no Sleeper
--      league, no roster and no box score to recover: the trophy is the only
--      surviving fact, so the trophy is the only thing recorded. The season
--      rows say 'Recorded by hand' about themselves, exactly as
--      set_season_result() writes them, and carry no standings - so records,
--      averages and points-for stay honestly 2019-onward.
--
--   3. 2019 - sheyg2014 won, and Sleeper returns no owner for that roster
--      because he was removed from the league after winning it.
--      historical_identity_schema.sql already repaired the NAME on that
--      roster. It did not repair the IDENTITY, so every count that works by
--      sleeper_user_id - his title, his 2019 record, his points, his season
--      count - skipped him. The champion showed up on the Hall of Fame with
--      no championship on his own profile.
--
-- WHY THE LOCKS MATTER. champion_locked tells Sync Sleeper "a human decided
-- this, leave it alone" (see season_result_override_schema.sql). Every row
-- written here is locked, so the next sync cannot quietly undo it.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Who is who. The league is half real names and half 2019 usernames, so a
-- lookup that only checked one of them would miss half the people it was
-- asked about. Returns null rather than guessing.
-- ---------------------------------------------------------------------
create or replace function public.dfl_uid_for_name(name_in text)
returns text
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(
    (select m.sleeper_user_id from public.members m
      where lower(m.display_name) = lower(name_in)
        and coalesce(m.sleeper_user_id, '') <> ''
      limit 1),
    (select su.sleeper_user_id from public.sleeper_users su
      where lower(su.username) = lower(name_in)
         or lower(su.display_name) = lower(name_in)
      limit 1),
    (select m.sleeper_user_id from public.members m
      where lower(m.team_name) = lower(name_in)
        and coalesce(m.sleeper_user_id, '') <> ''
      limit 1)
  );
$fn$;

grant execute on function public.dfl_uid_for_name(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 1 & 2. THE TWO SEASONS THAT PREDATE THE RECORDS.
--
-- sleeper_league_id is NOT NULL and unique, so the placeholder names itself
-- honestly - 'manual-2017' borrows nothing from a real league id. This is the
-- same row set_season_result() would create if the commissioner did it from
-- the Hall of Fame, which means the "Correct season" button still works on
-- these two afterwards.
-- ---------------------------------------------------------------------
do $legacy$
declare
  legacy record;
  uid    text;
begin
  for legacy in
    select * from (values (2017, 'azhee28'), (2018, 'CimmeronG')) as v(season, winner)
  loop
    uid := public.dfl_uid_for_name(legacy.winner);
    if uid is null then
      raise warning 'No Sleeper id for % - link that member on the Admin page, then run this file again.', legacy.winner;
      continue;
    end if;

    insert into public.sleeper_leagues (sleeper_league_id, season, name, status)
    values ('manual-' || legacy.season, legacy.season, 'Recorded by hand', 'complete')
    on conflict (sleeper_league_id) do nothing;

    update public.sleeper_leagues
       set champion_user_id = uid,
           champion_locked  = true
     where season = legacy.season;
  end loop;
end
$legacy$;


-- ---------------------------------------------------------------------
-- 3. THE 2019 CHAMPION GETS HIS OWN SEASON BACK.
--
-- This extends the function historical_identity_schema.sql installed, so it
-- keeps running on the same trigger: after a sync writes champion_roster_id,
-- which is the only moment the roster is known. The name repair it already
-- did is kept verbatim; the identity repair is added underneath it.
--
-- Every write is conditional on a MATCHING roster and an EMPTY owner. A
-- season Sleeper can answer for itself is never touched, and if sheyg2014 is
-- not linked to a Sleeper account the function does nothing at all.
-- ---------------------------------------------------------------------
create or replace function public.dfl_apply_historical_identity_overrides()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  champ_roster bigint;
  sheyg_uid    text;
begin
  select sl.champion_roster_id
    into champ_roster
    from public.sleeper_leagues sl
   where sl.season = 2019
   order by sl.synced_at desc nulls last
   limit 1;

  if champ_roster is null then
    return;
  end if;

  -- The name. Unchanged from historical_identity_schema.sql.
  update public.sleeper_rosters
     set team_name = 'sheyg2014',
         display_name = 'sheyg2014'
   where season = 2019
     and roster_id = champ_roster
     and (coalesce(team_name, '') <> 'sheyg2014'
       or coalesce(display_name, '') <> 'sheyg2014');

  update public.sleeper_standings
     set team_name = 'sheyg2014'
   where season = 2019
     and roster_id = champ_roster
     and coalesce(team_name, '') <> 'sheyg2014';

  -- The identity. Without this the roster reads "sheyg2014" and counts as
  -- nobody: the wins, the points and the title all belong to a null owner.
  sheyg_uid := public.dfl_uid_for_name('sheyg2014');
  if sheyg_uid is null then
    return;
  end if;

  update public.sleeper_rosters
     set sleeper_user_id = sheyg_uid
   where season = 2019 and roster_id = champ_roster
     and coalesce(sleeper_user_id, '') = '';

  update public.sleeper_standings
     set sleeper_user_id = sheyg_uid
   where season = 2019 and roster_id = champ_roster
     and coalesce(sleeper_user_id, '') = '';

  -- And the trophy itself, locked so the next sync cannot blank it again.
  update public.sleeper_leagues
     set champion_user_id = sheyg_uid,
         champion_locked  = true
   where season = 2019
     and coalesce(champion_user_id, '') = '';
end;
$fn$;

select public.dfl_apply_historical_identity_overrides();


-- ---------------------------------------------------------------------
-- REPORT: every title on record, and who says so.
-- Expect 2017 azhee28, 2018 CimmeronG and 2019 sheyg2014 to read "by hand".
-- ---------------------------------------------------------------------
select
  l.season,
  coalesce(champ.display_name, '(none)') as champion,
  case when l.champion_locked then 'by hand' else 'from Sleeper' end as source,
  l.name
from public.sleeper_leagues l
left join public.members champ on champ.sleeper_user_id = l.champion_user_id
order by l.season desc;
