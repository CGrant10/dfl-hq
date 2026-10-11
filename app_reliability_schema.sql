-- Anonymous technical categories only, bounded client batches and retention.
create table if not exists public.app_issue_events (
 id bigint generated always as identity primary key,
 kind text not null check(kind in ('request_error','image_error','runtime_error','promise_error','stale_scores')),
 source text not null check(source in ('app','sleeper','nfl','supabase','image')),
 route text not null check(route ~ '^[a-z0-9-]{1,32}$'),
 app_version text not null check(app_version ~ '^[0-9]+([.][0-9]+){1,3}$'),
 created_at timestamptz not null default now()
);
create index if not exists app_issue_created_idx on public.app_issue_events(created_at desc);
alter table public.app_issue_events enable row level security;
revoke all on public.app_issue_events from public,anon,authenticated;
grant all on public.app_issue_events to service_role;
grant usage,select on sequence public.app_issue_events_id_seq to service_role;
create or replace function public.record_app_issues(p_events jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare inserted integer;
begin
 if p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>20 then raise exception 'Invalid issue batch';end if;
 -- Bounded global admission avoids unlimited anonymous writes during a storm.
 perform pg_advisory_xact_lock(1368,1);
 if (select count(*) from public.app_issue_events where created_at>now()-interval '1 minute')>=300 then return 0;end if;
 insert into public.app_issue_events(kind,source,route,app_version)
 select e->>'kind',e->>'source',e->>'route',e->>'version' from jsonb_array_elements(p_events) e
 where e->>'kind' in ('request_error','image_error','runtime_error','promise_error','stale_scores')
 and e->>'source' in ('app','sleeper','nfl','supabase','image')
 and e->>'route' ~ '^[a-z0-9-]{1,32}$' and e->>'version' ~ '^[0-9]+([.][0-9]+){1,3}$';
 get diagnostics inserted=row_count;return inserted;
end;$$;
revoke all on function public.record_app_issues(jsonb) from public;
grant execute on function public.record_app_issues(jsonb) to anon,authenticated;
create or replace function public.app_reliability_summary() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_commissioner_permission('sleeper') then raise exception 'Commissioner access required';end if;
 return jsonb_build_object(
 'issues',(select coalesce(jsonb_agg(row),'[]'::jsonb) from (select kind,source,route,app_version,count(*) samples,max(created_at) last_seen from public.app_issue_events where created_at>now()-interval '14 days' group by kind,source,route,app_version order by count(*) desc limit 30) row),
 'wall',(select jsonb_build_object('pending',count(*) filter(where completed_at is null and attempts<5),'failed',count(*) filter(where result='failed' or completed_at is null and attempts>=5),'delivered',count(*) filter(where result='delivered')) from public.wall_push_outbox),
 'sync',(select jsonb_build_object('mode',last_background_mode,'started_at',last_background_started_at,'checked_at',last_auto_checked_at,'error',nullif(last_auto_error,''),'enabled',auto_sync_enabled) from public.sleeper_config where id=1));
end;$$;
revoke all on function public.app_reliability_summary() from public;
grant execute on function public.app_reliability_summary() to anon,authenticated;
select cron.schedule('dfl-reliability-retention','30 8 * * *',$job$
 delete from public.app_issue_events where created_at<now()-interval '30 days';
 delete from public.wall_push_outbox where completed_at<now()-interval '30 days' or completed_at is null and attempts>=5 and available_at<now()-interval '30 days';
$job$);
