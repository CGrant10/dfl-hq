-- Watchlists check real changes every ten minutes through the existing cron auth.
select cron.schedule('dfl-player-watchlist','*/10 * * * *',$job$
 select net.http_post(
  url:=regexp_replace((select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_sync_url' limit 1),'/sync-sleeper$','/player-watchlist'),
  headers:=jsonb_build_object('Content-Type','application/json','x-dfl-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_cron_token' limit 1)),
  body:=jsonb_build_object('scheduled_at',now()),timeout_milliseconds:=60000
 ) where exists(select 1 from public.sleeper_config where id=1 and auto_sync_enabled)
 and extract(month from now() at time zone 'America/Chicago') in (9,10,11,12,1,2)
 and extract(hour from now() at time zone 'America/Chicago') between 6 and 23;
$job$);
