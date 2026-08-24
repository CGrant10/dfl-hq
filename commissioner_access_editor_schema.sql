-- =====================================================================
-- DFL HQ - edit commissioner access without replacing it
-- ---------------------------------------------------------------------
-- Run after commissioner_roles_schema.sql. Safe to re-run.
--
-- Owners need to see an assignment before adjusting it, but PIN hashes must
-- never cross the Data API. The list function returns only role state and
-- permissions. save_commissioner() now treats a blank PIN as "keep the
-- existing hash"; a genuinely new assignment still requires a PIN.
-- =====================================================================

create or replace function public.list_commissioner_access()
returns table(member_id bigint, is_owner boolean, permissions jsonb, active boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_commissioner_owner() then raise exception 'Owner access required'; end if;

  return query
    select ca.member_id, ca.is_owner, ca.permissions, ca.active
      from public.commissioner_access ca
     order by ca.member_id;
end;
$$;

revoke execute on function public.list_commissioner_access() from public;
grant execute on function public.list_commissioner_access() to anon, authenticated;

create or replace function public.save_commissioner(
  target_member_id bigint,
  new_pin text,
  new_permissions jsonb default '[]'::jsonb,
  make_owner boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_hash text;
begin
  if not public.is_commissioner_owner() then raise exception 'Owner access required'; end if;
  if jsonb_typeof(coalesce(new_permissions, '[]'::jsonb)) <> 'array' then raise exception 'Permissions must be an array'; end if;

  select ca.pin_hash into resolved_hash
    from public.commissioner_access ca
   where ca.member_id = target_member_id;

  if nullif(coalesce(new_pin, ''), '') is not null then
    if length(new_pin) < 4 then raise exception 'Commissioner PIN must be at least 4 characters'; end if;
    resolved_hash := extensions.crypt(new_pin, extensions.gen_salt('bf'));
  elsif resolved_hash is null then
    raise exception 'A commissioner PIN is required for new access';
  end if;

  insert into public.commissioner_access(member_id, pin_hash, permissions, is_owner, active, updated_at)
  values (target_member_id, resolved_hash, coalesce(new_permissions, '[]'::jsonb), make_owner, true, now())
  on conflict (member_id) do update
    set pin_hash = excluded.pin_hash,
        permissions = excluded.permissions,
        is_owner = excluded.is_owner,
        active = true,
        updated_at = now();

  return true;
end;
$$;

revoke execute on function public.save_commissioner(bigint,text,jsonb,boolean) from public;
grant execute on function public.save_commissioner(bigint,text,jsonb,boolean) to anon, authenticated;

-- Verification report: assignment state only; deliberately omits pin_hash.
select member_id, is_owner, permissions, active
  from public.commissioner_access
 order by member_id;
