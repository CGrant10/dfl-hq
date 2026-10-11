-- Useful cadence is selected inside the authenticated worker. Existing slots
-- remain available for full reconciliation, reports and sportsbook board setup.
alter table public.sleeper_config add column if not exists last_background_started_at timestamptz;
alter table public.sleeper_config add column if not exists last_background_mode text;
select cron.schedule('dfl-sleeper-live-sync','*/5 * * * *',$job$
 select net.http_post(
   url:=(select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_sync_url' limit 1),
   headers:=jsonb_build_object('Content-Type','application/json','x-dfl-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_cron_token' limit 1)),
   body:=jsonb_build_object('adaptive',true),timeout_milliseconds:=30000)
 where exists(select 1 from public.sleeper_config where id=1 and auto_sync_enabled)
   and extract(month from now()) in (9,10,11,12,1,2);
$job$);
