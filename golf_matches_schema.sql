-- =====================================================================
-- DFL Golf - the tournament: three rounds, 2v2s, singles, guests
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run. Safe to re-run, and
-- safe to run over an earlier version of this same file.
--
-- THE DAY
-- Two captains draft twelve players into two teams of six. Those two teams
-- stay put all day and every point earned lands on one of them. The day is
-- three rounds of nine holes on the same nine:
--
--   ROUND 1   2v2   three battles, pairs made in draft order
--   ROUND 2   2v2   three battles again, but the pairs can be anybody
--   ROUND 3   singles, built by hand - one point per match
--
-- Each round keeps its own matches and its own strokes, so the board can
-- show a running total AND what each nine did on its own. Nothing is
-- overwritten when the next round starts.
--
-- WHY NEW TABLES AND NOT golf_scores
-- golf_scores holds one row per (outing, team, hole): a single card for a
-- whole team of six. What gets scored here is the PAIR - or in round 3 the
-- individual - so the team is the wrong grain. The team card is untouched
-- and still works for outings played that way.
--
--   golf_rounds          a nine: its number, its format
--   golf_matches         one battle inside a round
--   golf_match_sides     the two sides of a battle, each owned by a team
--   golf_match_players   who is on a side (two for a 2v2, one for singles)
--   golf_match_scores    one ball per side, so one number per side per hole
--
-- NOTE ON THE BASE GOLF TABLES
-- golf_outings, golf_participants, golf_teams, golf_holes and golf_rankings
-- were created directly in the Supabase dashboard and have no create-table
-- script in this repo. Everything below only ever ADDS to them, and uses
-- "if not exists" / "drop ... if exists" so it does not care what shape
-- they are in.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Guests: somebody who plays golf but is not in the league
--
-- Half the field is not in the fantasy league, and making them a members
-- row to get them on a scorecard puts a stranger in the "Who are you?"
-- picker, the keeper tables and every member dropdown in the app forever.
-- So a participant is EITHER a member or a name typed for the day.
-- ---------------------------------------------------------------------
alter table public.golf_participants alter column member_id drop not null;
alter table public.golf_participants add column if not exists guest_name text;

-- Exactly one of the two, never both and never neither.
alter table public.golf_participants drop constraint if exists golf_participants_who;
alter table public.golf_participants add constraint golf_participants_who check (
  (member_id is not null and guest_name is null) or
  (member_id is null and guest_name is not null and length(btrim(guest_name)) > 0)
);

-- ---------------------------------------------------------------------
-- 2. The rounds
-- ---------------------------------------------------------------------
create table if not exists public.golf_rounds (
  id           bigint generated always as identity primary key,
  outing_id    bigint not null references public.golf_outings(id) on delete cascade,
  round_number int    not null,
  name         text,
  format       text   not null default 'pairs' check (format in ('pairs', 'singles')),
  holes        int    not null default 9 check (holes between 1 and 18),
  created_at   timestamptz not null default now(),
  unique (outing_id, round_number)
);

create table if not exists public.golf_matches (
  id           bigint generated always as identity primary key,
  outing_id    bigint not null references public.golf_outings(id) on delete cascade,
  match_number int    not null,
  created_at   timestamptz not null default now()
);

-- Added rather than declared, so this file also upgrades a database that
-- ran the pre-tournament version of it.
alter table public.golf_matches add column if not exists round_id bigint
  references public.golf_rounds(id) on delete cascade;

-- Any match from before rounds existed becomes round 1 of its outing.
do $$
declare r record; v_round bigint;
begin
  for r in select distinct outing_id from public.golf_matches where round_id is null loop
    insert into public.golf_rounds (outing_id, round_number, name, format)
    values (r.outing_id, 1, 'Round 1', 'pairs')
    on conflict (outing_id, round_number) do update set format = excluded.format
    returning id into v_round;
    if v_round is null then
      select id into v_round from public.golf_rounds
      where outing_id = r.outing_id and round_number = 1;
    end if;
    update public.golf_matches set round_id = v_round
    where outing_id = r.outing_id and round_id is null;
  end loop;
end $$;

-- match_number is per ROUND now, not per outing.
alter table public.golf_matches drop constraint if exists golf_matches_outing_id_match_number_key;
drop index if exists public.uq_golf_matches_round_number;
create unique index uq_golf_matches_round_number
  on public.golf_matches (round_id, match_number) where round_id is not null;

create table if not exists public.golf_match_sides (
  id       bigint generated always as identity primary key,
  match_id bigint not null references public.golf_matches(id) on delete cascade,
  team_id  bigint not null references public.golf_teams(id)   on delete cascade,
  slot     int    not null check (slot in (1, 2)),
  unique (match_id, slot),
  -- One side per team per battle: a team cannot play itself.
  unique (match_id, team_id)
);

create table if not exists public.golf_match_players (
  id             bigint generated always as identity primary key,
  side_id        bigint not null references public.golf_match_sides(id)  on delete cascade,
  participant_id bigint not null references public.golf_participants(id) on delete cascade,
  round_id       bigint references public.golf_rounds(id) on delete cascade
);

alter table public.golf_match_players add column if not exists round_id bigint
  references public.golf_rounds(id) on delete cascade;

/*
  A player is in one pair PER ROUND - not one pair ever.

  The first version of this file had unique(participant_id), which was right
  for a single 2v2 and wrong the moment the day became three rounds: it
  would have refused to put anybody in round 2. The rule that actually
  holds is one seat per round, which needs the round on the row, so the
  trigger below keeps it there.
*/
alter table public.golf_match_players drop constraint if exists golf_match_players_participant_id_key;

create or replace function public.golf_match_players_round()
returns trigger
language plpgsql
as $$
begin
  select m.round_id into new.round_id
  from public.golf_match_sides s
  join public.golf_matches m on m.id = s.match_id
  where s.id = new.side_id;
  return new;
end;
$$;

drop trigger if exists golf_match_players_round_trg on public.golf_match_players;
create trigger golf_match_players_round_trg
  before insert or update of side_id on public.golf_match_players
  for each row execute function public.golf_match_players_round();

update public.golf_match_players mp set round_id = m.round_id
from public.golf_match_sides s
join public.golf_matches m on m.id = s.match_id
where s.id = mp.side_id and mp.round_id is distinct from m.round_id;

drop index if exists public.uq_golf_match_players_round;
create unique index uq_golf_match_players_round
  on public.golf_match_players (round_id, participant_id) where round_id is not null;

create table if not exists public.golf_match_scores (
  id         bigint generated always as identity primary key,
  side_id    bigint not null references public.golf_match_sides(id) on delete cascade,
  hole       int    not null,
  strokes    int    not null check (strokes between 1 and 15),
  updated_at timestamptz not null default now(),
  unique (side_id, hole)
);

-- A round is nine holes, so a card's holes are 1-9; 18 leaves room without
-- ever letting a typo write hole 40.
alter table public.golf_match_scores drop constraint if exists golf_match_scores_hole_check;
alter table public.golf_match_scores add constraint golf_match_scores_hole_check
  check (hole between 1 and 18);

create index if not exists idx_golf_rounds_outing        on public.golf_rounds(outing_id, round_number);
create index if not exists idx_golf_matches_round        on public.golf_matches(round_id, match_number);
create index if not exists idx_golf_matches_outing       on public.golf_matches(outing_id);
create index if not exists idx_golf_match_sides_match    on public.golf_match_sides(match_id, slot);
create index if not exists idx_golf_match_players_side   on public.golf_match_players(side_id);
create index if not exists idx_golf_match_scores_side    on public.golf_match_scores(side_id, hole);

-- ---------------------------------------------------------------------
-- 3. Row level security
--
-- Everything is public to read - the whole league watches the board.
--
-- Writing follows the pattern golf_scores already uses: the app sends the
-- member selected on this device as x-member-id and Postgres decides what
-- that member may touch.
--
-- Anyone in a match may write EITHER side of it. The card has both sides on
-- one screen and whoever is holding the phone fills both in - and in a
-- foursome with a guest in it, the guest has no member id at all, so if
-- only "your own side" could be written their card could never be scored.
-- ---------------------------------------------------------------------
alter table public.golf_rounds         enable row level security;
alter table public.golf_matches        enable row level security;
alter table public.golf_match_sides    enable row level security;
alter table public.golf_match_players  enable row level security;
alter table public.golf_match_scores   enable row level security;

create or replace function public.golf_current_member()
returns bigint
language sql
stable
as $$
  select nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint;
$$;

-- Is the selected member one of the players in this match?
create or replace function public.golf_in_match(p_match_id bigint)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.golf_match_players mp
    join public.golf_match_sides   s on s.id = mp.side_id
    join public.golf_participants  p on p.id = mp.participant_id
    where s.match_id = p_match_id
      and p.member_id is not null
      and p.member_id = public.golf_current_member()
  );
$$;

do $$
declare t text;
begin
  foreach t in array array['golf_rounds','golf_matches','golf_match_sides','golf_match_players']
  loop
    execute format('drop policy if exists "public read %1$s" on public.%1$I', t);
    execute format('create policy "public read %1$s" on public.%1$I for select using (true)', t);
    execute format('drop policy if exists "admin write %1$s" on public.%1$I', t);
    execute format('create policy "admin write %1$s" on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "public read golf match scores" on public.golf_match_scores;
create policy "public read golf match scores" on public.golf_match_scores for select using (true);
drop policy if exists "admin write golf match scores" on public.golf_match_scores;
create policy "admin write golf match scores" on public.golf_match_scores for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "player write golf match scores" on public.golf_match_scores;
create policy "player write golf match scores" on public.golf_match_scores for all
  using (
    exists (select 1 from public.golf_match_sides s
            where s.id = golf_match_scores.side_id and public.golf_in_match(s.match_id))
  )
  with check (
    exists (select 1 from public.golf_match_sides s
            where s.id = golf_match_scores.side_id and public.golf_in_match(s.match_id))
  );

-- ---------------------------------------------------------------------
-- 4. Building the day
-- ---------------------------------------------------------------------

-- The pre-tournament builder took an outing. Rounds made it wrong.
drop function if exists public.golf_build_matches(bigint);

/* Add the next round. Returns its id. */
create or replace function public.golf_add_round(p_outing_id bigint, p_format text default 'pairs')
returns bigint
language plpgsql
security definer
as $$
declare v_n int; v_id bigint;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  if p_format not in ('pairs', 'singles') then raise exception 'Unknown format %', p_format; end if;

  select coalesce(max(round_number), 0) + 1 into v_n
  from public.golf_rounds where outing_id = p_outing_id;

  insert into public.golf_rounds (outing_id, round_number, name, format)
  values (p_outing_id, v_n, 'Round ' || v_n, p_format)
  returning id into v_id;
  return v_id;
end;
$$;

/*
  One empty match in a round: two sides, one per team, nobody in them.

  This is how the singles nine gets built - "I'll pick who plays" - and it
  is also how an extra 2v2 gets added. The seats are filled from the app.
*/
create or replace function public.golf_add_match(p_round_id bigint)
returns bigint
language plpgsql
security definer
as $$
declare v_outing bigint; v_teams bigint[]; v_n int; v_match bigint; t int;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;

  select outing_id into v_outing from public.golf_rounds where id = p_round_id;
  if v_outing is null then raise exception 'No such round'; end if;

  select array_agg(id order by sort_order, id) into v_teams
  from public.golf_teams where outing_id = v_outing;
  if v_teams is null or array_length(v_teams, 1) <> 2 then
    raise exception 'This needs exactly two teams; the outing has %', coalesce(array_length(v_teams, 1), 0);
  end if;

  select coalesce(max(match_number), 0) + 1 into v_n
  from public.golf_matches where round_id = p_round_id;

  insert into public.golf_matches (outing_id, round_id, match_number)
  values (v_outing, p_round_id, v_n) returning id into v_match;

  for t in 1 .. 2 loop
    insert into public.golf_match_sides (match_id, team_id, slot) values (v_match, v_teams[t], t);
  end loop;

  return v_match;
end;
$$;

/*
  Fill a round with 2v2s, pairs in draft order - first two picked together,
  pair 1 against pair 1. As many battles as the smaller team can field, so
  6 v 6 gives three and an odd man out is simply not in one.

  Only ever touches the round it is given, so building round 2 cannot
  disturb round 1's pairs or its strokes. Refuses to run over a round that
  has already been scored, since re-pairing would orphan those strokes.
*/
create or replace function public.golf_build_pairs(p_round_id bigint)
returns int
language plpgsql
security definer
as $$
declare
  v_outing bigint;
  v_teams  bigint[];
  v_scored int;
  v_match  bigint;
  v_side   bigint;
  v_pairs  int;
  v_sides  int;
  i        int;
  t        int;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;

  select outing_id into v_outing from public.golf_rounds where id = p_round_id;
  if v_outing is null then raise exception 'No such round'; end if;

  select count(*) into v_scored
  from public.golf_match_scores ms
  join public.golf_match_sides s on s.id = ms.side_id
  join public.golf_matches m     on m.id = s.match_id
  where m.round_id = p_round_id;
  if v_scored > 0 then
    raise exception 'This round already has strokes in it. Clear them before rebuilding its pairs.';
  end if;

  select array_agg(id order by sort_order, id) into v_teams
  from public.golf_teams where outing_id = v_outing;
  if v_teams is null or array_length(v_teams, 1) <> 2 then
    raise exception 'The 2v2s need exactly two teams; this outing has %', coalesce(array_length(v_teams, 1), 0);
  end if;

  delete from public.golf_matches where round_id = p_round_id;

  -- How many complete pairs the SMALLER team can field. v_sides matters as
  -- much as v_pairs: a team with nobody on it produces no group row at all,
  -- so min() would report the other team's six and build battles with one
  -- empty side in each.
  select min(n) / 2, count(*) into v_pairs, v_sides from (
    select count(*) as n
    from public.golf_participants
    where outing_id = v_outing and team_id = any(v_teams)
    group by team_id
  ) counted;

  if coalesce(v_sides, 0) < 2 or coalesce(v_pairs, 0) < 1 then
    raise exception 'Both teams need at least two players before the 2v2s can be built.';
  end if;

  for i in 1 .. v_pairs loop
    insert into public.golf_matches (outing_id, round_id, match_number)
    values (v_outing, p_round_id, i) returning id into v_match;

    for t in 1 .. 2 loop
      insert into public.golf_match_sides (match_id, team_id, slot)
      values (v_match, v_teams[t], t) returning id into v_side;

      insert into public.golf_match_players (side_id, participant_id)
      select v_side, p.id
      from public.golf_participants p
      where p.outing_id = v_outing and p.team_id = v_teams[t]
      order by coalesce(p.pick_number, 9999), p.sort_order, p.id
      offset (i - 1) * 2 limit 2;
    end loop;
  end loop;

  return v_pairs;
end;
$$;
