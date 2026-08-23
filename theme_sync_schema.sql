-- =====================================================================
-- DFL HQ - carry the palette choice between a member's devices.
-- Supabase SQL Editor -> Run once. Additive and safe to re-run.
-- ---------------------------------------------------------------------
-- WHY THE THEME DID NOT FOLLOW ANYBODY AROUND. js/theme.js has always
-- kept the choice in localStorage under "dfl.mode", which is per browser
-- and per device by definition. Picking a club on a desktop could not
-- reach a phone because the phone was never told.
--
-- The mode now rides on the member row, so it follows the identity rather
-- than the browser. localStorage stays as the fast local copy - it is read
-- synchronously at boot, before anything is known about who is using the
-- app, and the app must paint immediately rather than wait for a query.
--
-- WHAT THE COLUMN HOLDS. The same strings the picker already stores:
-- "system", "dark", "light", "fairway", "medicine", or "team:KC" for one of the 32
-- clubs. Validated with a regex rather than an enum so adding a palette
-- stays a one-line change in theme.js, which is how that file is built.
--
-- THE TRUST LEVEL IS UNCHANGED AND STATED PLAINLY: dfl_current_member()
-- reads the x-member-id header, which comes from localStorage and is a
-- claim rather than proof. Somebody who edited it could change another
-- member's colour scheme. That is the same trust level as the golf display
-- name, the bio and the accent colour, and it is why this is a cosmetic
-- preference and nothing else.
-- =====================================================================

alter table public.members
  add column if not exists theme_mode text;

alter table public.members drop constraint if exists members_theme_mode_shape;
alter table public.members
  add constraint members_theme_mode_shape
  check (
    theme_mode is null
    or theme_mode in ('system', 'dark', 'light', 'fairway', 'medicine')
    or theme_mode ~ '^team:[A-Z]{2,3}$'
  );

-- ---------------------------------------------------------------------
-- One member-scoped write, the same shape as the rest of the app's RPCs.
-- Returns the number of rows changed so the client can tell a refusal from
-- a success - PostgREST reports both as a cheerful 204 otherwise.
-- ---------------------------------------------------------------------
create or replace function public.dfl_save_theme_mode(new_mode text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  me bigint := public.dfl_current_member();
  clean text := nullif(trim(coalesce(new_mode, '')), '');
  n int;
begin
  if me is null then
    raise exception 'No member on this request';
  end if;

  -- A value this database does not recognise is stored as "no preference"
  -- rather than rejected: a newer client that learns a palette this schema
  -- has never heard of must not have its save fail outright.
  if clean is not null
     and clean not in ('system', 'dark', 'light', 'fairway', 'medicine')
     and clean !~ '^team:[A-Z]{2,3}$' then
    clean := null;
  end if;

  update public.members set theme_mode = clean where id = me;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.dfl_save_theme_mode(text) from public;
grant execute on function public.dfl_save_theme_mode(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Check:
--   select display_name, theme_mode from public.members order by display_name;
--   -- expected: nulls until each member picks a palette on any device
-- ---------------------------------------------------------------------
