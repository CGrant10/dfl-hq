\set ON_ERROR_STOP on
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;end if;
end$$;
create schema cron;
create table cron.job(jobid bigint generated always as identity,jobname text,schedule text,command text,active boolean default true);
create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.job(jobname,schedule,command) values($1,$2,$3) returning jobid$$;
create function cron.alter_job(job_id bigint,active boolean default true) returns void language sql as $$update cron.job set active=$2 where jobid=$1$$;
\ir ../migrations/20261026192037_home_game_day_highlights.sql
insert into public.nfl_highlight_clips(id,game_id,session_date,headline,kind,thumbnail_url,source_url,duration,published_at,expires_at,game_label)
values('1','401',(now() at time zone 'America/Chicago')::date,'Real touchdown','touchdown','https://espnmedia-cdn.akamaized.net/clip.jpg','https://www.espn.com/video/clip/_/id/1',27,now(),(((now() at time zone 'America/Chicago')::date+1)+time '06:00') at time zone 'America/Chicago','KC · BUF'),
('2','401',(now() at time zone 'America/Chicago')::date-1,'Yesterday touchdown','touchdown','https://espnmedia-cdn.akamaized.net/clip.jpg','https://www.espn.com/video/clip/_/id/2',27,now()-interval '1 day',least(now()-interval '1 minute',(((now() at time zone 'America/Chicago')::date)+time '06:00') at time zone 'America/Chicago'),'KC · BUF');
set role anon;
do $$begin
 if (select count(*) from public.nfl_highlight_clips)<>1 then raise exception 'Expired clips leaked';end if;
 begin delete from public.nfl_highlight_clips;raise exception 'Browser can delete clips';exception when insufficient_privilege then null;end;
 begin update public.nfl_highlight_clips set headline='forged';raise exception 'Browser can forge clips';exception when insufficient_privilege then null;end;
end$$;
reset role;

set role authenticated;
do $$begin if (select count(*) from public.nfl_highlight_clips)<>1 then raise exception 'Authenticated read leaks expiry';end if;end$$;
reset role;
do $$begin
 if not(select relrowsecurity from pg_class where oid='public.nfl_highlight_clips'::regclass) then raise exception 'Missing RLS';end if;
 if exists(select 1 from cron.job where jobname='dfl-game-highlights' and active) then raise exception 'Unverified collector activated';end if;
 if ('2026-11-01 06:00:00'::timestamp at time zone 'America/Chicago')<>'2026-11-01 12:00:00Z'::timestamptz then raise exception 'DST expiry wrong';end if;
 begin update public.nfl_highlight_clips set expires_at=now()+interval '3 days';raise exception 'Cutoff can be extended';exception when check_violation then null;end;
end$$;
delete from public.nfl_highlight_clips where expires_at<=now();
do $$begin if (select count(*) from public.nfl_highlight_clips)<>1 then raise exception 'Retention removed current clips';end if;end$$;

-- The new edition may keep Sunday until Tuesday; only official direct MP4s.
\ir ../migrations/20261026202356_weekend_highlight_playback.sql
update public.nfl_highlight_clips set video_url='https://espnmedia-cdn.akamaized.net/espn/media/16x9/test.mp4';
insert into public.nfl_highlight_clips(id,game_id,session_date,headline,kind,thumbnail_url,source_url,video_url,duration,published_at,expires_at,game_label)
values('3','401','2026-10-25','Weekend touchdown','touchdown','https://espnmedia-cdn.akamaized.net/clip.jpg','https://www.espn.com/video/clip/_/id/3','https://espnmedia-cdn.akamaized.net/espn/media/16x9/weekend.mp4',27,'2026-10-25 18:00Z','2026-10-27 11:00Z','KC · BUF');
do $$begin
 begin update public.nfl_highlight_clips set expires_at='2026-10-27 11:00:01Z' where id='3';raise exception 'Weekend cutoff extended';exception when check_violation then null;end;
 begin update public.nfl_highlight_clips set video_url='https://evil.test/clip.mp4' where id='3';raise exception 'Untrusted video host accepted';exception when check_violation then null;end;
 begin update public.nfl_highlight_clips set video_url='https://espnmedia-cdn.akamaized.net.evil.test/espn/media/clip.mp4' where id='3';raise exception 'Spoofed host accepted';exception when check_violation then null;end;
 begin update public.nfl_highlight_clips set video_url='https://espnmedia-cdn.akamaized.net/espn/media/clip.mp4?redirect=evil' where id='3';raise exception 'Query video accepted';exception when check_violation then null;end;
 if ('2026-11-03 06:00:00'::timestamp at time zone 'America/Chicago')<>'2026-11-03 12:00:00Z'::timestamptz then raise exception 'Weekend DST expiry wrong';end if;
 if not(select relrowsecurity from pg_class where oid='public.nfl_highlight_clips'::regclass) then raise exception 'Weekend migration disabled RLS';end if;
end$$;
set role anon;
do $$begin
 begin update public.nfl_highlight_clips set video_url=null;raise exception 'Browser can change video sources';exception when insufficient_privilege then null;end;
end$$;
reset role;

\ir ../migrations/20261027002343_nfl_highlight_play_links.sql
update public.nfl_highlight_clips set play_id='40112345' where id='3';
do $$begin
 if (select play_id from public.nfl_highlight_clips where id='3') is distinct from '40112345' then raise exception 'Play link not saved';end if;
 begin update public.nfl_highlight_clips set play_id='https://evil.test';raise exception 'Non-numeric play link accepted';exception when check_violation then null;end;
 if not(select relrowsecurity from pg_class where oid='public.nfl_highlight_clips'::regclass) then raise exception 'Play links disabled expiry RLS';end if;
end$$;
set role anon;
do $$begin
 begin update public.nfl_highlight_clips set play_id='999';raise exception 'Browser can redirect play links';exception when insufficient_privilege then null;end;
end$$;
reset role;
