-- =====================================================================
-- DFL HQ - DFL Golf
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive, safe to re-run, touches no existing table.
--
-- Golf is its OWN DFL event. It has nothing to do with fantasy draft
-- order: the golf power rankings never feed the draft, and an Arena race
-- never sets a golf team. The two systems are deliberately unrelated.
--
-- Everybody references public.members. No second roster.
--
-- The whole schema goes in now, including the scoring, ranking and ledger
-- tables that the app does not read yet, so the later work is app code
-- only and never another migration.
--
-- Anything that can be derived is NOT stored: a player's total, their score
-- to par, the team total and the leaderboard order are all worked out from
-- golf_scores and golf_holes when the page draws. Stored totals drift.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. An outing
-- ---------------------------------------------------------------------
create table if not exists public.golf_outings (
  id          bigint generated always as identity primary key,
  name        text not null,
  course      text not null default '',
  event_date  date,
  holes       int not null default 18,
  status      text not null default 'setup',   -- setup | active | final
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  finalized_at timestamptz
);


-- ---------------------------------------------------------------------
-- 2. Teams within an outing
-- ---------------------------------------------------------------------
create table if not exists public.golf_teams (
  id          bigint generated always as identity primary key,
  outing_id   bigint not null references public.golf_outings(id) on delete cascade,
  name        text not null default '',
  color       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 3. Who is playing, and for whom
--    `locked` is respected by the team generator: a locked player keeps
--    their team when teams are regenerated.
-- ---------------------------------------------------------------------
create table if not exists public.golf_participants (
  id          bigint generated always as identity primary key,
  outing_id   bigint not null references public.golf_outings(id) on delete cascade,
  member_id   bigint not null references public.members(id) on delete cascade,
  team_id     bigint references public.golf_teams(id) on delete set null,
  locked      boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (outing_id, member_id)
);


-- ---------------------------------------------------------------------
-- 4. The card: par per hole, then a stroke per player per hole
-- ---------------------------------------------------------------------
create table if not exists public.golf_holes (
  id          bigint generated always as identity primary key,
  outing_id   bigint not null references public.golf_outings(id) on delete cascade,
  hole        int not null,
  par         int not null default 4,
  unique (outing_id, hole)
);

create table if not exists public.golf_scores (
  id          bigint generated always as identity primary key,
  outing_id   bigint not null references public.golf_outings(id) on delete cascade,
  member_id   bigint not null references public.members(id) on delete cascade,
  hole        int not null,
  strokes     int not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- one score per player per hole, so entering it twice corrects it
  unique (outing_id, member_id, hole)
);


-- ---------------------------------------------------------------------
-- 5. Power rankings
--    One row per member. `rating` is the only number that matters; the
--    rest are for entertainment and are edited by hand.
--    A member with no row is treated as DEFAULT_RATING by the app rather
--    than being excluded, so a new member can be balanced immediately.
-- ---------------------------------------------------------------------
create table if not exists public.golf_rankings (
  member_id     bigint primary key references public.members(id) on delete cascade,
  rating        int not null default 75,
  handicap      int,
  driving       int,
  putting       int,
  short_game    int,
  consistency   int,
  choking       int,
  wins          int not null default 0,
  best_score    int,
  last_outing_id bigint references public.golf_outings(id) on delete set null,
  notes         text not null default '',
  updated_at    timestamptz not null default now()
);

-- Every rating change, so a ranking has a story and can be argued about.
create table if not exists public.golf_ranking_history (
  id            bigint generated always as identity primary key,
  member_id     bigint not null references public.members(id) on delete cascade,
  rating_before int,
  rating_after  int,
  outing_id     bigint references public.golf_outings(id) on delete set null,
  note          text not null default '',
  created_at    timestamptz not null default now()
);


create index if not exists idx_golf_part_outing  on public.golf_participants(outing_id);
create index if not exists idx_golf_part_member  on public.golf_participants(member_id);
create index if not exists idx_golf_teams_outing on public.golf_teams(outing_id);
create index if not exists idx_golf_holes_outing on public.golf_holes(outing_id);
create index if not exists idx_golf_scores_outing on public.golf_scores(outing_id);
create index if not exists idx_golf_scores_lookup on public.golf_scores(outing_id, hole);
create index if not exists idx_golf_rankhist_member on public.golf_ranking_history(member_id);


-- =====================================================================
-- 6. ROW LEVEL SECURITY
--    Everyone reads - watching the scores come in live is the point.
--    Only the commissioner writes. Same is_admin() as the rest of the app.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'golf_outings','golf_teams','golf_participants','golf_holes',
    'golf_scores','golf_rankings','golf_ranking_history'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);

    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format(
      'create policy "admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      t);
  end loop;
end;
$$;


-- ---------------------------------------------------------------------
-- 7. Live scoring
--    The leaderboard subscribes to golf_scores so the league can watch
--    from the clubhouse. Optional: the app falls back to polling.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.golf_scores';
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
