-- Independent transaction checks: no dependency on full-sync/game-day cadence.
alter table public.sleeper_config
 add column if not exists last_trade_watch_started_at timestamptz,
 add column if not exists last_trade_watch_checked_at timestamptz,
 add column if not exists last_trade_watch_error text not null default '';
-- Existing sleeper_config RLS and commissioner access remain in force.
select cron.schedule('dfl-trade-watch','*/2 * * * *',$job$
 select net.http_post(
  url:=regexp_replace((select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_sync_url' limit 1),'/sync-sleeper$','/trade-watch'),
  headers:=jsonb_build_object('Content-Type','application/json','x-dfl-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_cron_token' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=60000)
 where exists(select 1 from public.sleeper_config where id=1 and auto_sync_enabled);
$job$);
