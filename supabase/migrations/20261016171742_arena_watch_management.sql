-- Maintenance uses the same Arena permission and revision lock as live controls.
-- No existing race or result is changed by installing these functions.
create or replace function dfl_arena_private.stadium_manage(
 p_event_id bigint,p_action text,p_revision integer)
returns jsonb language plpgsql set search_path='' as $$
declare e public.arena_events;
begin
 if p_action is null or p_action not in ('reset','remove') then
  raise exception 'Unknown race control.' using errcode='22023';
 end if;
 select * into e from public.arena_events where id=p_event_id for update;
 if not found then raise exception 'Race not found.' using errcode='22023';end if;
 if p_revision is null or p_revision<>e.race_revision then
  raise exception 'Race changed. Reopen the controls.' using errcode='40001';
 end if;
 if p_action='remove' then
  if e.bc_state<>'finished' and e.status<>'complete' then
   raise exception 'Only past races can be removed.' using errcode='22023';
  end if;
  perform set_config('dfl.arena_command','on',true);
  delete from public.arena_events where id=e.id;
  perform set_config('dfl.arena_command','off',true);
  return jsonb_build_object('removed_id',e.id);
 end if;
 if e.race_engine<>'stadium-v1' then
  raise exception 'This race must keep its original engine.' using errcode='22023';
 end if;
 if e.bc_state='finished' or e.status='complete' then
  raise exception 'The finish is locked. Use Race again for a new draw.' using errcode='22023';
 end if;
 -- Pause and reset under one row lock/transaction, without a client round trip.
 if e.bc_state='running' then
  perform dfl_arena_private.stadium_apply(e.id,'pause',e.race_revision);
  select * into e from public.arena_events where id=p_event_id;
  -- A race that finished before the command arrived keeps its official order.
  if e.bc_state='finished' then return public.arena_stadium_snapshot(e.id);end if;
 end if;
 perform dfl_arena_private.stadium_apply(e.id,'reset',e.race_revision);
 return public.arena_stadium_snapshot(e.id);
end $$;
revoke all on function dfl_arena_private.stadium_manage(bigint,text,integer) from public,anon,authenticated;

create or replace function public.arena_stadium_command(
 p_event_id bigint,p_action text,p_revision integer,p_name text default null,
 p_duration_seconds integer default null,p_member_ids bigint[] default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare id bigint;
begin
 if not public.has_commissioner_permission('broadcast') then
  raise exception 'Only Arena commissioners can control races.' using errcode='42501';
 end if;
 if p_action in ('reset','remove') then
  return dfl_arena_private.stadium_manage(p_event_id,p_action,p_revision);
 end if;
 id:=dfl_arena_private.stadium_apply(p_event_id,p_action,p_revision,p_name,p_duration_seconds,p_member_ids);
 return public.arena_stadium_snapshot(id);
end $$;
revoke all on function public.arena_stadium_command(bigint,text,integer,text,integer,bigint[]) from public,anon,authenticated;
grant execute on function public.arena_stadium_command(bigint,text,integer,text,integer,bigint[]) to anon,authenticated;
notify pgrst,'reload schema';
