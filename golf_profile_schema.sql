-- DFL HQ - Golf Profile + automatic Sportsbook repricing
-- Run after golf_bag_schema.sql and sportsbook_golf_schema.sql. Safe to re-run.

create table if not exists public.golf_profiles (
  member_id bigint primary key references public.members(id) on delete cascade,
  handicap_index numeric(5,1),
  avg_9 numeric(5,1),
  avg_18 numeric(5,1),
  rating numeric(6,2),
  rating_source text not null default 'estimated' check (rating_source in ('handicap','avg18','avg9','estimated')),
  updated_at timestamptz not null default now()
);

alter table public.golf_profiles enable row level security;
drop policy if exists "golf profiles readable" on public.golf_profiles;
create policy "golf profiles readable" on public.golf_profiles for select using (true);
drop policy if exists "own golf profile" on public.golf_profiles;
create policy "own golf profile" on public.golf_profiles for all
using (member_id=nullif(current_setting('request.headers',true)::jsonb->>'x-member-id','')::bigint)
with check (member_id=nullif(current_setting('request.headers',true)::jsonb->>'x-member-id','')::bigint);
drop policy if exists "admin golf profile" on public.golf_profiles;
create policy "admin golf profile" on public.golf_profiles for all using(public.is_admin()) with check(public.is_admin());

create or replace function public.golf_profile_rating(h numeric,a9 numeric,a18 numeric)
returns numeric language sql immutable as $$
  select case
    when h is not null then greatest(35,least(100,90-h))
    when a18 is not null then greatest(35,least(100,165-a18))
    when a9 is not null then greatest(35,least(100,165-(a9*2)))
    else 75 end::numeric;
$$;

create or replace function public.golf_save_profile(new_handicap numeric,new_avg_9 numeric,new_avg_18 numeric)
returns public.golf_profiles language plpgsql security definer set search_path=public as $$
declare mid bigint:=nullif(current_setting('request.headers',true)::jsonb->>'x-member-id','')::bigint; row public.golf_profiles; src text;
begin
  if mid is null then raise exception 'Select your DFL member first'; end if;
  if new_handicap is not null and (new_handicap < -10 or new_handicap > 54) then raise exception 'Handicap must be between -10 and 54'; end if;
  if new_avg_9 is not null and (new_avg_9 < 20 or new_avg_9 > 100) then raise exception '9-hole average looks invalid'; end if;
  if new_avg_18 is not null and (new_avg_18 < 40 or new_avg_18 > 200) then raise exception '18-hole average looks invalid'; end if;
  src:=case when new_handicap is not null then 'handicap' when new_avg_18 is not null then 'avg18' when new_avg_9 is not null then 'avg9' else 'estimated' end;
  insert into public.golf_profiles(member_id,handicap_index,avg_9,avg_18,rating,rating_source,updated_at)
  values(mid,new_handicap,new_avg_9,new_avg_18,public.golf_profile_rating(new_handicap,new_avg_9,new_avg_18),src,now())
  on conflict(member_id) do update set handicap_index=excluded.handicap_index,avg_9=excluded.avg_9,avg_18=excluded.avg_18,rating=excluded.rating,rating_source=excluded.rating_source,updated_at=now()
  returning * into row;
  return row;
end; $$;
grant execute on function public.golf_save_profile(numeric,numeric,numeric) to anon,authenticated;

-- A golfer's own handicap/averages are the first pricing source.
create or replace function public.sportsbook_golf_side_rating(target_side_id bigint)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce(avg(coalesce(gprof.rating,gr.rating,75)),75)::numeric
  from public.golf_match_players gmp
  join public.golf_participants gp on gp.id=gmp.participant_id
  left join public.golf_profiles gprof on gprof.member_id=gp.member_id
  left join public.golf_rankings gr on gr.member_id=gp.member_id
  where gmp.side_id=target_side_id;
$$;

create or replace function public.sportsbook_golf_team_rating(target_team_id bigint)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce(avg(coalesce(gprof.rating,gr.rating,75)),75)::numeric
  from public.golf_participants gp
  left join public.golf_profiles gprof on gprof.member_id=gp.member_id
  left join public.golf_rankings gr on gr.member_id=gp.member_id
  where gp.team_id=target_team_id;
$$;

create or replace function public.sportsbook_golf_line_text(v numeric)
returns text language sql immutable as $$
  select trim(trailing '.' from trim(trailing '0' from to_char(v,'FM999990.0')));
$$;

-- Convert an implied probability to normal American odds.
create or replace function public.sportsbook_golf_american_from_implied(p numeric)
returns int language plpgsql immutable as $$
declare x numeric:=greatest(0.05,least(0.95,p));
begin
  if x>=0.5 then return -greatest(100,round(100*x/(1-x))::int);
  else return greatest(100,round(100*(1-x)/x)::int); end if;
end; $$;

-- Two-way market with about a 4.5% book hold. A true pick'em is -110/-110;
-- otherwise the handicap gap moves both sides naturally instead of forcing
-- every non-tie into an artificial favorite/plus-money pair.
create or replace function public.sportsbook_golf_moneyline_pair(rating_a numeric,rating_b numeric)
returns table(odds_a int,odds_b int) language plpgsql immutable as $$
declare
  diff numeric:=coalesce(rating_a,75)-coalesce(rating_b,75);
  fair_a numeric; implied_a numeric; implied_b numeric;
begin
  if abs(diff)<0.35 then return query select -110,-110; return; end if;
  fair_a:=greatest(0.18,least(0.82,1/(1+exp(-diff/8.0))));
  implied_a:=fair_a+0.0225;
  implied_b:=(1-fair_a)+0.0225;
  return query select public.sportsbook_golf_american_from_implied(implied_a),public.sportsbook_golf_american_from_implied(implied_b);
end; $$;

-- Match play moves in holes; stroke play moves much closer to the actual
-- projected handicap gap. Half points prevent pushes on the spread.
create or replace function public.sportsbook_golf_spread_for_scoring(rating_a numeric,rating_b numeric,scoring text)
returns numeric language sql immutable as $$
  select case when scoring='match'
    then greatest(0.5,least(5.5,round((abs(coalesce(rating_a,75)-coalesce(rating_b,75))/3.5)*2)/2.0))
    else greatest(0.5,least(12.5,round(abs(coalesce(rating_a,75)-coalesce(rating_b,75))*2)/2.0))
  end;
$$;

create or replace function public.sportsbook_golf_margin_total_for_scoring(rating_a numeric,rating_b numeric,scoring text)
returns numeric language sql immutable as $$
  select case when scoring='match'
    then greatest(1.5,least(5.5,round((1.5+abs(coalesce(rating_a,75)-coalesce(rating_b,75))/4.0)*2)/2.0))
    else greatest(2.5,least(12.5,round((2.5+abs(coalesce(rating_a,75)-coalesce(rating_b,75))*0.75)*2)/2.0))
  end;
$$;

create or replace function public.sportsbook_reprice_open_golf()
returns int language plpgsql security definer set search_path=public as $$
declare
  m record; s1 record; s2 record; t1 record; t2 record; ml record;
  r1 numeric; r2 numeric; sp numeric; mt numeric; fav1 boolean; unit text;
  sp_text text; mt_text text; changed int:=0;
begin
  -- Tournament team moneyline.
  for m in
    select sm.id market_id,sm.auto_key,(regexp_match(sm.auto_key,'^golf:([0-9]+):team-war:v2$'))[1]::bigint outing_id
    from public.sportsbook_markets sm
    where sm.status='open' and (sm.closes_at is null or sm.closes_at>now())
      and sm.category='Golf' and sm.auto_key ~ '^golf:[0-9]+:team-war:v2$'
  loop
    select gt.* into t1 from public.golf_teams gt where gt.outing_id=m.outing_id order by gt.sort_order,gt.id limit 1;
    select gt.* into t2 from public.golf_teams gt where gt.outing_id=m.outing_id and gt.id<>t1.id order by gt.sort_order,gt.id limit 1;
    if t1.id is null or t2.id is null then continue; end if;
    r1:=public.sportsbook_golf_team_rating(t1.id); r2:=public.sportsbook_golf_team_rating(t2.id);
    select * into ml from public.sportsbook_golf_moneyline_pair(r1,r2);
    update public.sportsbook_outcomes so set odds_american=case so.sort_order when 0 then ml.odds_a else ml.odds_b end where so.market_id=m.market_id;
    changed:=changed+1;
  end loop;

  -- Match moneyline, spread, and winning-margin total.
  for m in
    select sm.id market_id,sm.auto_key,gm.id match_id,gr.scoring
    from public.sportsbook_markets sm
    join public.golf_matches gm on sm.auto_key like 'golf:%:match:'||gm.id||':%:v2'
    join public.golf_rounds gr on gr.id=gm.round_id
    where sm.status='open' and (sm.closes_at is null or sm.closes_at>now()) and sm.category='Golf'
  loop
    select gs.* into s1 from public.golf_match_sides gs where gs.match_id=m.match_id and gs.slot=1;
    select gs.* into s2 from public.golf_match_sides gs where gs.match_id=m.match_id and gs.slot=2;
    if s1.id is null or s2.id is null then continue; end if;
    r1:=public.sportsbook_golf_side_rating(s1.id); r2:=public.sportsbook_golf_side_rating(s2.id); fav1:=r1>=r2;

    if m.auto_key like '%:moneyline:v2' then
      select * into ml from public.sportsbook_golf_moneyline_pair(r1,r2);
      update public.sportsbook_outcomes so set odds_american=case so.sort_order when 0 then ml.odds_a else ml.odds_b end where so.market_id=m.market_id;

    elsif m.auto_key like '%:spread:v2' then
      sp:=public.sportsbook_golf_spread_for_scoring(r1,r2,m.scoring);sp_text:=public.sportsbook_golf_line_text(sp);
      update public.sportsbook_outcomes so set
        label=case when so.sort_order=0
          then public.sportsbook_golf_side_label(s1.id)||case when fav1 then ' -' else ' +' end||sp_text
          else public.sportsbook_golf_side_label(s2.id)||case when fav1 then ' +' else ' -' end||sp_text end,
        odds_american=-110
      where so.market_id=m.market_id;

    elsif m.auto_key like '%:margin-total:v2' then
      mt:=public.sportsbook_golf_margin_total_for_scoring(r1,r2,m.scoring);mt_text:=public.sportsbook_golf_line_text(mt);
      unit:=case when m.scoring='match' then 'holes' else 'strokes' end;
      update public.sportsbook_markets sm set title=public.sportsbook_golf_side_label(s1.id)||' vs '||public.sportsbook_golf_side_label(s2.id)||' — Winning margin O/U '||mt_text||' '||unit where sm.id=m.market_id;
      update public.sportsbook_outcomes so set
        label=case when so.sort_order=0 then 'OVER '||mt_text||' '||unit else 'UNDER '||mt_text||' '||unit end,
        odds_american=-110
      where so.market_id=m.market_id;
    end if;
    changed:=changed+1;
  end loop;
  return changed;
end; $$;
grant execute on function public.sportsbook_reprice_open_golf() to anon,authenticated;

create or replace function public.golf_save_profile_and_reprice(new_handicap numeric,new_avg_9 numeric,new_avg_18 numeric)
returns public.golf_profiles language plpgsql security definer set search_path=public as $$
declare row public.golf_profiles;
begin
  row:=public.golf_save_profile(new_handicap,new_avg_9,new_avg_18);
  perform public.sportsbook_reprice_open_golf();
  return row;
end; $$;
grant execute on function public.golf_save_profile_and_reprice(numeric,numeric,numeric) to anon,authenticated;

-- Refresh the current board when this migration is rerun.
select public.sportsbook_reprice_open_golf();
