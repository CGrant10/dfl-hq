-- Isolated test database only; the scheduler is inert in this fixture.
do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;end if;end$$;
grant usage on schema public to anon,authenticated,service_role;
create schema cron;create table cron.job(jobid bigint generated always as identity,jobname text,command text);create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.job(jobname,command) values($1,$3) returning jobid$$;create function cron.alter_job(job_id bigint,command text default null,active boolean default true) returns void language sql as $$select$$;
\ir ../migrations/20261025224728_live_football_watch.sql
\ir ../migrations/20261025224937_align_live_football_schedule.sql
begin;
set local role service_role;
select public.capture_nfl_live_game('{"id":"999","season":2026,"week":7,"live":true}',jsonb_build_array(jsonb_build_object('id','100','sequence',100,'kind','touchdown','players',jsonb_build_array(jsonb_build_object('id','1')),'at',extract(epoch from now())*1000)),array['100']);
do $$begin if exists(select 1 from nfl_live_games g,jsonb_array_elements(g.plays) p where p->>'eligible'='true') then raise exception 'Initial capture alerted';end if;end$$;
select public.capture_nfl_live_game('{"id":"999","season":2026,"week":7,"live":true}',jsonb_build_array(
 jsonb_build_object('id','100','sequence',100,'kind','touchdown','players',jsonb_build_array(jsonb_build_object('id','1')),'at',extract(epoch from now())*1000),
 jsonb_build_object('id','101','sequence',101,'kind','touchdown','players',jsonb_build_array(jsonb_build_object('id','1')),'at',extract(epoch from now())*1000-240000),
 jsonb_build_object('id','102','sequence',102,'kind','touchdown','players',jsonb_build_array(jsonb_build_object('id','1')),'at',extract(epoch from now())*1000-5000),
 jsonb_build_object('id','103','sequence',103,'kind','touchdown','players',jsonb_build_array(jsonb_build_object('id','1')),'at',extract(epoch from now())*1000+120000)
),array['100','101','102','103']);
do $$begin if (select count(*) from nfl_live_games g,jsonb_array_elements(g.plays) p where p->>'eligible'='true')<>1 then raise exception 'Eligibility did not reject baseline, stale or future plays';end if;end$$;
set local role anon;
do $$declare payload jsonb;begin
 payload:=public.nfl_live_week(2026,7);
 if jsonb_array_length(payload)<>1 or jsonb_array_length(payload->0->'plays')<>1 or payload->0->'plays'->0->>'id'<>'102' then raise exception 'Public feed did not expose only the fresh eligible event';end if;
 if public.nfl_live_week(2026,8)<>'[]'::jsonb then raise exception 'Week isolation failed';end if;
 begin perform baseline_keys from public.nfl_live_games;raise exception 'Private capture keys exposed';exception when insufficient_privilege then null;end;
 begin perform public.capture_nfl_live_game('{}','[]','{}');raise exception 'Anon can capture';exception when insufficient_privilege then null;end;
 begin update public.nfl_live_games set fetched_at=now();raise exception 'Anon can update';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if not (select relrowsecurity from pg_class where oid='public.nfl_live_games'::regclass) then raise exception 'RLS disabled';end if;
 if exists(select 1 from pg_proc where oid in ('public.capture_nfl_live_game(jsonb,jsonb,text[])'::regprocedure,'public.nfl_live_week(integer,integer)'::regprocedure) and prosecdef) then raise exception 'Unexpected definer privilege';end if;
end$$;
rollback;
