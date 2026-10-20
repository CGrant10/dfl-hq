-- Stamp only newly started draws. Existing runs, seeds, clocks and official
-- finish times retain their original presentation and replay trajectories.
create or replace function dfl_arena_private.stamp_stadium_presentation()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_setting('dfl.arena_command',true)='on'
    and new.race_engine='stadium-v1' and new.bc_state='running'
    and new.race_manifest is not null
    and (old.race_manifest is null or
      new.race_manifest->>'run_id' is distinct from old.race_manifest->>'run_id') then
  new.race_manifest:=new.race_manifest||jsonb_build_object('presentation_version',2);
 end if;
 return new;
end $$;
revoke all on function dfl_arena_private.stamp_stadium_presentation() from public,anon,authenticated;
create trigger stadium_presentation_stamp
 before update of race_manifest on public.arena_events
 for each row execute function dfl_arena_private.stamp_stadium_presentation();
