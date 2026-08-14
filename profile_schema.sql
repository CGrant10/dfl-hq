-- =====================================================================
-- The DFL page: a bio, a photo and a pet.
-- ---------------------------------------------------------------------
-- Run this once in the Supabase SQL editor. Additive and safe to re-run.
--
-- WHY AN RPC AND NOT A POLICY. members is not writable by the anon key -
-- verified: an anonymous update touches zero rows. The app already has
-- one member-scoped write, dfl_set_golf_name(), which is a security
-- definer function that works out WHO is calling from the x-member-id
-- header the client sends. This reuses that exact pattern rather than
-- opening members up to anonymous updates.
--
-- THE LIMITATION, STATED PLAINLY: x-member-id comes from localStorage,
-- so it is a claim rather than proof. Somebody who edits it could change
-- another member's bio, photo or pet. That is the same trust level the
-- golf display name has had since it shipped, and it is the reason this
-- pass does NOT touch anything consequential - no scores, no results, no
-- admin rights. Real per-member security needs Supabase Auth and
-- auth.uid(), which is deliberately out of scope here.
-- =====================================================================

-- A short piece of self-description. Length is capped in the database as
-- well as the textarea, because a client can send whatever it likes.
alter table public.members add column if not exists bio text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'members_bio_len') then
    alter table public.members
      add constraint members_bio_len check (bio is null or char_length(bio) <= 500);
  end if;
end $$;

/*
  THE DFL PET - cosmetic identity, stored as one small JSON blob.

    { "name": "Ripper", "species": "emberrat", "color": "#C8102E" }

  A blob rather than three columns because it is a handful of purely
  cosmetic properties that will grow an accessory or an expression next,
  and a relational table for that would be ceremony. It is also exactly
  how the rest of this app stores small config (app_settings).

  IT HAS NO EFFECT ON ANY RACE. The Arena simulation reads none of this;
  it only ever reaches the renderer.
*/
alter table public.members add column if not exists pet jsonb;

/*
  ONE WRITE, SCOPED TO THE CALLER.

  Every argument is optional: null means "leave it alone", so the photo,
  the bio and the pet can each be saved on their own without the client
  having to send back the other two and risk clobbering them.

  It returns the number of rows changed so the client can tell a refusal
  from a success - PostgREST reports both as a cheerful 204 otherwise,
  which is how "saved!" ends up on screen next to an unchanged value.
*/
create or replace function public.dfl_update_profile(
  p_bio text default null,
  p_image text default null,
  p_pet jsonb default null,
  p_clear_image boolean default false
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  me bigint := public.dfl_current_member();
  n int;
begin
  if me is null then
    raise exception 'No member on this request';
  end if;

  update public.members
     set bio           = coalesce(p_bio, bio),
         pet           = coalesce(p_pet, pet),
         profile_image = case when p_clear_image then null
                              else coalesce(p_image, profile_image) end
   where id = me;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.dfl_update_profile(text, text, jsonb, boolean) from public;
grant execute on function public.dfl_update_profile(text, text, jsonb, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
--   set local role anon;
--   update public.members set bio = 'nope';   -- expected: 0 rows (RLS)
--   reset role;
-- ---------------------------------------------------------------------
