-- =====================================================================
-- DFL Golf schema / permissions
-- =====================================================================
-- Safe to re-run. Run this in Supabase SQL Editor after updating DFL HQ.
--
-- Golf scores are ONE score per TEAM per HOLE. golf_scores.member_id is
-- retained nullable for legacy player-score rows, but all new team cards
-- use team_id and one row per outing/team/hole.

create table if not exists public.golf_outings (
  id bigint generated always as identity primary key,
  name text not null, course text not null default '', event_date date,
  holes int not null default 18, status text not null default 'setup',
  notes text not null default '', created_at timestamptz not null default now(), finalized_at timestamptz
);
create table if not exists public.golf_teams (
  id bigint generated always as identity primary key,
  outing_id bigint not null references public.golf_outings(id) on delete cascade,
  name text not null default '', color text, sort_order int not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.golf_participants (
  id bigint generated always as identity primary key,
  outing_id bigint not null references public.golf_outings(id) on delete cascade,
  member_id bigint not null references public.members(id) on delete cascade,
  team_id bigint references public.golf_teams(id) on delete set null,
  locked boolean not null default false, sort_order int not null default 0, created_at timestamptz not null default now(),
  unique (outing_id, member_id)
);
create table if not exists public.golf_holes (
  id bigint generated always as identity primary key,
  outing_id bigint not null references public.golf_outings(id) on delete cascade,
  hole int not null, par int not null default 4, unique (outing_id, hole)
);
create table if not exists public.golf_scores (
  id bigint generated always as identity primary key,
  outing_id bigint not null references public.golf_outings(id) on delete cascade,
  member_id bigint references public.members(id) on delete cascade,
  team_id bigint references public.golf_teams(id) on delete cascade,
  hole int not null, strokes int not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (outing_id, member_id, hole)
);

-- Upgrade existing installations from player-only scores to team scores.
alter table public.golf_scores add column if not exists team_id bigint references public.golf_teams(id) on delete cascade;
alter table public.golf_scores alter column member_id drop not null;
create unique index if not exists uq_golf_scores_team_hole on public.golf_scores(outing_id, team_id, hole) where team_id is not null;
create index if not exists idx_golf_scores_team on public.golf_scores(outing_id, team_id, hole);

create table if not exists public.golf_rankings (
  member_id bigint primary key references public.members(id) on delete cascade,
  rating int not null default 75, handicap int, driving int, putting int, short_game int,
  consistency int, choking int, wins int not null default 0, best_score int,
  last_outing_id bigint references public.golf_outings(id) on delete set null,
  notes text not null default '', updated_at timestamptz not null default now()
);
create table if not exists public.golf_ranking_history (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  rating_before int, rating_after int,
  outing_id bigint references public.golf_outings(id) on delete set null,
  note text not null default '', created_at timestamptz not null default now()
);

create index if not exists idx_golf_part_outing on public.golf_participants(outing_id);
create index if not exists idx_golf_part_member on public.golf_participants(member_id);
create index if not exists idx_golf_teams_outing on public.golf_teams(outing_id);
create index if not exists idx_golf_holes_outing on public.golf_holes(outing_id);
create index if not exists idx_golf_scores_outing on public.golf_scores(outing_id);
create index if not exists idx_golf_scores_lookup on public.golf_scores(outing_id, hole);

-- Everyone can read golf data. Admin can manage all golf data.
-- A non-admin can write ONLY the single scorecard belonging to a team they
-- are a member of. Other teams remain read-only.
do $$
begin
  alter table public.golf_outings enable row level security;
  alter table public.golf_teams enable row level security;
  alter table public.golf_participants enable row level security;
  alter table public.golf_holes enable row level security;
  alter table public.golf_scores enable row level security;
  alter table public.golf_rankings enable row level security;
  alter table public.golf_ranking_history enable row level security;

  drop policy if exists "public read" on public.golf_outings;
  create policy "public read" on public.golf_outings for select using (true);
  drop policy if exists "public read" on public.golf_teams;
  create policy "public read" on public.golf_teams for select using (true);
  drop policy if exists "public read" on public.golf_participants;
  create policy "public read" on public.golf_participants for select using (true);
  drop policy if exists "public read" on public.golf_holes;
  create policy "public read" on public.golf_holes for select using (true);
  drop policy if exists "public read" on public.golf_scores;
  create policy "public read" on public.golf_scores for select using (true);
  drop policy if exists "public read" on public.golf_rankings;
  create policy "public read" on public.golf_rankings for select using (true);
  drop policy if exists "public read" on public.golf_ranking_history;
  create policy "public read" on public.golf_ranking_history for select using (true);

  drop policy if exists "admin write" on public.golf_outings;
  create policy "admin write" on public.golf_outings for all using (public.is_admin()) with check (public.is_admin());
  drop policy if exists "admin write" on public.golf_teams;
  create policy "admin write" on public.golf_teams for all using (public.is_admin()) with check (public.is_admin());
  drop policy if exists "admin write" on public.golf_participants;
  create policy "admin write" on public.golf_participants for all using (public.is_admin()) with check (public.is_admin());
  drop policy if exists "admin write" on public.golf_holes;
  create policy "admin write" on public.golf_holes for all using (public.is_admin()) with check (public.is_admin());
  drop policy if exists "admin write" on public.golf_rankings;
  create policy "admin write" on public.golf_rankings for all using (public.is_admin()) with check (public.is_admin());
  drop policy if exists "admin write" on public.golf_ranking_history;
  create policy "admin write" on public.golf_ranking_history for all using (public.is_admin()) with check (public.is_admin());

  drop policy if exists "admin write" on public.golf_scores;
  create policy "admin write" on public.golf_scores for all using (public.is_admin()) with check (public.is_admin());

  drop policy if exists "team member write scores" on public.golf_scores;
  create policy "team member write scores" on public.golf_scores for all
    using (
      golf_scores.team_id is not null
      and exists (
        select 1 from public.golf_participants editor
        where editor.outing_id = golf_scores.outing_id
          and editor.team_id = golf_scores.team_id
          and editor.member_id = nullif(current_setting('request.headers', true)::json->>'x-member-id', '')::bigint
      )
    )
    with check (
      golf_scores.team_id is not null
      and exists (
        select 1 from public.golf_participants editor
        where editor.outing_id = golf_scores.outing_id
          and editor.team_id = golf_scores.team_id
          and editor.member_id = nullif(current_setting('request.headers', true)::json->>'x-member-id', '')::bigint
      )
    );
end;
$$;

-- Default every hole to par 4 when an outing has no hole rows yet.
insert into public.golf_holes (outing_id, hole, par)
select o.id, h.hole, 4
from public.golf_outings o
cross join lateral generate_series(1, greatest(1, least(o.holes, 18))) h(hole)
where not exists (select 1 from public.golf_holes gh where gh.outing_id = o.id and gh.hole = h.hole);

-- Realtime scoring.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin execute 'alter publication supabase_realtime add table public.golf_scores';
    exception when duplicate_object then null; end;
  end if;
end;
$$;
