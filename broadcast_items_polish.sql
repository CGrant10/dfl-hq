-- =====================================================================
-- Broadcast 1.5 - additive migration for broadcast_items.
-- ---------------------------------------------------------------------
-- Run this AFTER broadcast_items_schema.sql. It only adds columns and is
-- safe to run twice; no existing column is altered, renamed or dropped,
-- and every addition has a default so existing rows stay valid.
--
-- SECURITY REVIEW: no new table, so no new policy surface. The four
-- policies from broadcast_items_schema.sql (public read, is_admin write)
-- already cover these columns - Postgres RLS is per ROW, so a column
-- added to a protected table is protected the moment it exists. Nothing
-- here is private: background choice and dwell are presentation, and the
-- table remains a public sign.
-- =====================================================================

-- WHERE A SLIDE SITS IN THE COMMISSIONER'S RUNNING ORDER.
-- Compared only against other manual slides - see the ordering rule in
-- js/broadcast-deck.js. Ascending, so "move up" means a smaller number.
alter table public.broadcast_items
  add column if not exists sort_order int not null default 0;

-- HOW LONG THIS SLIDE HOLDS THE SCREEN, in seconds.
-- NULL means "use the treatment default", which is the normal case - the
-- point is that a slide can be given longer, not that every slide must
-- be timed by hand. The range is enforced here as well as in the browser
-- because a 0-second slide is a seizure risk and a 600-second one is a
-- broken rotation.
alter table public.broadcast_items
  add column if not exists dwell_seconds int;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'broadcast_items_dwell_range'
  ) then
    alter table public.broadcast_items
      add constraint broadcast_items_dwell_range
      check (dwell_seconds is null or (dwell_seconds >= 3 and dwell_seconds <= 15));
  end if;
end $$;

-- HOW THE SLIDE IS DRESSED.
-- One column, not five booleans. 'default' is the house dark broadcast
-- look; 'light' inverts to a light plate with dark type; 'dark' is the
-- heavier dramatic treatment; 'image' composes the item's existing image
-- as artwork; 'logo' uses the DFL crest as an oversized background.
--
-- NOTE: 'image' reuses the image column that already exists. There is
-- deliberately no second image field.
alter table public.broadcast_items
  add column if not exists background text not null default 'default';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'broadcast_items_background'
  ) then
    alter table public.broadcast_items
      add constraint broadcast_items_background
      check (background in ('default','light','dark','image','logo'));
  end if;
end $$;

-- The manual running order is read on every front-page load.
create index if not exists broadcast_items_order_idx
  on public.broadcast_items (active, sort_order, created_at);

-- ---------------------------------------------------------------------
-- Still refused for anonymous callers, because the policies did not
-- change and they are per row:
--
--   set local role anon;
--   update public.broadcast_items set background = 'light';
--   -- expected: 0 rows (no policy grants anon an update)
--   reset role;
-- ---------------------------------------------------------------------
