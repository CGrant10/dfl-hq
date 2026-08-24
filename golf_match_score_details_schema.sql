-- Additive Tournament Beta score details. Safe to re-run.

alter table public.golf_match_scores
  add column if not exists drops integer;

alter table public.golf_match_scores
  drop constraint if exists golf_match_scores_putts_check,
  drop constraint if exists golf_match_scores_drops_check;

alter table public.golf_match_scores
  add constraint golf_match_scores_putts_check
    check (putts is null or putts between 0 and 15),
  add constraint golf_match_scores_drops_check
    check (drops is null or drops between 0 and 9);

comment on column public.golf_match_scores.putts is
  'Putts taken by this match side on the hole.';
comment on column public.golf_match_scores.drops is
  'Penalty drops taken by this match side on the hole.';

notify pgrst, 'reload schema';
