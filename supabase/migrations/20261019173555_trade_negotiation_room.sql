-- Offers are DFL negotiations, never instructions to execute a Sleeper trade.
create schema if not exists dfl_trade_private;
revoke all on schema dfl_trade_private from public;
grant usage on schema dfl_trade_private to anon,authenticated;
create table public.trade_rooms (
 id bigint generated always as identity primary key,
 season integer not null,
 league_id text not null,
 owner_id bigint not null references public.members(id),
 client_key uuid not null,
 member_ids bigint[] not null,
 sender_id bigint not null references public.members(id),
 proposal jsonb not null,
 status text not null check(status in ('draft','pending','agreed','declined','withdrawn')),
 accepted_ids bigint[] not null default '{}',
 revision integer not null default 1,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(owner_id,client_key)
);
create index trade_rooms_members on public.trade_rooms using gin(member_ids);
create index trade_rooms_updated on public.trade_rooms(updated_at desc);
create index trade_rooms_sender on public.trade_rooms(sender_id);
create table public.trade_room_events (
 room_id bigint not null references public.trade_rooms(id) on delete cascade,
 revision integer not null,
 actor_id bigint not null references public.members(id),
 action text not null,
 proposal jsonb,
 created_at timestamptz not null default clock_timestamp(),
 primary key(room_id,revision)
);
create index trade_room_events_actor on public.trade_room_events(actor_id);
alter table public.trade_rooms enable row level security;
alter table public.trade_room_events enable row level security;
-- No direct REST/table access: private RPCs check the existing member/PIN model
-- for both reads and writes. An x-member-id alone cannot open a locked profile.
revoke all on public.trade_rooms,public.trade_room_events from public,anon,authenticated;

create function dfl_trade_private.actor(p_pin text) returns bigint language plpgsql security definer set search_path='' as $$
declare me bigint:=public.request_member_id();
begin
 if me is null or not exists(select 1 from public.members where id=me and active=true)
 or public.keeper_self_identity_ok(me,p_pin) is not true then
  raise exception 'Unlock your profile to open trade offers.' using errcode='42501';
 end if;
 return me;
end $$;

create function dfl_trade_private.validate(p_proposal jsonb,p_season integer,p_league text) returns bigint[] language plpgsql security definer set search_path='' as $$
declare ids bigint[]:='{}'; owners bigint[]:='{}'; sent text[]:='{}'; received text[]:='{}'; roster public.sleeper_rosters; tid text; pid text; target text; mid bigint; i integer;
begin
 if p_proposal is null or jsonb_typeof(p_proposal)<>'object' or octet_length(p_proposal::text)>4000
 or jsonb_typeof(p_proposal->'teamIds') is distinct from 'array' or jsonb_typeof(p_proposal->'sends') is distinct from 'array'
 or jsonb_typeof(p_proposal->'destinations') is distinct from 'object' then raise exception 'Invalid trade package.' using errcode='22023';end if;
 if jsonb_array_length(p_proposal->'teamIds') not between 2 and 8
 or jsonb_array_length(p_proposal->'sends')<>jsonb_array_length(p_proposal->'teamIds')
 or exists(select 1 from jsonb_object_keys(p_proposal) k where k<>all(array['teamIds','sends','destinations'])) then raise exception 'Invalid trade teams.' using errcode='22023';end if;
 for i in 0..jsonb_array_length(p_proposal->'teamIds')-1 loop
  tid:=p_proposal->'teamIds'->>i;
  if tid !~ '^[1-9][0-9]{0,3}$' or tid::bigint=any(ids) then raise exception 'Choose distinct trade teams.' using errcode='22023';end if;
  ids:=array_append(ids,tid::bigint);
  select * into roster from public.sleeper_rosters r where r.season=p_season and r.roster_id=tid::integer and (r.league_id=p_league or r.league_id is null) order by r.synced_at desc nulls last,r.id desc limit 1;
  if not found then raise exception 'Sync the current league rosters first.' using errcode='22023';end if;
  select min(id) into mid from public.members where active=true and sleeper_user_id=roster.sleeper_user_id;
  if mid is null or mid=any(owners) then raise exception 'Every team needs a current DFL manager.' using errcode='22023';end if;
  owners:=array_append(owners,mid);
  if jsonb_typeof(p_proposal->'sends'->i) is distinct from 'array' then raise exception 'Invalid player list.' using errcode='22023';end if;
  if jsonb_array_length(p_proposal->'sends'->i) not between 1 and 7 then raise exception 'Each team must send players.' using errcode='22023';end if;
  for pid in select jsonb_array_elements_text(p_proposal->'sends'->i) loop
   if pid is null or length(pid)>40 or pid=any(sent) or not(coalesce(roster.players,'[]'::jsonb) ? pid) then raise exception 'A player changed teams. Sync rosters and rebuild the offer.' using errcode='22023';end if;
   target:=p_proposal->'destinations'->>pid;
   if target is null or target=tid or not(p_proposal->'teamIds' ? target) then raise exception 'Choose a different receiving team for every player.' using errcode='22023';end if;
   sent:=array_append(sent,pid);received:=array_append(received,target);
  end loop;
 end loop;
 if cardinality(sent)>8 or exists(select 1 from jsonb_array_elements_text(p_proposal->'teamIds') t where not(t=any(received)))
 or (select count(*) from jsonb_object_keys(p_proposal->'destinations'))<>cardinality(sent) then raise exception 'Every team must receive players; eight players maximum.' using errcode='22023';end if;
 return owners;
end $$;

create function dfl_trade_private.terms(p_proposal jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select jsonb_object_agg(player,jsonb_build_array(p_proposal->'teamIds'->>(ordinality-1)::integer,p_proposal->'destinations'->>player))
 from jsonb_array_elements(p_proposal->'sends') with ordinality sends(ids,ordinality)
 cross join lateral jsonb_array_elements_text(ids) players(player)
$$;

create function dfl_trade_private.list_rooms(p_pin text) returns jsonb language plpgsql security definer set search_path='' as $$
declare me bigint:=dfl_trade_private.actor(p_pin);
begin
 return (select coalesce(jsonb_agg(to_jsonb(t) order by t.updated_at desc),'[]'::jsonb) from
 (select * from public.trade_rooms where me=any(member_ids) and (status<>'draft' or owner_id=me) order by updated_at desc limit 50) t);
end $$;
create function dfl_trade_private.read_room(p_id bigint,p_pin text) returns jsonb language plpgsql security definer set search_path='' as $$
declare me bigint:=dfl_trade_private.actor(p_pin); r public.trade_rooms;
begin
 select * into r from public.trade_rooms where id=p_id and me=any(member_ids) and (status<>'draft' or owner_id=me);
 if not found then raise exception 'Offer not found.' using errcode='42501';end if;
 return to_jsonb(r)||jsonb_build_object('events',(select coalesce(jsonb_agg(to_jsonb(e) order by revision desc),'[]'::jsonb) from public.trade_room_events e where room_id=r.id));
end $$;
create function dfl_trade_private.command(p_action text,p_id bigint,p_revision integer,p_season integer,p_proposal jsonb,p_pin text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare me bigint:=dfl_trade_private.actor(p_pin); r public.trade_rooms; owners bigint[]; league public.sleeper_leagues; next_proposal jsonb;
begin
 if p_action is null or p_action not in ('save','send','counter','accept','decline','withdraw','remove') then raise exception 'Unknown offer action.' using errcode='22023';end if;
 if p_id is null then
  if p_action not in ('save','send') or p_revision is distinct from 0 then raise exception 'Open the latest offer.' using errcode='40001';end if;
  select * into league from public.sleeper_leagues order by season desc,id desc limit 1;
  if league.season is distinct from p_season then raise exception 'Use the current season.' using errcode='22023';end if;
  owners:=dfl_trade_private.validate(p_proposal,p_season,league.sleeper_league_id);
  if not(me=any(owners)) then raise exception 'Your team must be part of the offer.' using errcode='42501';end if;
  -- Bound accidental repeated taps/retries without swallowing genuinely new terms.
  perform pg_advisory_xact_lock(7443,me::integer);
  if p_request_id is null then raise exception 'Reopen the offer before sending.' using errcode='22023';end if;
  select * into r from public.trade_rooms where owner_id=me and client_key=p_request_id;
  if found then return to_jsonb(r);end if;
  if (select count(*) from public.trade_rooms where owner_id=me and status in ('draft','pending'))>=30 then raise exception 'Close an older offer before adding another.' using errcode='22023';end if;
  insert into public.trade_rooms(season,league_id,owner_id,client_key,member_ids,sender_id,proposal,status,accepted_ids)
  values(p_season,league.sleeper_league_id,me,p_request_id,owners,me,p_proposal,case when p_action='save' then 'draft' else 'pending' end,case when p_action='send' then array[me] else '{}'::bigint[] end) returning * into r;
 else
  select * into r from public.trade_rooms where id=p_id for update;
  if not found or not(me=any(r.member_ids)) or (r.status='draft' and r.owner_id<>me) then raise exception 'Offer not found.' using errcode='42501';end if;
  if r.revision is distinct from p_revision then raise exception 'This offer changed. Refresh before responding.' using errcode='40001';end if;
  if p_action='remove' then
   if r.status<>'draft' or r.owner_id<>me then raise exception 'Only your own draft can be removed.' using errcode='42501';end if;
   delete from public.trade_rooms where id=r.id;return jsonb_build_object('removed',r.id);
  end if;
  if r.revision>=100 then raise exception 'Offer history is full. Start a new offer.' using errcode='22023';end if;
  if p_action in ('save','send','counter','accept') then
   select * into league from public.sleeper_leagues order by season desc,id desc limit 1;
   if r.season<>league.season or r.league_id<>league.sleeper_league_id then raise exception 'This offer belongs to a past league. Start a new offer.' using errcode='22023';end if;
   next_proposal:=case when p_action in ('save','send','counter') then p_proposal else r.proposal end;
   owners:=dfl_trade_private.validate(next_proposal,r.season,r.league_id);
   if not(owners@>r.member_ids and owners<@r.member_ids) then raise exception 'Start a new offer to change managers.' using errcode='22023';end if;
  end if;
  if p_action in ('save','send') then
   if r.status<>'draft' or r.owner_id<>me then raise exception 'This draft has already been sent.' using errcode='40001';end if;
   r.proposal:=next_proposal;r.sender_id:=me;r.status:=case when p_action='save' then 'draft' else 'pending' end;
   r.accepted_ids:=case when p_action='send' then array[me] else '{}'::bigint[] end;
  elsif p_action='counter' then
   if r.status<>'pending' or r.sender_id=me then raise exception 'Only a recipient can counter a pending offer.' using errcode='42501';end if;
   if dfl_trade_private.terms(r.proposal)=dfl_trade_private.terms(next_proposal) then raise exception 'Change the players or routing before sending a counter.' using errcode='22023';end if;
   r.proposal:=next_proposal;r.sender_id:=me;r.accepted_ids:=array[me];
  elsif p_action='accept' then
   if r.status<>'pending' or me=any(r.accepted_ids) then raise exception 'This offer is not waiting for your agreement.' using errcode='40001';end if;
   r.accepted_ids:=array_append(r.accepted_ids,me);
   if r.accepted_ids@>r.member_ids then r.status:='agreed';end if;
  elsif p_action='decline' then
   if r.status<>'pending' or r.sender_id=me then raise exception 'Only a recipient can decline a pending offer.' using errcode='42501';end if;
   r.status:='declined';
  elsif p_action='withdraw' then
   if r.status<>'pending' or r.sender_id<>me then raise exception 'Only the sender can withdraw a pending offer.' using errcode='42501';end if;
   r.status:='withdrawn';
  end if;
  update public.trade_rooms set proposal=r.proposal,sender_id=r.sender_id,status=r.status,accepted_ids=r.accepted_ids,revision=r.revision+1,updated_at=clock_timestamp() where id=r.id returning * into r;
 end if;
 insert into public.trade_room_events(room_id,revision,actor_id,action,proposal) values(r.id,r.revision,me,p_action,case when p_action in ('save','send','counter') then r.proposal else null end);
 return to_jsonb(r);
end $$;

-- The REST-visible wrappers are invokers. Definer bodies stay in an unexposed schema.
create function public.trade_room_list(p_pin text default null) returns jsonb language sql security invoker set search_path='' as $$select dfl_trade_private.list_rooms(p_pin)$$;
create function public.trade_room_read(p_id bigint,p_pin text default null) returns jsonb language sql security invoker set search_path='' as $$select dfl_trade_private.read_room(p_id,p_pin)$$;
create function public.trade_room_command(p_action text,p_id bigint default null,p_revision integer default 0,p_season integer default null,p_proposal jsonb default null,p_pin text default null,p_request_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select dfl_trade_private.command(p_action,p_id,p_revision,p_season,p_proposal,p_pin,p_request_id)$$;
revoke all on all functions in schema dfl_trade_private from public,anon,authenticated;
grant execute on function dfl_trade_private.list_rooms(text),dfl_trade_private.read_room(bigint,text),dfl_trade_private.command(text,bigint,integer,integer,jsonb,text,uuid) to anon,authenticated;
revoke all on function public.trade_room_list(text),public.trade_room_read(bigint,text),public.trade_room_command(text,bigint,integer,integer,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.trade_room_list(text),public.trade_room_read(bigint,text),public.trade_room_command(text,bigint,integer,integer,jsonb,text,uuid) to anon,authenticated;
notify pgrst,'reload schema';
