-- Publisher clip metadata only. The video remains in ESPN's official player.
create table public.nfl_highlight_clips (
 id text primary key check(id ~ '^[0-9]{1,24}$'),
 game_id text not null check(game_id ~ '^[0-9]{1,24}$'),
 session_date date not null,
 headline text not null check(length(headline) between 1 and 180),
 kind text not null check(kind in ('touchdown','big-play')),
 thumbnail_url text not null check(thumbnail_url ~ '^https://(espnmedia-cdn\.akamaized\.net|a[1-4]?\.espncdn\.com)/'),
 source_url text not null check(source_url='https://www.espn.com/video/clip/_/id/'||id),
 duration integer not null check(duration between 3 and 180),
 published_at timestamptz not null,
 expires_at timestamptz not null,
 game_label text not null check(length(game_label) between 1 and 40),
 fetched_at timestamptz not null default now(),
 check(expires_at>published_at),
 check(expires_at<=((session_date+1)+time '06:00') at time zone 'America/Chicago')
);
create index nfl_highlight_day on public.nfl_highlight_clips(session_date,published_at desc);
create index nfl_highlight_expiry on public.nfl_highlight_clips(expires_at);
alter table public.nfl_highlight_clips enable row level security;
revoke all on public.nfl_highlight_clips from public,anon,authenticated;
grant select on public.nfl_highlight_clips to anon,authenticated;
grant all on public.nfl_highlight_clips to service_role;
create policy nfl_highlight_read on public.nfl_highlight_clips for select to anon,authenticated using(expires_at>(select now()));

-- Existing private scheduler credential; no new key reaches any browser.
select cron.schedule('dfl-game-highlights','*/3 * * * *',$job$
 select net.http_post(
  url:=regexp_replace((select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_sync_url' limit 1),'/sync-sleeper$','/game-highlights'),
  headers:=jsonb_build_object('Content-Type','application/json','x-dfl-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='dfl_sleeper_cron_token' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=55000
 );
$job$);
select cron.alter_job((select jobid from cron.job where jobname='dfl-game-highlights'),active:=false);
select cron.schedule('dfl-highlight-retention','*/5 * * * *','delete from public.nfl_highlight_clips where expires_at<=now();');
