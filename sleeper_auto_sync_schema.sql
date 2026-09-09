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
begin
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
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'dfl-sleeper-auto-sync'
  loop
    perform cron.unschedule(existing_job);
  end loop;
end
$cron$;

select cron.schedule(
  'dfl-sleeper-auto-sync',
  '*/2 * * * *',
  'select private.sync_sleeper_if_changed();'
);
