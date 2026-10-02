-- League games use the app's existing selected-member identity model.
-- Quiz answers are private; immutable attempts are graded by a narrow trigger.
create schema if not exists private;
create table public.dfl_trivia_questions (
 season integer not null, week integer not null check(week between 1 and 18),
 ordinal integer not null check(ordinal between 1 and 5), prompt text not null,
 options jsonb not null, source text not null, correct_index integer not null check(correct_index between 0 and 3),
 primary key(season,week,ordinal)
);
alter table public.dfl_trivia_questions enable row level security;
create policy "read quiz prompts" on public.dfl_trivia_questions for select to anon,authenticated using(true);
revoke all on public.dfl_trivia_questions from anon,authenticated;
grant select(season,week,ordinal,prompt,options) on public.dfl_trivia_questions to anon,authenticated;
create table public.dfl_trivia_attempts (
 season integer not null, week integer not null, member_id bigint not null references public.members(id),
 answers integer[] not null, correct integer not null default 0, results jsonb not null default '[]',
 created_at timestamptz not null default now(), primary key(season,week,member_id)
);
create index dfl_trivia_member_idx on public.dfl_trivia_attempts(member_id);
alter table public.dfl_trivia_attempts enable row level security;
create policy "read trivia scores" on public.dfl_trivia_attempts for select to anon,authenticated using(true);
create policy "submit one own quiz" on public.dfl_trivia_attempts for insert to anon,authenticated with check(member_id=(select public.dfl_current_member()));
revoke all on public.dfl_trivia_attempts from anon,authenticated;
grant select(season,week,member_id,correct,created_at) on public.dfl_trivia_attempts to anon,authenticated;
grant insert(season,week,member_id,answers) on public.dfl_trivia_attempts to anon,authenticated;
create function private.grade_dfl_trivia() returns trigger language plpgsql security definer set search_path='' as $$
declare q record; idx integer; score integer:=0; receipt jsonb:='[]';
begin
 if new.member_id is distinct from public.dfl_current_member() then raise exception 'Choose your profile first'; end if;
 if cardinality(new.answers)<>5 or array_lower(new.answers,1)<>1 or exists(select 1 from unnest(new.answers) a where a is null or a<0 or a>3) then raise exception 'Answer all five questions'; end if;
 if (select count(*) from public.dfl_trivia_questions where season=new.season and week=new.week)<>5 then raise exception 'Quiz unavailable'; end if;
 if now()<public.clubhouse_week_end(new.season,new.week)-interval '7 days' or now()>=public.clubhouse_week_end(new.season,new.week) then raise exception 'This weekly quiz is closed'; end if;
 for q in select * from public.dfl_trivia_questions where season=new.season and week=new.week order by ordinal loop
  idx:=new.answers[q.ordinal]; if idx=q.correct_index then score:=score+1; end if;
  receipt:=receipt||jsonb_build_array(jsonb_build_object('ordinal',q.ordinal,'answer',idx,'correctIndex',q.correct_index,'prompt',q.prompt,'options',q.options,'source',q.source));
 end loop;
 new.correct:=score;new.results:=receipt;new.created_at:=now();return new;
end $$;
revoke all on function private.grade_dfl_trivia() from public,anon,authenticated;
create trigger grade_dfl_trivia before insert on public.dfl_trivia_attempts for each row execute function private.grade_dfl_trivia();
-- Only an actor's own answer receipts are returned. Private implementation is
-- outside the exposed schema; its public wrapper remains an invoker.
create function private.my_dfl_trivia(p_season integer,p_week integer) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('correct',a.correct,'results',a.results) from public.dfl_trivia_attempts a where a.season=p_season and a.week=p_week and a.member_id=public.dfl_current_member();
$$;
revoke all on function private.my_dfl_trivia(integer,integer) from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.my_dfl_trivia(integer,integer) to anon,authenticated;
create function public.my_dfl_trivia(p_season integer,p_week integer) returns jsonb language sql stable security invoker set search_path='' as $$select private.my_dfl_trivia(p_season,p_week)$$;
revoke all on function public.my_dfl_trivia(integer,integer) from public;
grant execute on function public.my_dfl_trivia(integer,integer) to anon,authenticated;
-- Freeze packs for every week of the latest synced season. Historical source
-- rows remain identifiable and corrections cannot change submitted questions.
create function private.seed_dfl_trivia(p_season integer) returns void language sql security definer set search_path='' as $$
insert into public.dfl_trivia_questions(season,week,ordinal,prompt,options,source,correct_index)
select season,w,n::integer,
 case when n%3=0 then format('Which season featured this game: %s %s — %s %s?',left_name,score1::text,score2::text,right_name)
 when n%3=2 then format('How many points did %s score against %s in %s Week %s?',winner_name,loser_name,gseason,gweek)
 else format('Who won the %s Week %s meeting between %s and %s?',gseason,gweek,left_name,right_name) end,
 (select jsonb_agg(choices.options->((i-(n::integer%4)+4)%4) order by i) from generate_series(0,3)i cross join lateral (select case when n%3=0 then to_jsonb(array[gseason::text,(gseason-1)::text,(gseason+1)::text,(gseason-2)::text])
 when n%3=2 then to_jsonb(array[winner_score::text,(winner_score+7.5)::text,(winner_score-3.2)::text,(winner_score+12.4)::text])
 else to_jsonb(array[winner_name,loser_name,'It was a tie','The matchup was not played']) end as options)choices),
 format('%s Week %s · %s %s — %s %s',gseason,gweek,left_name,score1,score2,right_name),n::integer%4
from (select l.season,w,g.* from (select p_season season) l cross join generate_series(1,18) w cross join lateral (
 select row_number() over(order by md5(concat(l.season,':',w,':',m.season,':',m.week,':',m.roster1,':',m.roster2))) n,
 m.season gseason,m.week gweek,m.score1,m.score2,
 coalesce(a.display_name,'Roster '||m.roster1) left_name,coalesce(b.display_name,'Roster '||m.roster2) right_name,
 case when m.score1>m.score2 then coalesce(a.display_name,'Roster '||m.roster1) else coalesce(b.display_name,'Roster '||m.roster2) end winner_name,
 case when m.score1>m.score2 then coalesce(b.display_name,'Roster '||m.roster2) else coalesce(a.display_name,'Roster '||m.roster1) end loser_name,
 greatest(m.score1,m.score2) winner_score
 from public.sleeper_matchups m left join public.members a on a.sleeper_user_id=m.user1 left join public.members b on b.sleeper_user_id=m.user2
 where m.season<l.season and m.score1<>m.score2 and m.score1>0 and m.score2>0
 order by md5(concat(l.season,':',w,':',m.season,':',m.week,':',m.roster1,':',m.roster2)) limit 5
 )g)bank where n<=5 on conflict do nothing;
$$;
revoke all on function private.seed_dfl_trivia(integer) from public,anon,authenticated;
create function private.seed_dfl_trivia_on_season() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.seed_dfl_trivia(new.season);return new;end $$;
revoke all on function private.seed_dfl_trivia_on_season() from public,anon,authenticated;
create trigger seed_dfl_trivia_on_season after insert on public.sleeper_leagues for each row execute function private.seed_dfl_trivia_on_season();
select private.seed_dfl_trivia((select max(season) from public.sleeper_leagues));

create function public.dfl_call_lock(p_season integer,p_week integer) returns timestamptz language sql stable security invoker set search_path='' as $$
 select coalesce((select min(starts_at) from public.nfl_pickem_games where season=p_season and week=p_week),public.clubhouse_week_end(p_season,p_week)-interval '4 days 10 hours');
$$;
revoke all on function public.dfl_call_lock(integer,integer) from public;
grant execute on function public.dfl_call_lock(integer,integer) to anon,authenticated;
grant select(season,week,starts_at) on public.nfl_pickem_games to anon,authenticated;
create table public.dfl_weekly_calls (
 season integer not null,week integer not null check(week between 1 and 18),member_id bigint not null references public.members(id),
 matchup_id integer not null,roster_id integer not null,created_at timestamptz not null default now(),
 primary key(season,week,member_id), foreign key(season,week,matchup_id) references public.sleeper_matchups(season,week,matchup_id)
);
create index dfl_weekly_calls_member_idx on public.dfl_weekly_calls(member_id);
alter table public.dfl_weekly_calls enable row level security;
create function public.dfl_call_valid(p_season integer,p_week integer,p_matchup integer,p_roster integer) returns boolean language sql stable security invoker set search_path='' as $$
 select now()<public.dfl_call_lock(p_season,p_week) and now()>=public.clubhouse_week_end(p_season,p_week)-interval '7 days'
 and exists(select 1 from public.sleeper_matchups where season=p_season and week=p_week and matchup_id=p_matchup and p_roster in (roster1,roster2));
$$;
revoke all on function public.dfl_call_valid(integer,integer,integer,integer) from public;
grant execute on function public.dfl_call_valid(integer,integer,integer,integer) to anon,authenticated;
create policy "read weekly calls" on public.dfl_weekly_calls for select to anon,authenticated using(true);
create policy "make own call" on public.dfl_weekly_calls for insert to anon,authenticated with check(member_id=(select public.dfl_current_member()) and public.dfl_call_valid(season,week,matchup_id,roster_id));
create policy "change own unlocked call" on public.dfl_weekly_calls for update to anon,authenticated using(member_id=(select public.dfl_current_member()) and now()<public.dfl_call_lock(season,week)) with check(member_id=(select public.dfl_current_member()) and public.dfl_call_valid(season,week,matchup_id,roster_id));
revoke all on public.dfl_weekly_calls from anon,authenticated;
grant select,insert,update on public.dfl_weekly_calls to anon,authenticated;
