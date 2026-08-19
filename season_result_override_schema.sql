-- =====================================================================
-- DFL HQ - the commissioner names the champion and the Chip Eater by hand
-- ---------------------------------------------------------------------
-- Run after sleeper_schema.sql, chip_eater_schema.sql and
-- commissioner_roles_schema.sql. Safe to re-run.
--
-- WHY THIS WRITES THE SAME COLUMN EVERYTHING ELSE READS
--
-- sleeper_leagues.champion_user_id is read in FOURTEEN files - the ticker, the
-- stage deck, fun facts, lore, history, home, profile, what's new. An override
-- stored somewhere else would mean teaching all fourteen to prefer it, and the
-- one that got missed would disagree with the rest forever.
--
-- So the override writes champion_user_id itself, and the sync is taught not to
-- clobber it. One value, one meaning, fourteen readers unchanged.
--
-- THE LOCK IS WHAT MAKES THAT SAFE. champion_locked / last_place_locked say "a
-- human decided this, leave it alone". Sync Sleeper skips a locked column and
-- overwrites an unlocked one, so a season the bracket gets right stays
-- automatic and a season it cannot know stays corrected.
--
-- The case that prompted it: sheyg2014 won 2019, and Sleeper has no record
-- because he was removed from the league that year. No amount of reading the
-- API will ever produce that answer.
-- =====================================================================

alter table public.sleeper_leagues
  add column if not exists champion_locked   boolean not null default false,
  add column if not exists last_place_locked boolean not null default false;

comment on column public.sleeper_leagues.champion_locked is
  'A human set champion_user_id. Sync Sleeper must not overwrite it.';
comment on column public.sleeper_leagues.last_place_locked is
  'A human set last_place_user_id. Sync Sleeper must not overwrite it.';

-- ---------------------------------------------------------------------
-- THE OVERRIDE.
--
-- Takes MEMBER ids, because that is what a commissioner picks from a list, and
-- resolves them to the Sleeper user id the columns hold - so the caller never
-- has to know that mapping exists.
--
-- Passing null CLEARS the lock and hands the column back to the sync. That is
-- deliberate: an override you cannot undo is a trap, and "I picked the wrong
-- name" needs a way back that is not the SQL editor.
-- ---------------------------------------------------------------------
create or replace function public.set_season_result(
  target_season       int,
  champion_member_id  bigint default null,
  last_place_member_id bigint default null,
  set_champion        boolean default true,
  set_last_place      boolean default true
) returns public.sleeper_leagues
language plpgsql security definer set search_path = public as $$
declare
  allowed  boolean := false;
  champ_uid text;
  last_uid  text;
  row_out  public.sleeper_leagues;
begin
  /*
    The results are league history, so `history` governs them - and `sleeper`
    does too, because the columns live on a table that permission already owns.
    Either is enough. has_commissioner_permission() accepts legacy is_admin(),
    so the shared Admin password works here as well.
  */
  if exists (select 1 from pg_proc where proname = 'has_commissioner_permission') then
    execute 'select public.has_commissioner_permission($1) or public.has_commissioner_permission($2)'
      into allowed using 'history', 'sleeper';
  else
    allowed := public.is_admin();
  end if;
  if not allowed then
    raise exception 'That needs the History or Sleeper permission';
  end if;

  if set_champion and champion_member_id is not null then
    select m.sleeper_user_id into champ_uid from public.members m where m.id = champion_member_id;
    if champ_uid is null or champ_uid = '' then
      raise exception 'That member is not linked to a Sleeper account, so there is no id to record. Link it on the Admin page first.';
    end if;
  end if;

  if set_last_place and last_place_member_id is not null then
    select m.sleeper_user_id into last_uid from public.members m where m.id = last_place_member_id;
    if last_uid is null or last_uid = '' then
      raise exception 'That member is not linked to a Sleeper account, so there is no id to record. Link it on the Admin page first.';
    end if;
  end if;

  /*
    A SEASON SLEEPER NEVER HAD STILL NEEDS A ROW.

    2019 is the whole reason: if the league's Sleeper history does not reach
    back that far there is nothing to update. sleeper_league_id is NOT NULL and
    unique, so a placeholder names itself honestly rather than borrowing an id
    that means something.
  */
  insert into public.sleeper_leagues (sleeper_league_id, season, name, status)
  values ('manual-' || target_season, target_season, 'Recorded by hand', 'complete')
  on conflict (sleeper_league_id) do nothing;

  update public.sleeper_leagues l
     set champion_user_id  = case when set_champion   then champ_uid else l.champion_user_id  end,
         champion_locked   = case when set_champion   then (champion_member_id is not null)
                                  else l.champion_locked end,
         last_place_user_id = case when set_last_place then last_uid  else l.last_place_user_id end,
         last_place_locked  = case when set_last_place then (last_place_member_id is not null)
                                   else l.last_place_locked end
   where l.season = target_season
   returning * into row_out;

  if row_out.id is null then
    raise exception 'No league row for %', target_season;
  end if;

  return row_out;
end;
$$;

grant execute on function public.set_season_result(int,bigint,bigint,boolean,boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- REPORT: every season, who holds each title, and whether a human said so.
-- ---------------------------------------------------------------------
select
  l.season,
  coalesce(champ.display_name, '(none)')      as champion,
  case when l.champion_locked then 'by hand' else 'from Sleeper' end as champion_source,
  coalesce(last.display_name, '(none)')       as chip_eater,
  case when l.last_place_locked then 'by hand' else 'from Sleeper' end as chip_eater_source
from public.sleeper_leagues l
left join public.members champ on champ.sleeper_user_id = l.champion_user_id
left join public.members last  on last.sleeper_user_id  = l.last_place_user_id
order by l.season desc;
