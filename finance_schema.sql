-- =====================================================================
-- DFL HQ - League Finances tables
-- ---------------------------------------------------------------------
-- HOW TO RUN:
--   Supabase -> SQL Editor -> New query -> paste this whole file -> Run.
--
-- ADDITIVE ONLY. Creates new tables, touches nothing that already exists,
-- and will NOT reset your admin password. Safe to re-run.
--
-- Design notes:
--   * EVERY table carries a `season`, so 2025 money and 2026 money never
--     mix and an old season can never be overwritten by a new one.
--   * Anything that can be calculated is NOT stored: remaining balance,
--     payment status, prize pool and the summary totals are all worked
--     out when the page is drawn. Stored totals drift; derived ones can't.
--
-- Security: everyone can read, only the admin can write, using the same
-- is_admin() function as the rest of the app.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. One row per season: the buy-in.
--    Total prize pool = buy_in x (number of people in finance_payments
--    for that season), worked out in the app.
-- ---------------------------------------------------------------------
create table if not exists public.finance_seasons (
  id          bigint generated always as identity primary key,
  season      int not null unique,
  buy_in      numeric(10,2) not null default 0,
  notes       text not null default '',
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. Dues, one row per team per season.
--    Remaining balance and Paid/Partial/Unpaid are derived from
--    amount_due vs amount_paid - not stored, so they can never disagree.
-- ---------------------------------------------------------------------
create table if not exists public.finance_payments (
  id               bigint generated always as identity primary key,
  season           int not null,
  owner_name       text not null,
  team_name        text not null default '',
  sleeper_user_id  text,                              -- optional link to Sleeper
  amount_due       numeric(10,2) not null default 0,
  amount_paid      numeric(10,2) not null default 0,
  date_paid        date,
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  unique (season, owner_name)
);


-- ---------------------------------------------------------------------
-- 3. Prize structure. Any number of categories per season.
-- ---------------------------------------------------------------------
create table if not exists public.finance_payouts (
  id           bigint generated always as identity primary key,
  season       int not null,
  title        text not null,
  amount       numeric(10,2) not null default 0,
  description  text not null default '',
  winner       text not null default '',
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. League expenses - trophy, draft food, domain, and so on.
-- ---------------------------------------------------------------------
create table if not exists public.finance_expenses (
  id            bigint generated always as identity primary key,
  season        int not null,
  description   text not null,
  amount        numeric(10,2) not null default 0,
  expense_date  date,
  notes         text not null default '',
  created_at    timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 5. Side competitions with their own money.
--    prize_pool is optional: leave it null and the app shows
--    buy_in x participants. Set it to override (added sponsor money etc).
--
--    NOTE: this is separate from the existing side_events table, which
--    handles sign-ups on the Calendar page. This one is about the money.
-- ---------------------------------------------------------------------
create table if not exists public.finance_competitions (
  id            bigint generated always as identity primary key,
  season        int not null,
  name          text not null,
  buy_in        numeric(10,2) not null default 0,
  participants  int not null default 0,
  prize_pool    numeric(10,2),                 -- null = calculate it
  winner        text not null default '',
  status        text not null default 'Open',  -- Open | Running | Finished
  notes         text not null default '',
  created_at    timestamptz not null default now()
);


create index if not exists idx_fin_payments_season on public.finance_payments(season);
create index if not exists idx_fin_payouts_season  on public.finance_payouts(season);
create index if not exists idx_fin_expenses_season on public.finance_expenses(season);
create index if not exists idx_fin_comps_season    on public.finance_competitions(season);


-- =====================================================================
-- 6. ROW LEVEL SECURITY
--    Members read. Only the admin writes. Enforced by Postgres, so a
--    member calling the API directly still cannot change a payment.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'finance_seasons','finance_payments','finance_payouts',
    'finance_expenses','finance_competitions'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);

    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format(
      'create policy "admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      t);
  end loop;
end;
$$;
