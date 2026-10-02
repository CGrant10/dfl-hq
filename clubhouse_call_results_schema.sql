-- Weekly predictions share the same lock and ownership rules for both modes.
alter table public.dfl_weekly_calls add column kind text not null default 'winner' check(kind in ('winner','high-score'));
create index dfl_weekly_calls_matchup_idx on public.dfl_weekly_calls(season,week,matchup_id);
create function public.dfl_call_standings(p_season integer) returns jsonb language sql stable security invoker set search_path='' as $$
 with final_weeks as (select distinct g.week from public.sleeper_matchups g where g.season=p_season and public.clubhouse_week_final(g.season,g.week)),
 grades as (select c.member_id,case when c.kind='winner' then (case when g.score1>g.score2 then g.roster1 when g.score2>g.score1 then g.roster2 else null end)=c.roster_id
 else (case when c.roster_id=g.roster1 then g.score1 else g.score2 end)=(select max(greatest(m.score1,m.score2)) from public.sleeper_matchups m where m.season=c.season and m.week=c.week) end as correct
 from public.dfl_weekly_calls c join final_weeks w on w.week=c.week join public.sleeper_matchups g on g.season=c.season and g.week=c.week and g.matchup_id=c.matchup_id
 where c.season=p_season and g.score1 is not null and g.score2 is not null and (c.kind='winner' or not exists(select 1 from public.sleeper_matchups missing where missing.season=c.season and missing.week=c.week and (missing.score1 is null or missing.score2 is null)))),
 ranked as (select member_id,count(*) as played,count(*) filter(where correct) as correct from grades group by member_id)
 select coalesce(jsonb_agg(to_jsonb(r) order by r.correct desc,r.played,r.member_id),'[]'::jsonb) from ranked r;
$$;
revoke all on function public.dfl_call_standings(integer) from public;
grant execute on function public.dfl_call_standings(integer) to anon,authenticated;
-- Retry seeding on league syncs in case the season row arrived before history.
drop trigger seed_dfl_trivia_on_season on public.sleeper_leagues;
create trigger seed_dfl_trivia_on_season after insert or update of synced_at on public.sleeper_leagues for each row execute function private.seed_dfl_trivia_on_season();
