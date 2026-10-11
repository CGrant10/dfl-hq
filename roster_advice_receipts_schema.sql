-- Public league advice only. Browsers can read; only the protected server
-- worker records snapshots. No member IDs, credentials or private behavior.
create table public.roster_advice_receipts (
 id bigint generated always as identity primary key,
 league_id text not null,
 season integer not null check(season between 2010 and 2100),
 week integer not null check(week between 1 and 18),
 roster_id integer not null check(roster_id between 1 and 12),
 kind text not null check(kind in ('lineup','waiver')),
 source_version text not null,
 before_lineup jsonb not null check(jsonb_typeof(before_lineup)='array' and jsonb_array_length(before_lineup)=9),
 after_lineup jsonb not null check(jsonb_typeof(after_lineup)='array' and jsonb_array_length(after_lineup)=9),
 added_players jsonb not null check(jsonb_typeof(added_players)='array' and jsonb_array_length(added_players) between 1 and 9),
 removed_players jsonb not null check(jsonb_typeof(removed_players)='array' and jsonb_array_length(removed_players)<=9),
 label text not null check(length(label)<=240),
 drop_id text,
 projected_gain numeric not null check(projected_gain>0),
 scoring_settings jsonb not null check(jsonb_typeof(scoring_settings)='object'),
 captured_at timestamptz not null,
 locks_at timestamptz not null,
 created_at timestamptz not null default now(),
 check(captured_at<locks_at and captured_at<=created_at+interval '30 seconds'),
 unique(league_id,season,week,roster_id,kind)
);
create table public.roster_advice_checks (
 league_id text not null,
 season integer not null check(season between 2010 and 2100),
 week integer not null check(week between 1 and 18),
 roster_id integer not null check(roster_id between 1 and 12),
 checked_at timestamptz not null default now(),
 primary key(league_id,season,week,roster_id)
);
alter table public.roster_advice_receipts enable row level security;
alter table public.roster_advice_checks enable row level security;
revoke all on public.roster_advice_receipts,public.roster_advice_checks from public,anon,authenticated;
revoke all on sequence public.roster_advice_receipts_id_seq from public,anon,authenticated;
create policy "Read public pregame advice" on public.roster_advice_receipts for select to anon,authenticated using(true);
create policy "Read advice capture status" on public.roster_advice_checks for select to anon,authenticated using(true);
grant select on public.roster_advice_receipts,public.roster_advice_checks to anon,authenticated;
grant all on public.roster_advice_receipts,public.roster_advice_checks to service_role;
grant usage,select on sequence public.roster_advice_receipts_id_seq to service_role;
