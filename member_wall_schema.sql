-- DFL HQ member wall + photo submissions. Safe to re-run.
create table if not exists public.member_wall_posts (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 500),
  image text,
  created_at timestamptz not null default now(),
  constraint wall_has_content check (length(trim(body)) > 0 or image is not null)
);
create index if not exists member_wall_posts_created_idx on public.member_wall_posts(created_at desc);
alter table public.member_wall_posts enable row level security;
drop policy if exists "wall read" on public.member_wall_posts;
drop policy if exists "wall insert own" on public.member_wall_posts;
drop policy if exists "wall delete own or admin" on public.member_wall_posts;
create policy "wall read" on public.member_wall_posts for select using (true);
create policy "wall insert own" on public.member_wall_posts for insert with check (member_id = dfl_current_member());
create policy "wall delete own or admin" on public.member_wall_posts for delete using (member_id = dfl_current_member() or has_commissioner_permission('broadcast'));

create table if not exists public.broadcast_submissions (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  image text not null,
  caption text not null default '' check (char_length(caption) <= 180),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  dwell_seconds int check (dwell_seconds between 3 and 15),
  broadcast_item_id bigint references public.broadcast_items(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists broadcast_submissions_status_idx on public.broadcast_submissions(status, created_at desc);
alter table public.broadcast_submissions enable row level security;
drop policy if exists "submission read" on public.broadcast_submissions;
drop policy if exists "submission insert own" on public.broadcast_submissions;
drop policy if exists "submission admin update" on public.broadcast_submissions;
create policy "submission read" on public.broadcast_submissions for select using (member_id = dfl_current_member() or has_commissioner_permission('broadcast'));
create policy "submission insert own" on public.broadcast_submissions for insert with check (member_id = dfl_current_member() and status = 'pending');
create policy "submission admin update" on public.broadcast_submissions for update using (has_commissioner_permission('broadcast')) with check (has_commissioner_permission('broadcast'));

create or replace function public.approve_broadcast_submission(p_id bigint, p_dwell_seconds int default 8)
returns bigint language plpgsql security definer set search_path=public as $$
declare s public.broadcast_submissions; new_id bigint;
begin
  if not has_commissioner_permission('broadcast') then raise exception 'Broadcast commissioner access required'; end if;
  select * into s from public.broadcast_submissions where id=p_id for update;
  if s.id is null then raise exception 'Submission not found'; end if;
  if s.status <> 'pending' then raise exception 'Submission already reviewed'; end if;
  insert into public.broadcast_items(treatment,kicker,headline,image,temporal,active,dwell_seconds)
  values ('hero','FROM THE BOYS',coalesce(nullif(trim(s.caption),''),'DFL'),s.image,'recent',true,greatest(3,least(coalesce(p_dwell_seconds,8),15)))
  returning id into new_id;
  update public.broadcast_submissions set status='approved',dwell_seconds=greatest(3,least(coalesce(p_dwell_seconds,8),15)),broadcast_item_id=new_id,reviewed_at=now() where id=p_id;
  return new_id;
end $$;
grant execute on function public.approve_broadcast_submission(bigint,int) to anon,authenticated;
