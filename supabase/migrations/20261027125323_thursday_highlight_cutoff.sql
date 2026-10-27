-- Keep Thursday–Monday highlights until the next Thursday at 06:00 Central.
-- Publisher expirations can still shorten a clip's availability.
alter table public.nfl_highlight_clips drop constraint nfl_highlight_weekend_expiry;
alter table public.nfl_highlight_clips add constraint nfl_highlight_weekend_expiry check (
 expires_at<=((session_date+(1+((10-extract(dow from session_date)::integer)%7)))+time '06:00') at time zone 'America/Chicago'
);
