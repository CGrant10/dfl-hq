-- DFL HQ league photo submissions: Broadcast, Hall of Fame, or Both.
-- Safe to re-run after member_wall_schema.sql.

alter table public.broadcast_submissions
  add column if not exists target_broadcast boolean not null default true,
  add column if not exists target_hall boolean not null default false,
  add column if not exists hall_status text not null default 'not_requested',
  add column if not exists hall_year int,
  add column if not exists people_label text not null default '',
  add column if not exists hall_reviewed_at timestamptz;

alter table public.broadcast_submissions drop constraint if exists broadcast_submissions_status_check;
alter table public.broadcast_submissions
  add constraint broadcast_submissions_status_check
  check (status in ('not_requested','pending','approved','rejected'));

alter table public.broadcast_submissions drop constraint if exists broadcast_submissions_hall_status_check;
alter table public.broadcast_submissions
  add constraint broadcast_submissions_hall_status_check
  check (hall_status in ('not_requested','pending','approved','rejected'));

alter table public.broadcast_submissions drop constraint if exists broadcast_submissions_target_check;
alter table public.broadcast_submissions
  add constraint broadcast_submissions_target_check check (target_broadcast or target_hall);

alter table public.broadcast_submissions drop constraint if exists broadcast_submissions_people_label_check;
alter table public.broadcast_submissions
  add constraint broadcast_submissions_people_label_check check (char_length(people_label) <= 160);

alter table public.broadcast_submissions drop constraint if exists broadcast_submissions_hall_year_check;
alter table public.broadcast_submissions
  add constraint broadcast_submissions_hall_year_check check (hall_year is null or hall_year between 2010 and 2100);

-- Existing rows were Broadcast submissions. Keep their existing status and mark
-- Hall as not requested.
update public.broadcast_submissions
set target_broadcast = true,
    target_hall = coalesce(target_hall, false),
    hall_status = case when coalesce(target_hall, false) then coalesce(nullif(hall_status,''),'pending') else 'not_requested' end
where target_broadcast is distinct from true
   or hall_status is null
   or hall_status = '';

alter table public.broadcast_submissions enable row level security;
drop policy if exists "submission read" on public.broadcast_submissions;
drop policy if exists "submission insert own" on public.broadcast_submissions;
drop policy if exists "submission admin update" on public.broadcast_submissions;

create policy "submission read" on public.broadcast_submissions for select using (
  member_id = dfl_current_member()
  or public.is_admin()
  or public.is_commissioner()
  or (target_hall and hall_status = 'approved')
);

create policy "submission insert own" on public.broadcast_submissions for insert with check (
  member_id = dfl_current_member()
  and (target_broadcast or target_hall)
  and status = case when target_broadcast then 'pending' else 'not_requested' end
  and hall_status = case when target_hall then 'pending' else 'not_requested' end
);

create policy "submission admin update" on public.broadcast_submissions for update using (
  public.is_admin() or public.is_commissioner()
) with check (
  public.is_admin() or public.is_commissioner()
);

create or replace function public.approve_broadcast_submission(p_id bigint, p_dwell_seconds int default 8)
returns bigint language plpgsql security definer set search_path=public as $$
declare s public.broadcast_submissions; new_id bigint;
begin
  if not (public.is_admin() or public.is_commissioner()) then
    raise exception 'Commissioner access required';
  end if;
  select * into s from public.broadcast_submissions where id=p_id for update;
  if s.id is null then raise exception 'Submission not found'; end if;
  if not s.target_broadcast then raise exception 'Broadcast was not requested'; end if;
  if s.status <> 'pending' then raise exception 'Broadcast submission already reviewed'; end if;
  insert into public.broadcast_items(treatment,kicker,headline,image,temporal,active,dwell_seconds)
  values ('hero','FROM THE BOYS',coalesce(nullif(trim(s.caption),''),'DFL'),s.image,'recent',true,greatest(3,least(coalesce(p_dwell_seconds,8),15)))
  returning id into new_id;
  update public.broadcast_submissions
    set status='approved',
        dwell_seconds=greatest(3,least(coalesce(p_dwell_seconds,8),15)),
        broadcast_item_id=new_id,
        reviewed_at=now()
    where id=p_id;
  return new_id;
end $$;

grant execute on function public.approve_broadcast_submission(bigint,int) to anon,authenticated;

create or replace function public.approve_hall_submission(p_id bigint)
returns void language plpgsql security definer set search_path=public as $$
declare s public.broadcast_submissions;
begin
  if not (public.is_admin() or public.is_commissioner()) then
    raise exception 'Commissioner access required';
  end if;
  select * into s from public.broadcast_submissions where id=p_id for update;
  if s.id is null then raise exception 'Submission not found'; end if;
  if not s.target_hall then raise exception 'Hall of Fame was not requested'; end if;
  if s.hall_status <> 'pending' then raise exception 'Hall submission already reviewed'; end if;
  update public.broadcast_submissions
    set hall_status='approved', hall_reviewed_at=now()
    where id=p_id;
end $$;

grant execute on function public.approve_hall_submission(bigint) to anon,authenticated;
