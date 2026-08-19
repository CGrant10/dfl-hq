-- DFL historical identity overrides
--
-- Sleeper no longer returns the owner account for the 2019 champion because
-- sheyg2014 was removed from that league after winning it. The roster itself
-- is still known through sleeper_leagues.champion_roster_id.
--
-- This migration repairs ONLY that exact historical slot. It never renames a
-- generic deleted Sleeper user, and it runs again after future sync writes so
-- the known identity cannot regress to "Deleted user".

create or replace function public.dfl_apply_historical_identity_overrides()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  champ_roster bigint;
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
end;
$$;

-- The league row is written after rosters/standings during a Sleeper sync.
-- Applying here guarantees the repair happens after champion_roster_id is
-- known, including on the very first sync after this migration is installed.
create or replace function public.dfl_historical_identity_after_league_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.season = 2019 then
    perform public.dfl_apply_historical_identity_overrides();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dfl_historical_identity_league on public.sleeper_leagues;
create trigger trg_dfl_historical_identity_league
after insert or update of champion_roster_id on public.sleeper_leagues
for each row
when (new.season = 2019)
execute function public.dfl_historical_identity_after_league_write();

-- If a later sync rewrites the orphan roster/standing after the league row is
-- already known, repair it immediately as well.
create or replace function public.dfl_historical_identity_after_snapshot_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.season = 2019 then
    perform public.dfl_apply_historical_identity_overrides();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dfl_historical_identity_roster on public.sleeper_rosters;
create trigger trg_dfl_historical_identity_roster
after insert or update of team_name, display_name on public.sleeper_rosters
for each row
when (new.season = 2019)
execute function public.dfl_historical_identity_after_snapshot_write();

drop trigger if exists trg_dfl_historical_identity_standing on public.sleeper_standings;
create trigger trg_dfl_historical_identity_standing
after insert or update of team_name on public.sleeper_standings
for each row
when (new.season = 2019)
execute function public.dfl_historical_identity_after_snapshot_write();

-- Fix the data that is already there right now.
select public.dfl_apply_historical_identity_overrides();
