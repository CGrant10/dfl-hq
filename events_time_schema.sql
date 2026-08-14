-- =====================================================================
-- A start time for calendar events.
-- ---------------------------------------------------------------------
-- Run this once in the Supabase SQL editor. Additive and safe to run
-- twice: one nullable column, nothing altered, nothing dropped.
--
-- SECURITY REVIEW: no new table, so no new policy surface. The events
-- policies already cover this column - RLS is per ROW, so a column added
-- to a protected table is protected the moment it exists. An event time
-- is public information, exactly like the event date beside it.
--
-- WHY `time` AND NOT `timestamptz`:
--
--   The existing event_date is a plain `date`, and half the app filters
--   on it as a string - home.js does .gte("event_date", today) with a
--   YYYY-MM-DD, and calendar.js splits upcoming from past with a string
--   compare. Promoting that column to timestamptz would silently break
--   every one of those comparisons.
--
--   A time is also not an instant. "The draft starts at 7pm" means 7pm
--   where the league is, not 00:00Z; storing it as timestamptz would
--   convert it per reader and show a member in another state the wrong
--   hour. `time` is wall-clock, which is what everybody means.
--
--   NULL means "no time set", which stays the default - an all-day
--   entry on the calendar should not be forced to claim midnight.
-- =====================================================================

alter table public.events
  add column if not exists event_time time;

-- The calendar reads the day's entries in order, and an event with a
-- time should sort before one without on the same day only if that is
-- what the query asks for - nulls last is the sensible default.
create index if not exists events_when_idx
  on public.events (event_date, event_time nulls last);
