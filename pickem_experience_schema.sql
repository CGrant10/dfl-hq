-- DFL HQ Pick'em game-day layer. Run after sportsbook_provider_pickem_schema.sql.
-- Safe to re-run.

create table if not exists public.nfl_pickem_config (
  singleton boolean primary key default true check(singleton=true),
  weekly_prize int not null default 0 check(weekly_prize between 0 and 10000),
  updated_at timestamptz not null default now()
);
insert into public.nfl_pickem_config(singleton) values(true) on conflict do nothing;
alter table public.nfl_pickem_config enable row level security;
revoke all on public.nfl_pickem_config from anon,authenticated;

alter table public.nfl_pickem_entries
  add column if not exists weekly_rank int,
  add column if not exists prize_paid int not null default 0;
create index if not exists idx_pickem_entries_week_results on public.nfl_pickem_entries(season,week,graded,weekly_rank);
create index if not exists idx_pickem_picks_game on public.nfl_pickem_picks(game_id);

create or replace function public.pickem_save_config(new_weekly_prize int)
returns int language plpgsql security definer set search_path=public as $$
begin
  if not public.has_commissioner_permission('sportsbook') then raise exception 'Sportsbook commissioner access required'; end if;
  if new_weekly_prize is null or new_weekly_prize<0 or new_weekly_prize>10000 then raise exception 'Weekly prize must be between 0 and 10,000 SIN'; end if;
  insert into public.nfl_pickem_config(singleton,weekly_prize) values(true,new_weekly_prize)
  on conflict(singleton) do update set weekly_prize=excluded.weekly_prize,updated_at=now();
  return new_weekly_prize;
end; $$;
revoke all on function public.pickem_save_config(int) from public;
grant execute on function public.pickem_save_config(int) to anon,authenticated;

create schema if not exists private;
create or replace function private.pickem_season_rankings(target_season int,target_week int)
returns table(member_id bigint,display_name text,total_correct int,weeks int,week_wins int,season_rank bigint,previous_rank bigint,movement bigint,streak int)
language sql stable security definer set search_path=public,pg_catalog as $$
  with current_totals as (
    select e.member_id,m.display_name,sum(e.correct_count)::int total_correct,count(*)::int weeks,
           count(*) filter(where e.weekly_rank=1)::int week_wins
      from public.nfl_pickem_entries e join public.members m on m.id=e.member_id
     where e.season=target_season and e.graded and e.week<=target_week group by e.member_id,m.display_name
  ), current_ranked as (
    select c.*,dense_rank() over(order by c.total_correct desc,c.week_wins desc,c.display_name) season_rank from current_totals c
  ), previous_totals as (
    select e.member_id,sum(e.correct_count)::int total_correct,count(*) filter(where e.weekly_rank=1)::int week_wins
      from public.nfl_pickem_entries e where e.season=target_season and e.graded and e.week<target_week group by e.member_id
  ), previous_ranked as (
    select p.*,dense_rank() over(order by p.total_correct desc,p.week_wins desc,p.member_id) previous_rank from previous_totals p
  )
  select c.member_id,c.display_name,c.total_correct,c.weeks,c.week_wins,c.season_rank,p.previous_rank,
         coalesce(p.previous_rank-c.season_rank,0)::bigint movement,
         coalesce((select count(*)::int from (
           select e.weekly_rank,row_number() over(order by e.week desc) rn
             from public.nfl_pickem_entries e where e.member_id=c.member_id and e.season=target_season and e.graded and e.week<=target_week
         ) recent where recent.rn < coalesce((select min(x.rn) from (
           select e.weekly_rank,row_number() over(order by e.week desc) rn from public.nfl_pickem_entries e
            where e.member_id=c.member_id and e.season=target_season and e.graded and e.week<=target_week
         ) x where x.weekly_rank<>1),2147483647)),0)::int streak
    from current_ranked c left join previous_ranked p using(member_id)
   order by c.season_rank,c.display_name;
$$;
revoke all on function private.pickem_season_rankings(int,int) from public,anon,authenticated;

create or replace function public.pickem_current_board(target_season int default null,target_week int default null)
returns jsonb language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare mid bigint:=public.sportsbook_member_id(); s int; w int; result jsonb; lock_at timestamptz; is_locked boolean; previous_week int;
begin
  select season,week into s,w from public.nfl_pickem_games
   where (target_season is null or season=target_season) and (target_week is null or week=target_week)
   order by case when starts_at>now() then 0 else 1 end,abs(extract(epoch from(starts_at-now()))) limit 1;
  if target_season is not null then s:=target_season; end if;if target_week is not null then w:=target_week; end if;
  if s is null then return jsonb_build_object('available',false); end if;
  select min(starts_at) into lock_at from public.nfl_pickem_games where season=s and week=w;is_locked:=lock_at<=now();
  select max(week) into previous_week from public.nfl_pickem_entries where season=s and week<w and graded;
  select jsonb_build_object(
    'available',true,'season',s,'week',w,'locksAt',lock_at,'locked',is_locked,
    'weeklyPrize',coalesce((select weekly_prize from public.nfl_pickem_config where singleton),0),
    'games',coalesce((select jsonb_agg(to_jsonb(g)||jsonb_build_object(
      'pickCount',case when is_locked then (select count(*) from public.nfl_pickem_picks p where p.game_id=g.provider_event_id) else 0 end,
      'awayPickPct',case when is_locked then coalesce((select round(100.0*count(*) filter(where p.picked_team_id=g.away_team_id)/nullif(count(*),0)) from public.nfl_pickem_picks p where p.game_id=g.provider_event_id),0) else null end,
      'homePickPct',case when is_locked then coalesce((select round(100.0*count(*) filter(where p.picked_team_id=g.home_team_id)/nullif(count(*),0)) from public.nfl_pickem_picks p where p.game_id=g.provider_event_id),0) else null end
    ) order by g.starts_at) from public.nfl_pickem_games g where g.season=s and g.week=w),'[]'::jsonb),
    'entry',(select jsonb_build_object('id',e.id,'tiebreakTotal',e.tiebreak_total,'correctCount',e.correct_count,'tiebreakDelta',e.tiebreak_delta,'graded',e.graded,'weeklyRank',e.weekly_rank,'prizePaid',e.prize_paid,
      'liveCorrect',(select count(*) from public.nfl_pickem_picks p join public.nfl_pickem_games g on g.provider_event_id=p.game_id where p.entry_id=e.id and g.status='final' and (g.home_score=g.away_score or p.picked_team_id=case when g.home_score>g.away_score then g.home_team_id else g.away_team_id end)),
      'liveWrong',(select count(*) from public.nfl_pickem_picks p join public.nfl_pickem_games g on g.provider_event_id=p.game_id where p.entry_id=e.id and g.status='final' and g.home_score<>g.away_score and p.picked_team_id<>case when g.home_score>g.away_score then g.home_team_id else g.away_team_id end),
      'picks',coalesce((select jsonb_object_agg(p.game_id,p.picked_team_id) from public.nfl_pickem_picks p where p.entry_id=e.id),'{}'::jsonb))
      from public.nfl_pickem_entries e where e.member_id=mid and e.season=s and e.week=w),
    'standings',coalesce((select jsonb_agg(x order by x.correct_count desc nulls last,x.tiebreak_delta asc nulls last,x.submitted_at)
      from (select e.member_id,m.display_name,e.correct_count,e.tiebreak_delta,e.graded,e.weekly_rank,e.prize_paid,e.submitted_at,
        case when is_locked then coalesce((select jsonb_object_agg(p.game_id,p.picked_team_id) from public.nfl_pickem_picks p where p.entry_id=e.id),'{}'::jsonb) else null end picks
        from public.nfl_pickem_entries e join public.members m on m.id=e.member_id where e.season=s and e.week=w) x),'[]'::jsonb),
    'seasonStandings',coalesce((select jsonb_agg(to_jsonb(x) order by x.season_rank) from private.pickem_season_rankings(s,coalesce(previous_week,w)) x),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(to_jsonb(x) order by x.week desc) from (
      select win.week,(select count(*)::int from public.nfl_pickem_entries all_cards where all_cards.season=s and all_cards.week=win.week) cards,
        jsonb_build_object('memberId',win.member_id,'name',wm.display_name,'correct',win.correct_count,'delta',win.tiebreak_delta,'prize',win.prize_paid) winner,
        (select jsonb_build_object('correct',mine.correct_count,'rank',mine.weekly_rank,'delta',mine.tiebreak_delta,'prize',mine.prize_paid)
          from public.nfl_pickem_entries mine where mine.member_id=mid and mine.season=s and mine.week=win.week and mine.graded) mine
      from public.nfl_pickem_entries win join public.members wm on wm.id=win.member_id
      where win.season=s and win.graded and win.weekly_rank=1
    ) x),'[]'::jsonb),
    'rivals',coalesce((select jsonb_agg(to_jsonb(x) order by x.display_name) from (
      select opp.member_id,m.display_name,count(*)::int weeks,
        sum(me.correct_count)::int my_correct,sum(opp.correct_count)::int their_correct,
        count(*) filter(where me.correct_count>opp.correct_count)::int my_wins,
        count(*) filter(where opp.correct_count>me.correct_count)::int their_wins,
        count(*) filter(where opp.correct_count=me.correct_count)::int ties,
        case when is_locked then (select count(*)::int
          from public.nfl_pickem_entries my_now
          join public.nfl_pickem_picks my_pick on my_pick.entry_id=my_now.id
          join public.nfl_pickem_entries their_now on their_now.season=my_now.season and their_now.week=my_now.week and their_now.member_id=opp.member_id
          join public.nfl_pickem_picks their_pick on their_pick.entry_id=their_now.id and their_pick.game_id=my_pick.game_id
          where my_now.member_id=mid and my_now.season=s and my_now.week=w and my_pick.picked_team_id<>their_pick.picked_team_id) else null end current_disagreements
      from public.nfl_pickem_entries opp
      join public.nfl_pickem_entries me on me.season=opp.season and me.week=opp.week and me.member_id=mid and me.graded
      join public.members m on m.id=opp.member_id
      where opp.season=s and opp.graded and opp.member_id<>mid
      group by opp.member_id,m.display_name
    ) x),'[]'::jsonb),
    'lastRecap',case when previous_week is null then null else (select jsonb_build_object(
      'week',previous_week,
      'winner',(select jsonb_build_object('name',m.display_name,'correct',e.correct_count,'delta',e.tiebreak_delta,'prize',e.prize_paid) from public.nfl_pickem_entries e join public.members m on m.id=e.member_id where e.season=s and e.week=previous_week order by e.weekly_rank nulls last limit 1),
      'worst',(select jsonb_build_object('name',m.display_name,'correct',e.correct_count) from public.nfl_pickem_entries e join public.members m on m.id=e.member_id where e.season=s and e.week=previous_week order by e.correct_count,e.tiebreak_delta desc nulls last limit 1),
      'closest',(select jsonb_build_object('name',m.display_name,'delta',e.tiebreak_delta) from public.nfl_pickem_entries e join public.members m on m.id=e.member_id where e.season=s and e.week=previous_week and e.tiebreak_delta is not null order by e.tiebreak_delta limit 1),
      'mine',(select jsonb_build_object('correct',e.correct_count,'rank',e.weekly_rank,'prize',e.prize_paid,'movement',coalesce(r.movement,0),'streak',coalesce(r.streak,0))
        from public.nfl_pickem_entries e left join private.pickem_season_rankings(s,previous_week) r on r.member_id=e.member_id
        where e.member_id=mid and e.season=s and e.week=previous_week)
    )) end
  ) into result;return result;
end; $$;
revoke all on function public.pickem_current_board(int,int) from public;
grant execute on function public.pickem_current_board(int,int) to anon,authenticated;

create or replace function public.pickem_grade_week(target_season int,target_week int)
returns int language plpgsql security definer set search_path=public,pg_catalog as $$
declare actual_total numeric;changed int;prize int;winner record;
begin
  if (select count(*) from public.nfl_pickem_games where season=target_season and week=target_week)=0
    or exists(select 1 from public.nfl_pickem_games where season=target_season and week=target_week and status not in('final','cancelled')) then return 0;end if;
  select home_score+away_score into actual_total from public.nfl_pickem_games where season=target_season and week=target_week and is_monday_night order by starts_at desc limit 1;
  update public.nfl_pickem_entries e set correct_count=(select count(*) from public.nfl_pickem_picks p join public.nfl_pickem_games g on g.provider_event_id=p.game_id where p.entry_id=e.id and g.status='final' and(g.home_score=g.away_score or p.picked_team_id=case when g.home_score>g.away_score then g.home_team_id else g.away_team_id end)),tiebreak_delta=case when actual_total is null then null else abs(e.tiebreak_total-actual_total) end,graded=true,updated_at=now() where e.season=target_season and e.week=target_week;
  get diagnostics changed=row_count;
  with ranked as(select id,row_number() over(order by correct_count desc,tiebreak_delta asc nulls last,submitted_at) rn from public.nfl_pickem_entries where season=target_season and week=target_week)
  update public.nfl_pickem_entries e set weekly_rank=r.rn from ranked r where e.id=r.id;
  select weekly_prize into prize from public.nfl_pickem_config where singleton;
  if coalesce(prize,0)>0 then
    for winner in update public.nfl_pickem_entries set prize_paid=prize where season=target_season and week=target_week and weekly_rank=1 and prize_paid=0 returning member_id,id loop
      insert into public.sportsbook_wallets(member_id,balance,last_daily_at) values(winner.member_id,500+prize,now()) on conflict(member_id) do update set balance=public.sportsbook_wallets.balance+prize,updated_at=now();
      insert into public.sportsbook_ledger(member_id,amount,kind,note) values(winner.member_id,prize,'payout','NFL Pick''em Week '||target_week||' winner');
    end loop;
  end if;
  return changed;
end; $$;
revoke all on function public.pickem_grade_week(int,int) from public,anon,authenticated;
grant execute on function public.pickem_grade_week(int,int) to service_role;

do $$ begin
  if exists(select 1 from cron.job where jobname='dfl-pickem-gameday-sync') then perform cron.unschedule('dfl-pickem-gameday-sync');end if;
end $$;
select cron.schedule('dfl-pickem-gameday-sync','15 * * * 0,1,2','select private.sync_sportsbook_feed();');
