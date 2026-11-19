-- Only the scheduled service worker can publish quotes. Ticket prices are snapshots.
create or replace function public.sportsbook_refresh_matchup_quotes(target_key text, quotes jsonb, checked_at timestamptz)
returns boolean language plpgsql security invoker set search_path='' as $$
declare m public.sportsbook_markets%rowtype; a numeric; b numeric; matched integer;
begin
 if target_key !~ '^matchup:[0-9]+:[0-9]+:[0-9]+$' or jsonb_typeof(quotes)<>'array' or jsonb_array_length(quotes)<>2 or checked_at is null or checked_at>now()+interval '1 minute' then raise exception 'Invalid matchup quotes'; end if;
 if exists(select 1 from jsonb_to_recordset(quotes) q(roster_id integer,projected numeric,odds integer) where q.roster_id is null or q.projected is null or q.projected<0 or q.odds is null or abs(q.odds)<100 or abs(q.odds)>100000) then raise exception 'Invalid matchup quote'; end if;
 select * into m from public.sportsbook_markets where auto_key=target_key and category='Fantasy' for update;
 if not found or m.status not in ('open','locked') or m.provider_updated_at>checked_at then return false; end if;
 select count(*) into matched from public.sportsbook_outcomes o join jsonb_to_recordset(quotes) q(roster_id integer,projected numeric,odds integer) on q.roster_id=o.sleeper_roster_id where o.market_id=m.id;
 if matched<>2 or (select count(distinct q.roster_id) from jsonb_to_recordset(quotes) q(roster_id integer))<>2 then raise exception 'Matchup teams changed'; end if;
 select q.projected into a from public.sportsbook_outcomes o join jsonb_to_recordset(quotes) q(roster_id integer,projected numeric) on q.roster_id=o.sleeper_roster_id where o.market_id=m.id order by o.sort_order,o.id limit 1;
 select q.projected into b from public.sportsbook_outcomes o join jsonb_to_recordset(quotes) q(roster_id integer,projected numeric) on q.roster_id=o.sleeper_roster_id where o.market_id=m.id order by o.sort_order desc,o.id desc limit 1;
 if m.status='open' and m.closes_at>now() then
  update public.sportsbook_outcomes o set odds_american=q.odds from jsonb_to_recordset(quotes) q(roster_id integer,odds integer) where o.market_id=m.id and o.sleeper_roster_id=q.roster_id;
 end if;
 update public.sportsbook_markets set lore_note='Week '||split_part(target_key,':',3)||' projected '||round(a,1)||'–'||round(b,1),provider_updated_at=checked_at,status=case when closes_at<=now() then 'locked' else status end where id=m.id;
 return true;
end $$;
revoke all on function public.sportsbook_refresh_matchup_quotes(text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.sportsbook_refresh_matchup_quotes(text,jsonb,timestamptz) to service_role;

-- A quote update and a new wager use the same market lock. Re-read after that
-- lock so a concurrent update cannot mix the displayed price and stored legs.
do $patch$
declare definition text;
begin
 select pg_get_functiondef('public.sportsbook_place_entry(bigint[],integer)'::regprocedure) into definition;
 if position('NFL lines are paused' in definition)=0 then
  if position('if m.status' in definition)=0 then raise exception 'Entry validation changed'; end if;
  definition:=replace(definition,'    if m.status',E'    if m.category<>''Fantasy'' then raise exception ''NFL lines are paused''; end if;\n    select * into o from public.sportsbook_outcomes where id=target;\n    if m.status');
  execute definition;
 end if;
end $patch$;

-- New clients bind confirmation to the reviewed prices. Keep the two-argument
-- entry point for older installs while they finish updating.
do $quote$
declare definition text;
begin
 select pg_get_functiondef('public.sportsbook_place_entry(bigint[],integer)'::regprocedure) into definition;
 definition:=replace(definition,'sin_stake integer)','sin_stake integer, quoted_prices jsonb)');
 definition:=replace(definition,'    if m.status',E'    if jsonb_typeof(quoted_prices) is distinct from ''object'' or quoted_prices->>o.id::text is null or (quoted_prices->>o.id::text)::integer<>o.odds_american then raise exception ''A line moved. Review the current price before confirming.''; end if;\n    if m.status');
 execute definition;
end $quote$;
revoke all on function public.sportsbook_place_entry(bigint[],integer,jsonb) from public;
grant execute on function public.sportsbook_place_entry(bigint[],integer,jsonb) to anon,authenticated;

-- The same signed, private job now keeps weekly quotes and results moving.
select cron.alter_job(job_id:=(select jobid from cron.job where jobname='dfl-sportsbook-feed-sync'),schedule:='*/5 * * * *');
