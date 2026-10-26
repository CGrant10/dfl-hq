-- Public NFL metadata only, in the same compact shape already cached by DFL.
create table public.nfl_player_directory (
 id smallint primary key check(id=1),
 players jsonb not null check(jsonb_typeof(players)='object'),
 player_count integer not null check(player_count between 1000 and 50000),
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 fetched_at timestamptz not null
);
alter table public.nfl_player_directory enable row level security;
revoke all on public.nfl_player_directory from public,anon,authenticated;
grant select(players,fetched_at,id) on public.nfl_player_directory to anon,authenticated;
grant all on public.nfl_player_directory to service_role;
create policy nfl_player_directory_read on public.nfl_player_directory for select to anon,authenticated using(true);
select cron.schedule('dfl-player-directory','*/4 * * * *',$job$
 select net.http_post(
 url:=regexp_replace((select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_sync_url' limit 1),'/sync-sleeper$','/player-directory'),
 headers:=jsonb_build_object('Content-Type','application/json','x-dfl-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_cron_token' limit 1)),
 body:='{}'::jsonb,timeout_milliseconds:=45000);
$job$);
-- Enabled after the protected refresher has populated and verified the row.
select cron.alter_job((select jobid from cron.job where jobname='dfl-player-directory'),active:=false);
