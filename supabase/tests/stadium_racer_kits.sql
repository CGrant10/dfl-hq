-- Owner-only fixture setup; member API calls run as anon. All writes roll back.
begin;
do $setup$
declare me bigint; other bigint;
begin
 select id into me from public.members where active=true order by id limit 1;
 select id into other from public.members where active=true and id<>me order by id limit 1;
 perform set_config('dfl.kit_test_member',me::text,true);
 perform set_config('dfl.kit_test_other',other::text,true);
 perform set_config('dfl.kit_test_events',(select md5(coalesce(jsonb_agg(to_jsonb(e) order by id)::text,'')) from public.arena_events e),true);
 delete from public.arena_racer_kits where member_id=me;
 insert into public.profile_locks(member_id,pin_hash,active) values(me,extensions.crypt('493817',extensions.gen_salt('bf')),true)
 on conflict(member_id) do update set pin_hash=excluded.pin_hash,active=true;
 perform set_config('request.headers',jsonb_build_object('x-member-id',me::text)::text,true);
end $setup$;
set local role anon;
do $qa$
declare me bigint:=current_setting('dfl.kit_test_member')::bigint; other bigint:=current_setting('dfl.kit_test_other')::bigint;
 kit jsonb:='{"version":1,"skin":"#67412e","helmet":"#00338d","helmetStyle":"visor","jersey":"#00338d","pants":"#eae7df","trim":"#c60c30","number":17,"preset":"nfl:BUF"}'; saved jsonb; bad jsonb;
begin
 begin perform public.arena_save_racer_kit(kit,0,null);raise exception 'locked kit saved without PIN';exception when insufficient_privilege then null;end;
 begin perform public.arena_save_racer_kit(kit,0,'000000');raise exception 'wrong PIN accepted';exception when insufficient_privilege then null;end;
 saved:=public.arena_save_racer_kit(kit,0,'493817');
 if (saved->>'member_id')::bigint<>me or (saved->>'revision')::integer<>1 or saved->'kit'<>kit then raise exception 'wrong kit owner/result';end if;
 begin perform public.arena_save_racer_kit(kit,0,'493817');raise exception 'stale kit saved';exception when serialization_failure then null;end;
 saved:=public.arena_save_racer_kit(jsonb_set(kit,'{number}','0'),1,'493817');
 if saved->'kit'->>'number'<>'0' or saved->>'revision'<>'2' then raise exception 'zero jersey or revision invalid';end if;
 for bad in select value from jsonb_array_elements(jsonb_build_array(
  jsonb_set(kit,'{preset}','null'),jsonb_set(kit,'{helmetStyle}','null'),jsonb_set(kit,'{jersey}','"url(javascript:x)"'),
  jsonb_set(kit,'{number}','100'),jsonb_set(kit,'{number}','1.5'),kit||jsonb_build_object('member_id',other),kit||'{"speed":2}',jsonb_set(kit,'{preset}','"nfl:INVALID"')))
 loop
  begin perform public.arena_save_racer_kit(bad,2,'493817');raise exception 'invalid kit accepted';exception when invalid_parameter_value then null;end;
 end loop;
 begin update public.arena_racer_kits set revision=revision+1 where member_id=other;raise exception 'direct kit edit allowed';exception when insufficient_privilege then null;end;
 perform set_config('request.headers','{}',true);
 begin perform public.arena_save_racer_kit(kit,0,'493817');raise exception 'anonymous identity saved';exception when insufficient_privilege then null;end;
 if (select md5(coalesce(jsonb_agg(to_jsonb(e) order by id)::text,'')) from public.arena_events e)<>current_setting('dfl.kit_test_events') then raise exception 'cosmetics changed an event';end if;
end $qa$;
rollback;
