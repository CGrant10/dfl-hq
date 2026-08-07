-- Rolla Country Club (Rolla, North Dakota)
-- 9 holes / Par 36 / Blue tee yardage
-- Run this once in Supabase SQL Editor.
-- Safe to re-run: it updates matching course/hole rows instead of relying on
-- an ON CONFLICT constraint that may not exist in the current schema.

do $$
declare
  v_course_id bigint;
  r record;
begin
  select id
    into v_course_id
    from public.golf_courses
   where lower(name) = lower('Rolla Country Club')
     and lower(coalesce(city,'')) = lower('Rolla')
     and lower(coalesce(state,'')) in ('nd','north dakota')
   order by id
   limit 1;

  if v_course_id is null then
    insert into public.golf_courses
      (name, city, state, holes, par, yardage, course_rating, slope, website, source_url)
    values
      ('Rolla Country Club', 'Rolla', 'ND', 9, 36, 2814, null, null,
       'https://www.rollacountryclub.com/',
       'https://www.hole19golf.com/courses/rolla-country-club')
    returning id into v_course_id;
  else
    update public.golf_courses
       set name = 'Rolla Country Club',
           city = 'Rolla',
           state = 'ND',
           holes = 9,
           par = 36,
           yardage = 2814,
           website = 'https://www.rollacountryclub.com/',
           source_url = 'https://www.hole19golf.com/courses/rolla-country-club'
     where id = v_course_id;
  end if;

  for r in
    select * from (values
      (1, 4, 8, 321),
      (2, 4, 4, 330),
      (3, 5, 3, 413),
      (4, 3, 2, 188),
      (5, 4, 1, 359),
      (6, 3, 7, 179),
      (7, 4, 5, 298),
      (8, 5, 6, 430),
      (9, 4, 9, 296)
    ) as x(hole, par, handicap, yardage_men)
  loop
    update public.golf_course_holes
       set par = r.par,
           handicap = r.handicap,
           yardage_men = r.yardage_men
     where course_id = v_course_id
       and hole = r.hole;

    if not found then
      insert into public.golf_course_holes
        (course_id, hole, par, handicap, yardage_men, yardage_women)
      values
        (v_course_id, r.hole, r.par, r.handicap, r.yardage_men, null);
    end if;
  end loop;

  -- Link existing Rolla outings that don't already have a course_id.
  update public.golf_outings
     set course_id = v_course_id
   where course_id is null
     and lower(coalesce(course,'')) like '%rolla%';

  raise notice 'Rolla Country Club course id: %', v_course_id;
end $$;

-- Verify the loaded course and nine holes.
select
  c.id,
  c.name,
  c.city,
  c.state,
  c.holes,
  c.par,
  c.yardage
from public.golf_courses c
where c.id = (
  select id
  from public.golf_courses
  where lower(name) = lower('Rolla Country Club')
    and lower(city) = lower('Rolla')
    and lower(state) in ('nd','north dakota')
  order by id
  limit 1
);

select
  hole,
  par,
  handicap,
  yardage_men
from public.golf_course_holes
where course_id = (
  select id
  from public.golf_courses
  where lower(name) = lower('Rolla Country Club')
    and lower(city) = lower('Rolla')
    and lower(state) in ('nd','north dakota')
  order by id
  limit 1
)
order by hole;
