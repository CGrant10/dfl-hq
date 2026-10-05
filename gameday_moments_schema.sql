-- Captured sync moments are shared with the league. No browser can write them.
create schema if not exists private;
create table if not exists private.gameday_state (
 league_id text not null, season integer not null, week integer not null,
 revision bigint not null default 0, rows jsonb not null,
 primary key(league_id,season,week)
);
alter table private.gameday_state enable row level security;
revoke all on private.gameday_state from public,anon,authenticated;
grant usage on schema private to service_role;
grant all on private.gameday_state to service_role;
create policy gameday_state_service on private.gameday_state for all to service_role using(true) with check(true);
create table if not exists public.gameday_moments (
 id bigint generated always as identity primary key,
 league_id text not null,season integer not null,week integer not null check(week between 1 and 18),
 event_key text not null,kind text not null check(kind in ('lead','big','surge')),
 matchup_id integer not null,roster_id integer not null,player_id text,
 data jsonb not null,captured_at timestamptz not null default now(),
 unique(league_id,season,week,event_key)
);
create index if not exists gameday_moments_week_page on public.gameday_moments(league_id,season,week,id desc);
alter table public.gameday_moments enable row level security;
revoke all on public.gameday_moments from public,anon,authenticated;
grant select on public.gameday_moments to anon,authenticated;
grant all on public.gameday_moments to service_role;
grant usage,select on sequence public.gameday_moments_id_seq to service_role;
create policy gameday_moments_read on public.gameday_moments for select to anon,authenticated using(true);
create or replace function public.capture_gameday_snapshot(p_league_id text,p_season integer,p_week integer,p_rows jsonb)
returns integer language plpgsql security invoker set search_path=pg_catalog,public as $$
declare old_rows jsonb; revision bigint; r jsonb; a jsonb; b jsonb; old_a jsonb; old_b jsonb;
 player text; pts numeric; was numeric; leader integer; old_leader integer; count_inserted integer:=0; changed integer;
begin
 if p_league_id is null or p_season is null or p_week is null or p_rows is null or p_season<2000 or p_week not between 1 and 18 or jsonb_typeof(p_rows)<>'array' then raise exception 'Invalid GameDay snapshot';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_league_id||':'||p_season||':'||p_week,0));
 select s.rows,s.revision+1 into old_rows,revision from private.gameday_state s where league_id=p_league_id and season=p_season and week=p_week;
 if old_rows=p_rows then return 0;end if;
 revision:=coalesce(revision,1);
 for a in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(a->'points')<>'number' or a->>'matchup_id' is null then continue;end if;
  select value into b from jsonb_array_elements(p_rows) where value->>'matchup_id'=a->>'matchup_id' and (value->>'roster_id')::integer>(a->>'roster_id')::integer limit 1;
  if b is null or jsonb_typeof(b->'points')<>'number' then continue;end if;
  select value into old_a from jsonb_array_elements(coalesce(old_rows,'[]')) where value->>'roster_id'=a->>'roster_id';
  select value into old_b from jsonb_array_elements(coalesce(old_rows,'[]')) where value->>'roster_id'=b->>'roster_id';
  leader:=case when (a->>'points')::numeric>(b->>'points')::numeric then (a->>'roster_id')::integer when (b->>'points')::numeric>(a->>'points')::numeric then (b->>'roster_id')::integer else null end;
  old_leader:=case when (old_a->>'points')::numeric>(old_b->>'points')::numeric then (a->>'roster_id')::integer when (old_b->>'points')::numeric>(old_a->>'points')::numeric then (b->>'roster_id')::integer else null end;
  if leader is not null and old_leader is not null and leader<>old_leader then
   insert into public.gameday_moments(league_id,season,week,event_key,kind,matchup_id,roster_id,data)
   values(p_league_id,p_season,p_week,'lead:'||revision||':'||(a->>'matchup_id'),'lead',(a->>'matchup_id')::integer,leader,jsonb_build_object('scores',jsonb_build_object(a->>'roster_id',a->'points',b->>'roster_id',b->'points'))) on conflict do nothing;
   get diagnostics changed=row_count;count_inserted:=count_inserted+changed;
  end if;
 end loop;
 for r in select value from jsonb_array_elements(p_rows) loop
  if r->>'matchup_id' is null then continue;end if;
  select value into old_a from jsonb_array_elements(coalesce(old_rows,'[]')) where value->>'roster_id'=r->>'roster_id';
  for player in select distinct value from jsonb_array_elements_text(coalesce(r->'starters','[]')) where value<>'0' loop
   if jsonb_typeof(r->'players_points'->player)<>'number' then continue;end if;
   pts:=(r->'players_points'->>player)::numeric;was:=case when jsonb_typeof(old_a->'players_points'->player)='number' then (old_a->'players_points'->>player)::numeric else null end;
   if pts>=20 then
    insert into public.gameday_moments(league_id,season,week,event_key,kind,matchup_id,roster_id,player_id,data)
    values(p_league_id,p_season,p_week,'big:'||(r->>'roster_id')||':'||player,'big',(r->>'matchup_id')::integer,(r->>'roster_id')::integer,player,jsonb_build_object('points',pts)) on conflict do nothing;
    get diagnostics changed=row_count;count_inserted:=count_inserted+changed;
   end if;
   if was is not null and pts-was>=6 and coalesce(old_a->'starters','[]') ? player then
    insert into public.gameday_moments(league_id,season,week,event_key,kind,matchup_id,roster_id,player_id,data)
    values(p_league_id,p_season,p_week,'surge:'||revision||':'||(r->>'roster_id')||':'||player,'surge',(r->>'matchup_id')::integer,(r->>'roster_id')::integer,player,jsonb_build_object('points',pts,'delta',pts-was)) on conflict do nothing;
    get diagnostics changed=row_count;count_inserted:=count_inserted+changed;
   end if;
  end loop;
 end loop;
 insert into private.gameday_state(league_id,season,week,revision,rows) values(p_league_id,p_season,p_week,revision,p_rows)
 on conflict(league_id,season,week) do update set rows=excluded.rows,revision=excluded.revision;
 return count_inserted;
end;$$;
revoke all on function public.capture_gameday_snapshot(text,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.capture_gameday_snapshot(text,integer,integer,jsonb) to service_role;
