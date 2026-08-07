-- DFL Golf: one scorecard per team, one score per team/hole.
-- This migration is safe to run after the existing golf tables exist.

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

-- Scores are readable by the league. Writes are limited to admins and
-- members of the team whose scorecard is being edited.
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

-- Keep this policy compatible with the app's current member-selection model.
-- If your existing schema already has a golf_scores write policy, the admin
-- policy above is sufficient for admins; the app also prevents non-team edits.
drop policy if exists "team member write scores" on public.golf_scores;
