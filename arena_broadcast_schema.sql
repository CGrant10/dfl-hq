-- =====================================================================
-- DFL HQ - Arena Broadcast Mode
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive. Run AFTER arena_schema.sql. Safe to re-run.
--
-- HOW THE SYNC WORKS, AND WHY IT IS THIS CHEAP
--
-- The obvious way to drive a broadcast is to stream positions - the admin
-- pushes "duck 3 is at 62%" many times a second and the broadcast draws it.
-- That is a lot of writes, it is at the mercy of the venue wifi, and every
-- dropped message is a visible stutter on stream.
--
-- None of that is necessary here, because an Arena race is a DETERMINISTIC
-- simulation (see js/arena/race.js): the same seed always produces the same
-- race, tick for tick. So the only things a viewer needs are the seed and
-- when the clock started. Both views then compute the identical race
-- locally, at their own frame rate, with no further traffic.
--
-- That means the state below is tiny and changes only when the commissioner
-- presses a button - start, pause, reset, skip - so one realtime row is
-- enough to keep OBS and the phone in lockstep.
--
-- bc_offset_ms is what makes pause work without stopping any clocks: it
-- accumulates time already spent paused, and elapsed is always
--     (now - bc_started_at) - bc_offset_ms
-- which is resumable, seekable ("skip to finish" just sets it past the end)
-- and survives a browser refresh on either side.
-- =====================================================================

alter table public.arena_events
  add column if not exists bc_state      text not null default 'idle',
  -- idle | countdown | running | paused | finished
  add column if not exists bc_started_at timestamptz,
  add column if not exists bc_offset_ms  int not null default 0,
  add column if not exists bc_show_board boolean not null default true,
  add column if not exists bc_show_timer boolean not null default true;


-- ---------------------------------------------------------------------
-- Realtime
--   The broadcast subscribes to this one row. If the publication does not
--   exist (a very old project) the app falls back to polling every second,
--   so this block is an optimisation and not a requirement.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- add_table throws if the table is already a member, which is fine.
    begin
      execute 'alter publication supabase_realtime add table public.arena_events';
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;

-- Realtime on Supabase also needs the row to be identifiable in the change
-- feed. FULL means updates carry every column, so the broadcast does not
-- have to re-fetch after each state change.
alter table public.arena_events replica identity full;
