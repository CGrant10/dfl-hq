-- DFL HQ engagement pass: Wall reactions + automatic Arena aftermath slides.
-- Safe to re-run.

create table if not exists public.wall_reactions (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.member_wall_posts(id) on delete cascade,
  member_id bigint not null references public.members(id) on delete cascade,
  reaction text not null check (reaction in ('😂','🔥','💀','🏆','🖕')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, member_id)
);

create index if not exists wall_reactions_post_idx on public.wall_reactions(post_id);
create index if not exists wall_reactions_member_idx on public.wall_reactions(member_id);

alter table public.wall_reactions enable row level security;
drop policy if exists "wall reactions read" on public.wall_reactions;
drop policy if exists "wall reactions insert own" on public.wall_reactions;
drop policy if exists "wall reactions update own" on public.wall_reactions;
drop policy if exists "wall reactions delete own" on public.wall_reactions;

create policy "wall reactions read" on public.wall_reactions
  for select using (true);
create policy "wall reactions insert own" on public.wall_reactions
  for insert with check (member_id = public.dfl_current_member());
create policy "wall reactions update own" on public.wall_reactions
  for update using (member_id = public.dfl_current_member())
  with check (member_id = public.dfl_current_member());
create policy "wall reactions delete own" on public.wall_reactions
  for delete using (member_id = public.dfl_current_member());

create or replace function public.dfl_touch_wall_reaction()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists wall_reactions_touch on public.wall_reactions;
create trigger wall_reactions_touch
before update on public.wall_reactions
for each row execute function public.dfl_touch_wall_reaction();

-- A finished Arena race should leave a little smoke behind on Home. The
-- winning result creates one temporary hand-written-style Broadcast item.
-- It expires after three days and is deduplicated by its result link.
create or replace function public.dfl_arena_aftermath_broadcast()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  winner_name text;
  event_name text;
  result_href text;
begin
  if new.place <> 1 then return new; end if;

  select coalesce(m.display_name, 'Somebody'), coalesce(e.name, 'DFL Arena')
    into winner_name, event_name
  from public.arena_events e
  left join public.members m on m.id = new.member_id
  where e.id = new.event_id;

  if winner_name is null then return new; end if;
  result_href := '#/arena-results?id=' || new.event_id::text;

  if not exists (
    select 1 from public.broadcast_items
    where href = result_href and kicker = 'ARENA AFTERMATH'
  ) then
    insert into public.broadcast_items(
      treatment,kicker,headline,subtitle,href,temporal,active,
      starts_at,ends_at,dwell_seconds,background,sort_order
    ) values (
      'champion','ARENA AFTERMATH',winner_name || ' just folded everyone',event_name,
      result_href,'recent',true,now(),now() + interval '3 days',5,'default',0
    );
  end if;

  return new;
end $$;

drop trigger if exists arena_result_aftermath_broadcast on public.arena_results;
create trigger arena_result_aftermath_broadcast
after insert on public.arena_results
for each row execute function public.dfl_arena_aftermath_broadcast();
