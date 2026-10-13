-- Shared stadium races. Existing completed/active legacy races are retained.
create schema if not exists dfl_arena_private;
revoke all on schema dfl_arena_private from public,anon,authenticated;

alter table public.arena_events
 add column if not exists race_engine text not null default 'legacy',
 add column if not exists race_duration_ms integer not null default 60000,
 add column if not exists race_revision integer not null default 0,
 add column if not exists race_manifest jsonb;

-- Ready legacy events convert only when their commissioner saves/starts them.
-- Adding this API never changes an existing race, seed, result, or clock.

create or replace function dfl_arena_private.guard_stadium_write()
returns trigger language plpgsql security definer set search_path='' as $$
declare engine text;
begin
 if tg_table_name='arena_events' then
  engine:=case when tg_op='DELETE' then old.race_engine else new.race_engine end;
  if tg_op='UPDATE' and old.race_engine='stadium-v1' then engine:='stadium-v1'; end if;
 else
  select e.race_engine into engine from public.arena_events e
   where e.id=case when tg_op='DELETE' then old.event_id else new.event_id end;
 end if;
 if engine='stadium-v1' and current_setting('dfl.arena_command',true) is distinct from 'on' then
  raise exception 'Use the stadium race controls.' using errcode='42501';
 end if;
 if tg_op='DELETE' then return old; end if;return new;
end $$;
revoke all on function dfl_arena_private.guard_stadium_write() from public,anon,authenticated;
create trigger stadium_event_write before insert or update or delete on public.arena_events
 for each row execute function dfl_arena_private.guard_stadium_write();
create trigger stadium_participant_write before insert or update or delete on public.arena_participants
 for each row execute function dfl_arena_private.guard_stadium_write();
create trigger stadium_result_write before insert or update or delete on public.arena_results
 for each row execute function dfl_arena_private.guard_stadium_write();

-- Finalization is derived solely from the locked draw and the server clock.
create or replace function dfl_arena_private.finish_stadium(p_id bigint)
returns void language plpgsql security definer set search_path='' as $$
declare e public.arena_events; elapsed numeric; count_racers integer;
begin
 select * into e from public.arena_events where id=p_id for update;
 if not found or e.race_engine<>'stadium-v1' or e.bc_state<>'running' or e.race_manifest is null then return;end if;
 elapsed:=extract(epoch from(clock_timestamp()-e.bc_started_at))*1000+e.bc_offset_ms;
 if elapsed<e.race_duration_ms then return;end if;
 count_racers:=jsonb_array_length(e.race_manifest->'order');
 perform set_config('dfl.arena_command','on',true);
 insert into public.arena_results(event_id,member_id,place,finish_ms)
 select e.id,member_id::bigint,place::integer,
  round(e.race_duration_ms*(.975+.025*(place-1)/greatest(1,count_racers-1)))::integer
 from jsonb_array_elements_text(e.race_manifest->'order') with ordinality as r(member_id,place)
 on conflict(event_id,member_id) do nothing;
 if (select count(*) from public.arena_results where event_id=e.id)<>count_racers then
  raise exception 'The official finish could not be saved.';
 end if;
 update public.arena_events set bc_state='finished',status='complete',bc_started_at=null,
  bc_offset_ms=race_duration_ms,completed_at=clock_timestamp(),race_revision=race_revision+1 where id=e.id;
 perform set_config('dfl.arena_command','off',true);
end $$;
revoke all on function dfl_arena_private.finish_stadium(bigint) from public,anon,authenticated;

create or replace function public.arena_stadium_snapshot(p_event_id bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.arena_events; payload jsonb;
begin
 perform dfl_arena_private.finish_stadium(p_event_id);
 select * into e from public.arena_events where id=p_event_id;
 if not found then raise exception 'Race not found.' using errcode='22023';end if;
 payload:=jsonb_build_object('event',to_jsonb(e),
  'participants',(select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order,p.id),'[]'::jsonb) from public.arena_participants p where p.event_id=e.id),
  'results',(select coalesce(jsonb_agg(to_jsonb(r) order by r.place),'[]'::jsonb) from public.arena_results r where r.event_id=e.id),
  'can_control',public.has_commissioner_permission('broadcast'),
  'server_ms',round(extract(epoch from clock_timestamp())*1000)::bigint);
 return payload;
end $$;
revoke all on function public.arena_stadium_snapshot(bigint) from public,anon,authenticated;
grant execute on function public.arena_stadium_snapshot(bigint) to anon,authenticated;

-- Private command implementation is not exposed through the Data API.
create or replace function dfl_arena_private.stadium_apply(
 p_event_id bigint,p_action text,p_revision integer,p_name text default null,
 p_duration_seconds integer default null,p_member_ids bigint[] default null)
returns bigint language plpgsql security definer set search_path='' as $$
declare e public.arena_events; ids bigint[]; n integer; elapsed numeric; seed_bytes bytea; draw_seed bigint; draw_order jsonb; actor bigint;
begin
 if p_action is null or p_action not in ('create','configure','start','pause','resume','reset') then
  raise exception 'Unknown race control.' using errcode='22023';end if;
 if p_action='create' then
  if length(trim(coalesce(p_name,''))) not between 1 and 80 then raise exception 'Enter a race name.' using errcode='22023';end if;
  if p_duration_seconds is null or p_duration_seconds not between 15 and 600 then raise exception 'Choose 15–600 seconds.' using errcode='22023';end if;
  ids:=p_member_ids;
 else
  select * into e from public.arena_events where id=p_event_id for update;
  if not found then raise exception 'Stadium race not found.' using errcode='22023';end if;
  if e.race_engine<>'stadium-v1' and not(p_action='configure' and e.bc_state='idle' and e.status='setup'
   and not exists(select 1 from public.arena_results where event_id=e.id)) then
   raise exception 'This existing race must keep its original engine.' using errcode='22023';end if;
  if p_revision is null or p_revision<>e.race_revision then raise exception 'Race changed. Refresh the controls.' using errcode='40001';end if;
  elapsed:=case when e.bc_state='running' then extract(epoch from(clock_timestamp()-e.bc_started_at))*1000+e.bc_offset_ms else e.bc_offset_ms end;
  if e.bc_state='running' and elapsed>=e.race_duration_ms then
   perform dfl_arena_private.finish_stadium(e.id);return e.id;
  end if;
  if e.bc_state='finished' or e.status='complete' then raise exception 'This order is locked. Create another race.' using errcode='22023';end if;
  if p_action='configure' then
   if e.bc_state not in ('idle','paused') then raise exception 'Pause the race before editing.' using errcode='22023';end if;
   if p_duration_seconds is null or p_duration_seconds not between 15 and 600 then raise exception 'Choose 15–600 seconds.' using errcode='22023';end if;
   if length(trim(coalesce(p_name,e.name))) not between 1 and 80 then raise exception 'Enter a race name.' using errcode='22023';end if;
   ids:=coalesce(p_member_ids,array(select member_id from public.arena_participants where event_id=e.id order by sort_order,id));
  end if;
 end if;
 if p_action in ('create','configure') then
  n:=coalesce(cardinality(ids),0);
  if n not between 2 and 32 or (select count(distinct x) from unnest(ids)x)<>n
   or (select count(*) from public.members m where m.id=any(ids) and m.active=true)<>n then
   raise exception 'Choose 2–32 different active DFL members.' using errcode='22023';end if;
 end if;
 perform set_config('dfl.arena_command','on',true);
 if p_action='create' then
  insert into public.arena_events(name,theme,race_length,length_ticks,race_engine,race_duration_ms,race_revision)
   values(trim(p_name),'stadium','custom',p_duration_seconds*25,'stadium-v1',p_duration_seconds*1000,1) returning * into e;
 elsif p_action='configure' then
  if e.bc_state='paused' then
   if ids is distinct from array(select member_id from public.arena_participants where event_id=e.id order by sort_order,id) then
    raise exception 'Restart the draw before changing racers.' using errcode='22023';end if;
   if elapsed>=e.race_duration_ms*.9 then raise exception 'Final sprint underway. Resume to finish.' using errcode='22023';end if;
   elapsed:=case when elapsed<0 then elapsed else round(elapsed/e.race_duration_ms*(p_duration_seconds*1000)) end;
  end if;
  update public.arena_events set name=trim(coalesce(p_name,name)),race_engine='stadium-v1',race_duration_ms=p_duration_seconds*1000,
   race_length='custom',length_ticks=p_duration_seconds*25,
   bc_offset_ms=case when bc_state='paused' then elapsed::integer else 0 end,
   race_revision=race_revision+1 where id=e.id returning * into e;
 end if;
 if p_action='create' or p_action='configure' and e.bc_state='idle' then
  delete from public.arena_participants where event_id=e.id;
  insert into public.arena_participants(event_id,member_id,sort_order,number,sprite)
   select e.id,id,ordinality::integer-1,ordinality::integer,'stadium' from unnest(ids) with ordinality as m(id,ordinality);
 end if;
 if p_action='start' then
  if e.bc_state<>'idle' then raise exception 'The race is already started.' using errcode='22023';end if;
  ids:=array(select member_id from public.arena_participants where event_id=e.id order by sort_order,id);
  if cardinality(ids) not between 2 and 32 then raise exception 'Choose at least two racers.' using errcode='22023';end if;
  if exists(select 1 from public.members where id=any(ids) and active is distinct from true) then raise exception 'The racer list changed. Edit the lineup.';end if;
  seed_bytes:=extensions.gen_random_bytes(32);
  draw_seed:=get_byte(seed_bytes,0)::bigint*16777216+get_byte(seed_bytes,1)::bigint*65536+get_byte(seed_bytes,2)::bigint*256+get_byte(seed_bytes,3)::bigint+1;
  select jsonb_agg(id::text order by extensions.digest(seed_bytes||convert_to(id::text,'UTF8'),'sha256')) into draw_order from unnest(ids) as m(id);
  update public.arena_events set seed=draw_seed,bc_state='running',bc_started_at=clock_timestamp()+interval '3 seconds',bc_offset_ms=0,
   race_manifest=jsonb_build_object('engine','stadium-v1','seed',draw_seed,'order',draw_order,
    'story_duration_ms',race_duration_ms,'run_id',gen_random_uuid(),'draw_hash',encode(extensions.digest(seed_bytes,'sha256'),'hex')),
   race_revision=race_revision+1 where id=e.id;
 elsif p_action='pause' then
  if e.bc_state<>'running' then raise exception 'The race is not running.' using errcode='22023';end if;
  update public.arena_events set bc_state='paused',bc_started_at=null,bc_offset_ms=round(elapsed)::integer,race_revision=race_revision+1 where id=e.id;
 elsif p_action='resume' then
  if e.bc_state<>'paused' then raise exception 'The race is not paused.' using errcode='22023';end if;
  update public.arena_events set bc_state='running',bc_started_at=clock_timestamp(),race_revision=race_revision+1 where id=e.id;
 elsif p_action='reset' then
  if e.bc_state not in ('idle','paused') then raise exception 'Pause the race before restarting.' using errcode='22023';end if;
  update public.arena_events set bc_state='idle',bc_started_at=null,bc_offset_ms=0,seed=null,race_manifest=null,race_revision=race_revision+1 where id=e.id;
 end if;
 perform set_config('dfl.arena_command','off',true);
 return e.id;
end $$;
revoke all on function dfl_arena_private.stadium_apply(bigint,text,integer,text,integer,bigint[]) from public,anon,authenticated;

create or replace function public.arena_stadium_command(
 p_event_id bigint,p_action text,p_revision integer,p_name text default null,
 p_duration_seconds integer default null,p_member_ids bigint[] default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare id bigint;
begin
 if not public.has_commissioner_permission('broadcast') then
  raise exception 'Only Arena commissioners can control races.' using errcode='42501';end if;
 id:=dfl_arena_private.stadium_apply(p_event_id,p_action,p_revision,p_name,p_duration_seconds,p_member_ids);
 return public.arena_stadium_snapshot(id);
end $$;
revoke all on function public.arena_stadium_command(bigint,text,integer,text,integer,bigint[]) from public,anon,authenticated;
grant execute on function public.arena_stadium_command(bigint,text,integer,text,integer,bigint[]) to anon,authenticated;

alter table public.arena_events enable row level security;
alter table public.arena_participants enable row level security;
alter table public.arena_results enable row level security;
notify pgrst,'reload schema';
