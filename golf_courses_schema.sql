-- DFL Golf course library
-- Run once in Supabase SQL Editor.

create table if not exists public.golf_courses (
  id bigint generated always as identity primary key,
  name text not null,
  city text,
  state text,
  holes int not null default 18,
  par int,
  yardage int,
  course_rating numeric(5,1),
  slope int,
  website text,
  source_url text,
  created_at timestamptz not null default now(),
  unique(name, city, state)
);

create table if not exists public.golf_course_holes (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.golf_courses(id) on delete cascade,
  hole int not null,
  par int not null,
  handicap int,
  yardage_men int,
  yardage_women int,
  unique(course_id, hole)
);

alter table public.golf_outings add column if not exists course_id bigint references public.golf_courses(id) on delete set null;
create index if not exists idx_golf_course_holes_course on public.golf_course_holes(course_id, hole);
create index if not exists idx_golf_outings_course on public.golf_outings(course_id);

alter table public.golf_courses enable row level security;
alter table public.golf_course_holes enable row level security;
drop policy if exists "public read golf courses" on public.golf_courses;
create policy "public read golf courses" on public.golf_courses for select using (true);
drop policy if exists "admin write golf courses" on public.golf_courses;
create policy "admin write golf courses" on public.golf_courses for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public read golf course holes" on public.golf_course_holes;
create policy "public read golf course holes" on public.golf_course_holes for select using (true);
drop policy if exists "admin write golf course holes" on public.golf_course_holes;
create policy "admin write golf course holes" on public.golf_course_holes for all using (public.is_admin()) with check (public.is_admin());

insert into public.golf_courses
  (name, city, state, holes, par, yardage, course_rating, slope, website, source_url)
values
  ('Rolla Country Club', 'Rolla', 'ND', 9, 36, 3081, null, null,
   'https://www.rollacountryclub.com/',
   'https://www.18birdies.com/golf-courses/club/b87a57c0-86ac-11e4-8c28-020000005b00/rolla-municipal-golf-club')
on conflict (name, city, state) do update set
  holes=excluded.holes,
  par=excluded.par,
  yardage=excluded.yardage,
  website=excluded.website,
  source_url=excluded.source_url;

insert into public.golf_course_holes (course_id, hole, par, handicap, yardage_men, yardage_women)
select c.id, v.hole, v.par, v.handicap, v.yardage_men, v.yardage_women
from public.golf_courses c
cross join (values
  (1,4,8,315,290),
  (2,4,4,301,227),
  (3,5,3,401,336),
  (4,3,2,181,172),
  (5,4,1,354,345),
  (6,3,7,158,151),
  (7,4,5,292,281),
  (8,5,6,408,402),
  (9,4,9,277,255)
) as v(hole,par,handicap,yardage_men,yardage_women)
where c.name='Rolla Country Club' and c.city='Rolla' and c.state='ND'
on conflict (course_id, hole) do update set
  par=excluded.par,
  handicap=excluded.handicap,
  yardage_men=excluded.yardage_men,
  yardage_women=excluded.yardage_women;

-- Seed/update the selected event's holes from a course with:
-- select public.golf_apply_course_to_outing(<outing_id>, <course_id>);
create or replace function public.golf_apply_course_to_outing(p_outing_id bigint, p_course_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  update public.golf_outings
  set course_id=p_course_id,
      course=(select name from public.golf_courses where id=p_course_id),
      holes=(select holes from public.golf_courses where id=p_course_id)
  where id=p_outing_id;

  delete from public.golf_holes where outing_id=p_outing_id;
  insert into public.golf_holes(outing_id,hole,par)
  select p_outing_id,hole,par
  from public.golf_course_holes
  where course_id=p_course_id
  order by hole;
end;
$$;
