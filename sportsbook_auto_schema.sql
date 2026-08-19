-- =====================================================================
-- DFL HQ - Sportsbook Auto Board
-- ---------------------------------------------------------------------
-- Run after sportsbook_schema.sql. Safe to re-run.
--
-- Keeps an offseason board alive without a cron job: every Sportsbook visit
-- calls sportsbook_maintain_auto_board(). Expired auto props become LOCKED
-- and wait for a commissioner ruling; fresh League Lore chaos props refill
-- the board up to four open auto markets.
-- =====================================================================

alter table public.sportsbook_markets
  add column if not exists auto_key text;

create index if not exists idx_sportsbook_markets_auto
  on public.sportsbook_markets(auto_key, status, created_at desc);

create table if not exists public.sportsbook_auto_templates (
  template_key text primary key,
  category text not null,
  title text not null,
  lore_note text not null default '',
  outcomes jsonb not null,
  duration_hours int not null default 48 check (duration_hours between 12 and 168),
  cooldown_days int not null default 10 check (cooldown_days between 1 and 90),
  active boolean not null default true,
  constraint sportsbook_auto_outcomes_array check (jsonb_typeof(outcomes) = 'array')
);

alter table public.sportsbook_auto_templates enable row level security;
-- No direct API policies. The pool is internal; the public sees only markets.

insert into public.sportsbook_auto_templates(template_key,category,title,lore_note,outcomes,duration_hours,cooldown_days,active)
values
  ('dfl-rule-smoke','DFL Life','Will a DFL rule get complained about before this line closes?','Offseason chaos line. Commissioner ruling required.','[{"label":"YES","odds":-145},{"label":"NO","odds":120}]'::jsonb,48,12,true),
  ('dfl-groupchat-fantasy','DFL Life','Will fantasy football get brought up in the group chat before this line closes?','The house considers silence unlikely. Commissioner ruling required.','[{"label":"YES","odds":-220},{"label":"NO","odds":175}]'::jsonb,48,10,true),
  ('dfl-golf-trash','DFL Life','Will golf trash talk break out before this line closes?','Nobody has ever accused this league of restraint. Commissioner ruling required.','[{"label":"YES","odds":-135},{"label":"NO","odds":110}]'::jsonb,48,10,true),
  ('dfl-late-arrival','DFL Life','Will somebody be late to the next DFL get-together?','The clock is undefeated. Commissioner ruling required.','[{"label":"YES","odds":-165},{"label":"NO","odds":135}]'::jsonb,72,18,true),
  ('dfl-bad-purchase','DFL Life','Will somebody admit to buying something they absolutely did not need?','Consumer discipline has been downgraded to questionable. Commissioner ruling required.','[{"label":"YES","odds":105},{"label":"NO","odds":-125}]'::jsonb,72,14,true),
  ('dfl-argument-source','DFL Life','What causes the next DFL argument?','Three roads enter. Only one ruins the group chat first. Commissioner ruling required.','[{"label":"Fantasy","odds":145},{"label":"Golf","odds":165},{"label":"Something dumber","odds":210}]'::jsonb,72,20,true),
  ('marvel-trailer','Marvel','Will the next Marvel trailer spark an argument in the DFL chat?','The multiverse is easier to manage than this league. Commissioner ruling required.','[{"label":"YES","odds":-115},{"label":"NO","odds":-105}]'::jsonb,96,21,true),
  ('marvel-doom','Marvel','Will Doctor Doom get mentioned in DFL chat before this line closes?','No outside feed is judging this one. Commissioner ruling required.','[{"label":"YES","odds":125},{"label":"NO","odds":-150}]'::jsonb,72,18,true),
  ('marvel-rewatch','Marvel','Will somebody recommend a Marvel rewatch before this line closes?','Nostalgia money is still money. Commissioner ruling required.','[{"label":"YES","odds":145},{"label":"NO","odds":-170}]'::jsonb,72,20,true),
  ('gaming-rage','Gaming','Will the next gaming session include a rage quit accusation?','Controller insurance not included. Commissioner ruling required.','[{"label":"YES","odds":-130},{"label":"NO","odds":105}]'::jsonb,72,14,true),
  ('gaming-rematch','Gaming','Will somebody demand an immediate rematch after the next loss?','The house has reviewed prior behavior. Commissioner ruling required.','[{"label":"YES","odds":-155},{"label":"NO","odds":125}]'::jsonb,72,14,true),
  ('gaming-excuse','Gaming','What excuse appears first after the next gaming loss?','Independent verification remains impossible and hilarious. Commissioner ruling required.','[{"label":"Lag","odds":175},{"label":"Controller","odds":220},{"label":"Game is trash","odds":135}]'::jsonb,72,21,true),
  ('golf-lost-ball','Golf','Will somebody lose a ball on the next DFL golf day?','The trees are currently favored. Commissioner ruling required.','[{"label":"YES","odds":-350},{"label":"NO","odds":275}]'::jsonb,96,18,true),
  ('golf-mulligan','Golf','Will somebody ask for a mulligan before the turn on the next DFL golf day?','The rulebook is already nervous. Commissioner ruling required.','[{"label":"YES","odds":-105},{"label":"NO","odds":-115}]'::jsonb,96,18,true),
  ('golf-club-blame','Golf','Will a bad shot get blamed on the club before the next golf line closes?','Equipment has retained counsel. Commissioner ruling required.','[{"label":"YES","odds":-180},{"label":"NO","odds":150}]'::jsonb,72,14,true),
  ('fantasy-draft-talk','Fantasy','Will draft strategy get argued about before this line closes?','Preseason brains are already overheating. Commissioner ruling required.','[{"label":"YES","odds":-190},{"label":"NO","odds":155}]'::jsonb,72,12,true),
  ('fantasy-keeper-regret','Fantasy','Will somebody publicly regret a keeper take before the season starts?','Receipts are the foundation of civilization. Commissioner ruling required.','[{"label":"YES","odds":120},{"label":"NO","odds":-145}]'::jsonb,96,18,true),
  ('fantasy-sleeper-hype','Fantasy','Will somebody call a player a sleeper before this line closes?','Calling a top-40 player a sleeper remains eligible. Commissioner ruling required.','[{"label":"YES","odds":-175},{"label":"NO","odds":145}]'::jsonb,72,14,true)
on conflict (template_key) do update set
  category = excluded.category,
  title = excluded.title,
  lore_note = excluded.lore_note,
  outcomes = excluded.outcomes,
  duration_hours = excluded.duration_hours,
  cooldown_days = excluded.cooldown_days,
  active = excluded.active;

create or replace function public.sportsbook_maintain_auto_board(target_open int default 4)
returns table(open_auto int, awaiting_ruling int)
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted int := greatest(1, least(coalesce(target_open,4),6));
  current_open int;
  need int;
  t record;
  market_id bigint;
  item jsonb;
  n int;
begin
  -- One maintainer at a time prevents two phones opening eight markets at once.
  perform pg_advisory_xact_lock(73910421);

  update public.sportsbook_markets
     set status = 'locked'
   where source = 'lore'
     and auto_key is not null
     and status = 'open'
     and closes_at is not null
     and closes_at <= now();

  select count(*) into current_open
    from public.sportsbook_markets
   where source = 'lore' and auto_key is not null and status = 'open'
     and (closes_at is null or closes_at > now());

  need := greatest(0, wanted - current_open);

  for t in
    select x.*
      from public.sportsbook_auto_templates x
     where x.active = true
       and not exists (
         select 1 from public.sportsbook_markets m
          where m.auto_key = x.template_key
            and m.status in ('open','locked')
       )
       and not exists (
         select 1 from public.sportsbook_markets m
          where m.auto_key = x.template_key
            and m.created_at > now() - make_interval(days => x.cooldown_days)
       )
     order by md5(x.template_key || current_date::text)
     limit need
  loop
    insert into public.sportsbook_markets(
      title, category, source, lore_note, status, closes_at, auto_key
    ) values (
      t.title, t.category, 'lore', t.lore_note, 'open',
      now() + make_interval(hours => t.duration_hours), t.template_key
    ) returning id into market_id;

    n := 0;
    for item in select * from jsonb_array_elements(t.outcomes) loop
      insert into public.sportsbook_outcomes(market_id,label,odds_american,sort_order)
      values (market_id,item->>'label',(item->>'odds')::int,n);
      n := n + 1;
    end loop;
  end loop;

  select count(*) into current_open
    from public.sportsbook_markets
   where source = 'lore' and auto_key is not null and status = 'open'
     and (closes_at is null or closes_at > now());

  return query select current_open,
    (select count(*)::int from public.sportsbook_markets
      where source='lore' and auto_key is not null and status='locked');
end;
$$;

grant execute on function public.sportsbook_maintain_auto_board(int) to anon, authenticated;

create or replace function public.sportsbook_void_market(target_market_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare b record;
begin
  if not public.has_commissioner_permission('sportsbook') then
    raise exception 'Sportsbook commissioner access required';
  end if;
  if not exists(select 1 from public.sportsbook_markets where id=target_market_id and status in ('open','locked')) then
    raise exception 'Market cannot be voided';
  end if;

  for b in select * from public.sportsbook_bets where market_id=target_market_id and status='open' for update loop
    update public.sportsbook_bets
       set status='void', payout=b.stake, settled_at=now()
     where id=b.id;
    update public.sportsbook_wallets
       set balance=balance+b.stake, updated_at=now()
     where member_id=b.member_id;
    insert into public.sportsbook_ledger(member_id,amount,kind,note,market_id,bet_id)
    values (b.member_id,b.stake,'refund','Voided market refund',target_market_id,b.id);
  end loop;

  update public.sportsbook_outcomes set is_winner=null where market_id=target_market_id;
  update public.sportsbook_markets set status='void', settled_at=now() where id=target_market_id;
  return true;
end;
$$;

grant execute on function public.sportsbook_void_market(bigint) to anon, authenticated;

-- Fill the first board immediately when the migration is installed.
select * from public.sportsbook_maintain_auto_board(4);
