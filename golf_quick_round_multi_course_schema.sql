-- Quick Rounds may contain golfers playing different courses.
-- NULL deliberately means "use the round's default course", so every
-- existing and ordinary same-course round keeps its current behaviour.

alter table public.golf_quick_players
  add column if not exists course_id bigint
  references public.golf_courses(id) on delete restrict;

create index if not exists golf_quick_players_course_idx
  on public.golf_quick_players(course_id)
  where course_id is not null;

comment on column public.golf_quick_players.course_id is
  'Optional course played by this golfer; NULL uses the Quick Round default course.';

-- No new policy is needed: this is a column on an RLS-protected table and
-- the existing quick-player policies continue to control its rows.

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'golf_quick_players'
  and column_name = 'course_id';
