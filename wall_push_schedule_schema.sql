select cron.schedule('dfl-wall-alerts','* * * * *',$job$
 select net.http_post(
 url:=replace((select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_sync_url' limit 1),'/sync-sleeper','/wall-alerts'),
 headers:=jsonb_build_object('Content-Type','application/json','x-dfl-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_cron_token' limit 1)),body:='{}'::jsonb,timeout_milliseconds:=55000)
 where exists(select 1 from public.wall_push_outbox where completed_at is null and attempts<5 and available_at<=now());
$job$);
