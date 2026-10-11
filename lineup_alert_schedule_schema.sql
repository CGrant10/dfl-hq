-- Uses the existing private Vault token and notification category preferences.
-- No new member identity, public RPC or notification-writer permission.
-- The worker reads the real NFL schedule and sends only in the 90 minutes
-- before an affected starter's kickoff. Source keys deduplicate each status.
select cron.schedule('dfl-lineup-alerts', '*/10 * * * *', $job$
  select net.http_post(
    url := regexp_replace((select decrypted_secret from vault.decrypted_secrets
      where name = 'dfl_sleeper_sync_url' limit 1), '/sync-sleeper$', '/lineup-alerts'),
    headers := jsonb_build_object('Content-Type','application/json',
      'x-dfl-cron-token',(select decrypted_secret from vault.decrypted_secrets
        where name = 'dfl_sleeper_cron_token' limit 1)),
    body := jsonb_build_object('scheduled_at',now()), timeout_milliseconds := 30000
  )
  where exists(select 1 from public.sleeper_config where id=1 and auto_sync_enabled)
    and extract(month from now() at time zone 'America/Chicago') in (9,10,11,12,1,2)
    and extract(hour from now() at time zone 'America/Chicago') between 6 and 23;
$job$);
