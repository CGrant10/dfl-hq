-- =====================================================================
-- DFL HQ - Optional profile PIN locks
-- ---------------------------------------------------------------------
-- Run in Supabase SQL Editor. Safe to re-run.
--
-- This is a lightweight privacy lock for the Profile route. It does not turn
-- normal DFL members into full auth accounts. The first PIN can be claimed by
-- the currently selected member; once a PIN exists it cannot be changed or
-- disabled without the current PIN, except by a commissioner Owner/master.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profile_locks (
  member_id bigint primary key references public.members(id) on delete cascade,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_locks enable row level security;
-- No direct table policies. PIN hashes never leave security-definer RPCs.

create or replace function public.profile_member_id()
returns bigint
language plpgsql
stable
as $$
declare raw_id text;
begin
  raw_id := nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-member-id';
  if raw_id is null or raw_id !~ '^[0-9]+$' then return null; end if;
  return raw_id::bigint;
exception when others then return null;
end;
$$;

-- Harmless status check used before the Profile page loads.
create or replace function public.profile_lock_status(target_member_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists(
    select 1 from public.profile_locks p
     where p.member_id = target_member_id and p.active = true
  );
$$;

grant execute on function public.profile_lock_status(bigint) to anon, authenticated;

create or replace function public.profile_verify_pin(target_member_id bigint, attempted_pin text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare stored_hash text;
begin
  if attempted_pin is null or attempted_pin = '' then return false; end if;
  select p.pin_hash into stored_hash
    from public.profile_locks p
   where p.member_id = target_member_id and p.active = true;
  if stored_hash is null then return false; end if;
  return stored_hash = crypt(attempted_pin, stored_hash);
end;
$$;

grant execute on function public.profile_verify_pin(bigint,text) to anon, authenticated;

-- First setup needs no previous PIN. Once a lock exists, the current PIN is
-- required. This prevents somebody who merely switches the member picker from
-- overwriting an already-claimed profile lock.
create or replace function public.profile_set_pin(new_pin text, current_pin text default null)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare mid bigint := public.profile_member_id(); existing_hash text;
begin
  if mid is null then raise exception 'Pick your DFL member first'; end if;
  if new_pin is null or new_pin !~ '^[0-9]{4,6}$' then
    raise exception 'Profile PIN must be 4 to 6 digits';
  end if;

  select p.pin_hash into existing_hash
    from public.profile_locks p
   where p.member_id = mid and p.active = true;

  if existing_hash is not null then
    if current_pin is null or existing_hash <> crypt(current_pin, existing_hash) then
      raise exception 'Current profile PIN is incorrect';
    end if;
  end if;

  insert into public.profile_locks(member_id,pin_hash,active,updated_at)
  values(mid,crypt(new_pin,gen_salt('bf')),true,now())
  on conflict(member_id) do update
    set pin_hash=excluded.pin_hash, active=true, updated_at=now();
  return true;
end;
$$;

grant execute on function public.profile_set_pin(text,text) to anon, authenticated;

create or replace function public.profile_disable_pin(current_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare mid bigint := public.profile_member_id(); stored_hash text;
begin
  if mid is null then raise exception 'Pick your DFL member first'; end if;
  select p.pin_hash into stored_hash
    from public.profile_locks p
   where p.member_id = mid and p.active = true;
  if stored_hash is null then return true; end if;
  if current_pin is null or stored_hash <> crypt(current_pin, stored_hash) then
    raise exception 'Current profile PIN is incorrect';
  end if;
  update public.profile_locks set active=false, updated_at=now() where member_id=mid;
  return true;
end;
$$;

grant execute on function public.profile_disable_pin(text) to anon, authenticated;

-- Break-glass reset. Owners/master admins can remove a forgotten profile PIN,
-- but can never read it.
create or replace function public.profile_owner_reset_pin(target_member_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_commissioner_owner() then raise exception 'Owner access required'; end if;
  delete from public.profile_locks where member_id = target_member_id;
  return true;
end;
$$;

grant execute on function public.profile_owner_reset_pin(bigint) to anon, authenticated;
