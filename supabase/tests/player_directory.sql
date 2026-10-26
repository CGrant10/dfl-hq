-- Isolated PostgreSQL fixture. The cron job cannot make HTTP requests here.
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;end if;
end$$;
grant usage on schema public to anon,authenticated,service_role;
create schema cron;
create table cron.job(jobid bigint generated always as identity,jobname text,command text,active boolean default true);
create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.job(jobname,command) values($1,$3) returning jobid$$;
create function cron.alter_job(job_id bigint,active boolean default true) returns void language sql as $$update cron.job set active=$2 where jobid=$1$$;
\ir ../migrations/20261026125445_player_directory_cache.sql
begin;
set local role service_role;
insert into public.nfl_player_directory(id,players,player_count,content_hash,fetched_at)
 values(1,'{"1":{"n":"Player","p":"WR","fp":["WR"],"t":"BUF"}}',1000,repeat('a',64),now());
set local role anon;
do $$begin
 if not exists(select players,fetched_at from public.nfl_player_directory where id=1) then raise exception 'Public catalog read failed';end if;
 begin update public.nfl_player_directory set fetched_at=now();raise exception 'Browser can forge freshness';exception when insufficient_privilege then null;end;
 begin delete from public.nfl_player_directory;raise exception 'Browser can delete catalog';exception when insufficient_privilege then null;end;
 begin perform content_hash from public.nfl_player_directory;raise exception 'Unnecessary cache internals exposed';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if not(select relrowsecurity from pg_class where oid='public.nfl_player_directory'::regclass) then raise exception 'RLS disabled';end if;
 if(select active from cron.job where jobname='dfl-player-directory') then raise exception 'Unverified worker activated';end if;
end$$;
rollback;
