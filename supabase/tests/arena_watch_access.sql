-- Isolated fixture only: has_commissioner_permission reads this test identity.
begin;
select set_config('qa.arena_commissioner','on',true);
do $$declare eid bigint;begin
 eid:=dfl_arena_private.stadium_apply(null,'create',0,'Public wrapper QA',30,array(select id from public.members order by id limit 3));
 perform set_config('qa.event_id',eid::text,true);
end$$;
set local role anon;
do $$declare eid bigint:=current_setting('qa.event_id')::bigint; rev integer; result jsonb;begin
 rev:=(public.arena_stadium_snapshot(eid)->'event'->>'race_revision')::integer;
 result:=public.arena_stadium_command(eid,'start',rev);
 result:=public.arena_stadium_command(eid,'reset',(result->'event'->>'race_revision')::integer);
 if result->'event'->>'bc_state'<>'idle' or result->>'can_control'<>'true' then raise exception 'authorized public reset failed';end if;
 result:=public.arena_stadium_command(eid,'start',(result->'event'->>'race_revision')::integer);
end$$;
reset role;
select set_config('dfl.arena_command','on',true);
update public.arena_events set bc_started_at=clock_timestamp()-interval '40 seconds' where id=current_setting('qa.event_id')::bigint;
select set_config('dfl.arena_command','off',true);
set local role anon;
do $$declare eid bigint:=current_setting('qa.event_id')::bigint;result jsonb;begin
 result:=public.arena_stadium_snapshot(eid);
 result:=public.arena_stadium_command(eid,'remove',(result->'event'->>'race_revision')::integer);
 if (result->>'removed_id')::bigint<>eid or exists(select 1 from public.arena_events where id=eid) then raise exception 'authorized public deletion failed';end if;
 perform set_config('qa.arena_commissioner','off',true);
 begin perform public.arena_stadium_command(eid,'remove',0);raise exception 'revoked controls allowed';exception when insufficient_privilege then null;end;
end$$;
rollback;
