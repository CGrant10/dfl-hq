-- Watchlists use an independent, unguessable browser capability. A member
-- picker header alone cannot read or change somebody else's saved players.
create table public.player_watch_devices (
 id uuid primary key, token_hash bytea not null, member_id bigint not null references public.members(id) on delete cascade,
 league_id text not null, updated_at timestamptz not null default now()
);
create table public.player_watch_items (
 device_id uuid not null references public.player_watch_devices(id) on delete cascade,
 player_id text not null check(player_id ~ '^[A-Za-z0-9_-]{1,32}$'), created_at timestamptz not null default now(),
 primary key(device_id,player_id)
);
create table public.player_watch_states (
 league_id text not null, member_id bigint not null references public.members(id) on delete cascade, player_id text not null,
 owner_roster integer, injury text not null, season integer not null, week integer not null,
 revision integer not null default 0, checked_at timestamptz not null default now(),
 primary key(league_id,member_id,player_id)
);
alter table public.player_watch_devices enable row level security;
alter table public.player_watch_items enable row level security;
alter table public.player_watch_states enable row level security;
revoke all on public.player_watch_devices,public.player_watch_items,public.player_watch_states from public,anon,authenticated;
grant all on public.player_watch_devices,public.player_watch_items,public.player_watch_states to service_role;
-- Explicit deny policies document intentional service-only tables.
create policy watch_devices_private on public.player_watch_devices for all to anon,authenticated using(false) with check(false);
create policy watch_items_private on public.player_watch_items for all to anon,authenticated using(false) with check(false);
create policy watch_states_private on public.player_watch_states for all to anon,authenticated using(false) with check(false);
create or replace function private.player_watchlist(device uuid, secret text, action text default 'read', player text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare mid bigint := public.dfl_current_member(); league text; saved public.player_watch_devices; result jsonb;
begin
 if mid is null or not exists(select 1 from public.members where id=mid and active) then raise exception 'Choose your member first'; end if;
 if secret is null or secret !~ '^[a-f0-9]{64}$' then raise exception 'Invalid watchlist key'; end if;
 if action not in ('read','add','remove') then raise exception 'Invalid watchlist action'; end if;
 select sleeper_league_id into league from public.sleeper_config where id=1;
 if league is null then raise exception 'League unavailable'; end if;
 if action='add' then
  insert into public.player_watch_devices(id,token_hash,member_id,league_id)
   values(device,extensions.digest(secret,'sha256'),mid,league) on conflict(id) do nothing;
 end if;
 select * into saved from public.player_watch_devices where id=device for update;
 if not found then return '[]'::jsonb; end if;
 if saved.token_hash<>extensions.digest(secret,'sha256') or saved.member_id<>mid then raise exception 'Watchlist key does not match'; end if;
 if saved.league_id<>league then raise exception 'This watchlist belongs to another league'; end if;
 if action in ('add','remove') and (player is null or player !~ '^[A-Za-z0-9_-]{1,32}$') then raise exception 'Invalid player'; end if;
 if action='add' then
  if not exists(select 1 from public.player_watch_items where device_id=device and player_id=player)
    and (select count(*) from public.player_watch_items where device_id=device)>=20 then raise exception 'Watch up to 20 players'; end if;
  insert into public.player_watch_items(device_id,player_id) values(device,player) on conflict do nothing;
 elsif action='remove' then
  delete from public.player_watch_items where device_id=device and player_id=player;
 end if;
 update public.player_watch_devices set updated_at=now() where id=device;
 select coalesce(jsonb_agg(jsonb_build_object('player_id',player_id,'created_at',created_at) order by created_at desc),'[]'::jsonb)
 into result from public.player_watch_items where device_id=device;
 return result;
end; $$;
revoke all on function private.player_watchlist(uuid,text,text,text) from public,anon,authenticated;
grant usage on schema private to anon,authenticated;
grant execute on function private.player_watchlist(uuid,text,text,text) to anon,authenticated;
create or replace function public.my_player_watchlist(device uuid, secret text, action text default 'read', player text default null)
returns jsonb language sql security invoker set search_path = '' as $$
 select private.player_watchlist(device,secret,action,player);
$$;
revoke all on function public.my_player_watchlist(uuid,text,text,text) from public;
grant execute on function public.my_player_watchlist(uuid,text,text,text) to anon,authenticated;

create table public.player_watch_poll (id boolean primary key default true check(id), locked_until timestamptz not null);
alter table public.player_watch_poll enable row level security;
revoke all on public.player_watch_poll from public,anon,authenticated;
grant all on public.player_watch_poll to service_role;
create policy watch_poll_private on public.player_watch_poll for all to anon,authenticated using(false) with check(false);
create or replace function public.claim_player_watch_poll()
returns boolean language sql security invoker set search_path='' as $$
 with claimed as (
  insert into public.player_watch_poll(id,locked_until) values(true,now()+interval '2 minutes')
  on conflict(id) do update set locked_until=excluded.locked_until where public.player_watch_poll.locked_until<=now()
  returning id
 ) select exists(select 1 from claimed);
$$;
revoke all on function public.claim_player_watch_poll() from public,anon,authenticated;
grant execute on function public.claim_player_watch_poll() to service_role;

-- Preserve per-player event keys when a grouped push succeeds before a poll retry.
alter table public.notification_messages add column if not exists watch_alert_keys text[] not null default '{}';
