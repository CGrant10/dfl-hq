-- DFL Golf: one scorecard per team, one score per team/hole.
-- Run this in Supabase SQL Editor after the existing golf tables exist.

alter table public.golf_scores
  add column if not exists team_id bigint references public.golf_teams(id) on delete cascade;

alter table public.golf_scores
  alter column member_id drop not null;

-- Remove duplicate team/hole rows before adding the required unique index.
delete from public.golf_scores a
using public.golf_scores b
where a.team_id is not null
  and b.team_id = a.team_id
  and b.outing_id = a.outing_id
  and b.hole = a.hole
  and a.id < b.id;

-- IMPORTANT: PostgreSQL does not accept a schema-qualified index name here.
drop index if exists public.uq_golf_scores_team_hole;
create unique index uq_golf_scores_team_hole
  on public.golf_scores (outing_id, team_id, hole)
  where team_id is not null;

create index if not exists idx_golf_scores_team
  on public.golf_scores (outing_id, team_id, hole);

create index if not exists idx_golf_scores_outing
  on public.golf_scores (outing_id);

alter table public.golf_scores enable row level security;

drop policy if exists "public read" on public.golf_scores;
create policy "public read"
on public.golf_scores
for select
using (true);

drop policy if exists "admin write" on public.golf_scores;
create policy "admin write"
on public.golf_scores
for all
using (public.is_admin())
with check (public.is_admin());

-- The app sends the selected member id as x-member-id. This allows a real
-- team member to write only that team's scorecard. Other teams remain read-only.
drop policy if exists "team member write scores" on public.golf_scores;
create policy "team member write scores"
on public.golf_scores
for all
using (
  team_id is not null
  and exists (
    select 1
    from public.golf_participants p
    where p.outing_id = golf_scores.outing_id
      and p.team_id = golf_scores.team_id
      and p.member_id = nullif(
        current_setting('request.headers', true)::jsonb ->> 'x-member-id',
        ''
      )::bigint
  )
)
with check (
  team_id is not null
  and exists (
    select 1
    from public.golf_participants p
    where p.outing_id = golf_scores.outing_id
      and p.team_id = golf_scores.team_id
      and p.member_id = nullif(
        current_setting('request.headers', true)::jsonb ->> 'x-member-id',
        ''
      )::bigint
  )
);
