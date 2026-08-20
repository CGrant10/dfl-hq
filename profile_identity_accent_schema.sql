-- =====================================================================
-- DFL HQ - the member's own accent colour.
-- Supabase SQL Editor -> Run once. Additive and safe to re-run.
-- ---------------------------------------------------------------------
-- profile_identity_schema.sql gave every member a title, a featured
-- achievement and a club. This adds the colour that carries them: it
-- tints that member's own byline on the Wall and their pills on their
-- profile, and nothing else. It is never applied to the app's theme
-- tokens, so one member's taste cannot repaint the league's chrome.
--
-- WHY THE FORMAT IS CHECKED IN THE DATABASE. The picker offers a fixed
-- palette, but the column is written through an RPC that any client can
-- call with any string. The colour is interpolated into a style attribute
-- on every one of that member's posts, so an unvalidated value is a
-- direct CSS-injection surface. The check constraint makes "#rrggbb" the
-- only thing the column can physically hold.
--
-- THIS REPLACES THE FOUR-ARGUMENT profile_identity_save. The old
-- signature is dropped explicitly at the end: leaving it in place would
-- keep an overload that silently ignores the accent, and PostgREST would
-- be free to pick either one.
-- =====================================================================

alter table public.members
  add column if not exists accent_color text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_accent_hex') then
    alter table public.members
      add constraint members_accent_hex
      check (accent_color is null or accent_color ~* '^#[0-9a-f]{6}$');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- One member-scoped write, same shape as the rest of the app's RPCs:
-- security definer, and it refuses any target that is not the caller.
-- ---------------------------------------------------------------------
create or replace function public.profile_identity_save(
  target_member_id bigint,
  new_title text,
  new_achievement text,
  new_favorite_team text,
  new_accent_color text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me bigint := public.dfl_current_member();
  accent text := nullif(trim(coalesce(new_accent_color, '')), '');
begin
  if me is null then
    raise exception 'No member on this request';
  end if;

  if target_member_id is null or target_member_id <> me then
    raise exception 'You can only edit your own profile identity';
  end if;

  if not exists (select 1 from public.members where id = me and active = true) then
    raise exception 'Member not found';
  end if;

  -- Anything that is not a six-digit hex colour is stored as no colour at
  -- all rather than rejected, so a stale client cannot make the whole save
  -- fail on a field the member did not touch.
  if accent is not null and accent !~* '^#[0-9a-f]{6}$' then
    accent := null;
  end if;

  update public.members
     set profile_title        = nullif(left(trim(coalesce(new_title, '')), 80), ''),
         featured_achievement = nullif(left(trim(coalesce(new_achievement, '')), 120), ''),
         favorite_team        = nullif(left(trim(coalesce(new_favorite_team, '')), 24), ''),
         -- null means "leave the colour alone", so a client that does not
         -- send one cannot clear a colour the member already chose.
         accent_color         = coalesce(accent, accent_color)
   where id = me;
end;
$$;

revoke all on function public.profile_identity_save(bigint, text, text, text, text) from public;
grant execute on function public.profile_identity_save(bigint, text, text, text, text) to anon, authenticated;

-- The superseded four-argument overload. Dropped so PostgREST cannot
-- resolve a save to the version that has never heard of accent_color.
drop function if exists public.profile_identity_save(bigint, text, text, text);

-- ---------------------------------------------------------------------
-- Check:
--   select accent_color from public.members order by display_name;
--   -- expected: nulls until each member picks one
-- ---------------------------------------------------------------------
