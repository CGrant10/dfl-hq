-- Preserve the last valid league snapshot when upstream data fails validation.
alter table public.sleeper_config add column if not exists last_league_health jsonb;

create or replace function public.app_reliability_summary() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_commissioner_permission('sleeper') then raise exception 'Commissioner access required';end if;
 return jsonb_build_object(
 'issues',(select coalesce(jsonb_agg(row),'[]'::jsonb) from (select kind,source,route,app_version,count(*) samples,max(created_at) last_seen from public.app_issue_events where created_at>now()-interval '14 days' group by kind,source,route,app_version order by count(*) desc limit 30) row),
 'wall',(select jsonb_build_object('pending',count(*) filter(where completed_at is null and attempts<5),'failed',count(*) filter(where result='failed' or completed_at is null and attempts>=5),'delivered',count(*) filter(where result='delivered')) from public.wall_push_outbox),
 'leagueHealth',(select last_league_health from public.sleeper_config where id=1),
 'sync',(select jsonb_build_object('mode',last_background_mode,'started_at',last_background_started_at,'checked_at',last_auto_checked_at,'error',nullif(last_auto_error,''),'enabled',auto_sync_enabled) from public.sleeper_config where id=1));
end;$$;
revoke all on function public.app_reliability_summary() from public;
grant execute on function public.app_reliability_summary() to anon,authenticated;

-- Per-player alert states prevent grouped alerts repeating on subsequent polls.
alter table public.notification_messages add column if not exists lineup_alert_keys text[];
