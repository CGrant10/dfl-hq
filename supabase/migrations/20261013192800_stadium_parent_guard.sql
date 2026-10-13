-- A parent change must protect both sides of an existing stadium record.
create or replace function dfl_arena_private.guard_stadium_write()
returns trigger language plpgsql security definer set search_path='' as $$
declare engine text;
begin
 if tg_table_name='arena_events' then
  engine:=case when tg_op='DELETE' then old.race_engine else new.race_engine end;
  if tg_op='UPDATE' and old.race_engine='stadium-v1' then engine:='stadium-v1';end if;
 else
  select e.race_engine into engine from public.arena_events e
   where e.id=case when tg_op='DELETE' then old.event_id else new.event_id end;
  if tg_op='UPDATE' and exists(select 1 from public.arena_events where id=old.event_id and race_engine='stadium-v1') then engine:='stadium-v1';end if;
 end if;
 if engine='stadium-v1' and current_setting('dfl.arena_command',true) is distinct from 'on' then
  raise exception 'Use the stadium race controls.' using errcode='42501';
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
revoke all on function dfl_arena_private.guard_stadium_write() from public,anon,authenticated;
