-- =====================================================================
-- DFL Golf schema / permissions
-- =====================================================================
-- Safe to re-run. Golf scores are ONE score per TEAM per HOLE.
-- IMPORTANT: the unique team/hole index is required by the app's upsert.

create table if not exists public.golf_scores (
  id bigint generated always as identity primary key,
  outing_id bigint not null references public.golf_outings(id) on delete cascade,
  member_id bigint references public.members(id) on delete cascade,
  team_id bigint references public.golf_teams(id) on delete cascade,
  hole int not null,
  strokes int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outing_id, member_id, hole)
);

alter table public.golf_scores add column if not exists team_id bigint references public.golf_teams(id) on delete cascade;
alter table public.golf_scores alter column member_id drop not null;

-- Remove duplicate team/hole rows before creating the constraint/index.
delete from public.golf_scores a
using public.golf_scores b
where a.team_id is not null
  and b.team_id = a.team_id
  and b.outing_id = a.outing_id
  and b.hole = a.hole
  and a.id < b.id;

-- This is a PARTIAL unique index, so team scores are unique without
-- conflicting with legacy player-score rows that have no team_id.
drop index if exists public.uq_golf_scores_team_hole;
create unique index public.uq_golf_scores_team_hole
  on public.golf_scores (outing_id, team_id, hole)
  where team_id is not null;

create index if not exists idx_golf_scores_team on public.golf_scores(outing_id, team_id, hole);
create index if not exists idx_golf_scores_outing on public.golf_scores(outing_id);

-- RLS: everyone can read; admins can write all; team members can write
-- only the scorecard for their own team.
alter table public.golf_scores enable row level security;
drop policy if exists "public read" on public.golf_scores;
create policy "public read" on public.golf_scores for select using (true);
drop policy if exists "admin write" on public.golf_scores;
create policy "admin write" on public.golf_scores for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "team member write scores" on public.golf_scores;
create policy "team member write scores" on public.golf_scores for all
using (
  team_id is not null and exists (
    select 1 from public.golf_participants p
    where p.outing_id = golf_scores.outing_id
      and p.team_id = golf_scores.team_id
      and p.member_id = nullif(current_setting('request.headers', true)::json->>'x-member-id', '')::bigint
  )
)
with check (
  team_id is not null and exists (
    select 1 from public.golf_participants p
    where p.outing_id = golf_scores.outing_id
      and p.team_id = golf_scores.team_id
      and p.member_id = nullif(current_setting('request.headers', true)::json->>'x-member-id', '')::bigint
  )
);
