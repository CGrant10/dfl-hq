-- =====================================================================
-- A tee time for golf outings.
-- ---------------------------------------------------------------------
-- Run this once in the Supabase SQL editor. Additive and safe to run
-- twice: one nullable column, nothing altered, nothing dropped.
--
-- The same decision as events_time_schema.sql, for the same two reasons,
-- and they are worth repeating because the temptation to "fix" this to a
-- timestamptz later will be real:
--
--   1. golf_outings.event_date is a plain `date`, and the app compares it
--      as a string in several places - home.js filters the live outing
--      with .neq("status","final").order("event_date"), pages/golf.js
--      splits upcoming from history, and golf-join.js lists events by it.
--      Promoting the column would break those quietly.
--
--   2. A tee time is not an instant. "We tee off at 8:30" means 8:30 at
--      the course. timestamptz would convert per reader and tell a member
--      in another state the wrong time to show up - which for golf is the
--      difference between playing and not.
--
-- NULL means "no tee time set", which stays the default: an outing being
-- planned should not be forced to claim midnight.
--
-- SECURITY REVIEW: no new table, so no new policy surface. The existing
-- golf_outings policies cover this column - RLS is per ROW, so a column
-- added to a protected table is protected the moment it exists. A tee
-- time is public to the league exactly like the date beside it, and it is
-- not part of the guest authorisation path.
-- =====================================================================

alter table public.golf_outings
  add column if not exists event_time time;

create index if not exists golf_outings_when_idx
  on public.golf_outings (event_date, event_time nulls last);
