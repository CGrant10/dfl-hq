-- Run as the database owner after the Arena migrations. All fixture rows roll back.
begin;
do $qa$
declare ids bigint[]; eid bigint; legacy bigint; rev integer; result jsonb; saved jsonb;
begin
 select array_agg(id) into ids from(select id from public.members where active=true order by id limit 3)m;
 eid:=dfl_arena_private.stadium_apply(null,'create',0,'Rollback maintenance QA',30,ids);
 select race_revision into rev from public.arena_events where id=eid;
 begin perform dfl_arena_private.stadium_manage(eid,'remove',rev);raise exception 'setup deletion allowed';exception when invalid_parameter_value then null;end;
 perform dfl_arena_private.stadium_apply(eid,'start',rev);
 select race_revision into rev from public.arena_events where id=eid;
 begin perform dfl_arena_private.stadium_manage(eid,'remove',rev);raise exception 'live deletion allowed';exception when invalid_parameter_value then null;end;
 begin perform dfl_arena_private.stadium_manage(eid,'reset',rev-1);raise exception 'stale reset allowed';exception when serialization_failure then null;end;
 result:=dfl_arena_private.stadium_manage(eid,'reset',rev);
 if result->'event'->>'bc_state'<>'idle' or result->'event'->'race_manifest'<>'null'::jsonb or result->'event'->>'seed' is not null
  or (result->'event'->>'bc_offset_ms')::integer<>0 or (result->'event'->>'race_revision')::integer<>rev+2
  or jsonb_array_length(result->'participants')<>3 then raise exception 'live reset did not return the existing lineup to setup';end if;
 select race_revision into rev from public.arena_events where id=eid;
 perform dfl_arena_private.stadium_apply(eid,'start',rev);
 select race_revision into rev from public.arena_events where id=eid;
 perform dfl_arena_private.stadium_apply(eid,'pause',rev);
 select race_revision into rev from public.arena_events where id=eid;
 result:=dfl_arena_private.stadium_manage(eid,'reset',rev);
 if result->'event'->>'bc_state'<>'idle' then raise exception 'paused reset failed';end if;
 select race_revision into rev from public.arena_events where id=eid;
 perform dfl_arena_private.stadium_apply(eid,'start',rev);
 perform set_config('dfl.arena_command','on',true);
 update public.arena_events set bc_started_at=clock_timestamp()-interval '40 seconds' where id=eid;
 perform set_config('dfl.arena_command','off',true);
 select race_revision into rev from public.arena_events where id=eid;
 -- A finish that wins the race with Reset keeps its official order.
 result:=dfl_arena_private.stadium_manage(eid,'reset',rev);
 if result->'event'->>'bc_state'<>'finished' or jsonb_array_length(result->'results')<>3 then raise exception 'reset erased a finish';end if;
 saved:=result->'results';select race_revision into rev from public.arena_events where id=eid;
 begin perform dfl_arena_private.stadium_manage(eid,'reset',rev);raise exception 'finished reset allowed';exception when invalid_parameter_value then null;end;
 if public.arena_stadium_snapshot(eid)->'results'<>saved then raise exception 'locked results changed';end if;
 begin perform dfl_arena_private.stadium_manage(eid,'remove',rev-1);raise exception 'stale deletion allowed';exception when serialization_failure then null;end;
 result:=dfl_arena_private.stadium_manage(eid,'remove',rev);
 if (result->>'removed_id')::bigint<>eid or exists(select 1 from public.arena_events where id=eid)
  or exists(select 1 from public.arena_results where event_id=eid)
  or exists(select 1 from public.arena_participants where event_id=eid) then raise exception 'past race deletion left linked rows';end if;
 insert into public.arena_events(name,status) values('Rollback legacy QA','complete') returning id into legacy;
 insert into public.arena_participants(event_id,member_id) values(legacy,ids[1]);
 insert into public.arena_results(event_id,member_id,place) values(legacy,ids[1],1);
 perform dfl_arena_private.stadium_manage(legacy,'remove',0);
 if exists(select 1 from public.arena_events where id=legacy) or (select count(*) from public.members where id=any(ids))<>3 then raise exception 'legacy deletion failed or removed members';end if;
end $qa$;
set local role anon;
do $qa$
begin
 begin perform public.arena_stadium_command(0,'reset',0);raise exception 'anonymous reset allowed';exception when insufficient_privilege then null;end;
 begin perform public.arena_stadium_command(0,'remove',0);raise exception 'anonymous deletion allowed';exception when insufficient_privilege then null;end;
 begin perform dfl_arena_private.stadium_manage(0,'remove',0);raise exception 'private maintenance exposed';exception when insufficient_privilege then null;end;
end $qa$;
rollback;
