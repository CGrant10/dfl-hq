-- =====================================================================
-- DFL HQ - the daily SIN is CLAIMED, not dripped
-- ---------------------------------------------------------------------
-- Run after sportsbook_schema.sql. Safe to re-run.
--
-- The allowance used to be applied by sportsbook_touch_wallet(), which the app
-- calls when a member opens the Sportsbook - so it arrived whether or not
-- anybody noticed, and opening the page was indistinguishable from taking part.
-- The point of a daily allowance is that somebody turns up for it. If it lands
-- by itself it is not an allowance, it is a balance going up.
--
-- So the credit moves to sportsbook_claim_daily(), behind a button, and
-- touch_wallet() goes back to what its name says: make sure the wallet exists
-- and report where it stands.
--
-- Nothing about the economy changes: 500 to open, 50 per elapsed day, ten days
-- of catch-up per return, and the clock still advances across every elapsed day
-- even when the catch-up is capped so a year away does not become a windfall.
-- =====================================================================

-- ---------------------------------------------------------------------
-- REPORT ONLY. No credit, no ledger row, no clock movement.
--
-- The return shape gains `claimable` and `claimable_days` and keeps `credited`
-- so an un-updated client still reads a number rather than undefined - it is
-- always 0 now, because this function no longer pays anybody.
-- ---------------------------------------------------------------------
create or replace function public.sportsbook_touch_wallet()
returns table(
  balance int,
  credited int,
  claimable int,
  claimable_days int,
  last_daily_at timestamptz,
  next_daily_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
declare
  mid bigint := public.sportsbook_member_id();
  w public.sportsbook_wallets%rowtype;
  elapsed_days int := 0;
  days int := 0;
begin
  if mid is null then raise exception 'Pick a DFL member first'; end if;

  insert into public.sportsbook_wallets(member_id, balance, last_daily_at)
  values (mid, 500, now() - interval '24 hours')
  on conflict (member_id) do nothing;

  if found then
    insert into public.sportsbook_ledger(member_id, amount, kind, note)
    values (mid, 500, 'starting', 'Opening bankroll');
  end if;

  select * into w from public.sportsbook_wallets where member_id = mid;
  elapsed_days := greatest(0, floor(extract(epoch from (now() - w.last_daily_at)) / 86400)::int);
  days := least(elapsed_days, 10);

  return query select
    w.balance,
    0,
    days * 50,
    days,
    w.last_daily_at,
    w.last_daily_at + interval '24 hours';
end;
$$;

grant execute on function public.sportsbook_touch_wallet() to anon, authenticated;

-- ---------------------------------------------------------------------
-- THE CLAIM. This is the one that pays.
--
-- `for update` on the wallet row, so two taps on a slow connection cannot both
-- see the same elapsed days and both credit them. The clock advances by every
-- elapsed day rather than by the days actually paid - that is what stops a long
-- absence turning into a stored windfall, and it is the behaviour the old drip
-- had, kept deliberately.
-- ---------------------------------------------------------------------
create or replace function public.sportsbook_claim_daily()
returns table(
  balance int,
  credited int,
  claimable int,
  claimable_days int,
  last_daily_at timestamptz,
  next_daily_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
declare
  mid bigint := public.sportsbook_member_id();
  w public.sportsbook_wallets%rowtype;
  elapsed_days int := 0;
  paid_days int := 0;
  credit int := 0;
begin
  if mid is null then raise exception 'Pick a DFL member first'; end if;

  insert into public.sportsbook_wallets(member_id, balance, last_daily_at)
  values (mid, 500, now() - interval '24 hours')
  on conflict (member_id) do nothing;

  if found then
    insert into public.sportsbook_ledger(member_id, amount, kind, note)
    values (mid, 500, 'starting', 'Opening bankroll');
  end if;

  select * into w from public.sportsbook_wallets where member_id = mid for update;
  elapsed_days := greatest(0, floor(extract(epoch from (now() - w.last_daily_at)) / 86400)::int);

  if elapsed_days <= 0 then
    raise exception 'Nothing to claim yet. The next 50 SIN is at %',
      to_char(w.last_daily_at + interval '24 hours', 'Mon DD HH24:MI');
  end if;

  paid_days := least(elapsed_days, 10);
  credit := paid_days * 50;

  update public.sportsbook_wallets
     set balance = sportsbook_wallets.balance + credit,
         last_daily_at = w.last_daily_at + (elapsed_days * interval '24 hours'),
         updated_at = now()
   where member_id = mid
   returning * into w;

  insert into public.sportsbook_ledger(member_id, amount, kind, note)
  values (mid, credit, 'daily',
          case when paid_days = 1 then 'Claimed daily SIN'
               else 'Claimed ' || paid_days || ' days of SIN' end);

  return query select w.balance, credit, 0, 0, w.last_daily_at,
                      w.last_daily_at + interval '24 hours';
end;
$$;

grant execute on function public.sportsbook_claim_daily() to anon, authenticated;

-- ---------------------------------------------------------------------
-- REPORT: who has SIN waiting for them, and how long since they took any.
-- ---------------------------------------------------------------------
select
  m.display_name,
  w.balance,
  least(greatest(0, floor(extract(epoch from (now() - w.last_daily_at)) / 86400)::int), 10) * 50
    as claimable_now,
  date_trunc('minute', now() - w.last_daily_at) as since_last_claim
from public.sportsbook_wallets w
join public.members m on m.id = w.member_id
order by claimable_now desc, m.display_name;
