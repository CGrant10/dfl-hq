-- Isolated database bootstrap only. Never run in production.
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;
end$$;
create table public.members(id bigint primary key,active boolean default true,sleeper_user_id text);
create table public.sleeper_leagues(id bigint primary key,season integer,sleeper_league_id text);
create table public.sleeper_rosters(id bigint primary key,season integer,league_id text,roster_id integer,sleeper_user_id text,players jsonb,synced_at timestamptz default now());
insert into public.members values(1,true,'one'),(2,true,'two'),(3,false,'three');
insert into public.sleeper_leagues values(1,2026,'league');
insert into public.sleeper_rosters(id,season,league_id,roster_id,sleeper_user_id,players) values(1,2026,'league',1,'one','["a","b"]'),(2,2026,'league',2,'two','["c","d"]');
create function public.request_member_id() returns bigint language sql stable as $$select (nullif(current_setting('request.headers',true),'')::jsonb->>'x-member-id')::bigint$$;
create function public.keeper_self_identity_ok(target_member bigint,attempted_pin text) returns boolean language sql stable as $$select target_member<>2 or attempted_pin='1234'$$;
\ir ../migrations/20261019173555_trade_negotiation_room.sql
\ir ../migrations/20261021153056_trade_manager_intentions.sql
create function public.review_reject(query text,expected text) returns void language plpgsql security invoker as $$
begin
 begin execute query;exception when others then if sqlstate=expected then return;end if;raise exception 'Wrong error: % / %',sqlstate,sqlerrm;end;
 raise exception 'Expected rejection: %',query;
end $$;
\ir trade_intentions.sql
