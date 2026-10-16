-- Isolated PostgreSQL test database only. Never run this bootstrap in production.
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;
end$$;
create schema extensions;
create extension pgcrypto with schema extensions;
create table public.members(id bigint generated always as identity primary key,active boolean default true,display_name text);
insert into public.members(display_name) values('First'),('Second'),('Third');
create function public.is_admin() returns boolean language sql as $$select false$$;
-- The local fixture controls identity; production uses its existing PIN verifier.
create function public.has_commissioner_permission(text) returns boolean language sql
 as $$select coalesce(current_setting('qa.arena_commissioner',true),'off')='on'$$;
\ir ../../arena_schema.sql
\ir ../../arena_broadcast_schema.sql
\ir ../../broadcast_items_schema.sql
-- Legacy automation must be removed before any result is inserted.
create function public.dfl_arena_aftermath_broadcast() returns trigger language plpgsql as $$begin raise exception 'Retired winner trigger is still attached';end$$;
create trigger arena_result_aftermath_broadcast after insert on public.arena_results for each row execute function public.dfl_arena_aftermath_broadcast();
insert into public.broadcast_items(treatment,kicker,headline,href) values('champion','ARENA AFTERMATH','Old winner','#/arena-results?id=123'),('champion','DFL CHAMPION','League champion','#/history');
grant usage on schema public to anon,authenticated;
grant select on public.members,public.arena_events,public.arena_results,public.arena_participants to anon,authenticated;
\ir ../migrations/20261013190256_stadium_arena.sql
\ir ../migrations/20261016171742_arena_watch_management.sql
\ir ../migrations/20261016172342_remove_arena_winner_broadcast.sql
\ir stadium_arena.sql
\ir arena_watch_management.sql
\ir arena_watch_access.sql
do $$begin
 if exists(select 1 from public.broadcast_items where kicker='ARENA AFTERMATH' and active) then raise exception 'Arena winner slide remains active';end if;
 if not exists(select 1 from public.broadcast_items where kicker='DFL CHAMPION' and active) then raise exception 'League champion was removed';end if;
end$$;
