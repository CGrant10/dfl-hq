-- =====================================================================
-- DFL HQ - DFL Arena
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive, safe to re-run, touches no existing table.
--
-- Arena is a general purpose competition system, NOT a draft order tool.
-- An event is "a set of participants and an ordered result": draft order,
-- golf team picks, playoff seeding, punishments, awards, weekly
-- challenges. Nothing here knows or cares which.
--
-- Participants reference public.members - the existing member system. No
-- second roster, no second identity.
--
-- The result is stored as rows in arena_results rather than a JSON blob so
-- a member's finishes can be queried later ("how many Arena events has
-- Slaw won") without unpacking JSON on the client.
--
-- `seed` is the point of interest: a race is a seeded simulation, so
-- storing the seed means a saved event can be replayed and will run
-- exactly the same way. The result is not re-derived from it at read time -
-- arena_results is the record of truth - but the replay is honest.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Events
-- ---------------------------------------------------------------------
create table if not exists public.arena_events (
  id           bigint generated always as identity primary key,
  name         text not null,
  description  text not null default '',
  theme        text not null default 'ducks',   -- sprite theme key
  race_length  text not null default 'medium',  -- short | medium | long | custom
  length_ticks int,                             -- set when race_length = 'custom'
  notes        text not null default '',
  event_date   date,
  status       text not null default 'setup',   -- setup | complete
  seed         bigint,                          -- lets a saved race replay identically
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);


-- ---------------------------------------------------------------------
-- 2. Participants
--    A racer is a member plus how they look on the track.
-- ---------------------------------------------------------------------
create table if not exists public.arena_participants (
  id          bigint generated always as identity primary key,
  event_id    bigint not null references public.arena_events(id) on delete cascade,
  member_id   bigint not null references public.members(id) on delete cascade,
  sprite      text not null default '',      -- key within the event's theme
  color       text,                          -- optional lane / team colour
  number      int,                           -- optional racer number
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  -- a member races once per event
  unique (event_id, member_id)
);


-- ---------------------------------------------------------------------
-- 3. Results
--    place 1 is the winner. finish_ms is the simulated finish time, kept
--    because a 0.04 second gap is a better story than "2nd".
-- ---------------------------------------------------------------------
create table if not exists public.arena_results (
  id          bigint generated always as identity primary key,
  event_id    bigint not null references public.arena_events(id) on delete cascade,
  member_id   bigint not null references public.members(id) on delete cascade,
  place       int not null,
  finish_ms   int,
  created_at  timestamptz not null default now(),
  unique (event_id, member_id),
  unique (event_id, place)
);


create index if not exists idx_arena_part_event   on public.arena_participants(event_id);
create index if not exists idx_arena_res_event    on public.arena_results(event_id);
create index if not exists idx_arena_res_member   on public.arena_results(member_id);
create index if not exists idx_arena_events_date  on public.arena_events(event_date);


-- =====================================================================
-- 4. ROW LEVEL SECURITY
--    Everyone watches and reads history. Only the commissioner creates,
--    edits, runs and saves. Same is_admin() as the rest of the app.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array['arena_events','arena_participants','arena_results'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);

    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format(
      'create policy "admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      t);
  end loop;
end;
$$;
