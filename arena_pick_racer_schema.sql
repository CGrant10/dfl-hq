-- =====================================================================
-- DFL HQ - LET PEOPLE PICK THEIR OWN RACER
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run. Safe to re-run.
-- Adds NO tables and NO columns. One function.
--
-- THE PROBLEM
--
-- arena_participants is public-read and admin-write (see arena_schema.sql),
-- so choosing a racer has always been something the commissioner did FOR
-- everybody. Twelve people who each want to be a different thing is exactly
-- the fun of the Arena, and it was one person's job.
--
-- WHY A FUNCTION AND NOT A POLICY
--
-- A "member may update their own participant row" policy would be simple to
-- write and too generous: RLS filters ROWS, not COLUMNS, so it would also
-- hand every member their own colour, number, sort_order and - once
-- arena_sprites_schema.sql is in - sprite_image, which is a data: URI
-- column and therefore somewhere to stuff a megabyte of anything.
--
-- This function updates ONE COLUMN on ONE ROW that must belong to the
-- caller. That is the entire surface, and it cannot grow by accident the
-- way a policy can.
--
-- WHO THE CALLER IS
--
-- The same x-member-id header the golf policies already trust, read through
-- the same helper. That header is not a secret and is not treated as one:
-- it identifies which of twelve friends is holding the phone, in a league
-- where the whole point is that there are no passwords. It is exactly as
-- strong as picking your name on the "Who are you?" screen, which is what
-- it is. Somebody who edits it can change which cartoon animal represents
-- another member in a joke race - and nothing else, because this function
-- touches nothing else.
--
-- Uploading a picture stays admin-only, deliberately. Picking from the set
-- is what "pick your racer" means; letting anonymous callers write data:
-- URIs into a public table is a different thing entirely.
-- =====================================================================


/* The member on this request, if any. golf_current_member() already does
   exactly this, but the Arena is not golf and a shared helper should not be
   named after the first screen that needed it. */
create or replace function public.dfl_current_member()
returns bigint
language sql
stable
as $$
  select nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint;
$$;

grant execute on function public.dfl_current_member() to anon, authenticated;


/**
 * Pick your own racer in one event.
 *
 * Returns the number of rows changed: 1 when it worked, 0 when the caller
 * is not in that race. Zero is not an error - it is the honest answer, and
 * the app shows it rather than claiming a save that never happened. Row
 * level security has taught this codebase that lesson twice already.
 */
create or replace function public.arena_pick_racer(p_event_id bigint, p_sprite text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member bigint := public.dfl_current_member();
  v_sprite text;
  v_rows   integer;
begin
  if v_member is null then
    return 0;                               -- nobody is holding this phone
  end if;

  /* A sprite key is a short slug chosen from a list the app owns. The list
     lives in JavaScript and is display data, so this does not try to
     validate membership of it - an unknown key simply falls back to the
     default drawing. What it does refuse is anything that is not a slug,
     so the column cannot become a dumping ground. Empty means "back to the
     default", which is a legitimate choice. */
  v_sprite := nullif(btrim(coalesce(p_sprite, '')), '');
  if v_sprite is not null and v_sprite !~ '^[a-z0-9_-]{1,32}$' then
    raise exception 'Not a sprite key';
  end if;

  update public.arena_participants
     set sprite = v_sprite
   where event_id = p_event_id
     and member_id = v_member;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

grant execute on function public.arena_pick_racer(bigint, text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- What was deliberately NOT granted
--
-- No policy was added to arena_participants, arena_events or arena_results.
-- A member still cannot add themselves to a race, remove anybody, change a
-- colour or a lane number, upload an image, or touch a result. The Arena is
-- still the commissioner's to run; only the choice of what you look like
-- while losing is now yours.
-- ---------------------------------------------------------------------
