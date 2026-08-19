-- DFL HQ - Golf Sportsbook integration, player names, rating-based lines
-- Run after sportsbook_schema.sql and sportsbook_auto_schema.sql. Safe to re-run.

-- Refund/void old open Golf auto markets so corrected named/rated lines can regenerate.
do $$
declare r record; b record;
begin
  for r in
    select sm.id from public.sportsbook_markets sm
    where sm.source='lore' and sm.auto_key like 'golf:%' and sm.status in ('open','locked')
  loop
    for b in select sb.* from public.sportsbook_bets sb where sb.market_id=r.id and sb.status='open' for update loop
      update public.sportsbook_bets sb set status='void',payout=b.stake,settled_at=now() where sb.id=b.id;
      update public.sportsbook_wallets sw set balance=sw.balance+b.stake,updated_at=now() where sw.member_id=b.member_id;
      insert into public.sportsbook_ledger(member_id,amount,kind,note,market_id,bet_id)
      values(b.member_id,b.stake,'refund','Golf line rebuild refund',r.id,b.id);
    end loop;
    update public.sportsbook_outcomes so set is_winner=null where so.market_id=r.id;
    update public.sportsbook_markets sm set status='void',settled_at=now() where sm.id=r.id;
  end loop;
end $$;

-- Keep only the sharper fallback desk.
update public.sportsbook_auto_templates set active=false;
insert into public.sportsbook_auto_templates(template_key,category,title,lore_note,outcomes,duration_hours,cooldown_days,active) values
 ('savage-scorecard-court','DFL Disrespect','Will the next DFL golf day require a scorecard court hearing?','Somebody is going to remember a six as a five with the confidence of a sworn affidavit. Commissioner ruling required.','[{"label":"YES","odds":-135},{"label":"NO","odds":110}]'::jsonb,72,12,true),
 ('savage-cart-hostage','DFL Disrespect','Will one cart be sick of each other before the back nine?','Eighteen holes is a long time to share cupholders with somebody whose swing advice is getting worse. Commissioner ruling required.','[{"label":"YES","odds":-120},{"label":"NO","odds":100}]'::jsonb,72,14,true),
 ('savage-recount','DFL Disrespect','Will somebody need to count their strokes out loud because nobody believes the first number?','The house accepts math, witnesses, and visible shame. Commissioner ruling required.','[{"label":"YES","odds":-155},{"label":"NO","odds":125}]'::jsonb,72,12,true),
 ('savage-club-delusion','DFL Disrespect','Will somebody hit two clubs more than their Golf Bag claims they need?','The bag says 165. The ball says stop fucking lying. Commissioner ruling required.','[{"label":"YES","odds":-110},{"label":"NO","odds":-110}]'::jsonb,72,14,true),
 ('savage-turn-funeral','DFL Disrespect','Will somebody reach the turn already negotiating what does and does not count?','Nothing says competitive integrity like rewriting the constitution beside the hot dogs. Commissioner ruling required.','[{"label":"YES","odds":115},{"label":"NO","odds":-140}]'::jsonb,72,14,true),
 ('savage-free-swing-doctor','DFL Disrespect','Will somebody give swing advice while actively playing like dog shit?','Credentials: one good drive three holes ago. Commissioner ruling required.','[{"label":"YES","odds":-175},{"label":"NO","odds":145}]'::jsonb,72,12,true)
on conflict(template_key) do update set category=excluded.category,title=excluded.title,lore_note=excluded.lore_note,outcomes=excluded.outcomes,duration_hours=excluded.duration_hours,cooldown_days=excluded.cooldown_days,active=true;

-- Same naming order as the Golf UI: golf_name, guest_name, display_name, team_name.
create or replace function public.sportsbook_golf_player_name(target_participant_id bigint)
returns text language sql stable security definer set search_path=public as $$
  select coalesce(nullif(btrim(m.golf_name),''),nullif(btrim(gp.guest_name),''),nullif(btrim(m.display_name),''),nullif(btrim(m.team_name),''),'Unknown')
  from public.golf_participants gp
  left join public.members m on m.id=gp.member_id
  where gp.id=target_participant_id;
$$;

create or replace function public.sportsbook_golf_side_label(target_side_id bigint)
returns text language sql stable security definer set search_path=public as $$
  select coalesce(string_agg(public.sportsbook_golf_player_name(gmp.participant_id),' / ' order by gmp.id),'Unknown')
  from public.golf_match_players gmp where gmp.side_id=target_side_id;
$$;

-- Golf already uses golf_rankings.rating and a default of 75. Higher rating is treated as stronger,
-- matching the current team-balancing code path.
create or replace function public.sportsbook_golf_side_rating(target_side_id bigint)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce(avg(coalesce(gr.rating,75)),75)::numeric
  from public.golf_match_players gmp
  join public.golf_participants gp on gp.id=gmp.participant_id
  left join public.golf_rankings gr on gr.member_id=gp.member_id
  where gmp.side_id=target_side_id;
$$;

create or replace function public.sportsbook_golf_team_rating(target_team_id bigint)
returns numeric language sql stable security definer set search_path=public as $$
  select coalesce(avg(coalesce(gr.rating,75)),75)::numeric
  from public.golf_participants gp
  left join public.golf_rankings gr on gr.member_id=gp.member_id
  where gp.team_id=target_team_id;
$$;

-- Convert a rating-driven probability to American odds with roughly 5% total vig.
create or replace function public.sportsbook_golf_american(prob numeric)
returns int language plpgsql immutable as $$
declare p numeric:=greatest(0.06,least(0.94,prob));
begin
  if p>=0.5 then return -greatest(100,round(100*p/(1-p))::int);
  else return greatest(100,round(100*(1-p)/p)::int); end if;
end; $$;

create or replace function public.sportsbook_golf_side_odds(rating_for numeric,rating_against numeric)
returns int language plpgsql immutable as $$
declare fair numeric; priced numeric;
begin
  fair:=1/(1+exp(-(coalesce(rating_for,75)-coalesce(rating_against,75))/8.0));
  priced:=least(0.94,fair*1.05);
  return public.sportsbook_golf_american(priced);
end; $$;

-- Half-point handicap derived from the rating gap. Kept conservative until more history exists.
create or replace function public.sportsbook_golf_spread(rating_a numeric,rating_b numeric)
returns numeric language sql immutable as $$
  select greatest(0.5,least(4.5,round((abs(coalesce(rating_a,75)-coalesce(rating_b,75))/4.0)*2)/2.0));
$$;

create or replace function public.sportsbook_golf_margin_total(rating_a numeric,rating_b numeric)
returns numeric language sql immutable as $$
  select greatest(1.5,least(5.5,round((1.5+abs(coalesce(rating_a,75)-coalesce(rating_b,75))/5.0)*2)/2.0));
$$;

-- Force replacement of the older generic body.
drop function if exists public.sportsbook_maintain_golf_board();
create function public.sportsbook_maintain_golf_board()
returns table(result_open_golf int,result_outing_id bigint,result_outing_name text)
language plpgsql security definer set search_path=public
as $$
#variable_conflict use_column
declare
  o record; m record; s1 record; s2 record;
  new_market_id bigint; close_at timestamptz; k text; note text;
  label1 text; label2 text; r1 numeric; r2 numeric; spread numeric; margin_line numeric;
  odds1 int; odds2 int; fav1 boolean; unit text;
begin
  perform pg_advisory_xact_lock(73910422);
  select g.* into o from public.golf_outings g
   where coalesce(g.status,'upcoming')<>'final' and (g.event_date is null or g.event_date>=current_date-1)
   order by case when g.status='active' then 0 else 1 end,g.event_date nulls last,g.id limit 1;
  if o.id is null then return query select 0::int,null::bigint,null::text; return; end if;

  close_at:=case when o.event_date is not null
    then (o.event_date::timestamp+coalesce(o.event_time,time '09:00')) at time zone current_setting('TIMEZONE')
    else now()+interval '72 hours' end;
  if close_at<=now() then close_at:=now()+interval '4 hours'; end if;

  -- Two-team tournament moneyline, now rating based.
  if (select count(*) from public.golf_teams gt where gt.outing_id=o.id)=2 then
    select gt.* into s1 from public.golf_teams gt where gt.outing_id=o.id order by gt.sort_order,gt.id limit 1;
    select gt.* into s2 from public.golf_teams gt where gt.outing_id=o.id and gt.id<>s1.id order by gt.sort_order,gt.id limit 1;
    r1:=public.sportsbook_golf_team_rating(s1.id); r2:=public.sportsbook_golf_team_rating(s2.id);
    odds1:=public.sportsbook_golf_side_odds(r1,r2); odds2:=public.sportsbook_golf_side_odds(r2,r1);
    k:='golf:'||o.id||':team-war:v2';
    if not exists(select 1 from public.sportsbook_markets sm where sm.auto_key=k and sm.status in ('open','locked','settled')) then
      insert into public.sportsbook_markets(title,category,source,lore_note,status,closes_at,auto_key)
      values(coalesce(s1.name,'Team 1')||' vs '||coalesce(s2.name,'Team 2')||' — Tournament moneyline','Golf','lore',
        case when abs(r1-r2)<1 then 'Lore sees a coin flip. Somebody will still act shocked.'
             when r1>r2 then coalesce(s1.name,'Team 1')||' gets the favorite tax. '||coalesce(s2.name,'Team 2')||' gets the payout for proving the model can eat shit.'
             else coalesce(s2.name,'Team 2')||' gets the favorite tax. '||coalesce(s1.name,'Team 1')||' gets the payout for proving the model can eat shit.' end,
        'open',close_at,k) returning id into new_market_id;
      insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order) values
        (new_market_id,coalesce(s1.name,'Team 1'),odds1,0),(new_market_id,coalesce(s2.name,'Team 2'),odds2,1);
    end if;
  end if;

  -- Actual built matchups: player names, moneyline, handicap, and margin O/U.
  for m in
    select gm.id,gm.match_number,gm.round_id,gr.round_number,gr.name as round_name,gr.format,gr.scoring
    from public.golf_matches gm join public.golf_rounds gr on gr.id=gm.round_id
    where gm.outing_id=o.id order by gr.round_number,gm.match_number
  loop
    select gs.* into s1 from public.golf_match_sides gs where gs.match_id=m.id and gs.slot=1;
    select gs.* into s2 from public.golf_match_sides gs where gs.match_id=m.id and gs.slot=2;
    if s1.id is null or s2.id is null then continue; end if;

    label1:=public.sportsbook_golf_side_label(s1.id); label2:=public.sportsbook_golf_side_label(s2.id);
    if label1='Unknown' or label2='Unknown' then continue; end if;
    r1:=public.sportsbook_golf_side_rating(s1.id); r2:=public.sportsbook_golf_side_rating(s2.id);
    odds1:=public.sportsbook_golf_side_odds(r1,r2); odds2:=public.sportsbook_golf_side_odds(r2,r1);
    spread:=public.sportsbook_golf_spread(r1,r2); margin_line:=public.sportsbook_golf_margin_total(r1,r2);
    fav1:=r1>=r2; unit:=case when m.scoring='match' then 'holes' else 'strokes' end;
    note:=case when abs(r1-r2)<1 then 'Lore found almost nothing between these sides. Perfect conditions for somebody to take this personally.'
      when fav1 then label1||' is favored on the DFL Golf ratings. '||label2||' has been handed financial motivation and disrespect.'
      else label2||' is favored on the DFL Golf ratings. '||label1||' has been handed financial motivation and disrespect.' end;

    k:='golf:'||o.id||':match:'||m.id||':moneyline:v2';
    if not exists(select 1 from public.sportsbook_markets sm where sm.auto_key=k and sm.status in ('open','locked','settled')) then
      insert into public.sportsbook_markets(title,category,source,lore_note,status,closes_at,auto_key)
      values(label1||' vs '||label2||' — Moneyline','Golf','lore',note,'open',close_at,k) returning id into new_market_id;
      insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order) values
       (new_market_id,label1,odds1,0),(new_market_id,label2,odds2,1);
    end if;

    k:='golf:'||o.id||':match:'||m.id||':spread:v2';
    if not exists(select 1 from public.sportsbook_markets sm where sm.auto_key=k and sm.status in ('open','locked','settled')) then
      insert into public.sportsbook_markets(title,category,source,lore_note,status,closes_at,auto_key)
      values(label1||' vs '||label2||' — DFL handicap','Golf','lore','The favorite does not get to hide behind the moneyline. Cover the damn number.','open',close_at,k) returning id into new_market_id;
      if fav1 then
        insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order) values
         (new_market_id,label1||' -'||spread,-110,0),(new_market_id,label2||' +'||spread,-110,1);
      else
        insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order) values
         (new_market_id,label1||' +'||spread,-110,0),(new_market_id,label2||' -'||spread,-110,1);
      end if;
    end if;

    k:='golf:'||o.id||':match:'||m.id||':margin-total:v2';
    if not exists(select 1 from public.sportsbook_markets sm where sm.auto_key=k and sm.status in ('open','locked','settled')) then
      insert into public.sportsbook_markets(title,category,source,lore_note,status,closes_at,auto_key)
      values(label1||' vs '||label2||' — Winning margin O/U '||margin_line||' '||unit,'Golf','lore','Close fight or public execution. Pick a side of the number.','open',close_at,k) returning id into new_market_id;
      insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order) values
       (new_market_id,'OVER '||margin_line||' '||unit,-110,0),(new_market_id,'UNDER '||margin_line||' '||unit,-110,1);
    end if;
  end loop;

  return query select count(*)::int,o.id,o.name from public.sportsbook_markets sm
   where sm.category='Golf' and sm.auto_key like 'golf:'||o.id||':%' and sm.status='open';
end; $$;
grant execute on function public.sportsbook_maintain_golf_board() to anon,authenticated;

-- Golf gets first priority; generic disrespect props only fill unused board slots.
create or replace function public.sportsbook_maintain_auto_board(target_open int default 6)
returns table(open_auto int,awaiting_ruling int)
language plpgsql security definer set search_path=public
as $$
declare wanted int:=greatest(1,least(coalesce(target_open,6),12)); current_open int; need int; t record; new_market_id bigint; item jsonb; n int;
begin
  perform pg_advisory_xact_lock(73910421);
  perform public.sportsbook_maintain_golf_board();
  update public.sportsbook_markets sm set status='locked'
   where sm.source='lore' and sm.auto_key is not null and sm.status='open' and sm.closes_at is not null and sm.closes_at<=now();
  select count(*) into current_open from public.sportsbook_markets sm
   where sm.source='lore' and sm.auto_key is not null and sm.status='open' and (sm.closes_at is null or sm.closes_at>now());
  need:=greatest(0,wanted-current_open);
  for t in select x.* from public.sportsbook_auto_templates x
    where x.active=true
      and not exists(select 1 from public.sportsbook_markets sm where sm.auto_key=x.template_key and sm.status in ('open','locked'))
      and not exists(select 1 from public.sportsbook_markets sm where sm.auto_key=x.template_key and sm.created_at>now()-make_interval(days=>x.cooldown_days))
    order by md5(x.template_key||current_date::text) limit need
  loop
    insert into public.sportsbook_markets(title,category,source,lore_note,status,closes_at,auto_key)
    values(t.title,t.category,'lore',t.lore_note,'open',now()+make_interval(hours=>t.duration_hours),t.template_key)
    returning id into new_market_id;
    n:=0;
    for item in select * from jsonb_array_elements(t.outcomes) loop
      insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order)
      values(new_market_id,item->>'label',(item->>'odds')::int,n); n:=n+1;
    end loop;
  end loop;
  select count(*) into current_open from public.sportsbook_markets sm
   where sm.source='lore' and sm.auto_key is not null and sm.status='open' and (sm.closes_at is null or sm.closes_at>now());
  return query select current_open,(select count(*)::int from public.sportsbook_markets sm where sm.source='lore' and sm.auto_key is not null and sm.status='locked');
end; $$;
grant execute on function public.sportsbook_maintain_auto_board(int) to anon,authenticated;

select * from public.sportsbook_maintain_auto_board(10);
