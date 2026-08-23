-- DFL Golf Tournament Beta: separate event mode and putt totals on tournament cards.

alter table public.golf_outings
  drop constraint if exists golf_outings_event_type_check;

alter table public.golf_outings
  add constraint golf_outings_event_type_check
  check (event_type = any (array['quick'::text, 'tournament'::text, 'tournament_beta'::text]));

alter table public.golf_scores
  add column if not exists putts integer;

alter table public.golf_scores
  drop constraint if exists golf_scores_putts_check;

alter table public.golf_scores
  add constraint golf_scores_putts_check
  check (putts is null or putts between 0 and 15);
