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
    'push_failures', coalesce(sum(p.failure_count) filter (where p.enabled), 0)
  ) into result from public.push_subscriptions p;
  return result || jsonb_build_object(
    'unsettled_tickets', (select count(*) from public.sportsbook_bets where status = 'open'),
    'member_review', (select count(*) from public.members where active is false or sleeper_user_id is null)
  );
end;
$$;

revoke all on function public.commissioner_operations_health() from public, anon, authenticated;
grant execute on function public.commissioner_operations_health() to anon, authenticated;

comment on function public.commissioner_operations_health() is
  'Commissioner-gated aggregate health counts for RPC-only operational tables.';
