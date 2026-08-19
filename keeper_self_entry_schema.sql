-- =====================================================================
-- DFL HQ - members choose their own keeper
-- ---------------------------------------------------------------------
-- Run after keeper_rules_schema.sql, keeper_basis_correction.sql and
-- sleeper_draft_schema.sql. profile_lock_schema.sql is optional but
-- recommended - see IDENTITY below. Safe to re-run.
--
-- Until now `keepers` was public-read / privileged-write: the commissioner
-- entered every keeper for every member by hand. This adds a narrow
-- self-service path with four rules, all enforced HERE rather than in the
-- browser:
--
--   1. you may only write YOUR OWN keeper
--   2. the player must have been on YOUR roster last season
--   3. the season must not be locked
--   4. the cost is computed from the rules, never accepted from the client
--
-- THE TABLE POLICY IS NOT RELAXED. There is deliberately no member write
-- policy on `keepers`. Everything below is security definer, so a member can
-- only ever write a keeper through these functions, with those four rules
-- applied. Widening the table policy instead would have allowed any shape of
-- row a member cared to send.
-- =====================================================================

-- ---------------------------------------------------------------------
-- The request's member. Local by design: every feature in this app that
-- reads x-member-id defines its own copy so each migration stands alone.
-- See the note in SCHEMA.md about the four of them.
-- ---------------------------------------------------------------------
create or replace function public.keeper_request_member()
returns bigint language sql stable as $$
  select nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint;
$$;

-- ---------------------------------------------------------------------
-- THE COMMISSIONER'S FREEZE.
--
-- A separate table rather than a column on keeper_rules, because a rules row
-- governs every season from its effective_season until the next one - so a
-- flag on it could not say "2026 is closed, 2027 is open". Locking is a fact
-- about a SEASON.
-- ---------------------------------------------------------------------
create table if not exists public.keeper_season_state (
  season              int primary key,
  member_entry_locked boolean not null default false,
  locked_at           timestamptz,
  locked_by           bigint references public.members(id) on delete set null,
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- WHO PUT THIS ROW HERE.
--
-- Without this the self-service path cannot tell its own rows from the
-- commissioner's, and the "make room at the cap" step below would happily
-- delete a keeper the commissioner had entered by hand. The standing rule in
-- this repo is that approved keeper rows are never rewritten, so a member's
-- write has to be able to see which rows are theirs to replace.
--
-- Existing rows default to false, which is correct: everything already in the
-- table was entered by a commissioner.
-- ---------------------------------------------------------------------
alter table public.keepers
  add column if not exists self_submitted boolean not null default false;

alter table public.keeper_season_state enable row level security;

drop policy if exists "public read" on public.keeper_season_state;
create policy "public read" on public.keeper_season_state for select using (true);

-- Written only through keeper_set_season_lock() below, which checks the
-- keepers permission. No direct write policy at all.
drop policy if exists "admin write" on public.keeper_season_state;

create or replace function public.keeper_season_locked(target_season int)
returns boolean language sql stable as $$
  select coalesce(
    (select member_entry_locked from public.keeper_season_state where season = target_season),
    false);
$$;

-- ---------------------------------------------------------------------
-- IDENTITY: PIN IF THE MEMBER HAS ONE.
--
-- x-member-id comes from localStorage and is therefore a CLAIM, not proof -
-- the same trust model votes and side-event sign-ups already run on. For a
-- keeper that is thinner than it should be, so a member who has set a Profile
-- PIN must present it here, verified server-side against the stored hash.
--
-- A member who has NOT set one is trusted exactly as far as the rest of the
-- app trusts them. That is a deliberate, uneven guarantee: it blocks nobody
-- from taking part, and it means anybody who wants the stronger promise can
-- have it by setting a PIN. If profile_lock_schema.sql has not been run at
-- all there are no locks to check and this degrades to the header alone.
-- ---------------------------------------------------------------------
create or replace function public.keeper_self_identity_ok(target_member bigint, attempted_pin text)
returns boolean language plpgsql stable as $$
declare
  has_lock boolean := false;
begin
  if target_member is null then return false; end if;

  -- No profile_locks table means the migration is not installed. Nothing to
  -- verify, and refusing here would take the feature down for that reason.
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profile_locks'
  ) then
    return true;
  end if;

  execute 'select exists (select 1 from public.profile_locks where member_id = $1 and active)'
    into has_lock using target_member;

  if not has_lock then return true; end if;
  if attempted_pin is null or attempted_pin = '' then return false; end if;

  return public.profile_verify_pin(target_member, attempted_pin) is true;
end;
$$;

-- ---------------------------------------------------------------------
-- Does this member need to type a PIN to submit? The UI asks so it can show
-- the field only when it will actually be required. It reports on the
-- CALLER's own member id and nobody else's, so it leaks nothing.
-- ---------------------------------------------------------------------
create or replace function public.keeper_self_needs_pin()
returns boolean language plpgsql stable as $$
declare me bigint := public.keeper_request_member();
begin
  if me is null then return false; end if;
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profile_locks'
  ) then
    return false;
  end if;
  return exists (select 1 from public.profile_locks where member_id = me and active);
end;
$$;

-- ---------------------------------------------------------------------
-- How many keepers the league allows. Sleeper knows this and the sync stores
-- it; a league that has not synced it falls back to one, which is the DFL
-- rule and the safer direction to be wrong in.
-- ---------------------------------------------------------------------
create or replace function public.keeper_max_allowed()
returns int language sql stable as $$
  select coalesce(
    (select max_keepers from public.sleeper_leagues
      where max_keepers is not null order by season desc limit 1),
    1);
$$;

-- ---------------------------------------------------------------------
-- WHAT THE MEMBER MAY DO, in one round trip, so the card can draw itself
-- without guessing and without a second implementation of these rules.
-- ---------------------------------------------------------------------
create or replace function public.keeper_self_status(target_season int)
returns table (
  member_id     bigint,
  locked        boolean,
  needs_pin     boolean,
  max_keepers   int,
  used_slots    int,
  may_submit    boolean,
  reason        text
) language plpgsql stable as $$
declare
  me     bigint := public.keeper_request_member();
  lock   boolean := public.keeper_season_locked(target_season);
  cap    int := public.keeper_max_allowed();
  used   int := 0;
begin
  if me is null then
    return query select null::bigint, lock, false, cap, 0, false,
      'Pick your league member first'::text;
    return;
  end if;

  select count(*) into used from public.keepers k
    where k.year = target_season and k.member_id = me;

  return query select
    me,
    lock,
    public.keeper_self_needs_pin(),
    cap,
    used,
    (not lock),
    case when lock then format('Keepers for %s are locked', target_season)
         else null end::text;
end;
$$;

-- ---------------------------------------------------------------------
-- THE WRITE.
--
-- Replaces this member's keeper for the season rather than adding to it: the
-- chosen rule is "editable until the commissioner locks the season", and the
-- honest implementation of that is that submitting again is a change of mind,
-- not a second keeper. When the league allows more than one keeper the extra
-- slots fill up until the cap is reached and then the OLDEST is replaced, so
-- a member can always keep choosing without having to delete first.
--
-- THE COST IS COMPUTED HERE. keeper-entry.js computes it in JS for the
-- commissioner and that is fine - a commissioner may legitimately override.
-- A member may not, so nothing about the round is read from the request.
--
-- The two lines below are the ONE deliberate duplication of
-- decisionContext(): basis season is target_season - 1, and the roster read
-- is the same season. It is duplicated because a member write must not trust
-- the client for its own price. If the league ever changes that offset it has
-- to change in keeper-rules.js AND here.
-- ---------------------------------------------------------------------
create or replace function public.keeper_set_self(
  target_season   int,
  pick_player_id  text,
  pick_name       text default null,
  pick_pos        text default null,
  pick_nfl_team   text default null,
  attempted_pin   text default null
)
returns public.keepers
language plpgsql security definer set search_path = public as $$
declare
  me        bigint := public.keeper_request_member();
  basis_yr  int := target_season - 1;
  rules     public.keeper_rules;
  mem       public.members;
  basis_rd  int;
  cost_rd   int;
  cap       int := public.keeper_max_allowed();
  used      int;
  victim    bigint;
  saved     public.keepers;
begin
  if me is null then
    raise exception 'Pick your league member first';
  end if;
  if not public.keeper_self_identity_ok(me, attempted_pin) then
    raise exception 'That needs your Profile PIN';
  end if;
  if public.keeper_season_locked(target_season) then
    raise exception 'Keepers for % are locked', target_season;
  end if;
  if pick_player_id is null or pick_player_id = '' then
    raise exception 'Choose a player';
  end if;

  select * into mem from public.members where id = me;
  if not found then
    raise exception 'That member no longer exists';
  end if;

  -- RULE 2: the player has to have been yours. Without this a member could
  -- keep anybody in the league, which is not a keeper, it is a trade.
  if not exists (
    select 1
    from public.sleeper_rosters r
    join public.members m on m.sleeper_user_id = r.sleeper_user_id
    where m.id = me
      and r.season = basis_yr
      and exists (
        select 1 from jsonb_array_elements_text(r.players) p where p = pick_player_id
      )
  ) then
    raise exception 'That player was not on your % roster', basis_yr;
  end if;

  -- Somebody else may already have them for this season. (year, player_id) is
  -- unique, so this would fail anyway - it fails with a sentence instead.
  if exists (
    select 1 from public.keepers k
    where k.year = target_season and k.player_id = pick_player_id
      and coalesce(k.member_id, -1) <> me
  ) then
    raise exception 'Another member has already kept that player for %', target_season;
  end if;

  -- The rules governing this season: the newest set at or before it.
  select * into rules from public.keeper_rules
    where effective_season <= target_season
    order by effective_season desc limit 1;
  if not found then
    raise exception 'No keeper rules are configured for %', target_season;
  end if;

  -- RULE 4: the price, from the previous season's draft and nowhere else. A
  -- player with no pick on record that season cannot be priced, so cannot be
  -- self-kept - the commissioner has to record it, which is the existing
  -- review path rather than a new one.
  select d.round into basis_rd
    from public.sleeper_draft_picks d
    where d.season = basis_yr and d.player_id = pick_player_id
    order by d.round asc limit 1;

  if basis_rd is null then
    raise exception 'No % draft round is on record for that player - ask the commissioner to enter this keeper', basis_yr;
  end if;

  cost_rd := greatest(rules.min_keeper_round, basis_rd - rules.round_adjustment);

  -- Make room, but ONLY out of rows this member submitted themselves. A
  -- commissioner-entered keeper is a decision somebody else recorded and it is
  -- not a member's to overwrite - if that is what fills their slot, they are
  -- told to go and ask, which is a conversation rather than a silent delete.
  select count(*) into used from public.keepers k
    where k.year = target_season and k.member_id = me;

  if used >= cap and not exists (
    select 1 from public.keepers k
    where k.year = target_season and k.member_id = me and k.self_submitted
  ) then
    raise exception 'Your % keeper was entered by the commissioner. Ask them to change it.', target_season;
  end if;

  while used >= cap loop
    select k.id into victim from public.keepers k
      where k.year = target_season and k.member_id = me and k.self_submitted
      order by k.created_at asc, k.id asc limit 1;
    exit when victim is null;
    delete from public.keepers where id = victim;
    used := used - 1;
  end loop;

  insert into public.keepers (
    year, member_id, player_id, team, player,
    player_name, player_pos, player_team, team_snapshot,
    basis_round, basis_season, keeper_year,
    calculated_round, round_cost, round_overridden, rules_season, notes,
    self_submitted
  ) values (
    target_season, me, pick_player_id,
    coalesce(nullif(mem.team_name, ''), mem.display_name),
    coalesce(nullif(pick_name, ''), 'Player ' || pick_player_id),
    nullif(pick_name, ''), nullif(pick_pos, ''), nullif(pick_nfl_team, ''),
    nullif(mem.team_name, ''),
    basis_rd, basis_yr, 1,
    cost_rd, cost_rd, false, rules.effective_season,
    'Chosen by the member',
    true
  )
  returning * into saved;

  return saved;
end;
$$;

-- ---------------------------------------------------------------------
-- Changing your mind all the way back to nothing.
-- ---------------------------------------------------------------------
create or replace function public.keeper_clear_self(
  target_season  int,
  attempted_pin  text default null
)
returns int
language plpgsql security definer set search_path = public as $$
declare
  me      bigint := public.keeper_request_member();
  removed int := 0;
begin
  if me is null then
    raise exception 'Pick your league member first';
  end if;
  if not public.keeper_self_identity_ok(me, attempted_pin) then
    raise exception 'That needs your Profile PIN';
  end if;
  if public.keeper_season_locked(target_season) then
    raise exception 'Keepers for % are locked', target_season;
  end if;

  /* Same rule as replacing: a member may withdraw what they chose and nothing
     else. A commissioner-entered row survives a member pressing Remove. */
  with gone as (
    delete from public.keepers
      where year = target_season and member_id = me and self_submitted
      returning 1
  )
  select count(*) into removed from gone;

  if removed = 0 and exists (
    select 1 from public.keepers
    where year = target_season and member_id = me
  ) then
    raise exception 'Your % keeper was entered by the commissioner. Ask them to change it.', target_season;
  end if;

  return removed;
end;
$$;

-- ---------------------------------------------------------------------
-- THE FREEZE, for whoever owns the keepers permission.
--
-- has_commissioner_permission() accepts legacy is_admin(), so the shared
-- Admin password works here too. If commissioner_roles_schema.sql has not
-- been run, fall back to is_admin() alone.
-- ---------------------------------------------------------------------
create or replace function public.keeper_set_season_lock(target_season int, locked boolean)
returns public.keeper_season_state
language plpgsql security definer set search_path = public as $$
declare
  allowed boolean := false;
  row_out public.keeper_season_state;
begin
  if exists (select 1 from pg_proc where proname = 'has_commissioner_permission') then
    execute 'select public.has_commissioner_permission($1)' into allowed using 'keepers';
  else
    allowed := public.is_admin();
  end if;
  if not allowed then
    raise exception 'That needs the Keepers permission';
  end if;

  insert into public.keeper_season_state (season, member_entry_locked, locked_at, locked_by, updated_at)
  values (target_season, locked,
          case when locked then now() else null end,
          public.keeper_request_member(), now())
  on conflict (season) do update
    set member_entry_locked = excluded.member_entry_locked,
        locked_at = excluded.locked_at,
        locked_by = excluded.locked_by,
        updated_at = now()
  returning * into row_out;

  return row_out;
end;
$$;

grant execute on function public.keeper_request_member() to anon, authenticated;
grant execute on function public.keeper_season_locked(int) to anon, authenticated;
grant execute on function public.keeper_self_identity_ok(bigint,text) to anon, authenticated;
grant execute on function public.keeper_self_needs_pin() to anon, authenticated;
grant execute on function public.keeper_max_allowed() to anon, authenticated;
grant execute on function public.keeper_self_status(int) to anon, authenticated;
grant execute on function public.keeper_set_self(int,text,text,text,text,text) to anon, authenticated;
grant execute on function public.keeper_clear_self(int,text) to anon, authenticated;
grant execute on function public.keeper_set_season_lock(int,boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- REPORT: is this league ready for members to choose their own keeper?
-- ---------------------------------------------------------------------
select
  (select count(*) from public.keeper_rules)                    as rule_sets,
  public.keeper_max_allowed()                                    as max_keepers,
  (select count(*) from public.sleeper_draft_picks)               as draft_picks_on_record,
  (select count(*) from public.sleeper_rosters)                   as rosters_on_record,
  (select count(*) from public.members where sleeper_user_id is not null)
                                                                 as members_linked_to_sleeper,
  (select count(*) from public.members)                           as members_total,
  (select count(*) from public.keepers where not self_submitted)   as commissioner_entered_rows;
