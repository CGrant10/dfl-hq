-- Shared, member-scoped accountability for generated trade recommendations.
create table if not exists public.trade_recommendation_audit (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  season int,
  week int,
  team_id text not null,
  partner_id text not null,
  send_snapshot jsonb not null default '[]'::jsonb,
  receive_snapshot jsonb not null default '[]'::jsonb,
  projected_weekly_delta numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint trade_audit_send_array check (jsonb_typeof(send_snapshot) = 'array'),
  constraint trade_audit_receive_array check (jsonb_typeof(receive_snapshot) = 'array')
);
alter table public.trade_recommendation_audit enable row level security;
revoke all on table public.trade_recommendation_audit from public, anon, authenticated;
create index if not exists idx_trade_recommendation_member_created
  on public.trade_recommendation_audit(member_id, created_at desc);

create or replace function public.record_trade_recommendation(
  audit_season int, audit_week int, audit_team_id text, audit_partner_id text,
  audit_send jsonb, audit_receive jsonb, audit_weekly_delta numeric
) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare me bigint := public.dfl_current_member(); saved_id bigint;
begin
  if me is null then raise exception 'Choose a member first'; end if;
  if jsonb_typeof(audit_send) <> 'array' or jsonb_typeof(audit_receive) <> 'array' then raise exception 'Invalid trade snapshot'; end if;
  insert into public.trade_recommendation_audit(member_id,season,week,team_id,partner_id,send_snapshot,receive_snapshot,projected_weekly_delta)
  values(me,audit_season,audit_week,left(audit_team_id,80),left(audit_partner_id,80),audit_send,audit_receive,coalesce(audit_weekly_delta,0))
  returning id into saved_id;
  return saved_id;
end;
$$;
revoke all on function public.record_trade_recommendation(int,int,text,text,jsonb,jsonb,numeric) from public, anon, authenticated;
grant execute on function public.record_trade_recommendation(int,int,text,text,jsonb,jsonb,numeric) to anon, authenticated;

create or replace function public.my_trade_recommendations(max_rows int default 80)
returns table(id bigint, season int, week int, team_id text, partner_id text, send_snapshot jsonb,
  receive_snapshot jsonb, projected_weekly_delta numeric, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select a.id,a.season,a.week,a.team_id,a.partner_id,a.send_snapshot,a.receive_snapshot,a.projected_weekly_delta,a.created_at
  from public.trade_recommendation_audit a
  where a.member_id = public.dfl_current_member()
  order by a.created_at desc limit greatest(1,least(coalesce(max_rows,80),200));
$$;
revoke all on function public.my_trade_recommendations(int) from public, anon, authenticated;
grant execute on function public.my_trade_recommendations(int) to anon, authenticated;

