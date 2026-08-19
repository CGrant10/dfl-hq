-- =====================================================================
-- DFL HQ - Golf Sportsbook integration + disrespect board
-- ---------------------------------------------------------------------
-- Run after sportsbook_schema.sql and sportsbook_auto_schema.sql.
-- Safe to re-run.
--
-- Upcoming/active golf outings now outrank generic offseason filler. The
-- Sportsbook creates markets from REAL golf_teams / golf_rounds /
-- golf_matches / golf_match_sides rows. Odds are intentionally neutral until
-- DFL has enough player-level golf history for a defensible rating model;
-- League Lore is allowed to roast, not invent performance data.
-- =====================================================================

-- Retire the old daycare props. This migration runs in Supabase SQL Editor,
-- where there is no DFL commissioner request header, so it MUST NOT call the
-- app-facing sportsbook_void_market() RPC. Refund/void directly here instead.
do $$
declare r record; b record;
begin
  for r in
    select sm.id from public.sportsbook_markets sm
     where sm.source='lore' and sm.auto_key is not null and sm.status in ('open','locked')
       and sm.auto_key in (
         'dfl-rule-smoke','dfl-groupchat-fantasy','dfl-golf-trash','dfl-late-arrival',
         'dfl-bad-purchase','dfl-argument-source','marvel-trailer','marvel-doom',
         'marvel-rewatch','gaming-rage','gaming-rematch','gaming-excuse',
         'golf-lost-ball','golf-mulligan','golf-club-blame','fantasy-draft-talk',
         'fantasy-keeper-regret','fantasy-sleeper-hype'
       )
  loop
    for b in
      select sb.* from public.sportsbook_bets sb
       where sb.market_id=r.id and sb.status='open'
       for update
    loop
      update public.sportsbook_bets sb
         set status='void', payout=b.stake, settled_at=now()
       where sb.id=b.id;
      update public.sportsbook_wallets sw
         set balance=sw.balance+b.stake, updated_at=now()
       where sw.member_id=b.member_id;
      insert into public.sportsbook_ledger(member_id,amount,kind,note,market_id,bet_id)
      values(b.member_id,b.stake,'refund','Retired auto-market refund',r.id,b.id);
    end loop;
    update public.sportsbook_outcomes so set is_winner=null where so.market_id=r.id;
    update public.sportsbook_markets sm set status='void',settled_at=now() where sm.id=r.id;
  end loop;
end $$;

update public.sportsbook_auto_templates set active=false;

-- Fallback board for when there is no real golf/fantasy event to price.
insert into public.sportsbook_auto_templates(template_key,category,title,lore_note,outcomes,duration_hours,cooldown_days,active)
values
 ('savage-scorecard-court','DFL Disrespect','Will the next DFL golf day require a scorecard court hearing?','Somebody is going to remember a six as a five with the confidence of a sworn affidavit. Commissioner ruling required.','[{"label":"YES","odds":-135},{"label":"NO","odds":110}]'::jsonb,72,12,true),
 ('savage-cart-hostage','DFL Disrespect','Will one cart be sick of each other before the back nine?','Eighteen holes is a long time to share cupholders with somebody whose swing advice is getting worse. Commissioner ruling required.','[{"label":"YES","odds":-120},{"label":"NO","odds":100}]'::jsonb,72,14,true),
 ('savage-recount','DFL Disrespect','Will somebody need to count their strokes out loud because nobody believes the first number?','The house accepts math, witnesses, and visible shame. Commissioner ruling required.','[{"label":"YES","odds":-155},{"label":"NO","odds":125}]'::jsonb,72,12,true),
 ('savage-club-delusion','DFL Disrespect','Will somebody hit two clubs more than their Golf Bag claims they need?','The bag says 165. The ball says stop fucking lying. Commissioner ruling required.','[{"label":"YES","odds":-110},{"label":"NO","odds":-110}]'::jsonb,72,14,true),
 ('savage-turn-funeral','DFL Disrespect','Will somebody reach the turn already negotiating what does and does not count?','Nothing says competitive integrity like rewriting the constitution beside the hot dogs. Commissioner ruling required.','[{"label":"YES","odds":115},{"label":"NO","odds":-140}]'::jsonb,72,14,true),
 ('savage-free-swing-doctor','DFL Disrespect','Will somebody give swing advice while actively playing like dog shit?','Credentials: one good drive three holes ago. Commissioner ruling required.','[{"label":"YES","odds":-175},{"label":"NO","odds":145}]'::jsonb,72,12,true)
on conflict(template_key) do update set
 category=excluded.category,title=excluded.title,lore_note=excluded.lore_note,
 outcomes=excluded.outcomes,duration_hours=excluded.duration_hours,
 cooldown_days=excluded.cooldown_days,active=true;

create or replace function public.sportsbook_maintain_golf_board()
returns table(open_golf int, outing_id bigint, outing_name text)
language plpgsql
security definer
set search_path=public
as $$
declare
  o record; t record; m record; s1 record; s2 record;
  new_market_id bigint; close_at timestamptz; k text; note text;
begin
  perform pg_advisory_xact_lock(73910422);

  select g.* into o
    from public.golf_outings g
   where coalesce(g.status,'upcoming') <> 'final'
     and (g.event_date is null or g.event_date >= current_date - 1)
   order by case when g.status='active' then 0 else 1 end,
            g.event_date nulls last, g.id
   limit 1;

  if o.id is null then return query select 0::int,null::bigint,null::text; return; end if;
  close_at := case when o.event_date is not null
    then (o.event_date::timestamp + coalesce(o.event_time,time '09:00')) at time zone current_setting('TIMEZONE')
    else now()+interval '72 hours' end;
  if close_at <= now() then close_at := now()+interval '4 hours'; end if;

  if (select count(*) from public.golf_teams gt where gt.outing_id=o.id) >= 2 then
    k := 'golf:'||o.id||':outright';
    if not exists(select 1 from public.sportsbook_markets sm where sm.auto_key=k and sm.status in ('open','locked','settled')) then
      insert into public.sportsbook_markets(title,category,source,lore_note,status,closes_at,auto_key)
      values(o.name||' — Who wins the damn thing?','Golf','lore',
        'Real DFL teams. Neutral opening prices for now: Lore will talk shit, but it will not fake a handicap.',
        'open',close_at,k) returning id into new_market_id;
      for t in select gt.id,gt.name,gt.sort_order from public.golf_teams gt where gt.outing_id=o.id order by gt.sort_order,gt.id loop
        insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order)
        values(new_market_id,coalesce(t.name,'Team'),
          case (select count(*) from public.golf_teams gt2 where gt2.outing_id=o.id)
            when 2 then -110 when 3 then 200 when 4 then 300 else 400 end,
          coalesce(t.sort_order,0));
      end loop;
    end if;
  end if;

  if (select count(*) from public.golf_teams gt where gt.outing_id=o.id)=2 then
    select gt.* into s1 from public.golf_teams gt where gt.outing_id=o.id order by gt.sort_order,gt.id limit 1;
    select gt.* into s2 from public.golf_teams gt where gt.outing_id=o.id and gt.id<>s1.id order by gt.sort_order,gt.id limit 1;
    k := 'golf:'||o.id||':team-war';
    if not exists(select 1 from public.sportsbook_markets sm where sm.auto_key=k and sm.status in ('open','locked','settled')) then
      insert into public.sportsbook_markets(title,category,source,lore_note,status,closes_at,auto_key)
      values(coalesce(s1.name,'Team 1')||' vs '||coalesce(s2.name,'Team 2')||' — Tournament moneyline','Golf','lore',
        'The computer refuses to pretend either side has earned favorite status yet. Pick your idiots.',
        'open',close_at,k) returning id into new_market_id;
      insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order) values
        (new_market_id,coalesce(s1.name,'Team 1'),-110,0),(new_market_id,coalesce(s2.name,'Team 2'),-110,1);
    end if;
  end if;

  for m in
    select gm.id,gm.match_number,gm.round_id,gr.round_number,gr.name as round_name,gr.format
      from public.golf_matches gm join public.golf_rounds gr on gr.id=gm.round_id
     where gm.outing_id=o.id order by gr.round_number,gm.match_number
  loop
    select gs.*,gt.name team_name into s1
      from public.golf_match_sides gs join public.golf_teams gt on gt.id=gs.team_id
     where gs.match_id=m.id and gs.slot=1;
    select gs.*,gt.name team_name into s2
      from public.golf_match_sides gs join public.golf_teams gt on gt.id=gs.team_id
     where gs.match_id=m.id and gs.slot=2;
    if s1.id is null or s2.id is null then continue; end if;
    k := 'golf:'||o.id||':match:'||m.id;
    if not exists(select 1 from public.sportsbook_markets sm where sm.auto_key=k and sm.status in ('open','locked','settled')) then
      note := case when m.format='singles'
        then 'Singles. No teammate to blame, no place to hide. The house has removed all adult supervision.'
        else 'Pairs. Four golfers, two balls, and enough shared blame to keep every group chat alive until winter.' end;
      insert into public.sportsbook_markets(title,category,source,lore_note,status,closes_at,auto_key)
      values('Round '||m.round_number||' · Match '||m.match_number||' — '||coalesce(s1.team_name,'Side 1')||' vs '||coalesce(s2.team_name,'Side 2'),
        'Golf','lore',note,'open',close_at,k) returning id into new_market_id;
      insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order) values
        (new_market_id,coalesce(s1.team_name,'Side 1'),-110,0),(new_market_id,coalesce(s2.team_name,'Side 2'),-110,1);
    end if;
  end loop;

  return query select count(*)::int,o.id,o.name
    from public.sportsbook_markets sm
   where sm.category='Golf' and sm.auto_key like 'golf:'||o.id||':%' and sm.status='open';
end;
$$;
grant execute on function public.sportsbook_maintain_golf_board() to anon,authenticated;

create or replace function public.sportsbook_maintain_auto_board(target_open int default 4)
returns table(open_auto int, awaiting_ruling int)
language plpgsql security definer set search_path=public
as $$
declare wanted int:=greatest(1,least(coalesce(target_open,4),8)); current_open int; need int; t record; new_market_id bigint; item jsonb; n int;
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
  select count(*) into current_open from public.sportsbook_markets sm where sm.source='lore' and sm.auto_key is not null and sm.status='open' and (sm.closes_at is null or sm.closes_at>now());
  return query select current_open,(select count(*)::int from public.sportsbook_markets sm where sm.source='lore' and sm.auto_key is not null and sm.status='locked');
end;
$$;
grant execute on function public.sportsbook_maintain_auto_board(int) to anon,authenticated;

select * from public.sportsbook_maintain_auto_board(6);
