-- Public video metadata only. A link is written by the verified provider worker;
-- existing expiry RLS and service-only writes continue to apply.
alter table public.nfl_highlight_clips add column play_id text
 check (play_id is null or play_id ~ '^[0-9]{1,24}$');
create index nfl_highlight_play_video on public.nfl_highlight_clips(game_id,play_id)
 where play_id is not null and video_url is not null;
