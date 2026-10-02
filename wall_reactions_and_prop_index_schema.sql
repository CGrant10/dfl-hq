-- Public clubhouse reactions use the same selected-member ownership model
-- as Wall posts/replies. An emoji can occur only once per member and post.
create table public.member_wall_reactions(
 id bigint generated always as identity primary key,
 post_id bigint not null references public.member_wall_posts(id) on delete cascade,
 member_id bigint not null references public.members(id) on delete cascade,
 emoji text not null check(emoji in ('😂','🔥','💀','🧂')),
 created_at timestamptz not null default now(),
 unique(post_id,member_id,emoji)
);
create index member_wall_reactions_member_idx on public.member_wall_reactions(member_id);
alter table public.member_wall_reactions enable row level security;
create policy "read Wall reactions" on public.member_wall_reactions for select using(true);
create policy "react as self" on public.member_wall_reactions for insert with check(member_id=(select public.dfl_current_member()));
create policy "remove own reaction" on public.member_wall_reactions for delete using(member_id=(select public.dfl_current_member()));
revoke all on public.member_wall_reactions from anon,authenticated;
grant select,insert,delete on public.member_wall_reactions to anon,authenticated;
revoke all on sequence public.member_wall_reactions_id_seq from anon,authenticated;
grant usage on sequence public.member_wall_reactions_id_seq to anon,authenticated;

-- Compact discovery metadata only. Full prices, scores and outcome payloads
-- are fetched when a game opens. The function honors underlying table RLS.
create function public.sportsbook_prop_index() returns table(
 id bigint,title text,lore_note text,provider_event_id text,provider_key text,
 provider_updated_at timestamptz,closes_at timestamptz,status text,source text,category text
) language sql stable security invoker set search_path='' as $$
 select m.id,m.title,m.lore_note,m.provider_event_id,m.provider_key,
 m.provider_updated_at,m.closes_at,m.status,m.source,m.category
 from public.sportsbook_markets m where m.source='provider' and m.category='Player Props'
 and m.status='open' and (m.closes_at is null or m.closes_at>now())
 order by m.provider_event_id,m.id;
$$;
revoke all on function public.sportsbook_prop_index() from public;
grant execute on function public.sportsbook_prop_index() to anon,authenticated;
