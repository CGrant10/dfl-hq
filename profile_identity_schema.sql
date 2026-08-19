-- DFL HQ — member-owned profile identity preferences
-- Supabase SQL Editor -> Run once. Safe to re-run.

alter table public.members
  add column if not exists profile_title text,
  add column if not exists featured_achievement text;

-- favorite_team already exists on members; keep it as the canonical NFL pick.

create or replace function public.profile_identity_save(
  target_member_id bigint,
  new_title text,
  new_achievement text,
  new_favorite_team text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_member_id is null or not exists(select 1 from public.members where id=target_member_id and active=true) then
    raise exception 'Member not found';
  end if;

  update public.members
     set profile_title = nullif(left(trim(coalesce(new_title,'')),80),''),
         featured_achievement = nullif(left(trim(coalesce(new_achievement,'')),120),''),
         favorite_team = nullif(left(trim(coalesce(new_favorite_team,'')),24),'')
   where id=target_member_id;
end;
$$;

grant execute on function public.profile_identity_save(bigint,text,text,text) to anon, authenticated;
