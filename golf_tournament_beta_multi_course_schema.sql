-- Tournament Beta multi-course play.
-- A NULL assignment inherits the event's primary course, preserving every
-- existing tournament and keeping the normal one-course setup unchanged.

alter table public.golf_participants
  add column if not exists course_id bigint
  references public.golf_courses(id) on delete set null;

create index if not exists idx_golf_participants_course
  on public.golf_participants(outing_id, course_id);

-- The composite index serves event loading; this one supports the foreign
-- key when a saved course is removed or reassigned.
create index if not exists idx_golf_participants_course_id
  on public.golf_participants(course_id)
  where course_id is not null;

comment on column public.golf_participants.course_id is
  'Optional Tournament Beta course override. NULL inherits golf_outings.course_id.';
