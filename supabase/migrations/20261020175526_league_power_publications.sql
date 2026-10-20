-- Public league editions. Only the scheduled service can insert; no app client
-- can publish, edit or delete another manager's ranking.
create table public.league_power_publications (
 league_id text not null,
 season integer not null check(season between 2000 and 2200),
 week integer not null check(week between 1 and 14),
 model_version text not null,
 payload jsonb not null check(jsonb_typeof(payload)='object' and jsonb_typeof(payload->'rows')='array' and jsonb_array_length(payload->'rows') between 2 and 32),
 published_at timestamptz not null default now(),
 primary key(league_id,season,week,model_version)
);
alter table public.league_power_publications enable row level security;
revoke all on public.league_power_publications from public,anon,authenticated,service_role;
grant select on public.league_power_publications to anon,authenticated;
grant select,insert on public.league_power_publications to service_role;
create policy "Published power editions are public" on public.league_power_publications for select to anon,authenticated using(true);
comment on table public.league_power_publications is 'Append-only server-published weekly power editions. Historical rosters and movements do not change after publication.';
notify pgrst,'reload schema';
