-- SportsGameOdds imports upsert the same over/under rows on every refresh.
-- PostgREST cannot infer a partial unique index for an `on_conflict` target,
-- so keep the existing guard and add the equivalent non-partial form.
-- PostgreSQL still permits multiple NULL provider_side values, preserving
-- commissioner-created and legacy outcomes.
create unique index if not exists uq_sportsbook_outcome_provider_side_full
  on public.sportsbook_outcomes(market_id, provider_side);

create unique index if not exists uq_sportsbook_market_provider_key_full
  on public.sportsbook_markets(provider_key);
