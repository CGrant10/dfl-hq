-- =====================================================================
-- DFL HQ - My bag (club distances)
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- A place to write down how far you hit each club. One row per club per
-- member, and PRIVATE: you see your own bag and nobody else's.
--
-- Everyone gets one rather than it being hardcoded to a single member -
-- it is the same amount of code either way, and it means nobody has to
-- edit SQL when the next person wants theirs.
-- =====================================================================

create table if not exists public.golf_bag (
  id         bigint generated always as identity primary key,
  member_id  bigint not null references public.members(id) on delete cascade,
  club       text   not null,
  yards      int,                    -- null = not measured yet
  notes      text   not null default '',
  sort_order int    not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_golf_bag_member
  on public.golf_bag(member_id, sort_order);


-- ---------------------------------------------------------------------
-- Row level security: your bag is yours.
--
-- No "public read" policy here, unlike the rest of golf. Everything else
-- in this app is league business; this is one person's notes about their
-- own 7 iron, and it needs no audience.
--
-- The member id comes from the same x-member-id header the golf scorecard
-- uses, so a plain member can write their own rows without the admin
-- password. The admin policy exists so the commissioner can clean up
-- after a member who has left.
-- ---------------------------------------------------------------------
alter table public.golf_bag enable row level security;

drop policy if exists "own bag" on public.golf_bag;
create policy "own bag"
on public.golf_bag
for all
using (
  member_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint
)
with check (
  member_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint
);

drop policy if exists "admin bag" on public.golf_bag;
create policy "admin bag"
on public.golf_bag
for all
using (public.is_admin())
with check (public.is_admin());
