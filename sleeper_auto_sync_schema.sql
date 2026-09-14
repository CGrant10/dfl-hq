-- DFL HQ - automatic Sleeper change detection
-- Applied in production as migration enable_sleeper_auto_sync.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

alter table public.sleeper_config
  add column if not exists auto_sync_enabled boolean not null default true,
  add column if not exists last_auto_checked_at timestamptz,
  add column if not exists last_auto_signature text,
  add column if not exists last_auto_error text not null default '';

comment on column public.sleeper_config.auto_sync_enabled is
  'Controls the protected background Sleeper poller.';
comment on column public.sleeper_config.last_auto_signature is
  'SHA-256 of the latest league, roster, lineup, matchup, and transaction snapshot.';

-- Before running this file outside production, create these two Vault secrets:
--   dfl_sleeper_sync_url   full /functions/v1/sync-sleeper URL
--   dfl_sleeper_cron_token token whose SHA-256 is trusted by the function
-- Their values intentionally do not live in source control.

create schema if not exists private;

create or replace function private.sync_sleeper_if_changed()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net, vault
as $function$
declare
  request_id bigint;
  chicago_now timestamp;
  local_day integer;
  local_hm text;
begin
  /* pg_cron runs in GMT on Supabase. Gate on America/Chicago here so the
     four football-day checks stay at the requested wall-clock times through
     both CST and CDT. "Sunday midnight" is the end of Sunday: 12:00 AM
     Monday local time. Calls outside these four slots make no HTTP request. */
  chicago_now := now() at time zone 'America/Chicago';
  local_day := extract(dow from chicago_now);
  local_hm := to_char(chicago_now, 'HH24:MI');
  if not (
    (local_day = 0 and local_hm in ('13:00', '15:30', '18:00'))
    or (local_day = 1 and local_hm = '00:00')
  ) then
    return null;
  end if;

  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'dfl_sleeper_sync_url' limit 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dfl-cron-token', (select decrypted_secret from vault.decrypted_secrets
                           where name = 'dfl_sleeper_cron_token' limit 1)
    ),
    body := jsonb_build_object('scheduled_at', now()),
    timeout_milliseconds := 30000
  ) into request_id;
  return request_id;
end
$function$;

revoke all on function private.sync_sleeper_if_changed()
  from public, anon, authenticated;

do $cron$
begin
  /* Retire the old twice-daily job. Named schedules below are upserted by
     cron.schedule(), so rerunning this file never creates duplicates. */
  if exists (select 1 from cron.job where jobname = 'dfl-sleeper-auto-sync') then
    perform cron.unschedule('dfl-sleeper-auto-sync');
  end if;
end
$cron$;

/* Each logical slot covers both possible UTC hours for CST/CDT. The local
   gate inside the function rejects the inactive offset, leaving exactly four
   HTTP syncs while avoiding an every-30-minute database job. */
select cron.schedule('dfl-sleeper-sunday-1300', '0 18,19 * * 0',
  'select private.sync_sleeper_if_changed();');
select cron.schedule('dfl-sleeper-sunday-1530', '30 20,21 * * 0',
  'select private.sync_sleeper_if_changed();');
select cron.schedule('dfl-sleeper-sunday-1800', '0 0,23 * * 0,1',
  'select private.sync_sleeper_if_changed();');
select cron.schedule('dfl-sleeper-sunday-midnight', '0 5,6 * * 1',
  'select private.sync_sleeper_if_changed();');
