-- =====================================================================
-- DFL HQ - THE DRAFT ORDER: where each team picks from, this year
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive and safe to re-run. Run this AFTER sleeper_draft_schema.sql.
--
-- WHY
--   sleeper_draft_picks already answers "what round did this player go in",
--   and it carries draft_slot on every pick - but only for a draft that has
--   already happened. The question the front page wants to answer in August
--   is the other one: WHERE DO I PICK THIS YEAR. A draft still in pre_draft
--   has zero picks, so there is nothing in that table to read.
--
--   Sleeper publishes it on the draft object itself, not on the picks:
--   /draft/<draft_id> returns `draft_order` ({sleeper_user_id: slot}) and
--   `slot_to_roster_id` ({slot: roster_id}), plus `type` (snake or linear),
--   `settings.rounds`, `status` and `start_time`. Same public keyless API
--   as everything else the app reads - no new provider, no key.
--
-- THE HONEST GAP
--   `draft_order` is NULL until the commissioner actually sets the order.
--   That is not an error and not a sync failure: it is the true state of a
--   draft nobody has ordered yet. The sync stores the draft row with
--   order_known = false and writes no slots, and the card says the order is
--   not set rather than inventing one.
--
-- THE FALLBACK
--   For a season that HAS been drafted, the order is recoverable without
--   trusting draft_order at all: the round-one picks are the board's first
--   column-by-column pass, so pick_no 1..N in round 1 IS the slot order.
--   sync.js derives slots that way when Sleeper hands back no draft_order,
--   which is why 2020-2025 fill in even though those drafts predate this
--   table. See syncDraftOrder() in js/sync.js.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. One row per season's draft - the facts about the event itself
--    Keyed on season, like every other Sleeper table here, so re-syncing a
--    season rewrites its own row and can never touch another year.
-- ---------------------------------------------------------------------

create table if not exists public.sleeper_drafts (
  season        int  primary key,
  draft_id      text not null,
  status        text,                    -- pre_draft | drafting | complete
  draft_type    text,                    -- snake | linear | auction
  rounds        int,
  start_time_ms bigint,                  -- Sleeper's epoch ms; null until scheduled
  pick_timer_s  int,                     -- seconds on the clock, 0 = untimed
  order_known   boolean not null default false,
  synced_at     timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. One row per slot on the board
--    (season, draft_slot) is unique: a board has exactly one team in each
--    column. sleeper_user_id is what members.sleeper_user_id holds, so a
--    slot maps to a member without going anywhere near a name.
-- ---------------------------------------------------------------------

create table if not exists public.sleeper_draft_slots (
  id               bigint generated always as identity primary key,
  season           int  not null,
  draft_slot       int  not null,
  roster_id        int,
  sleeper_user_id  text,                 -- null on a deleted Sleeper account
  synced_at        timestamptz not null default now(),
  unique (season, draft_slot)
);

create index if not exists idx_draft_slots_season on public.sleeper_draft_slots(season);
create index if not exists idx_draft_slots_owner  on public.sleeper_draft_slots(sleeper_user_id);


-- ---------------------------------------------------------------------
-- 3. Row Level Security
--    Same shape as every other Sleeper table: the league reads it, only an
--    admin writes it, and the writer is sync.js under the admin client.
-- ---------------------------------------------------------------------

alter table public.sleeper_drafts      enable row level security;
alter table public.sleeper_draft_slots enable row level security;

drop policy if exists "public read" on public.sleeper_drafts;
drop policy if exists "admin write" on public.sleeper_drafts;
drop policy if exists "public read" on public.sleeper_draft_slots;
drop policy if exists "admin write" on public.sleeper_draft_slots;

create policy "public read" on public.sleeper_drafts
  for select using (true);
create policy "admin write" on public.sleeper_drafts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "public read" on public.sleeper_draft_slots
  for select using (true);
create policy "admin write" on public.sleeper_draft_slots
  for all using (public.is_admin()) with check (public.is_admin());
