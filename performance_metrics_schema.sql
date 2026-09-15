-- =====================================================================
-- DFL HQ - anonymous real-user performance metrics
-- ---------------------------------------------------------------------
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Stores timings and broad technical categories only: no member id, team,
-- free-form URL, IP field, message content, or persistent browser id.
-- =====================================================================

create table if not exists public.app_performance_events (
  id          bigint generated always as identity primary key,
  metric      text not null check (metric in (
    'app_ready', 'largest_contentful_paint', 'cumulative_layout_shift',
    'interaction_latency', 'route_render'
  )),
  metric_value numeric not null check (metric_value >= 0 and metric_value <= 600000),
  unit        text not null check (unit in ('ms', 'score')),
  constraint app_performance_unit_matches_metric check (
    (metric = 'cumulative_layout_shift' and unit = 'score') or
    (metric <> 'cumulative_layout_shift' and unit = 'ms')
  ),
  route       text not null default 'app' check (route ~ '^[a-z0-9-]{1,32}$'),
  app_version text not null check (app_version ~ '^[0-9]+(\.[0-9]+){1,3}$'),
  device      text not null check (device in ('phone', 'tablet', 'desktop')),
  network     text not null check (network in ('slow-2g', '2g', '3g', '4g', 'wifi-or-unknown')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_app_performance_created
  on public.app_performance_events (created_at desc);
create index if not exists idx_app_performance_metric_route_created
  on public.app_performance_events (metric, route, created_at desc);

alter table public.app_performance_events enable row level security;
revoke all on table public.app_performance_events from anon, authenticated;

-- Clients can submit only a short, validated batch. Direct table writes and
-- every form of public read remain unavailable.
create or replace function public.record_app_performance(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted integer := 0;
begin
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 25 then
    raise exception 'Performance batch must contain at most 25 events';
  end if;

  insert into public.app_performance_events
    (metric, metric_value, unit, route, app_version, device, network)
  select
    event->>'metric',
    (event->>'value')::numeric,
    event->>'unit',
    coalesce(nullif(event->>'route', ''), 'app'),
    event->>'version',
    event->>'device',
    event->>'network'
  from jsonb_array_elements(p_events) event
  where event->>'metric' in (
      'app_ready', 'largest_contentful_paint', 'cumulative_layout_shift',
      'interaction_latency', 'route_render'
    )
    and event->>'unit' in ('ms', 'score')
    and coalesce(event->>'route', 'app') ~ '^[a-z0-9-]{1,32}$'
    and event->>'version' ~ '^[0-9]+(\.[0-9]+){1,3}$'
    and event->>'device' in ('phone', 'tablet', 'desktop')
    and event->>'network' in ('slow-2g', '2g', '3g', '4g', 'wifi-or-unknown')
    and (event->>'value') ~ '^[0-9]+(\.[0-9]+)?$'
    and length(event->>'value') <= 12
    and (event->>'value')::numeric between 0 and 600000;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function public.record_app_performance(jsonb) from public;
grant execute on function public.record_app_performance(jsonb) to anon, authenticated;

-- Only commissioners who already manage Sleeper data (and the master admin)
-- can read aggregates. Raw rows never leave the database.
create or replace function public.app_performance_summary(days_back integer default 14)
returns table (
  metric text,
  route text,
  unit text,
  samples bigint,
  p50 numeric,
  p75 numeric,
  p95 numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_commissioner_permission('sleeper') then
    raise exception 'Commissioner Sleeper access required';
  end if;

  return query
  select
    e.metric,
    e.route,
    e.unit,
    count(*)::bigint,
    round((percentile_cont(0.50) within group (order by e.metric_value))::numeric, 2),
    round((percentile_cont(0.75) within group (order by e.metric_value))::numeric, 2),
    round((percentile_cont(0.95) within group (order by e.metric_value))::numeric, 2)
  from public.app_performance_events e
  where e.created_at >= now() - make_interval(days => greatest(1, least(coalesce(days_back, 14), 90)))
  group by e.metric, e.route, e.unit
  order by e.metric, e.route;
end;
$$;

revoke all on function public.app_performance_summary(integer) from public;
grant execute on function public.app_performance_summary(integer) to anon, authenticated;
