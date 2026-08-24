-- =====================================================================
-- DFL HQ - Commissioner roles security foundation
-- ---------------------------------------------------------------------
-- Backwards-compatible migration. The existing shared Admin password keeps
-- working. This adds authenticated per-member commissioner PINs and scoped
-- permissions so the app can migrate one screen at a time.
--
-- Run this once in Supabase SQL Editor before enabling commissioner-role UI.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.commissioner_access (
  member_id     bigint primary key references public.members(id) on delete cascade,
  pin_hash      text not null,
  permissions   jsonb not null default '[]'::jsonb,
  is_owner      boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint commissioner_permissions_array check (jsonb_typeof(permissions) = 'array')
);

alter table public.commissioner_access enable row level security;
-- Intentionally no direct API policies. PIN hashes and role rows are only
-- exposed through security-definer functions below.

-- The member picker already sends x-member-id. Commissioner sessions add a
-- second secret header; neither value alone grants authority.
create or replace function public.commissioner_pin()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.headers', true), '')::json ->> 'x-commissioner-pin';
$$;

create or replace function public.request_member_id()
returns bigint
language plpgsql
stable
as $$
declare raw_id text;
begin
  raw_id := nullif(current_setting('request.headers', true), '')::json ->> 'x-member-id';
  if raw_id is null or raw_id !~ '^[0-9]+$' then return null; end if;
  return raw_id::bigint;
exception when others then
  return null;
end;
$$;

-- True only when the selected member has an active commissioner row and the
-- supplied PIN matches that member's bcrypt hash.
create or replace function public.is_commissioner()
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  mid bigint;
  pin text;
  stored_hash text;
begin
  mid := public.request_member_id();
  pin := public.commissioner_pin();
  if mid is null or pin is null or pin = '' then return false; end if;

  select ca.pin_hash into stored_hash
    from public.commissioner_access ca
   where ca.member_id = mid and ca.active = true;

  if stored_hash is null then return false; end if;
  return stored_hash = crypt(pin, stored_hash);
end;
$$;

-- Owner is deliberately separate from ordinary permissions. Only an owner
-- (or the legacy shared Admin login during migration) can manage commissioners.
create or replace function public.is_commissioner_owner()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select public.is_admin() or (
    public.is_commissioner() and exists (
      select 1 from public.commissioner_access ca
       where ca.member_id = public.request_member_id()
         and ca.active = true and ca.is_owner = true
    )
  );
$$;

create or replace function public.has_commissioner_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select public.is_admin() or (
    public.is_commissioner() and exists (
      select 1 from public.commissioner_access ca
       where ca.member_id = public.request_member_id()
         and ca.active = true
         and (ca.is_owner = true or ca.permissions ? permission_name)
    )
  );
$$;

grant execute on function public.is_commissioner() to anon, authenticated;
grant execute on function public.is_commissioner_owner() to anon, authenticated;
grant execute on function public.has_commissioner_permission(text) to anon, authenticated;

-- Safe profile endpoint: returns permissions but never the stored PIN hash.
create or replace function public.my_commissioner_access()
returns table(member_id bigint, is_owner boolean, permissions jsonb)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select ca.member_id, ca.is_owner, ca.permissions
    from public.commissioner_access ca
   where ca.member_id = public.request_member_id()
     and ca.active = true
     and public.is_commissioner();
$$;

grant execute on function public.my_commissioner_access() to anon, authenticated;

-- Owner/admin management endpoints. The app never writes commissioner_access
-- directly, which keeps PIN hashes out of ordinary CRUD and RLS paths.
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
declare resolved_hash text;
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

create or replace function public.disable_commissioner(target_member_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare owner_count int;
begin
  if not public.is_commissioner_owner() then raise exception 'Owner access required'; end if;

  if exists (select 1 from public.commissioner_access where member_id = target_member_id and is_owner and active) then
    select count(*) into owner_count from public.commissioner_access where is_owner and active;
    if owner_count <= 1 and not public.is_admin() then
      raise exception 'The last owner cannot remove their own owner access';
    end if;
  end if;

  update public.commissioner_access set active = false, updated_at = now()
   where member_id = target_member_id;
  return found;
end;
$$;

grant execute on function public.save_commissioner(bigint,text,jsonb,boolean) to anon, authenticated;
grant execute on function public.disable_commissioner(bigint) to anon, authenticated;

-- Permission-aware write policies. Legacy is_admin() remains accepted through
-- has_commissioner_permission(), so this migration cannot lock out the current
-- Admin page while the UI is being upgraded.
do $$
declare
  item record;
begin
  for item in select * from (values
    ('announcements','announcements'),
    ('polls','polls'),
    ('rules','rules'),
    ('keepers','keepers'),
    ('events','calendar'),
    ('history','history'),
    ('side_events','calendar')
  ) as v(table_name, permission_name)
  loop
    execute format('drop policy if exists "admin write" on public.%I', item.table_name);
    execute format(
      'create policy "admin write" on public.%I for all using (public.has_commissioner_permission(%L)) with check (public.has_commissioner_permission(%L))',
      item.table_name, item.permission_name, item.permission_name
    );
  end loop;
end;
$$;

-- Bootstrap example (DO NOT leave a real PIN in this file):
-- 1) Sign in with the existing shared Admin password in the app.
-- 2) From a client carrying that x-admin-token, call:
--      select public.save_commissioner(<YOUR_MEMBER_ID>, '<TEMP-PIN>',
--        '["announcements","calendar","polls","keepers","golf","broadcast","fees","history","rules","members","sleeper"]'::jsonb,
--        true);
--
-- The forthcoming UI will perform that call for you. Until then, adding this
-- migration changes no normal member flow and the shared Admin login continues
-- to authorize existing writes.
