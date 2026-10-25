-- Sanitized public NFL data. No member identities, device tokens or push keys.
create table if not exists public.nfl_live_games (
 game_id text primary key check(game_id ~ '^[0-9]{1,24}$'),
 season integer not null check(season between 2000 and 2200),
 week integer not null check(week between 1 and 18),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 plays jsonb not null default '[]' check(jsonb_typeof(plays)='array'),
 baseline_keys text[] not null default '{}',
 baseline_at timestamptz not null default now(),
 fetched_at timestamptz not null default now()
);
create index if not exists nfl_live_week on public.nfl_live_games(season,week);
alter table public.nfl_live_games enable row level security;
revoke all on public.nfl_live_games from public,anon,authenticated;
grant select(game_id,season,week,snapshot,plays,fetched_at) on public.nfl_live_games to anon,authenticated;
grant all on public.nfl_live_games to service_role;
create policy nfl_live_read on public.nfl_live_games for select to anon,authenticated using(true);

-- Serializing each game's first capture establishes a durable baseline, even
-- when two workers start together. Enrichment can retry; baseline plays cannot
-- become new alerts. The sender separately deduplicates each member/play key.
create or replace function public.capture_nfl_live_game(p_game jsonb,p_plays jsonb,p_seen text[])
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare old public.nfl_live_games; baseline text[]; captured timestamptz:=clock_timestamp(); next_plays jsonb; result public.nfl_live_games;
begin
 if jsonb_typeof(p_game)<>'object' or (p_game->>'id') !~ '^[0-9]{1,24}$'
 or (p_game->>'season') !~ '^[0-9]{4}$' or (p_game->>'week') !~ '^[0-9]{1,2}$'
 or jsonb_typeof(p_plays)<>'array' or jsonb_array_length(p_plays)>300
 or octet_length(p_plays::text)>1500000 or cardinality(p_seen)>400 then raise exception 'Invalid NFL capture';end if;
 perform pg_advisory_xact_lock(hashtextextended('dfl-nfl:'||(p_game->>'id'),0));
 select * into old from public.nfl_live_games where game_id=p_game->>'id' for update;
 if found and (old.season<>(p_game->>'season')::integer or old.week<>(p_game->>'week')::integer) then raise exception 'NFL game scope changed';end if;
 baseline:=case when old.game_id is null then coalesce(p_seen,'{}') else old.baseline_keys end;
 select coalesce(jsonb_agg(play||jsonb_build_object('eligible',
  not (play->>'id'=any(baseline)) and play->>'kind' in ('touchdown','big-play')
  and jsonb_typeof(play->'players')='array' and jsonb_array_length(play->'players')>0
  and case when jsonb_typeof(play->'at')='number' then (play->>'at')::numeric between extract(epoch from captured)*1000-180000 and extract(epoch from captured)*1000+15000 else false end
 ) order by (play->>'sequence')::numeric),'[]') into next_plays from jsonb_array_elements(p_plays) play;
 insert into public.nfl_live_games(game_id,season,week,snapshot,plays,baseline_keys,baseline_at,fetched_at)
 values(p_game->>'id',(p_game->>'season')::integer,(p_game->>'week')::integer,p_game,next_plays,baseline,coalesce(old.baseline_at,captured),captured)
 on conflict(game_id) do update set snapshot=excluded.snapshot,plays=excluded.plays,fetched_at=excluded.fetched_at
 returning * into result;
 return jsonb_build_object('game_id',result.game_id,'season',result.season,'week',result.week,'snapshot',result.snapshot,'plays',result.plays,'fetched_at',result.fetched_at);
end $$;
revoke all on function public.capture_nfl_live_game(jsonb,jsonb,text[]) from public,anon,authenticated;
grant execute on function public.capture_nfl_live_game(jsonb,jsonb,text[]) to service_role;

-- Reuse the existing private scheduler credential; never expose it to clients.
select cron.schedule('dfl-live-football','* * * * *',$job$
 select net.http_post(
  url:=regexp_replace((select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_sync_url' limit 1),'/sync-sleeper$','/live-football'),
  headers:=jsonb_build_object('Content-Type','application/json','x-dfl-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_sync_token' limit 1)),
  body:=jsonb_build_object('scheduled_at',now()),timeout_milliseconds:=55000
 );
$job$);
-- Activated after the verified frontend release is published.
select cron.alter_job((select jobid from cron.job where jobname='dfl-live-football'),active:=false);
select cron.schedule('dfl-live-football-retention','15 9 * * *','delete from public.nfl_live_games where fetched_at < now()-interval ''30 days'';');

-- Keep mobile refreshes small: recent eligible events, not a whole NFL game's
-- play-by-play history. Invoker permissions and table RLS still apply.
create or replace function public.nfl_live_week(p_season integer,p_week integer)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('game_id',g.game_id,'season',g.season,'week',g.week,'snapshot',g.snapshot,'fetched_at',g.fetched_at,
 'plays',(select coalesce(jsonb_agg(p.play order by (p.play->>'at')::numeric),'[]') from (
  select play from jsonb_array_elements(g.plays) play where play->>'eligible'='true' and jsonb_typeof(play->'at')='number'
   and (play->>'at')::numeric >= extract(epoch from now())*1000-180000
  order by (play->>'at')::numeric desc limit 12
 ) p)) order by g.game_id),'[]')
 from public.nfl_live_games g where g.season=p_season and g.week=p_week and g.fetched_at>now()-interval '15 minutes';
$$;
revoke all on function public.nfl_live_week(integer,integer) from public;
grant execute on function public.nfl_live_week(integer,integer) to anon,authenticated,service_role;
