-- DFL HQ - commissioner-imported Sleeper Player Picks board.
-- Safe to re-run. The public board remains read-only; only a commissioner
-- holding the Sportsbook permission can write through this RPC.

create or replace function public.sportsbook_import_sleeper_props(
  prop_rows jsonb,
  target_season int,
  target_week int
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  mid bigint := public.sportsbook_member_id();
  item jsonb;
  market_id bigint;
  imported int := 0;
  player_id text;
  player_name text;
  stat_key text;
  stat_label text;
  line numeric;
  closes_at timestamptz;
  v_provider_key text;
begin
  if not public.has_commissioner_permission('sportsbook') then
    raise exception 'Sportsbook commissioner access required';
  end if;
  if target_season not between 2020 and 2100 or target_week not between 1 and 22 then
    raise exception 'Choose a valid NFL season and week';
  end if;
  if jsonb_typeof(prop_rows) <> 'array' or jsonb_array_length(prop_rows) < 1
     or jsonb_array_length(prop_rows) > 60 then
    raise exception 'Import between 1 and 60 props at a time';
  end if;

  for item in select * from jsonb_array_elements(prop_rows) loop
    player_id := nullif(trim(item->>'playerId'), '');
    player_name := nullif(trim(item->>'playerName'), '');
    stat_key := nullif(trim(item->>'statKey'), '');
    stat_label := nullif(trim(item->>'statLabel'), '');
    line := nullif(item->>'line', '')::numeric;
    closes_at := nullif(item->>'closesAt', '')::timestamptz;
    if player_id is null or player_name is null or stat_label is null or line is null or line < 0 then
      raise exception 'Every prop needs a matched player, category and non-negative line';
    end if;
    if stat_key not in ('pass_yd','pass_td','rush_yd','rec_yd','rec','rush_rec_yd','pass_rush_yd','rush_rec_td','fantasy_points_ppr') then
      raise exception 'Unsupported Sleeper stat: %', stat_key;
    end if;
    if closes_at is null or closes_at <= now() then
      raise exception '% does not have a future kickoff on this week''s board', player_name;
    end if;

    v_provider_key := 'sleeper-import:' || target_season || ':' || target_week || ':'
      || player_id || ':' || stat_key || ':' || line;

    -- A changed line replaces the old one on the public board, but old
    -- tickets remain attached to a locked market and still auto-settle.
    update public.sportsbook_markets
       set status = 'locked'
     where source = 'provider'
       and provider_event_id = 'sleeper:' || target_season || ':' || target_week || ':' || player_id
       and provider_market_id = stat_key
       and sportsbook_markets.provider_key <> v_provider_key
       and status = 'open';

    insert into public.sportsbook_markets(
      title, category, source, lore_note, status, closes_at,
      created_by_member_id, provider_key, provider_event_id,
      provider_market_id, provider_line, provider_updated_at
    ) values (
      player_name || ' · ' || stat_label, 'Player Props', 'provider',
      'Sleeper board · Week ' || target_week || ' · imported by the commissioner',
      'open', closes_at, mid, v_provider_key,
      'sleeper:' || target_season || ':' || target_week || ':' || player_id,
      stat_key, line, now()
    )
    on conflict (provider_key) where provider_key is not null do update
      set provider_updated_at = now()
    returning id into market_id;

    insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order,provider_side)
    values
      (market_id,'Higher ' || line,-110,0,'over'),
      (market_id,'Lower ' || line,-110,1,'under')
    on conflict (market_id,provider_side) where provider_side is not null do nothing;
    imported := imported + 1;
  end loop;

  return jsonb_build_object('imported', imported, 'season', target_season, 'week', target_week);
end;
$$;

revoke all on function public.sportsbook_import_sleeper_props(jsonb,int,int) from public;
grant execute on function public.sportsbook_import_sleeper_props(jsonb,int,int) to anon,authenticated;
