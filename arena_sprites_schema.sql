-- =====================================================================
-- DFL HQ - custom racer images
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive. Run AFTER arena_schema.sql. Safe to re-run.
--
-- One column: the picture for THIS racer in THIS event, as a data: URI of a
-- small PNG that the browser produces before saving.
--
-- Why on the participant and not on the member: the same person can be a
-- duck in the draft-order race and a T-Rex in the punishment race, which is
-- most of the fun. Put it on members and every event shares one picture.
--
-- Why a data: URI and not Storage: no bucket, no bucket policies, no signed
-- URLs, and the picture arrives with the row that needs it. The browser
-- redraws whatever is picked down to 128x80 first, so a phone photo becomes
-- a few kilobytes instead of several megabytes.
--
-- If a racer has no image the app draws its built-in SVG for that slot, so
-- this is entirely optional and can be filled in one racer at a time.
-- =====================================================================

alter table public.arena_participants
  add column if not exists sprite_image text;
