-- =====================================================================
-- DFL HQ - last place comes from the bracket, not the table
-- ---------------------------------------------------------------------
-- Run after sleeper_schema.sql, then run Sync Sleeper from the Admin page.
-- Safe to re-run.
--
-- The Chip Eater was being read from sleeper_standings.rank, which the sync
-- computes as record-then-points-for: that is what the table looked like going
-- INTO the playoffs. The Chip Eater is whoever came last coming OUT of them,
-- which a 4-11 team can escape and an 8-7 team can walk into.
--
-- Sleeper decides it in the losers bracket, so the sync now reads that bracket
-- and stores the owner here. NULL is a real and common answer: a league that
-- runs no consolation bracket has no last place to report, and the season shows
-- no Chip Eater rather than a guess. The commissioner's "Correct season" button
-- is the override for those.
-- =====================================================================

alter table public.sleeper_leagues
  add column if not exists last_place_user_id text;

-- ---------------------------------------------------------------------
-- REPORT: what the sync will have to fill in.
--
-- Every complete season, whether last place is known yet, and what the OLD
-- rule would have said - so the difference is visible before anybody trusts it.
-- Run Sync Sleeper, then run this file again to see it populated.
-- ---------------------------------------------------------------------
select
  l.season,
  l.status,
  coalesce(bracket_member.display_name, '(not synced yet)') as chip_eater_from_bracket,
  coalesce(record_member.display_name, '(none)')            as would_have_been_by_record
from public.sleeper_leagues l
left join public.members bracket_member
       on bracket_member.sleeper_user_id = l.last_place_user_id
left join lateral (
  select s.sleeper_user_id
  from public.sleeper_standings s
  where s.season = l.season and s.rank is not null
  order by s.rank desc
  limit 1
) worst on true
left join public.members record_member
       on record_member.sleeper_user_id = worst.sleeper_user_id
where l.status = 'complete'
order by l.season desc;
