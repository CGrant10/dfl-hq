-- Shared observed scores, independent of notification/highlight pagination.
create table if not exists public.gameday_score_history (
 id bigint generated always as identity primary key,
 league_id text not null,season integer not null check(season>=2000),
 week integer not null check(week between 1 and 18),matchup_id integer not null check(matchup_id>0),
 revision bigint not null check(revision>0),
 roster1 integer not null check(roster1>0),roster2 integer not null check(roster2>roster1),
 score1 numeric(10,2) not null check(score1 between -10000 and 10000),
 score2 numeric(10,2) not null check(score2 between -10000 and 10000),
 observed_at timestamptz not null default statement_timestamp(),
 unique(league_id,season,week,matchup_id,revision)
);
create index if not exists gameday_score_history_matchup_page on public.gameday_score_history(league_id,season,week,matchup_id,id desc);
alter table public.gameday_score_history enable row level security;
revoke all on public.gameday_score_history from public,anon,authenticated;
grant select on public.gameday_score_history to anon,authenticated;
grant all on public.gameday_score_history to service_role;
grant usage,select on sequence public.gameday_score_history_id_seq to service_role;
drop policy if exists gameday_score_history_read on public.gameday_score_history;
create policy gameday_score_history_read on public.gameday_score_history for select to anon,authenticated using(true);
create or replace function private.capture_gameday_score_history()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare a jsonb;b jsonb;old_a jsonb;old_b jsonb;pair_count integer;old_rows jsonb;
begin
 if new.league_id is null or new.season<2000 or new.week not between 1 and 18 or jsonb_typeof(new.rows)<>'array' then return new;end if;
 old_rows:=case when tg_op='UPDATE' then old.rows else '[]'::jsonb end;
 for a in select value from jsonb_array_elements(new.rows) loop
  if coalesce(a->>'roster_id','')!~'^[1-9][0-9]{0,8}$' or coalesce(a->>'matchup_id','')!~'^[1-9][0-9]{0,8}$' or jsonb_typeof(a->'points') is distinct from 'number' then continue;end if;
  select count(*) into pair_count from jsonb_array_elements(new.rows) where value->>'matchup_id'=a->>'matchup_id';
  if pair_count<>2 then continue;end if;
  select value into b from jsonb_array_elements(new.rows) where value->>'matchup_id'=a->>'matchup_id' and value->>'roster_id'<>a->>'roster_id';
  if coalesce(b->>'roster_id','')!~'^[1-9][0-9]{0,8}$' or jsonb_typeof(b->'points') is distinct from 'number' or (a->>'roster_id')::integer>=(b->>'roster_id')::integer then continue;end if;
  if (a->>'points')::numeric not between -10000 and 10000 or (b->>'points')::numeric not between -10000 and 10000 then continue;end if;
  select value into old_a from jsonb_array_elements(coalesce(old_rows,'[]')) where value->>'matchup_id'=a->>'matchup_id' and value->>'roster_id'=a->>'roster_id';
  select value into old_b from jsonb_array_elements(coalesce(old_rows,'[]')) where value->>'matchup_id'=b->>'matchup_id' and value->>'roster_id'=b->>'roster_id';
  if old_a->'points'=a->'points' and old_b->'points'=b->'points' then continue;end if;
  insert into public.gameday_score_history(league_id,season,week,matchup_id,revision,roster1,roster2,score1,score2)
  values(new.league_id,new.season,new.week,(a->>'matchup_id')::integer,new.revision,(a->>'roster_id')::integer,(b->>'roster_id')::integer,(a->>'points')::numeric,(b->>'points')::numeric)
  on conflict do nothing;
 end loop;
 return new;
end;$$;
revoke all on function private.capture_gameday_score_history() from public,anon,authenticated;
grant execute on function private.capture_gameday_score_history() to service_role;
drop trigger if exists gameday_score_history_capture on private.gameday_state;
create trigger gameday_score_history_capture after insert or update of rows on private.gameday_state for each row execute function private.capture_gameday_score_history();
-- Historical lead receipts have both exact observed scores. No synthetic kickoff
-- or estimated in-between points are generated for weeks without checkpoints.
insert into public.gameday_score_history(league_id,season,week,matchup_id,revision,roster1,roster2,score1,score2,observed_at)
select m.league_id,m.season,m.week,m.matchup_id,split_part(m.event_key,':',2)::bigint,
 (s.ids[1])::integer,(s.ids[2])::integer,(m.data->'scores'->>s.ids[1])::numeric,(m.data->'scores'->>s.ids[2])::numeric,m.captured_at
from public.gameday_moments m cross join lateral (
 select array_agg(key order by key::integer) ids from jsonb_each(case when jsonb_typeof(m.data->'scores')='object' then m.data->'scores' else '{}'::jsonb end)
 where key~'^[1-9][0-9]{0,8}$' and jsonb_typeof(value)='number'
) s
where m.kind='lead' and m.event_key~'^lead:[1-9][0-9]{0,17}:[1-9][0-9]*$'
 and cardinality(s.ids)=2 and m.season>=2000 and m.week between 1 and 18 and m.matchup_id>0
 and (m.data->'scores'->>s.ids[1])::numeric between -10000 and 10000 and (m.data->'scores'->>s.ids[2])::numeric between -10000 and 10000
on conflict do nothing;
