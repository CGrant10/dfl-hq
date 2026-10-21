-- League-visible intentions; own-team writes use the existing member/PIN identity.
-- Intention preferences never change trade prices, evidence or verdicts.
create table public.trade_intentions (
 member_id bigint not null references public.members(id),
 season integer not null,
 league_id text not null,
 roster_id integer not null,
 players jsonb not null default '{}'::jsonb,
 needs text[] not null default '{}',
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(member_id,season,league_id)
);
alter table public.trade_intentions enable row level security;
revoke all on public.trade_intentions from public,anon,authenticated;

create function dfl_trade_private.list_intentions() returns jsonb language sql security definer set search_path='' as $$
 with league as (select season,sleeper_league_id from public.sleeper_leagues order by season desc,id desc limit 1),
 rosters as (select distinct on(r.roster_id) r.* from public.sleeper_rosters r join league l on r.season=l.season and (r.league_id=l.sleeper_league_id or r.league_id is null) order by r.roster_id,r.synced_at desc nulls last,r.id desc)
 select coalesce(jsonb_agg(to_jsonb(i) order by i.roster_id),'[]'::jsonb)
 from public.trade_intentions i join league l on i.season=l.season and i.league_id=l.sleeper_league_id
 join public.members m on m.id=i.member_id and m.active=true
 join rosters r on r.roster_id=i.roster_id and r.sleeper_user_id=m.sleeper_user_id;
$$;

create function dfl_trade_private.save_intentions(p_season integer,p_league text,p_revision integer,p_players jsonb,p_needs text[],p_pin text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me bigint:=dfl_trade_private.actor(p_pin); league public.sleeper_leagues; roster public.sleeper_rosters; current_row public.trade_intentions; player text; status text;
begin
 select * into league from public.sleeper_leagues order by season desc,id desc limit 1;
 if not found or p_season is distinct from league.season or p_league is distinct from league.sleeper_league_id then raise exception 'The league changed. Reopen Trade.' using errcode='22023';end if;
 if p_revision is null or p_revision<0 or p_players is null or jsonb_typeof(p_players)<>'object' or octet_length(p_players::text)>4000
 or p_needs is null or cardinality(p_needs)>4 or array_ndims(p_needs)>1
 or exists(select 1 from unnest(p_needs) n where n is null or n<>all(array['QB','RB','WR','TE']))
 or cardinality(p_needs)<>(select count(distinct n) from unnest(p_needs) n) then raise exception 'Choose valid player labels and positions.' using errcode='22023';end if;
 if (select count(*) from jsonb_object_keys(p_players))>40 then raise exception 'Too many player labels.' using errcode='22023';end if;
 select r.* into roster from (
  select distinct on(r.roster_id) r.* from public.sleeper_rosters r where r.season=p_season and (r.league_id=p_league or r.league_id is null) order by r.roster_id,r.synced_at desc nulls last,r.id desc
 ) r join public.members m on m.id=me and m.sleeper_user_id=r.sleeper_user_id;
 if not found then raise exception 'Your current Sleeper roster is unavailable.' using errcode='22023';end if;
 for player,status in select key,value from jsonb_each_text(p_players) loop
  if player='' or length(player)>40 or not(coalesce(roster.players,'[]'::jsonb) ? player)
  or status is null or status<>all(array['available','listening','keeping']) then raise exception 'A player changed teams. Refresh before saving.' using errcode='22023';end if;
 end loop;
 -- Serialize the absent-row case as well as edits; a stale device cannot overwrite.
 perform pg_advisory_xact_lock(hashtextextended(me::text||':'||p_season::text||':'||p_league,0));
 select * into current_row from public.trade_intentions where member_id=me and season=p_season and league_id=p_league for update;
 if coalesce(current_row.revision,0)<>p_revision then raise exception 'Your intentions changed on another device. Reload before saving.' using errcode='40001';end if;
 insert into public.trade_intentions(member_id,season,league_id,roster_id,players,needs)
 values(me,p_season,p_league,roster.roster_id,p_players,p_needs)
 on conflict(member_id,season,league_id) do update set roster_id=excluded.roster_id,players=excluded.players,needs=excluded.needs,revision=trade_intentions.revision+1,updated_at=clock_timestamp()
 returning * into current_row;
 return to_jsonb(current_row);
end $$;
create function public.trade_intentions_list() returns jsonb language sql security invoker set search_path='' as $$select dfl_trade_private.list_intentions()$$;
create function public.trade_intentions_save(p_season integer,p_league text,p_revision integer,p_players jsonb,p_needs text[],p_pin text default null)
returns jsonb language sql security invoker set search_path='' as $$select dfl_trade_private.save_intentions(p_season,p_league,p_revision,p_players,p_needs,p_pin)$$;
revoke all on function dfl_trade_private.list_intentions(),dfl_trade_private.save_intentions(integer,text,integer,jsonb,text[],text),public.trade_intentions_list(),public.trade_intentions_save(integer,text,integer,jsonb,text[],text) from public,anon,authenticated;
grant execute on function dfl_trade_private.list_intentions(),dfl_trade_private.save_intentions(integer,text,integer,jsonb,text[],text),public.trade_intentions_list(),public.trade_intentions_save(integer,text,integer,jsonb,text[],text) to anon,authenticated;
notify pgrst,'reload schema';
