create table public.arena_racer_kits(
 member_id bigint primary key references public.members(id) on delete cascade,
 kit jsonb not null,
 revision integer not null default 1,
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.arena_racer_kits enable row level security;
revoke all on public.arena_racer_kits from anon,authenticated;
grant select on public.arena_racer_kits to anon,authenticated;
create policy stadium_kits_read on public.arena_racer_kits for select to anon,authenticated using(true);

create or replace function public.arena_save_racer_kit(p_kit jsonb,p_revision integer,p_pin text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me bigint:=public.request_member_id(); saved public.arena_racer_kits; field text;
begin
 if me is null or not exists(select 1 from public.members where id=me and active=true) then raise exception 'Choose your DFL member first.' using errcode='42501';end if;
 -- Preserve the app's selected-member identity model, verifying its optional PIN on the server.
 if public.keeper_self_identity_ok(me,p_pin) is not true then raise exception 'Enter your profile PIN to save this racer.' using errcode='42501';end if;
 if p_revision is null or p_revision<0 then raise exception 'Refresh your racer before saving.' using errcode='40001';end if;
 if p_kit is null or jsonb_typeof(p_kit)<>'object' or octet_length(p_kit::text)>1500
  or not(p_kit ?& array['version','skin','helmet','helmetStyle','jersey','pants','trim','number','preset'])
  or exists(select 1 from jsonb_object_keys(p_kit) k where k<>all(array['version','skin','helmet','helmetStyle','jersey','pants','trim','number','preset'])) then raise exception 'Invalid racer kit.' using errcode='22023';end if;
 if p_kit->>'version'<>'1' or jsonb_typeof(p_kit->'version')<>'number'
  or jsonb_typeof(p_kit->'number')<>'number' or p_kit->>'number' !~ '^[0-9]{1,2}$'
  or jsonb_typeof(p_kit->'helmetStyle')<>'string' or p_kit->>'helmetStyle' not in ('classic','speed','visor') then raise exception 'Invalid racer options.' using errcode='22023';end if;
 foreach field in array array['skin','helmet','jersey','pants','trim'] loop
  if jsonb_typeof(p_kit->field)<>'string' or p_kit->>field !~* '^#[0-9a-f]{6}$' then raise exception 'Invalid racer color.' using errcode='22023';end if;
 end loop;
 if jsonb_typeof(p_kit->'preset')<>'string' or p_kit->>'preset' not in ('dfl','custom','nfl:ARI','nfl:ATL','nfl:BAL','nfl:BUF','nfl:CAR','nfl:CHI','nfl:CIN','nfl:CLE','nfl:DAL','nfl:DEN','nfl:DET','nfl:GB','nfl:HOU','nfl:IND','nfl:JAX','nfl:KC','nfl:LV','nfl:LAC','nfl:LAR','nfl:MIA','nfl:MIN','nfl:NE','nfl:NO','nfl:NYG','nfl:NYJ','nfl:PHI','nfl:PIT','nfl:SF','nfl:SEA','nfl:TB','nfl:TEN','nfl:WAS','pokemon:pikachu','pokemon:charizard','pokemon:gengar','pokemon:lucario','pokemon:blastoise','pokemon:rayquaza','pokemon:greninja','pokemon:mewtwo','anime:naruto','anime:goku','anime:vegeta','anime:luffy','anime:zoro','anime:ichigo','anime:tanjiro','anime:gojo') then raise exception 'Choose a racer preset.' using errcode='22023';end if;
 if p_revision<>0 and not exists(select 1 from public.arena_racer_kits where member_id=me) then raise exception 'Your racer changed. Reopen the editor.' using errcode='40001';end if;
 insert into public.arena_racer_kits(member_id,kit,revision) values(me,p_kit,1)
 on conflict(member_id) do update set kit=excluded.kit,revision=arena_racer_kits.revision+1,updated_at=clock_timestamp()
 where arena_racer_kits.revision=p_revision
 returning * into saved;
 if not found then raise exception 'Your racer changed on another device. Reopen the editor.' using errcode='40001';end if;
 return to_jsonb(saved);
end $$;
revoke all on function public.arena_save_racer_kit(jsonb,integer,text) from public,anon,authenticated;
grant execute on function public.arena_save_racer_kit(jsonb,integer,text) to anon,authenticated;

create or replace function public.arena_stadium_snapshot(p_event_id bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.arena_events;
begin
 perform dfl_arena_private.finish_stadium(p_event_id);
 select * into e from public.arena_events where id=p_event_id;
 if not found then raise exception 'Race not found.' using errcode='22023';end if;
 return jsonb_build_object('event',to_jsonb(e),
  'participants',(select coalesce(jsonb_agg(to_jsonb(p) order by p.sort_order,p.id),'[]'::jsonb) from public.arena_participants p where p.event_id=e.id),
  'results',(select coalesce(jsonb_agg(to_jsonb(r) order by r.place),'[]'::jsonb) from public.arena_results r where r.event_id=e.id),
  'racer_kits',(select coalesce(jsonb_agg(to_jsonb(k)),'[]'::jsonb) from public.arena_racer_kits k where exists(select 1 from public.arena_participants p where p.event_id=e.id and p.member_id=k.member_id)),
  'can_control',public.has_commissioner_permission('broadcast'),
  'server_ms',round(extract(epoch from clock_timestamp())*1000)::bigint);
end $$;
revoke all on function public.arena_stadium_snapshot(bigint) from public,anon,authenticated;
grant execute on function public.arena_stadium_snapshot(bigint) to anon,authenticated;
notify pgrst,'reload schema';
