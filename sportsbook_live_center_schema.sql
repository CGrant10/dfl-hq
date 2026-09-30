-- DFL Sportsbook live center: immutable ticket labels, provider progress,
-- batch settlement, and the league's latest completed weekly recap.
-- Safe to re-run after sportsbook_entries_schema.sql and
-- sportsbook_provider_pickem_schema.sql.

alter table public.sportsbook_bet_legs
  add column if not exists accepted_label text,
  add column if not exists accepted_market_title text,
  add column if not exists accepted_line numeric,
  add column if not exists accepted_side text;

update public.sportsbook_bet_legs l
   set accepted_label=coalesce(l.accepted_label,o.label),
       accepted_market_title=coalesce(l.accepted_market_title,m.title),
       accepted_line=coalesce(l.accepted_line,m.provider_line),
       accepted_side=coalesce(l.accepted_side,o.provider_side)
  from public.sportsbook_outcomes o, public.sportsbook_markets m
 where o.id=l.outcome_id and m.id=l.market_id
   and (l.accepted_label is null or l.accepted_market_title is null
        or (l.accepted_line is null and m.provider_line is not null)
        or (l.accepted_side is null and o.provider_side is not null));

create or replace function public.sportsbook_snapshot_leg()
returns trigger language plpgsql set search_path=public as $$
begin
  select coalesce(new.accepted_label,o.label),
         coalesce(new.accepted_market_title,m.title),
         coalesce(new.accepted_line,m.provider_line),
         coalesce(new.accepted_side,o.provider_side)
    into new.accepted_label,new.accepted_market_title,new.accepted_line,new.accepted_side
    from public.sportsbook_outcomes o
    join public.sportsbook_markets m on m.id=o.market_id
   where o.id=new.outcome_id and m.id=new.market_id;
  return new;
end; $$;
revoke all on function public.sportsbook_snapshot_leg() from public,anon,authenticated;

drop trigger if exists sportsbook_snapshot_leg_before_insert on public.sportsbook_bet_legs;
create trigger sportsbook_snapshot_leg_before_insert
before insert on public.sportsbook_bet_legs
for each row execute function public.sportsbook_snapshot_leg();

create index if not exists idx_sportsbook_bets_settled
  on public.sportsbook_bets(settled_at desc) where settled_at is not null;

create or replace function public.sportsbook_my_bets(row_limit int default 20, include_dismissed boolean default false)
returns table(
  id bigint, market_id bigint, outcome_id bigint, stake int, odds_american int,
  potential_payout int, status text, payout int, pick_count int,
  created_at timestamptz, settled_at timestamptz,
  cancelled_at timestamptz, dismissed_at timestamptz, legs jsonb
)
language sql stable security definer set search_path=public as $$
  select b.id,b.market_id,b.outcome_id,b.stake,b.odds_american,
         b.potential_payout,b.status,b.payout,b.pick_count,
         b.created_at,b.settled_at,b.cancelled_at,b.dismissed_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'outcome_id',l.outcome_id,
             'market_id',l.market_id,
             'label',coalesce(l.accepted_label,o.label),
             'market',coalesce(l.accepted_market_title,m.title),
             'odds_american',l.odds_american,
             'status',l.status,
             'accepted_line',coalesce(l.accepted_line,m.provider_line),
             'provider_side',coalesce(l.accepted_side,o.provider_side),
             'provider_score',m.provider_score,
             'provider_line',m.provider_line,
             'provider_updated_at',m.provider_updated_at,
             'market_status',m.status,
             'closes_at',m.closes_at,
             'category',m.category
           ) order by l.sort_order)
           from public.sportsbook_bet_legs l
           join public.sportsbook_outcomes o on o.id=l.outcome_id
           join public.sportsbook_markets m on m.id=l.market_id
           where l.bet_id=b.id
         ),'[]'::jsonb)
    from public.sportsbook_bets b
   where b.member_id=public.sportsbook_member_id()
     and (include_dismissed or b.dismissed_at is null)
   order by (b.status='open') desc,b.created_at desc
   limit greatest(1,least(coalesce(row_limit,20),100));
$$;
revoke all on function public.sportsbook_my_bets(int,boolean) from public;
grant execute on function public.sportsbook_my_bets(int,boolean) to anon,authenticated;

create or replace function public.sportsbook_update_provider_markets(updates jsonb)
returns int language plpgsql security definer set search_path=public as $$
declare changed int;
begin
  if jsonb_typeof(updates)<>'array' then raise exception 'Provider updates must be an array'; end if;
  update public.sportsbook_markets m set
    provider_score=x.provider_score,
    provider_updated_at=coalesce(x.provider_updated_at,now()),
    status=case when x.market_status in ('open','locked') then x.market_status else m.status end
  from jsonb_to_recordset(updates) as x(provider_key text,provider_score numeric,provider_updated_at timestamptz,market_status text)
  where m.provider_key=x.provider_key and m.source='provider' and m.status in ('open','locked');
  get diagnostics changed=row_count;
  return changed;
end; $$;
revoke all on function public.sportsbook_update_provider_markets(jsonb) from public,anon,authenticated;
grant execute on function public.sportsbook_update_provider_markets(jsonb) to service_role;

create or replace function public.sportsbook_settle_provider_markets(updates jsonb)
returns int language plpgsql security definer set search_path=public as $$
declare item record; changed int:=0; saved_line numeric; side text; is_void boolean;
begin
  if jsonb_typeof(updates)<>'array' then raise exception 'Provider settlements must be an array'; end if;
  for item in select * from jsonb_to_recordset(updates)
    as x(provider_key text,final_score numeric)
  loop
    select provider_line into saved_line from public.sportsbook_markets
     where provider_key=item.provider_key and source='provider' and status in ('open','locked');
    if saved_line is null then continue; end if;
    is_void:=item.final_score=saved_line;
    side:=case when item.final_score>saved_line then 'over' else 'under' end;
    if public.sportsbook_settle_provider_market(item.provider_key,side,item.final_score,is_void) then
      changed:=changed+1;
    end if;
  end loop;
  return changed;
end; $$;
revoke all on function public.sportsbook_settle_provider_markets(jsonb) from public,anon,authenticated;
grant execute on function public.sportsbook_settle_provider_markets(jsonb) to service_role;

create or replace function public.sportsbook_weekly_recap(target_at timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare local_now timestamp; this_tuesday timestamp; end_at timestamptz; start_at timestamptz; result jsonb;
begin
  local_now:=target_at at time zone 'America/Chicago';
  this_tuesday:=date_trunc('week',local_now)+interval '1 day';
  end_at:=(case when local_now>=this_tuesday then this_tuesday else this_tuesday-interval '7 days' end) at time zone 'America/Chicago';
  start_at:=end_at-interval '7 days';

  with settled as (
    select b.*,m.display_name,m.team_name
      from public.sportsbook_bets b join public.members m on m.id=b.member_id
     where b.settled_at>=start_at and b.settled_at<end_at and b.cancelled_at is null
  ), profit as (
    select member_id,display_name,team_name,
           sum(case status when 'won' then payout-stake when 'lost' then -stake else 0 end)::int net
      from settled group by member_id,display_name,team_name
  )
  select jsonb_build_object(
    'available',exists(select 1 from settled),
    'startsAt',start_at,'endsAt',end_at,
    'tickets',(select count(*) from settled),
    'sinRisked',coalesce((select sum(stake) from settled),0),
    'biggestWinner',(select to_jsonb(x) from (select id ticket_id,display_name,team_name,pick_count,payout,(payout-stake) net from settled where status='won' order by net desc,payout desc limit 1)x),
    'worstBeat',(select to_jsonb(x) from (select id ticket_id,display_name,team_name,pick_count,stake,potential_payout from settled where status='lost' order by potential_payout desc,pick_count desc limit 1)x),
    'longestParlay',(select to_jsonb(x) from (select id ticket_id,display_name,team_name,pick_count,status,potential_payout from settled where pick_count>1 order by pick_count desc,potential_payout desc limit 1)x),
    'mostProfitable',(select to_jsonb(x) from (select display_name,team_name,net from profit order by net desc,display_name limit 1)x),
    'funniestFailure',(select to_jsonb(x) from (select id ticket_id,display_name,team_name,pick_count,stake,potential_payout from settled where status='lost' order by pick_count desc,potential_payout desc limit 1)x)
  ) into result;
  return result;
end; $$;
revoke all on function public.sportsbook_weekly_recap(timestamptz) from public;
grant execute on function public.sportsbook_weekly_recap(timestamptz) to anon,authenticated;
