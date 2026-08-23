-- Shared commissioner-calibrated GPS endpoints for every saved golf hole.
-- Safe to re-run. Members can read them through the existing public-read
-- policy; writes still require the existing Golf commissioner policy.

alter table public.golf_course_holes
  add column if not exists tee_lat double precision,
  add column if not exists tee_lng double precision,
  add column if not exists green_lat double precision,
  add column if not exists green_lng double precision,
  add column if not exists gps_updated_at timestamptz,
  add column if not exists gps_updated_by bigint references public.members(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'golf_course_holes_tee_lat_check'
      and conrelid = 'public.golf_course_holes'::regclass
  ) then
    alter table public.golf_course_holes
      add constraint golf_course_holes_tee_lat_check
      check (tee_lat is null or tee_lat between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'golf_course_holes_tee_lng_check'
      and conrelid = 'public.golf_course_holes'::regclass
  ) then
    alter table public.golf_course_holes
      add constraint golf_course_holes_tee_lng_check
      check (tee_lng is null or tee_lng between -180 and 180);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'golf_course_holes_green_lat_check'
      and conrelid = 'public.golf_course_holes'::regclass
  ) then
    alter table public.golf_course_holes
      add constraint golf_course_holes_green_lat_check
      check (green_lat is null or green_lat between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'golf_course_holes_green_lng_check'
      and conrelid = 'public.golf_course_holes'::regclass
  ) then
    alter table public.golf_course_holes
      add constraint golf_course_holes_green_lng_check
      check (green_lng is null or green_lng between -180 and 180);
  end if;
end $$;

comment on column public.golf_course_holes.tee_lat is
  'Commissioner-calibrated tee-box latitude used by live hole GPS.';
comment on column public.golf_course_holes.tee_lng is
  'Commissioner-calibrated tee-box longitude used by live hole GPS.';
comment on column public.golf_course_holes.green_lat is
  'Commissioner-calibrated green-center latitude used by live hole GPS.';
comment on column public.golf_course_holes.green_lng is
  'Commissioner-calibrated green-center longitude used by live hole GPS.';

create index if not exists golf_course_holes_gps_updated_by_idx
  on public.golf_course_holes (gps_updated_by);
