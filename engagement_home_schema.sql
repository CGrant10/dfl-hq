-- DFL HQ engagement pass: Wall reactions. Arena aftermath slides are retired.
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

-- Retire both automatic and saved Arena winner slides; keep race results intact.
drop trigger if exists arena_result_aftermath_broadcast on public.arena_results;
drop function if exists public.dfl_arena_aftermath_broadcast();
update public.broadcast_items set active=false
 where kicker='ARENA AFTERMATH' and treatment='champion'
 and (href like '#/arena-results?id=%' or href like '#/arena?id=%');
