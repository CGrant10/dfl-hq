-- Keep the existing read-only league history and unique event identity.
alter table public.gameday_moments drop constraint gameday_moments_kind_check;
alter table public.gameday_moments add constraint gameday_moments_kind_check
 check(kind in ('lead','big','surge','touchdown','big-play'));
create index if not exists gameday_moments_matchup_page
 on public.gameday_moments(league_id,season,week,matchup_id,id desc);
