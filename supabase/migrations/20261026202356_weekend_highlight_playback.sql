-- Weekend NFL clips remain available through Tuesday morning, subject to each
-- publisher's own earlier expiry. No video files are copied or stored.
alter table public.nfl_highlight_clips add column video_url text;
alter table public.nfl_highlight_clips add constraint nfl_highlight_video_source check (
 video_url is null or video_url ~ '^https://espnmedia-cdn\.akamaized\.net/espn/media/[a-zA-Z0-9_./-]+\.mp4$'
);
alter table public.nfl_highlight_clips drop constraint nfl_highlight_clips_check2;
alter table public.nfl_highlight_clips add constraint nfl_highlight_weekend_expiry check (
 expires_at<=((session_date+(1+((8-extract(dow from session_date)::integer)%7)))+time '06:00') at time zone 'America/Chicago'
);
