-- Weekly rituals share the existing selected-member ownership model.
-- Final scores/awards remain derived, so Sleeper corrections update history.
create function public.clubhouse_week_end(p_season integer,p_week integer)
returns timestamptz language sql immutable security invoker set search_path='' as $$
 select (public_date.day::timestamp + interval '6 hours') at time zone 'America/New_York'
 from (select make_date(p_season,9,1) + ((8-extract(isodow from make_date(p_season,9,1))::integer)%7) + 8 + (p_week-1)*7 as day) public_date;
$$;
revoke all on function public.clubhouse_week_end(integer,integer) from public;
grant execute on function public.clubhouse_week_end(integer,integer) to anon,authenticated;

create policy "read public NFL slate status" on public.nfl_pickem_games for select to anon,authenticated using(true);
grant select(season,week,status) on public.nfl_pickem_games to anon,authenticated;
create function public.clubhouse_week_final(p_season integer,p_week integer)
returns boolean language sql stable security invoker set search_path='' as $$
 select now()>=public.clubhouse_week_end(p_season,p_week)
 and not exists(select 1 from public.nfl_pickem_games where season=p_season and week=p_week and status<>'final');
$$;
revoke all on function public.clubhouse_week_final(integer,integer) from public;
grant execute on function public.clubhouse_week_final(integer,integer) to anon,authenticated;

create function public.clubhouse_vote_open(p_season integer,p_week integer)
returns boolean language sql stable security invoker set search_path='' as $$
 select p_week between 1 and 18 and public.clubhouse_week_final(p_season,p_week)
 and now()<public.clubhouse_week_end(p_season,p_week+1)
 and exists(select 1 from public.sleeper_matchups where season=p_season and week=p_week and score1 is not null and score2 is not null);
$$;
revoke all on function public.clubhouse_vote_open(integer,integer) from public;
grant execute on function public.clubhouse_vote_open(integer,integer) to anon,authenticated;

create table public.clubhouse_award_votes(
 id bigint generated always as identity primary key,
 season integer not null check(season between 2010 and 2100),
 week integer not null check(week between 1 and 18),
 voter_id bigint not null references public.members(id) on delete cascade,
 nominee_id bigint not null references public.members(id) on delete cascade,
 unique(season,week,voter_id)
);
create index clubhouse_award_votes_voter_idx on public.clubhouse_award_votes(voter_id);
create index clubhouse_award_votes_nominee_idx on public.clubhouse_award_votes(nominee_id);
alter table public.clubhouse_award_votes enable row level security;
create policy "read weekly ballot" on public.clubhouse_award_votes for select using(true);
create policy "cast own weekly ballot" on public.clubhouse_award_votes for insert with check(
 voter_id=(select public.dfl_current_member()) and public.clubhouse_vote_open(season,week)
 and exists(select 1 from public.members n join public.sleeper_matchups g on n.sleeper_user_id in (g.user1,g.user2) where n.id=nominee_id and g.season=clubhouse_award_votes.season and g.week=clubhouse_award_votes.week)
);
create policy "change own weekly ballot" on public.clubhouse_award_votes for update using(voter_id=(select public.dfl_current_member()) and public.clubhouse_vote_open(season,week)) with check(
 voter_id=(select public.dfl_current_member()) and public.clubhouse_vote_open(season,week)
 and exists(select 1 from public.members n join public.sleeper_matchups g on n.sleeper_user_id in (g.user1,g.user2) where n.id=nominee_id and g.season=clubhouse_award_votes.season and g.week=clubhouse_award_votes.week)
);
create policy "withdraw own weekly ballot" on public.clubhouse_award_votes for delete using(voter_id=(select public.dfl_current_member()) and public.clubhouse_vote_open(season,week));
revoke all on public.clubhouse_award_votes from anon,authenticated;
grant select,insert,update,delete on public.clubhouse_award_votes to anon,authenticated;
revoke all on sequence public.clubhouse_award_votes_id_seq from anon,authenticated;
grant usage on sequence public.clubhouse_award_votes_id_seq to anon,authenticated;

create table public.clubhouse_matchup_threads(
 id bigint generated always as identity primary key,
 season integer not null,week integer not null,matchup_id integer not null,
 post_id bigint not null unique references public.member_wall_posts(id) on delete cascade,
 foreign key(season,week,matchup_id) references public.sleeper_matchups(season,week,matchup_id) on delete cascade,
 unique(season,week,matchup_id)
);
alter table public.clubhouse_matchup_threads enable row level security;
create policy "read matchup threads" on public.clubhouse_matchup_threads for select using(true);
create policy "start own matchup thread" on public.clubhouse_matchup_threads for insert with check(exists(select 1 from public.member_wall_posts p where p.id=post_id and p.member_id=(select public.dfl_current_member())));
revoke all on public.clubhouse_matchup_threads from anon,authenticated;
grant select,insert on public.clubhouse_matchup_threads to anon,authenticated;
revoke all on sequence public.clubhouse_matchup_threads_id_seq from anon,authenticated;
grant usage on sequence public.clubhouse_matchup_threads_id_seq to anon,authenticated;

create function public.clubhouse_open_thread(p_season integer,p_week integer,p_matchup integer)
returns bigint language plpgsql security invoker set search_path='' as $$
declare found_post bigint; game public.sleeper_matchups; actor bigint:=public.dfl_current_member(); left_name text; right_name text;
begin
 if actor is null then raise exception 'Choose your profile first'; end if;
 select * into game from public.sleeper_matchups where season=p_season and week=p_week and matchup_id=p_matchup;
 if not found then raise exception 'This matchup is not available'; end if;
 perform pg_advisory_xact_lock(p_season,p_week*1000+p_matchup);
 select post_id into found_post from public.clubhouse_matchup_threads where season=p_season and week=p_week and matchup_id=p_matchup;
 if found_post is not null then return found_post; end if;
 select coalesce(team_name,display_name) into left_name from public.members where sleeper_user_id=game.user1;
 select coalesce(team_name,display_name) into right_name from public.members where sleeper_user_id=game.user2;
 insert into public.member_wall_posts(member_id,body) values(actor,format('%s · Week %s matchup: %s vs %s. Bring predictions, trash talk and receipts.',p_season,p_week,coalesce(left_name,'Team '||game.roster1),coalesce(right_name,'Team '||game.roster2))) returning id into found_post;
 insert into public.clubhouse_matchup_threads(season,week,matchup_id,post_id) values(p_season,p_week,p_matchup,found_post);
 return found_post;
end $$;
revoke all on function public.clubhouse_open_thread(integer,integer,integer) from public;
grant execute on function public.clubhouse_open_thread(integer,integer,integer) to anon,authenticated;

create function public.clubhouse_week_data(p_season integer,p_week integer)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'season',p_season,'week',p_week,'completed',public.clubhouse_week_final(p_season,p_week),'voteOpen',public.clubhouse_vote_open(p_season,p_week),
 'voteClosesAt',public.clubhouse_week_end(p_season,p_week+1),
 'startsAt',public.clubhouse_week_end(p_season,p_week-1),'endsAt',public.clubhouse_week_end(p_season,p_week),
 'leagueId',(select sleeper_league_id from public.sleeper_leagues where season=p_season order by synced_at desc limit 1),
 'games',coalesce((select jsonb_agg(to_jsonb(g) order by g.matchup_id) from public.sleeper_matchups g where season=p_season and week=p_week),'[]'::jsonb),
 'votes',coalesce((select jsonb_agg(jsonb_build_object('voter_id',v.voter_id,'nominee_id',v.nominee_id) order by v.id) from public.clubhouse_award_votes v where season=p_season and week=p_week),'[]'::jsonb),
 'threads',coalesce((select jsonb_agg(jsonb_build_object('matchup_id',t.matchup_id,'post_id',t.post_id)) from public.clubhouse_matchup_threads t where season=p_season and week=p_week),'[]'::jsonb),
 'pickem',coalesce((select jsonb_agg(jsonb_build_object('member_id',e.member_id,'correct',e.correct_count,'rank',e.weekly_rank,'prize',e.prize_paid) order by e.weekly_rank,e.member_id) from public.nfl_pickem_entries e where e.season=p_season and e.week=p_week and e.graded),'[]'::jsonb),
 'sportsbook',public.sportsbook_weekly_recap(public.clubhouse_week_end(p_season,p_week)),
 'wall',coalesce((select jsonb_agg(to_jsonb(w)) from (select p.id,p.member_id,left(p.body,180) as body,
 (select count(*) from public.member_wall_reactions r where r.post_id=p.id) as reactions,
 (select count(*) from public.member_wall_replies r where r.post_id=p.id) as replies
 from public.member_wall_posts p where p.created_at>=public.clubhouse_week_end(p_season,p_week-1) and p.created_at<public.clubhouse_week_end(p_season,p_week)
 order by reactions desc,replies desc,p.id desc limit 3)w),'[]'::jsonb)
 );
$$;
revoke all on function public.clubhouse_week_data(integer,integer) from public;
grant execute on function public.clubhouse_week_data(integer,integer) to anon,authenticated;
create function public.clubhouse_week_index() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('season',w.season,'week',w.week,'completed',public.clubhouse_week_final(w.season,w.week)) order by w.season desc,w.week desc),'[]'::jsonb)
 from (select distinct season,week from public.sleeper_matchups where week between 1 and 18)w;
$$;
revoke all on function public.clubhouse_week_index() from public;
grant execute on function public.clubhouse_week_index() to anon,authenticated;

create function public.clubhouse_award_archive(p_season integer) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'leagueId',(select sleeper_league_id from public.sleeper_leagues where season=p_season order by synced_at desc limit 1),
 'games',coalesce((select jsonb_agg(to_jsonb(g) order by g.week,g.matchup_id) from public.sleeper_matchups g where g.season=p_season and public.clubhouse_week_final(g.season,g.week)),'[]'::jsonb),
 'votes',coalesce((select jsonb_agg(to_jsonb(v) order by v.week,v.id) from public.clubhouse_award_votes v where v.season=p_season),'[]'::jsonb),
 'closedWeeks',coalesce((select jsonb_agg(w.week) from (select distinct g.week from public.sleeper_matchups g where g.season=p_season and now()>=public.clubhouse_week_end(g.season,g.week+1))w),'[]'::jsonb));
$$;
revoke all on function public.clubhouse_award_archive(integer) from public;
grant execute on function public.clubhouse_award_archive(integer) to anon,authenticated;

-- Only final public score receipts; ungraded cards, picks and tiebreakers
-- remain inaccessible through the Data API.
create policy "read graded Pickem receipts" on public.nfl_pickem_entries for select to anon,authenticated using(graded); grant select(member_id,season,week,graded,correct_count,weekly_rank,prize_paid) on public.nfl_pickem_entries to anon,authenticated;
