-- Isolated PostgreSQL fixture only; never run on the league database.
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;
end$$;
create table public.members(id bigint primary key,active boolean default true,bio text,profile_image text);
alter table public.members enable row level security;
grant select,update on public.members to anon,authenticated;
create policy members_read on public.members for select to anon,authenticated using(true);
insert into public.members values(1,true,'Original','https://example.com/dfl.jpg'),(2,true,'Locked','https://example.com/locked.jpg'),(3,false,'Inactive',null);
create function public.request_member_id() returns bigint language sql stable as $$select (nullif(current_setting('request.headers',true),'')::jsonb->>'x-member-id')::bigint$$;
create function public.keeper_self_identity_ok(target_member bigint,attempted_pin text) returns boolean language sql stable as $$select target_member<>2 or attempted_pin='1234'$$;
\ir ../migrations/20261021184503_member_photo_preference.sql
create function public.photo_reject(query text,expected text) returns void language plpgsql security invoker as $$
begin
 begin execute query;exception when others then if sqlstate=expected then return;end if;raise exception 'Wrong error: % / %',sqlstate,sqlerrm;end;
 raise exception 'Expected rejection: %',query;
end $$;
grant execute on function public.photo_reject(text,text) to anon,authenticated;
set role anon;
select set_config('request.headers','{"x-member-id":"1"}',false);
select public.dfl_save_profile(p_bio=>'Updated',p_source=>'dfl');
do $$begin
 if not exists(select 1 from public.members where id=1 and bio='Updated' and profile_photo_source='dfl' and profile_image='https://example.com/dfl.jpg') then raise exception 'Own save failed';end if;
 if not exists(select 1 from public.members where id=2 and bio='Locked' and profile_photo_source='sleeper') then raise exception 'Other member changed';end if;
end$$;
select public.dfl_save_profile(p_source=>'sleeper');
do $$begin if (select profile_image from public.members where id=1)<>'https://example.com/dfl.jpg' then raise exception 'Switch destroyed upload';end if;end$$;
select public.dfl_save_profile(p_clear_image=>true,p_source=>'dfl');
do $$begin if not exists(select 1 from public.members where id=1 and profile_image is null and profile_photo_source='sleeper') then raise exception 'Clear failed';end if;end$$;
do $$declare n integer;begin
 update public.members set profile_photo_source='dfl' where id=2;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'RLS allowed a direct member update';end if;
end$$;
select public.photo_reject($q$select public.dfl_save_profile(p_source=>'wrong')$q$,'22023');
select public.photo_reject($q$select public.dfl_save_profile(p_bio=>repeat('x',501))$q$,'22023');
select public.photo_reject($q$select public.dfl_save_profile(p_image=>repeat('x',500001))$q$,'22023');
select set_config('request.headers','{"x-member-id":"2"}',false);
select public.photo_reject($q$select public.dfl_save_profile(p_source=>'dfl')$q$,'42501');
select public.photo_reject($q$select dfl_profile_private.save_profile(null,null,false,'dfl','wrong')$q$,'42501');
select public.dfl_save_profile(p_source=>'dfl',p_pin=>'1234');
select set_config('request.headers','{"x-member-id":"3"}',false);
select public.photo_reject($q$select public.dfl_save_profile()$q$,'42501');
select set_config('request.headers','{}',false);
select public.photo_reject($q$select public.dfl_save_profile()$q$,'42501');
reset role;
select 'member photo ownership, PIN, source switch, preserved upload, clear, invalid inputs: passed' as result;
