-- Run as the database owner after both stadium migrations. Everything rolls back.
begin;
do $qa$
declare ids bigint[]; eid bigint; legacy bigint; rev integer; payload jsonb; saved jsonb;
begin
 select array_agg(id) into ids from(select id from public.members where active=true order by id limit 3)m;
 eid:=dfl_arena_private.stadium_apply(null,'create',0,'Rollback stadium QA',30,ids);
 perform set_config('dfl.arena_test_id',eid::text,true);
 select race_revision into rev from public.arena_events where id=eid;
 perform dfl_arena_private.stadium_apply(eid,'start',rev);
 select race_revision into rev from public.arena_events where id=eid;
 begin perform dfl_arena_private.stadium_apply(eid,'pause',rev-1);raise exception 'stale control allowed';exception when serialization_failure then null;end;
 begin perform dfl_arena_private.stadium_apply(eid,'configure',rev,'Bad edit',40,ids);raise exception 'running edits allowed';exception when invalid_parameter_value then null;end;
 perform dfl_arena_private.stadium_apply(eid,'pause',rev);
 if (select bc_offset_ms from public.arena_events where id=eid)>=0 then raise exception 'countdown not paused';end if;
 select race_revision into rev from public.arena_events where id=eid;
 perform dfl_arena_private.stadium_apply(eid,'resume',rev);
 perform set_config('dfl.arena_command','on',true);
 update public.arena_events set bc_started_at=clock_timestamp()-interval '10 seconds',bc_offset_ms=0 where id=eid;
 perform set_config('dfl.arena_command','off',true);
 select race_revision into rev from public.arena_events where id=eid;
 perform dfl_arena_private.stadium_apply(eid,'pause',rev);
 select race_revision,race_manifest into rev,saved from public.arena_events where id=eid;
 begin perform dfl_arena_private.stadium_apply(eid,'configure',rev,'Bad edit',40,array[ids[2],ids[1],ids[3]]);raise exception 'paused roster changed';exception when invalid_parameter_value then null;end;
 select id into legacy from public.arena_events where race_engine='legacy' limit 1;
 if legacy is not null then
  begin update public.arena_participants set event_id=legacy where event_id=eid;raise exception 'parent guard failed';exception when insufficient_privilege then null;end;
 end if;
 perform dfl_arena_private.stadium_apply(eid,'configure',rev,'Updated fixture',60,ids);
 if (select bc_offset_ms from public.arena_events where id=eid) not between 19950 and 20200 then raise exception 'duration edit lost progress';end if;
 if (select race_manifest from public.arena_events where id=eid)<>saved then raise exception 'draw changed on configure';end if;
 select race_revision into rev from public.arena_events where id=eid;
 perform dfl_arena_private.stadium_apply(eid,'resume',rev);
 perform set_config('dfl.arena_command','on',true);
 update public.arena_events set bc_started_at=clock_timestamp()-interval '70 seconds' where id=eid;
 perform set_config('dfl.arena_command','off',true);
 payload:=public.arena_stadium_snapshot(eid);
 if jsonb_array_length(payload->'results')<>3 or payload->'event'->>'bc_state'<>'finished' then raise exception 'canonical finish failed';end if;
 perform public.arena_stadium_snapshot(eid);
 if (select count(*) from public.arena_results where event_id=eid)<>3 or (select max(finish_ms) from public.arena_results where event_id=eid)<>60000 then raise exception 'duplicate/wrong finish';end if;
 select race_revision into rev from public.arena_events where id=eid;
 begin perform dfl_arena_private.stadium_apply(eid,'reset',rev);raise exception 'archived reset allowed';exception when invalid_parameter_value then null;end;
 begin update public.arena_events set seed=1 where id=eid;raise exception 'direct draw edit allowed';exception when insufficient_privilege then null;end;
end $qa$;
set local role anon;
do $qa$
declare eid bigint:=current_setting('dfl.arena_test_id')::bigint;
begin
 if public.arena_stadium_snapshot(eid)->>'can_control'<>'false' then raise exception 'anonymous controls granted';end if;
 begin perform public.arena_stadium_command(eid,'start',0);raise exception 'anonymous start allowed';exception when insufficient_privilege then null;end;
 begin perform dfl_arena_private.stadium_apply(null,'create',0,'No access',30,array[1::bigint,2::bigint]);raise exception 'private function exposed';exception when insufficient_privilege then null;end;
end $qa$;
rollback;
