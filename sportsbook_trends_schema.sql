-- =====================================================================
-- DFL HQ - aggregate Sportsbook trends
-- ---------------------------------------------------------------------
-- Public counts for current Fantasy lines. Member identities and stakes are
-- never returned. Needs sportsbook_entries_schema.sql.
-- =====================================================================

create or replace function public.sportsbook_trending_picks(row_limit int default 3)
returns table(
  outcome_id bigint,
  market_id bigint,
  outcome_label text,
  market_title text,
  ticket_count bigint,
  bettor_count bigint,
  pick_share int
)
language sql stable security definer set search_path = public
as $$
  with eligible as (
    select l.outcome_id, l.market_id, b.id as bet_id, b.member_id
      from public.sportsbook_bet_legs l
      join public.sportsbook_bets b on b.id = l.bet_id
      join public.sportsbook_markets m on m.id = l.market_id
     where b.status = 'open'
       and l.status = 'open'
       and m.status = 'open'
       and m.category = 'Fantasy'
       and (m.closes_at is null or m.closes_at > now())
       and coalesce(m.auto_key, '') not like 'golf:%'
  ), counted as (
    select e.outcome_id, e.market_id,
           count(distinct e.bet_id) as ticket_count,
           count(distinct e.member_id) as bettor_count
      from eligible e
     group by e.outcome_id, e.market_id
  )
  select c.outcome_id, c.market_id, o.label, m.title,
         c.ticket_count, c.bettor_count,
         round(100.0 * c.ticket_count / nullif(sum(c.ticket_count) over (), 0))::int
    from counted c
    join public.sportsbook_outcomes o on o.id = c.outcome_id
    join public.sportsbook_markets m on m.id = c.market_id
   order by c.ticket_count desc, c.bettor_count desc, o.label
   limit greatest(1, least(coalesce(row_limit, 3), 10));
$$;

grant execute on function public.sportsbook_trending_picks(int) to anon, authenticated;

