-- Front and back green points for live hole GPS, the way TheGrint maps a course:
-- every hole carries a tee, a green front, a green center and a green back.
-- The center already exists in golf_gps_geometry_schema.sql; this adds the two
-- edges. Safe to re-run. Reads go through the existing public-read policy and
-- writes still require the existing Golf commissioner policy.
--
-- The app works without this migration: when front_/back_ are missing it selects
-- the original columns instead and projects the edges 16 yards either side of the
-- mapped center along the approach line, labelling them as estimated. Running
-- this replaces those estimates with points a commissioner actually walked.

alter table public.golf_course_holes
  add column if not exists front_lat double precision,
  add column if not exists front_lng double precision,
  add column if not exists back_lat double precision,
  add column if not exists back_lng double precision;

do $$
declare
  point_column text;
begin
  foreach point_column in array array['front_lat','front_lng','back_lat','back_lng'] loop
    if not exists (
      select 1 from pg_constraint
      where conname = 'golf_course_holes_' || point_column || '_check'
        and conrelid = 'public.golf_course_holes'::regclass
    ) then
      execute format(
        'alter table public.golf_course_holes add constraint %I check (%I is null or %I between %s and %s)',
        'golf_course_holes_' || point_column || '_check',
        point_column,
        point_column,
        case when point_column like '%_lat' then '-90' else '-180' end,
        case when point_column like '%_lat' then '90' else '180' end
      );
    end if;
  end loop;
end $$;

comment on column public.golf_course_holes.front_lat is
  'Commissioner-calibrated front-of-green latitude used by live hole GPS.';
comment on column public.golf_course_holes.front_lng is
  'Commissioner-calibrated front-of-green longitude used by live hole GPS.';
comment on column public.golf_course_holes.back_lat is
  'Commissioner-calibrated back-of-green latitude used by live hole GPS.';
comment on column public.golf_course_holes.back_lng is
  'Commissioner-calibrated back-of-green longitude used by live hole GPS.';
