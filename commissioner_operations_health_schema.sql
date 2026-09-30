-- Compact commissioner-only health counts for the Operations dashboard.
-- Backing tables remain unavailable through direct REST reads.
create or replace function public.commissioner_operations_health()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not public.has_commissioner_permission('sleeper') then
    raise exception 'Commissioner Sleeper access required';
  end if;
  select jsonb_build_object(
    'push_devices', count(*) filter (where p.enabled),
    'push_failures', coalesce(sum(p.failure_count) filter (where p.enabled), 0),
    'expired_push_devices', count(*) filter (where not p.enabled and p.failure_count >= 99),
    'last_push_success', max(p.last_success_at)
  ) into result from public.push_subscriptions p;
  return result || jsonb_build_object(
    'unsettled_tickets', (select count(*) from public.sportsbook_bets where status = 'open'),
    'member_review', (select count(*) from public.members where active is false or sleeper_user_id is null),
    'missing_profile_images', (select count(*) from public.members where active is true and nullif(trim(profile_image), '') is null),
    'oldest_open_ticket', (select min(created_at) from public.sportsbook_bets where status = 'open'),
    'latest_final_week', (select max(week) from public.sleeper_matchups where winner_roster_id is not null),
    'latest_final_season', (select max(season) from public.sleeper_matchups where winner_roster_id is not null),
    'settlement_pending', (select count(*) from public.sportsbook_markets m join public.sleeper_matchups sm
      on m.auto_key = concat('matchup:',sm.season,':',sm.week,':',sm.matchup_id)
      where m.status in ('open','locked') and sm.winner_roster_id is not null),
    'active_trade_alerts', (select count(*) from public.trade_alerts where breaking_active),
    'latest_trade_at', (select max(coalesce(occurred_at,created_at)) from public.trade_alerts),
    'cron_last_run', (select max(r.end_time) from cron.job_run_details r join cron.job j on j.jobid=r.jobid where j.jobname='dfl-sleeper-schedule-dispatcher'),
    'cron_last_status', (select r.status from cron.job_run_details r join cron.job j on j.jobid=r.jobid where j.jobname='dfl-sleeper-schedule-dispatcher' order by r.end_time desc nulls last limit 1)
  );
end;
$$;

revoke all on function public.commissioner_operations_health() from public, anon, authenticated;
grant execute on function public.commissioner_operations_health() to anon, authenticated;

comment on function public.commissioner_operations_health() is
  'Commissioner-gated aggregate health counts for RPC-only operational tables.';
