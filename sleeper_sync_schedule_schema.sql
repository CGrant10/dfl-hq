-- DFL HQ - commissioner-managed Sleeper sync schedule
-- Times are stored as America/Chicago wall-clock times. A one-minute cron
-- dispatcher keeps the schedule DST-safe without creating one cron job per slot.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

alter table public.sleeper_config
  add column if not exists auto_sync_enabled boolean not null default true,
  add column if not exists last_auto_scheduled_slot text;

create table if not exists public.sleeper_sync_schedule (
  day_of_week smallint not null check (day_of_week between 0 and 6),
  sync_time time without time zone not null,
  primary key (day_of_week, sync_time)
);

comment on table public.sleeper_sync_schedule is
  'Commissioner-managed America/Chicago times for automatic Sleeper syncs; 0 is Sunday.';

alter table public.sleeper_sync_schedule enable row level security;
revoke all on table public.sleeper_sync_schedule from public, anon, authenticated;

insert into public.sleeper_sync_schedule(day_of_week, sync_time)
select seed.day_of_week, seed.sync_time
from (values
  (0::smallint, '13:00'::time),
  (0::smallint, '15:30'::time),
  (0::smallint, '18:00'::time),
  (1::smallint, '00:00'::time)
) as seed(day_of_week, sync_time)
where not exists (select 1 from public.sleeper_sync_schedule)
on conflict do nothing;

create or replace function public.sleeper_get_sync_schedule()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  result jsonb;
begin
  if not public.has_commissioner_permission('sleeper') then
    raise exception 'Sleeper commissioner access required';
  end if;

  select jsonb_build_object(
    'enabled', coalesce((select auto_sync_enabled from public.sleeper_config where id = 1), false),
    'timezone', 'America/Chicago',
    'slots', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day', day_of_week,
          'time', to_char(sync_time, 'HH24:MI')
        ) order by day_of_week, sync_time
      )
      from public.sleeper_sync_schedule
    ), '[]'::jsonb)
  ) into result;

  return result;
end
$function$;

create or replace function public.sleeper_save_sync_schedule(
  new_schedule jsonb,
  new_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  item jsonb;
  day_text text;
  time_text text;
  saved_count integer;
begin
  if not public.has_commissioner_permission('sleeper') then
    raise exception 'Sleeper commissioner access required';
  end if;
  if new_schedule is null or jsonb_typeof(new_schedule) <> 'array' then
    raise exception 'Schedule must be an array';
  end if;
  if jsonb_array_length(new_schedule) > 56 then
    raise exception 'A maximum of 56 weekly sync times is allowed';
  end if;

  for item in select value from jsonb_array_elements(new_schedule)
  loop
    day_text := item ->> 'day';
    time_text := item ->> 'time';
    if day_text is null or day_text !~ '^[0-6]$' then
      raise exception 'Each sync time needs a weekday from 0 through 6';
    end if;
    if time_text is null or time_text !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Each sync time must use 24-hour HH:MM format';
    end if;
  end loop;

  if coalesce(new_enabled, false)
     and jsonb_array_length(new_schedule) = 0 then
    raise exception 'Add at least one time before enabling automatic sync';
  end if;

  -- pg-safeupdate protects PostgREST sessions from unbounded writes. Every
  -- stored row is constrained to this weekday range, so this predicate still
  -- replaces the full schedule while satisfying the production guard.
  delete from public.sleeper_sync_schedule
  where day_of_week between 0 and 6;
  insert into public.sleeper_sync_schedule(day_of_week, sync_time)
  select distinct
    (value ->> 'day')::smallint,
    (value ->> 'time')::time
  from jsonb_array_elements(new_schedule);

  update public.sleeper_config
  set auto_sync_enabled = coalesce(new_enabled, false),
      last_auto_scheduled_slot = null
  where id = 1;

  select count(*) into saved_count from public.sleeper_sync_schedule;
  return jsonb_build_object('enabled', coalesce(new_enabled, false), 'saved', saved_count);
end
$function$;

revoke all on function public.sleeper_get_sync_schedule() from public;
revoke all on function public.sleeper_save_sync_schedule(jsonb, boolean) from public;
grant execute on function public.sleeper_get_sync_schedule() to anon, authenticated;
grant execute on function public.sleeper_save_sync_schedule(jsonb, boolean) to anon, authenticated;

create schema if not exists private;

create or replace function private.sync_sleeper_if_scheduled()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net, vault
as $function$
declare
  request_id bigint;
  chicago_now timestamp;
  local_day smallint;
  local_time time without time zone;
  slot_key text;
  claimed boolean := false;
begin
  chicago_now := date_trunc('minute', now() at time zone 'America/Chicago');
  local_day := extract(dow from chicago_now)::smallint;
  local_time := chicago_now::time;
  slot_key := to_char(chicago_now, 'YYYY-MM-DD HH24:MI');

  if not exists (
    select 1
    from public.sleeper_sync_schedule schedule
    where schedule.day_of_week = local_day
      and schedule.sync_time = local_time
  ) then
    return null;
  end if;

  update public.sleeper_config
  set last_auto_scheduled_slot = slot_key
  where id = 1
    and auto_sync_enabled
    and last_auto_scheduled_slot is distinct from slot_key
  returning true into claimed;

  if not coalesce(claimed, false) then
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
    body := jsonb_build_object(
      'scheduled_at', now(),
      'local_slot', slot_key,
      'timezone', 'America/Chicago'
    ),
    timeout_milliseconds := 30000
  ) into request_id;
  return request_id;
end
$function$;

-- Keep the old private function name harmless for any in-flight/manual calls.
create or replace function private.sync_sleeper_if_changed()
returns bigint
language sql
security definer
set search_path = pg_catalog, private
as $function$
  select private.sync_sleeper_if_scheduled();
$function$;

revoke all on function private.sync_sleeper_if_scheduled()
  from public, anon, authenticated;
revoke all on function private.sync_sleeper_if_changed()
  from public, anon, authenticated;

do $cron$
declare
  old_name text;
begin
  foreach old_name in array array[
    'dfl-sleeper-auto-sync',
    'dfl-sleeper-sunday-1300',
    'dfl-sleeper-sunday-1530',
    'dfl-sleeper-sunday-1800',
    'dfl-sleeper-sunday-midnight'
  ]
  loop
    if exists (select 1 from cron.job where jobname = old_name) then
      perform cron.unschedule(old_name);
    end if;
  end loop;
end
$cron$;

select cron.schedule(
  'dfl-sleeper-schedule-dispatcher',
  '* * * * *',
  'select private.sync_sleeper_if_scheduled();'
);
