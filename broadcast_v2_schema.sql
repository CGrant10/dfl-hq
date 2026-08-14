-- =====================================================================
-- Broadcast v2: member images + automatic-slide presentation overrides.
-- ---------------------------------------------------------------------
-- Run this once in the Supabase SQL editor. Additive and safe to run
-- twice. Fantasy Fun Facts needs NO schema at all - it is derived from
-- the matchup rows that are already there.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. MEMBER IMAGES
--
-- members.profile_image already exists and stays exactly what it is: the
-- picture of the person. These three are for the BROADCAST, which wants
-- something with more personality than a headshot.
--
--   broadcast_image   the one the stage prefers. A good action/hero shot.
--   lookalike_image   the celebrity double. Used when there is no
--                     broadcast image, and by the look-alike slide.
--   chaos_image       opt-in only. NEVER chosen automatically - a slide
--                     has to ask for it by name, because "chaos" turning
--                     up on a championship card is not a nice surprise.
--
-- SECURITY: members is already publicly readable (the member picker on a
-- signed-out device reads it) and already admin-write. These are URLs to
-- pictures the league means to show on its own front page, so they carry
-- no more exposure than display_name does. No policy change.
-- ---------------------------------------------------------------------

alter table public.members add column if not exists broadcast_image text;
alter table public.members add column if not exists lookalike_image text;
alter table public.members add column if not exists chaos_image     text;


-- ---------------------------------------------------------------------
-- 2. AUTOMATIC SLIDE OVERRIDES
--
-- The commissioner can already write a slide by hand and can already
-- switch a source off. What was missing is the middle: leave the golf
-- slide switched on, generated from live data, but tell it to use a
-- picture and a different plate.
--
-- KEYED BY GENERATOR ID, which is the same key the on/off switches
-- already use (js/broadcast-deck.js GENERATOR_LABELS). One row per
-- source, at most. That is deliberately coarse - per-item overrides would
-- need a stable id for a thing that is regenerated from live data every
-- load, and there isn't one.
--
-- PRESENTATION ONLY. There is no headline, subtitle, body or temporal
-- column here and there must never be. The whole point is that the golf
-- score stays the golf score: if an admin could retype the headline, the
-- stage could say something the data does not, and temporal honesty would
-- be a suggestion rather than a rule. Everything in this table is about
-- how a slide LOOKS.
--
-- SECURITY: public read (it is the front page), is_admin() write. Same
-- shape and the same reasoning as broadcast_items, and the policies are
-- dropped by name and rebuilt so re-running leaves exactly these four.
-- ---------------------------------------------------------------------

create table if not exists public.broadcast_overrides (
  generator   text primary key,

  treatment   text check (treatment is null or treatment in
                ('scoreboard','champion','stat','announcement','event','hero')),
  background  text check (background is null or background in
                ('default','light','dark','image','logo')),
  image       text,
  dwell_seconds int check (dwell_seconds is null or (dwell_seconds >= 3 and dwell_seconds <= 15)),
  featured    boolean not null default false,
  weight      int     not null default 0,

  updated_at  timestamptz not null default now()
);

alter table public.broadcast_overrides enable row level security;

drop policy if exists "overrides read"   on public.broadcast_overrides;
drop policy if exists "overrides insert" on public.broadcast_overrides;
drop policy if exists "overrides update" on public.broadcast_overrides;
drop policy if exists "overrides delete" on public.broadcast_overrides;

create policy "overrides read"   on public.broadcast_overrides for select using (true);
create policy "overrides insert" on public.broadcast_overrides for insert with check (is_admin());
create policy "overrides update" on public.broadcast_overrides for update using (is_admin()) with check (is_admin());
create policy "overrides delete" on public.broadcast_overrides for delete using (is_admin());

-- ---------------------------------------------------------------------
-- Prove it rather than trust it:
--
--   set local role anon;
--   insert into public.broadcast_overrides (generator) values ('golf');
--   -- expected: new row violates row-level security policy
--   select count(*) from public.broadcast_overrides;   -- allowed
--   reset role;
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- 3. PER-SLIDE WATERMARK STRENGTH  (added in the Arena/Dashboard pass)
--
-- The crest behind a slide is right at 7% on a plain plate and too loud
-- on top of a photograph, where it competes with the artwork. Rather than
-- pick one global number that is wrong for half the slides, each slide
-- says how strong its own watermark should be.
--
-- Four words, not a number: an admin choosing "faint" is making a design
-- decision, and 0.043 is not a design decision. NULL means "default",
-- which is what every existing row already is.
--
-- SECURITY: no new table, so no new policy surface - the broadcast_items
-- policies already cover this column, because RLS is per row.
-- ---------------------------------------------------------------------

alter table public.broadcast_items
  add column if not exists logo_opacity text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'broadcast_items_logo_opacity'
  ) then
    alter table public.broadcast_items
      add constraint broadcast_items_logo_opacity
      check (logo_opacity is null or logo_opacity in ('default','subtle','faint','hidden'));
  end if;
end $$;
