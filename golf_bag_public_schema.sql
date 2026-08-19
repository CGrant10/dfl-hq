-- DFL HQ - opt-in public golf bags
-- Supabase -> SQL Editor -> New query -> paste -> Run. Safe to re-run.

create table if not exists public.golf_bag_visibility (
  member_id bigint primary key references public.members(id) on delete cascade,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.golf_bag_visibility enable row level security;

drop policy if exists "read public bag visibility" on public.golf_bag_visibility;
create policy "read public bag visibility"
on public.golf_bag_visibility for select
using (
  is_public = true
  or member_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint
  or public.is_admin()
);

drop policy if exists "own bag visibility" on public.golf_bag_visibility;
create policy "own bag visibility"
on public.golf_bag_visibility for all
using (
  member_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint
)
with check (
  member_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint
);

drop policy if exists "admin bag visibility" on public.golf_bag_visibility;
create policy "admin bag visibility"
on public.golf_bag_visibility for all
using (public.is_admin())
with check (public.is_admin());

-- Replace the old select behavior with own-or-opted-in reads. The existing
-- ALL policy still controls the owner's writes; this policy only adds SELECT.
drop policy if exists "public opted-in bags" on public.golf_bag;
create policy "public opted-in bags"
on public.golf_bag for select
using (
  exists (
    select 1 from public.golf_bag_visibility v
    where v.member_id = golf_bag.member_id and v.is_public = true
  )
);
