-- DFL HQ real-line feed + weekly NFL pick'em. Safe to re-run.

-- Provider markets share the existing slip, wallet, parlay and settlement path.
alter table public.sportsbook_markets drop constraint if exists sportsbook_markets_source_check;
alter table public.sportsbook_markets
  add constraint sportsbook_markets_source_check check (source in ('commissioner','lore','provider')),
  add column if not exists provider_key text,
  add column if not exists provider_event_id text,
  add column if not exists provider_market_id text,
  add column if not exists provider_line numeric,
  add column if not exists provider_score numeric,
  add column if not exists provider_updated_at timestamptz;
create unique index if not exists uq_sportsbook_market_provider_key
  on public.sportsbook_markets(provider_key) where provider_key is not null;

alter table public.sportsbook_outcomes add column if not exists provider_side text;
create unique index if not exists uq_sportsbook_outcome_provider_side
  on public.sportsbook_outcomes(market_id,provider_side) where provider_side is not null;

create table if not exists public.nfl_pickem_games (
  provider_event_id text primary key,
  season int not null,
  week int not null check (week between 1 and 22),
  starts_at timestamptz not null,
  away_team_id text not null,
  away_team_name text not null,
  home_team_id text not null,
  home_team_name text not null,
  away_score numeric,
  home_score numeric,
  status text not null default 'scheduled' check (status in ('scheduled','live','final','cancelled')),
  is_monday_night boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists idx_pickem_games_week on public.nfl_pickem_games(season,week,starts_at);

create table if not exists public.nfl_pickem_entries (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  season int not null,
  week int not null,
  tiebreak_total numeric not null check (tiebreak_total between 0 and 150),
  correct_count int,
  tiebreak_delta numeric,
  graded boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id,season,week)
);

create table if not exists public.nfl_pickem_picks (
  entry_id bigint not null references public.nfl_pickem_entries(id) on delete cascade,
  game_id text not null references public.nfl_pickem_games(provider_event_id) on delete cascade,
  picked_team_id text not null,
  primary key(entry_id,game_id)
);

alter table public.nfl_pickem_games enable row level security;
alter table public.nfl_pickem_entries enable row level security;
alter table public.nfl_pickem_picks enable row level security;
revoke all on public.nfl_pickem_games,public.nfl_pickem_entries,public.nfl_pickem_picks from anon,authenticated;

create or replace function public.pickem_current_board(target_season int default null,target_week int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare mid bigint:=public.sportsbook_member_id(); s int; w int; result jsonb;
begin
  select season,week into s,w from public.nfl_pickem_games
   where (target_season is null or season=target_season) and (target_week is null or week=target_week)
   order by case when starts_at > now() then 0 else 1 end, abs(extract(epoch from (starts_at-now()))) limit 1;
  if target_season is not null then s:=target_season; end if;
  if target_week is not null then w:=target_week; end if;
  if s is null then return jsonb_build_object('available',false); end if;
  select jsonb_build_object(
    'available',true,'season',s,'week',w,
    'locksAt',(select min(starts_at) from public.nfl_pickem_games where season=s and week=w),
    'games',coalesce((select jsonb_agg(to_jsonb(g) order by g.starts_at) from public.nfl_pickem_games g where g.season=s and g.week=w),'[]'::jsonb),
    'entry',(select jsonb_build_object('id',e.id,'tiebreakTotal',e.tiebreak_total,'correctCount',e.correct_count,'tiebreakDelta',e.tiebreak_delta,'graded',e.graded,
      'picks',coalesce((select jsonb_object_agg(p.game_id,p.picked_team_id) from public.nfl_pickem_picks p where p.entry_id=e.id),'{}'::jsonb))
      from public.nfl_pickem_entries e where e.member_id=mid and e.season=s and e.week=w),
    'standings',coalesce((select jsonb_agg(x order by x.correct_count desc nulls last,x.tiebreak_delta asc nulls last,x.submitted_at)
      from (select e.member_id,m.display_name,e.correct_count,e.tiebreak_delta,e.graded,e.submitted_at
        from public.nfl_pickem_entries e join public.members m on m.id=e.member_id where e.season=s and e.week=w) x),'[]'::jsonb),
    'seasonStandings',coalesce((select jsonb_agg(x order by x.total_correct desc,x.week_wins desc,x.display_name)
      from (select ranked.member_id,ranked.display_name,sum(ranked.correct_count)::int total_correct,count(*)::int weeks,
                   count(*) filter(where ranked.week_rank=1)::int week_wins
        from (select e.member_id,m.display_name,e.correct_count,
              row_number() over(partition by e.season,e.week order by e.correct_count desc,e.tiebreak_delta asc,e.submitted_at) week_rank
              from public.nfl_pickem_entries e join public.members m on m.id=e.member_id where e.season=s and e.graded) ranked
        group by ranked.member_id,ranked.display_name) x),'[]'::jsonb)
  ) into result;
  return result;
end; $$;
grant execute on function public.pickem_current_board(int,int) to anon,authenticated;

create or replace function public.pickem_save_entry(target_season int,target_week int,picks jsonb,tiebreak_total numeric)
returns bigint language plpgsql security definer set search_path = public as $$
declare mid bigint:=public.sportsbook_member_id(); eid bigint; g public.nfl_pickem_games%rowtype; picked text; game_count int;
begin
  if mid is null then raise exception 'Pick a DFL member first'; end if;
  if tiebreak_total is null or tiebreak_total<0 or tiebreak_total>150 then raise exception 'Enter a Monday-night total from 0 to 150'; end if;
  select count(*) into game_count from public.nfl_pickem_games where season=target_season and week=target_week;
  if game_count=0 then raise exception 'That pick em slate is not available'; end if;
  if (select min(starts_at) from public.nfl_pickem_games where season=target_season and week=target_week)<=now() then raise exception 'The weekly card has locked'; end if;
  if jsonb_typeof(picks)<>'object' or jsonb_object_length(picks)<>game_count then raise exception 'Pick every game before locking your card'; end if;
  for g in select * from public.nfl_pickem_games where season=target_season and week=target_week loop
    picked:=picks->>g.provider_event_id;
    if picked is null or picked not in (g.away_team_id,g.home_team_id) then raise exception 'Choose a valid winner for every game'; end if;
  end loop;
  insert into public.nfl_pickem_entries(member_id,season,week,tiebreak_total)
  values(mid,target_season,target_week,tiebreak_total)
  on conflict(member_id,season,week) do update set tiebreak_total=excluded.tiebreak_total,updated_at=now(),submitted_at=now(),graded=false
  returning id into eid;
  delete from public.nfl_pickem_picks where entry_id=eid;
  for g in select * from public.nfl_pickem_games where season=target_season and week=target_week loop
    insert into public.nfl_pickem_picks(entry_id,game_id,picked_team_id) values(eid,g.provider_event_id,picks->>g.provider_event_id);
  end loop;
  return eid;
end; $$;
grant execute on function public.pickem_save_entry(int,int,jsonb,numeric) to anon,authenticated;

-- Service-only grading. A tied NFL game accepts either team; the MNF total breaks weekly ties.
create or replace function public.pickem_grade_week(target_season int,target_week int)
returns int language plpgsql security definer set search_path = public as $$
declare actual_total numeric; changed int;
begin
  if (select count(*) from public.nfl_pickem_games where season=target_season and week=target_week)=0
     or exists(select 1 from public.nfl_pickem_games where season=target_season and week=target_week and status not in ('final','cancelled')) then return 0; end if;
  select home_score+away_score into actual_total from public.nfl_pickem_games where season=target_season and week=target_week and is_monday_night order by starts_at desc limit 1;
  update public.nfl_pickem_entries e set
    correct_count=(select count(*) from public.nfl_pickem_picks p join public.nfl_pickem_games g on g.provider_event_id=p.game_id
      where p.entry_id=e.id and g.status='final' and (g.home_score=g.away_score or p.picked_team_id=case when g.home_score>g.away_score then g.home_team_id else g.away_team_id end)),
    tiebreak_delta=case when actual_total is null then null else abs(e.tiebreak_total-actual_total) end,graded=true,updated_at=now()
  where e.season=target_season and e.week=target_week;
  get diagnostics changed=row_count; return changed;
end; $$;
revoke all on function public.pickem_grade_week(int,int) from public,anon,authenticated;
grant execute on function public.pickem_grade_week(int,int) to service_role;

-- Provider settlement deliberately bypasses the commissioner UI, but is callable only by the backend key.
create or replace function public.sportsbook_settle_provider_market(target_provider_key text,winner_side text,final_score numeric,void_market boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_market_id bigint; winner_id bigint; touched bigint; b public.sportsbook_bets%rowtype;
begin
  select id into v_market_id from public.sportsbook_markets where provider_key=target_provider_key and source='provider' and status in ('open','locked') for update;
  if v_market_id is null then return false; end if;
  update public.sportsbook_markets set provider_score=final_score,provider_updated_at=now() where id=v_market_id;
  if void_market then
    update public.sportsbook_bet_legs set status='void',settled_at=now() where market_id=v_market_id and status='open';
  else
    select id into winner_id from public.sportsbook_outcomes where market_id=v_market_id and provider_side=winner_side;
    if winner_id is null then raise exception 'Provider winner is missing'; end if;
    update public.sportsbook_outcomes set is_winner=(id=winner_id) where market_id=v_market_id;
    update public.sportsbook_bet_legs set status=case when outcome_id=winner_id then 'won' else 'lost' end,settled_at=now() where market_id=v_market_id and status='open';
  end if;
  for touched in select distinct bet_id from public.sportsbook_bet_legs where market_id=v_market_id loop
    if void_market then
      select * into b from public.sportsbook_bets where id=touched for update;
      if b.status='open' then
        update public.sportsbook_bets set status='void',payout=0,settled_at=now() where id=b.id;
        update public.sportsbook_wallets set balance=balance+b.stake,updated_at=now() where member_id=b.member_id;
        insert into public.sportsbook_ledger(member_id,amount,kind,note,market_id,bet_id) values(b.member_id,b.stake,'refund','Provider market voided',b.market_id,b.id);
      end if;
    else perform public.sportsbook_roll_up_entry(touched); end if;
  end loop;
  update public.sportsbook_markets set status=case when void_market then 'void' else 'settled' end,settled_at=now() where id=v_market_id;
  return true;
end; $$;
revoke all on function public.sportsbook_settle_provider_market(text,text,numeric,boolean) from public,anon,authenticated;
grant execute on function public.sportsbook_settle_provider_market(text,text,numeric,boolean) to service_role;

-- Refresh once each morning; commissioners can also use Sync lines on demand.
-- Reuses the already-vaulted Sleeper function URL and cron token, so there is
-- no second scheduler secret to maintain.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create schema if not exists private;
create or replace function private.sync_sportsbook_feed()
returns bigint language plpgsql security definer
set search_path=pg_catalog,extensions,net,vault as $$
declare request_id bigint; base_url text; cron_token text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name='dfl_sleeper_sync_url' limit 1;
  select decrypted_secret into cron_token from vault.decrypted_secrets where name='dfl_sleeper_cron_token' limit 1;
  if base_url is null or cron_token is null then return null; end if;
  select net.http_post(
    url:=replace(base_url,'sync-sleeper','sync-sportsbook-feed'),
    headers:=jsonb_build_object('Content-Type','application/json','x-dfl-cron-token',cron_token),
    body:=jsonb_build_object('action','sync','scheduled_at',now()),timeout_milliseconds:=30000
  ) into request_id;
  return request_id;
end; $$;
revoke all on function private.sync_sportsbook_feed() from public,anon,authenticated;
do $$ begin
  if exists(select 1 from cron.job where jobname='dfl-sportsbook-feed-sync') then perform cron.unschedule('dfl-sportsbook-feed-sync'); end if;
end $$;
select cron.schedule('dfl-sportsbook-feed-sync','15 14 * * *','select private.sync_sportsbook_feed();');
