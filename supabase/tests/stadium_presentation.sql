-- Isolated fixture only: all race changes roll back.
begin;
do $qa$
declare eid bigint; rev integer; draw jsonb; old_draw jsonb; ids bigint[];
begin
 select array_agg(id order by id) into ids from (select id from public.members where active limit 3) m;
 eid:=dfl_arena_private.stadium_apply(null,'create',0,'Presentation fixture',60,ids);
 select race_revision into rev from public.arena_events where id=eid;
 perform dfl_arena_private.stadium_apply(eid,'start',rev);
 select race_manifest,race_revision into draw,rev from public.arena_events where id=eid;
 if draw->>'presentation_version'<>'2' or jsonb_array_length(draw->'order')<>3 then raise exception 'new presentation was not sealed with draw';end if;
 perform dfl_arena_private.stadium_apply(eid,'pause',rev);
 select race_revision into rev from public.arena_events where id=eid;
 perform dfl_arena_private.stadium_apply(eid,'configure',rev,'Presentation fixture',120,ids);
 if (select race_manifest from public.arena_events where id=eid)<>draw then raise exception 'duration edit changed the sealed presentation';end if;
 select race_revision into rev from public.arena_events where id=eid;
 perform dfl_arena_private.stadium_apply(eid,'resume',rev);
 if (select race_manifest from public.arena_events where id=eid)<>draw then raise exception 'resume changed the sealed presentation';end if;
 -- Simulate an existing legacy draw; updating it in place must never upgrade it.
 perform set_config('dfl.arena_command','on',true);
 old_draw:=draw-'presentation_version';
 update public.arena_events set race_manifest=old_draw where id=eid;
 update public.arena_events set race_manifest=race_manifest where id=eid;
 perform set_config('dfl.arena_command','off',true);
 if (select race_manifest from public.arena_events where id=eid)<>old_draw then raise exception 'old draw was rewritten';end if;
 begin update public.arena_events set race_manifest=draw where id=eid;raise exception 'public draw write bypassed guard';exception when insufficient_privilege then null;end;
 if has_function_privilege('anon','dfl_arena_private.stamp_stadium_presentation()','execute') or has_function_privilege('authenticated','dfl_arena_private.stamp_stadium_presentation()','execute') then raise exception 'trigger function publicly executable';end if;
end $qa$;
rollback;
