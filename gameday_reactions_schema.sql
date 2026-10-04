-- Matchup reactions follow the same selected-member identity as Wall reactions.
create table public.gameday_reactions (
 league_id text not null check (league_id ~ '^[0-9]{1,24}$'),
 season integer not null check (season between 2000 and 2200),
 week integer not null check (week between 1 and 18),
 matchup_id integer not null check (matchup_id > 0),
 member_id bigint not null references public.members(id) on delete cascade,
 reaction text not null check (reaction in ('choke','cooking','fraud','respect')),
 created_at timestamptz not null default now(),
 primary key (league_id,season,week,matchup_id,member_id,reaction)
);
create index gameday_reactions_member_idx on public.gameday_reactions(member_id);
alter table public.gameday_reactions enable row level security;
create policy "read matchup reactions" on public.gameday_reactions for select to anon,authenticated using (true);
create policy "react to synced matchup as self" on public.gameday_reactions for insert to anon,authenticated with check (
 member_id = (select public.dfl_current_member())
 and exists (select 1 from public.sleeper_matchups g where g.league_id=gameday_reactions.league_id and g.season=gameday_reactions.season and g.week=gameday_reactions.week and g.matchup_id=gameday_reactions.matchup_id)
);
create policy "remove own matchup reaction" on public.gameday_reactions for delete to anon,authenticated using (member_id = (select public.dfl_current_member()));
revoke all on public.gameday_reactions from anon,authenticated;
grant select,insert,delete on public.gameday_reactions to anon,authenticated;
