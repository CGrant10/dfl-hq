-- Advanced, per-hole Quick Round controls.
-- Additive and safe to re-run against an existing DFL HQ database.

alter table public.golf_quick_scores
  add column if not exists putts smallint,
  add column if not exists tee_direction text,
  add column if not exists putt_distance smallint,
  add column if not exists tee_club text,
  add column if not exists fairway_bunker boolean not null default false,
  add column if not exists greenside_bunker boolean not null default false,
  add column if not exists water_hazard smallint not null default 0,
  add column if not exists drop_shots smallint not null default 0,
  add column if not exists out_of_bounds smallint not null default 0,
  add column if not exists drinks smallint not null default 0;

alter table public.golf_quick_scores
  drop constraint if exists golf_quick_scores_putts_check,
  drop constraint if exists golf_quick_scores_tee_direction_check,
  drop constraint if exists golf_quick_scores_putt_distance_check,
  drop constraint if exists golf_quick_scores_tee_club_check,
  drop constraint if exists golf_quick_scores_water_hazard_check,
  drop constraint if exists golf_quick_scores_drop_shots_check,
  drop constraint if exists golf_quick_scores_out_of_bounds_check,
  drop constraint if exists golf_quick_scores_drinks_check;

alter table public.golf_quick_scores
  add constraint golf_quick_scores_putts_check check (putts is null or putts between 0 and 15),
  add constraint golf_quick_scores_tee_direction_check check (tee_direction is null or tee_direction in ('hit','left','right','far_left','far_right','long','short','miss')),
  add constraint golf_quick_scores_putt_distance_check check (putt_distance is null or putt_distance between 0 and 200),
  add constraint golf_quick_scores_tee_club_check check (tee_club is null or char_length(tee_club) <= 32),
  add constraint golf_quick_scores_water_hazard_check check (water_hazard between 0 and 9),
  add constraint golf_quick_scores_drop_shots_check check (drop_shots between 0 and 9),
  add constraint golf_quick_scores_out_of_bounds_check check (out_of_bounds between 0 and 9),
  add constraint golf_quick_scores_drinks_check check (drinks between 0 and 9);

comment on column public.golf_quick_scores.putts is 'Putts taken on this hole.';
comment on column public.golf_quick_scores.tee_direction is 'Tee result selected in Quick Round scoring.';
comment on column public.golf_quick_scores.putt_distance is 'First-putt distance in feet.';
comment on column public.golf_quick_scores.tee_club is 'Club used from the tee.';
