-- DFL HQ Wall edit/delete permissions. Safe to re-run.
-- Run this once in Supabase SQL Editor after deploying the matching app release.

alter table public.member_wall_posts enable row level security;

drop policy if exists "wall update own" on public.member_wall_posts;
drop policy if exists "wall delete own or admin" on public.member_wall_posts;

-- Members may edit only their own Wall posts. Keeping member_id unchanged is
-- enforced by WITH CHECK, so an edit cannot transfer ownership to somebody else.
create policy "wall update own" on public.member_wall_posts
for update
using (member_id = public.dfl_current_member())
with check (member_id = public.dfl_current_member());

-- Members may delete their own posts. Any authenticated commissioner or the
-- legacy master Admin may remove a post for moderation, regardless of scope.
create policy "wall delete own or admin" on public.member_wall_posts
for delete
using (
  member_id = public.dfl_current_member()
  or public.is_admin()
  or public.is_commissioner()
);
