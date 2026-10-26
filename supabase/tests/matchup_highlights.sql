-- Run after live_football.sql in an isolated database, never against production.
\ir ../../gameday_moments_schema.sql
\ir ../migrations/20261026012530_matchup_highlights.sql
begin;
set local role service_role;
insert into public.gameday_moments(league_id,season,week,event_key,kind,matchup_id,roster_id,player_id,data)
 values('fixture',2026,7,'nfl:999:123:1','touchdown',7,1,'1','{"play":{"id":"123","yards":42}}'),
 ('fixture',2026,7,'nfl:999:124:1','big-play',7,1,'1','{"play":{"id":"124","yards":25}}'),
 ('fixture',2026,7,'lead:1:7','lead',7,1,null,'{"scores":{"1":100,"2":99}}');
insert into public.gameday_moments(league_id,season,week,event_key,kind,matchup_id,roster_id,player_id,data)
 values('fixture',2026,7,'nfl:999:123:1','touchdown',7,1,'1','{"play":{"yards":99}}')
 on conflict(league_id,season,week,event_key) do nothing;
do $$begin
 if (select count(*) from public.gameday_moments where league_id='fixture')<>3 then raise exception 'Duplicate archive play';end if;
 if (select data->'play'->>'yards' from public.gameday_moments where event_key='nfl:999:123:1')<>'42' then raise exception 'Retry overwrote saved history';end if;
end$$;
set local role anon;
do $$begin
 if (select count(*) from public.gameday_moments where league_id='fixture' and season=2026 and week=7 and matchup_id=7)<>3 then raise exception 'Public history unavailable';end if;
 begin insert into public.gameday_moments(league_id,season,week,event_key,kind,matchup_id,roster_id,data) values('fixture',2026,7,'forged','touchdown',7,1,'{}');raise exception 'Browser forged a highlight';exception when insufficient_privilege then null;end;
 begin update public.gameday_moments set data='{}';raise exception 'Browser changed a highlight';exception when insufficient_privilege then null;end;
 begin delete from public.gameday_moments;raise exception 'Browser deleted history';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if not (select relrowsecurity from pg_class where oid='public.gameday_moments'::regclass) then raise exception 'Moment RLS disabled';end if;
 if not exists(select 1 from pg_indexes where indexname='gameday_moments_matchup_page') then raise exception 'Missing scoped pagination index';end if;
end$$;
rollback;
