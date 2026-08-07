-- =====================================================================
-- DFL Golf schema
-- =====================================================================
-- Safe to re-run. Creates/updates the golf tables and permissions.

create table if not exists public.golf_outings (
  id bigint generated always as identity primary key,
  name text not null,
  course text not null default '',
  event_date date,
  holes int not null default 18,
  status text not null default 'setup',
  notes text not null default '',
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create table if not exists public.golf_teams (
  id bigint generated always as identity primary key,
  outing_id bigint not null references public.golf_outings(id) on delete cascade,
  name text not null default '',
  color text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.golf_participants (
  id bigint generated always as identity primary key,
  outing_id bigint not null references public.golf_outings(id) on delete cascade,
  member_id bigint not null references public.members(id) on delete cascade,
  team_id bigint references public.golf_teams(id) on delete set null,
  locked boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (outing_id, member_id)
);

create table if not exists public.golf_holes (
  id bigint generated always as identity primary key,
  outing_id bigint not null references public.golf_outings(id) on delete cascade,
  hole int not null,
  par int not null default 4,
  unique (outing_id, hole)
);

create table if not exists public.golf_scores (
  id bigint generated always as identity primary key,
  outing_id bigint not null references public.golf_outings(id) on delete cascade,
  member_id bigint not null references public.members(id) on delete cascade,
  hole int not null,
  strokes int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outing_id, member_id, hole)
);

create table if not exists public.golf_rankings (
  member_id bigint primary key references public.members(id) on delete cascade,
  rating int not null default 75,
  handicap int,
  driving int,
  putting int,
  short_game int,
  consistency int,
  choking int,
  wins int not null default 0,
  best_score int,
  last_outing_id bigint references public.golf_outings(id) on delete set null,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.golf_ranking_history (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  rating_before int,
  rating_after int,
  outing_id bigint references public.golf_outings(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_golf_part_outing on public.golf_participants(outing_id);
create index if not exists idx_golf_part_member on public.golf_participants(member_id);
create index if not exists idx_golf_teams_outing on public.golf_teams(outing_id);
create index if not exists idx_golf_holes_outing on public.golf_holes(outing_id);
create index if not exists idx_golf_scores_outing on public.golf_scores(outing_id);
create index if not exists idx_golf_scores_lookup on public.golf_scores(outing_id, hole);
create index if not exists idx_golf_rankhist_member on public.golf_ranking_history(member_id);

-- Everyone may read golf data. Admin may manage everything.
-- A selected team member may write ONLY their own golf_scores rows.
-- The x-member-id header is supplied by the app from the selected member.
-- Note: this is an app-level identity model, not password authentication.

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

  drop policy if exists "team member insert own score" on public.golf_scores;
  create policy "team member insert own score" on public.golf_scores for insert
    with check (
      member_id = nullif(current_setting('request.headers', true)::json->>'x-member-id', '')::bigint
      and exists (
        select 1 from public.golf_participants p
        where p.outing_id = golf_scores.outing_id
          and p.member_id = golf_scores.member_id
          and p.team_id is not null
      )
    );

  drop policy if exists "team member update own score" on public.golf_scores;
  create policy "team member update own score" on public.golf_scores for update
    using (
      member_id = nullif(current_setting('request.headers', true)::json->>'x-member-id', '')::bigint
      and exists (
        select 1 from public.golf_participants p
        where p.outing_id = golf_scores.outing_id
          and p.member_id = golf_scores.member_id
          and p.team_id is not null
      )
    )
    with check (
      member_id = nullif(current_setting('request.headers', true)::json->>'x-member-id', '')::bigint
      and exists (
        select 1 from public.golf_participants p
        where p.outing_id = golf_scores.outing_id
          and p.member_id = golf_scores.member_id
          and p.team_id is not null
      )
    );

  drop policy if exists "team member delete own score" on public.golf_scores;
  create policy "team member delete own score" on public.golf_scores for delete
    using (
      member_id = nullif(current_setting('request.headers', true)::json->>'x-member-id', '')::bigint
      and exists (
        select 1 from public.golf_participants p
        where p.outing_id = golf_scores.outing_id
          and p.member_id = golf_scores.member_id
          and p.team_id is not null
      )
    );
end;
$$;

-- Create standard par-4 holes automatically for existing outings that do not
-- have a golf_holes row yet. Admins can edit these later in Supabase.
insert into public.golf_holes (outing_id, hole, par)
select o.id, h.hole, 4
from public.golf_outings o
cross join lateral generate_series(1, greatest(1, least(o.holes, 18))) as h(hole)
where not exists (
  select 1 from public.golf_holes gh where gh.outing_id = o.id and gh.hole = h.hole
);

-- Realtime scoring.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin execute 'alter publication supabase_realtime add table public.golf_scores';
    exception when duplicate_object then null; end;
  end if;
end;
$$;
