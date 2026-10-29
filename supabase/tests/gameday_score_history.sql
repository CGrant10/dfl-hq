\set ON_ERROR_STOP on
begin;
do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;end if;end$$;
\ir ../../gameday_moments_schema.sql
\ir ../migrations/20261029162624_gameday_score_history.sql
set local role service_role;
select public.capture_gameday_snapshot('history-review',2026,7,'[{"matchup_id":1,"roster_id":1,"points":42,"starters":[]},{"matchup_id":1,"roster_id":2,"points":40,"starters":[]}]');
select public.capture_gameday_snapshot('history-review',2026,7,'[{"matchup_id":1,"roster_id":1,"points":42,"starters":[]},{"matchup_id":1,"roster_id":2,"points":40,"starters":[]}]');
select public.capture_gameday_snapshot('history-review',2026,7,'[{"matchup_id":1,"roster_id":1,"points":42,"starters":["99"]},{"matchup_id":1,"roster_id":2,"points":40,"starters":[]}]');
select public.capture_gameday_snapshot('history-review',2026,7,'[{"matchup_id":1,"roster_id":1,"points":42,"starters":[]},{"matchup_id":1,"roster_id":2,"points":48,"starters":[]}]');
select public.capture_gameday_snapshot('history-review',2026,7,'[{"matchup_id":1,"roster_id":1,"points":41.5,"starters":[]},{"matchup_id":1,"roster_id":2,"points":48,"starters":[]}]');
select public.capture_gameday_snapshot('history-partial',2026,7,'[{"matchup_id":1,"roster_id":1,"points":42,"starters":[]}]');
select public.capture_gameday_snapshot('history-unknown',2026,7,'[{"matchup_id":1,"roster_id":1,"points":42,"starters":[]},{"matchup_id":1,"roster_id":2,"points":null,"starters":[]}]');
reset role;
do $$begin
 if (select count(*) from public.gameday_score_history)<>3 then raise exception 'Changed scores only';end if;
 if (select score1 from public.gameday_score_history order by id desc limit 1)<>41.5 then raise exception 'Correction lost';end if;
 if (select count(*) from public.gameday_moments where kind='lead')<>1 then raise exception 'Notification behavior changed';end if;
end$$;
set local role anon;
select * from public.gameday_score_history;
do $$begin
 begin insert into public.gameday_score_history(league_id,season,week,matchup_id,revision,roster1,roster2,score1,score2)values('x',2026,7,1,1,1,2,0,0);raise exception 'Public write allowed';exception when insufficient_privilege then null;end;
 begin perform private.capture_gameday_score_history();raise exception 'Public trigger access';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- Reapplying/backfilling a saved lead must not duplicate the existing revision.
\ir ../migrations/20261029162624_gameday_score_history.sql
do $$begin if(select count(*) from public.gameday_score_history)<>3 then raise exception 'Backfill duplicated revision';end if;end$$;
rollback;
