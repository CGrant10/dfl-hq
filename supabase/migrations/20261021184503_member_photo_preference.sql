-- The upload stays intact when members choose their current Sleeper portrait.
alter table public.members add column profile_photo_source text not null default 'sleeper'
 check (profile_photo_source in ('sleeper','dfl'));

create schema if not exists dfl_profile_private;
revoke all on schema dfl_profile_private from public;
grant usage on schema dfl_profile_private to anon,authenticated;

-- A single transaction saves the upload and source. No caller-supplied member ID.
create function dfl_profile_private.save_profile(p_bio text,p_image text,p_clear_image boolean,p_source text,p_pin text)
returns integer language plpgsql security definer set search_path='' as $$
declare me bigint:=public.request_member_id(); n integer;
begin
 if me is null or not exists(select 1 from public.members where id=me and active=true)
 or public.keeper_self_identity_ok(me,p_pin) is not true then
  raise exception 'Enter your profile PIN to save.' using errcode='42501';
 end if;
 if p_source is null or p_source not in ('sleeper','dfl') or p_clear_image is null then
  raise exception 'Choose Sleeper or DFL upload.' using errcode='22023';
 end if;
 if p_bio is not null and char_length(p_bio)>500 then raise exception 'Bio must be 500 characters or fewer.' using errcode='22023';end if;
 if p_image is not null and octet_length(p_image)>500000 then raise exception 'Choose a smaller photo.' using errcode='22023';end if;
 update public.members set bio=coalesce(p_bio,bio),
  profile_image=case when p_clear_image then null else coalesce(p_image,profile_image) end,
  profile_photo_source=case when p_clear_image then 'sleeper' else p_source end
 where id=me;
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function dfl_profile_private.save_profile(text,text,boolean,text,text) from public;
grant execute on function dfl_profile_private.save_profile(text,text,boolean,text,text) to anon,authenticated;
create function public.dfl_save_profile(p_bio text default null,p_image text default null,p_clear_image boolean default false,p_source text default 'sleeper',p_pin text default null)
returns integer language sql security invoker set search_path='' as $$
 select dfl_profile_private.save_profile(p_bio,p_image,p_clear_image,p_source,p_pin);
$$;
revoke all on function public.dfl_save_profile(text,text,boolean,text,text) from public;
grant execute on function public.dfl_save_profile(text,text,boolean,text,text) to anon,authenticated;
