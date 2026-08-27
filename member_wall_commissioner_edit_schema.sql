-- =====================================================================
-- member_wall_posts - a commissioner can fix a post, not only delete it.
-- ---------------------------------------------------------------------
-- RUN THIS BEFORE v1.200.0 if commissioners should be able to edit. The
-- member who posted something could always edit it and that does not
-- change; until this runs, a commissioner pressing Edit on somebody
-- else's post is refused by the policy and told so.
--
-- WHY. "wall delete own or admin" already let a commissioner remove a
-- post for moderation, but "wall update own" did not let them fix one -
-- so the only moderation move available was the destructive one. A
-- caption to correct or a picture cropped badly meant deleting somebody
-- else's post.
--
-- OWNERSHIP CANNOT MOVE. The old policy kept member_id honest with
-- WITH CHECK (member_id = dfl_current_member()), which cannot survive a
-- commissioner editing a post that is not theirs - and RLS has no way to
-- compare a new row against the old one. So the rule moves into a trigger,
-- where OLD exists: member_id is frozen on update for everybody, including
-- the master admin. Nothing in the app ever sends it.
-- =====================================================================

alter table public.member_wall_posts enable row level security;

-- The rule the old WITH CHECK was really expressing, in the one place that
-- can actually express it.
create or replace function public.member_wall_keep_owner()
returns trigger
language plpgsql
as $$
begin
  if new.member_id is distinct from old.member_id then
    raise exception 'A Wall post cannot change hands';
  end if;
  return new;
end;
$$;

drop trigger if exists member_wall_keep_owner on public.member_wall_posts;
create trigger member_wall_keep_owner
  before update on public.member_wall_posts
  for each row execute function public.member_wall_keep_owner();

-- Editing now matches deleting: the member who posted it, or any
-- authenticated commissioner, or the legacy master Admin.
drop policy if exists "wall update own" on public.member_wall_posts;
drop policy if exists "wall update own or admin" on public.member_wall_posts;

create policy "wall update own or admin" on public.member_wall_posts
for update
using (
  member_id = public.dfl_current_member()
  or public.is_admin()
  or public.is_commissioner()
)
with check (
  member_id = public.dfl_current_member()
  or public.is_admin()
  or public.is_commissioner()
);

select polname, polcmd
from pg_policy
where polrelid = 'public.member_wall_posts'::regclass
order by polname;
