-- =====================================================================
-- DFL HQ - Supabase database schema
-- ---------------------------------------------------------------------
-- HOW TO RUN:
--   1. Open your Supabase project -> SQL Editor -> New query
--   2. Paste this whole file in
--   3. Change 'CHANGE-ME-ADMIN-PASSWORD' near the bottom to your password
--   4. Press Run
--
-- Safe to re-run: everything uses "if not exists" / "or replace", and the
-- admin password insert only fires if no password is set yet.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;


-- =====================================================================
-- 1. TABLES
-- =====================================================================

-- Everyone who has ever picked a league name in the app.
create table if not exists public.users (
  id          bigint generated always as identity primary key,
  username    text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.announcements (
  id          bigint generated always as identity primary key,
  title       text not null,
  content     text not null default '',
  created_at  timestamptz not null default now()
);

-- options is a JSON array of strings, e.g. ["Yes","No","Maybe"]
create table if not exists public.polls (
  id          bigint generated always as identity primary key,
  question    text not null,
  options     jsonb not null default '[]'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.votes (
  id          bigint generated always as identity primary key,
  poll_id     bigint not null references public.polls(id) on delete cascade,
  username    text not null,
  answer      text not null,
  created_at  timestamptz not null default now(),
  -- one vote per person per poll
  unique (poll_id, username)
);

-- category is one of: scoring | keeper | trade | waiver | playoff | general
create table if not exists public.rules (
  id          bigint generated always as identity primary key,
  category    text not null,
  title       text not null default '',
  content     text not null default '',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.keepers (
  id          bigint generated always as identity primary key,
  team        text not null,
  player      text not null,
  round_cost  int,
  notes       text not null default '',
  year        int not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.events (
  id           bigint generated always as identity primary key,
  title        text not null,
  event_date   date not null,
  description  text not null default '',
  created_at   timestamptz not null default now()
);

create table if not exists public.history (
  id          bigint generated always as identity primary key,
  year        int not null,
  category    text not null,     -- Champion | Runner Up | Award | Record | Moment
  winner      text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

-- Non-football stuff: March Madness, pick'em, survivor pools, etc.
create table if not exists public.side_events (
  id           bigint generated always as identity primary key,
  title        text not null,
  kind         text not null default 'Other',  -- Bracket | Pick'em | Survivor | Other
  description  text not null default '',
  link         text not null default '',       -- optional external link
  status       text not null default 'Open',   -- Open | Closed | Finished
  created_at   timestamptz not null default now()
);

-- Who signed up for a side event (uses the saved league name, no accounts).
create table if not exists public.side_event_signups (
  id             bigint generated always as identity primary key,
  side_event_id  bigint not null references public.side_events(id) on delete cascade,
  username       text not null,
  created_at     timestamptz not null default now(),
  unique (side_event_id, username)
);

create index if not exists idx_votes_poll     on public.votes(poll_id);
create index if not exists idx_keepers_year   on public.keepers(year);
create index if not exists idx_history_year   on public.history(year);
create index if not exists idx_events_date    on public.events(event_date);


-- =====================================================================
-- 2. ADMIN PASSWORD
-- ---------------------------------------------------------------------
-- The password lives in this table as a bcrypt hash. Row Level Security is
-- on and there are NO policies, so the table is completely invisible to the
-- app's anon key -- it can only be read by the is_admin() function below,
-- which runs as the table owner.
--
-- The app sends the typed password in an "x-admin-token" header. Postgres
-- checks it. The password is never in your JavaScript.
-- =====================================================================

create table if not exists public.app_admin (
  id             int primary key default 1,
  password_hash  text not null,
  constraint app_admin_single_row check (id = 1)
);

alter table public.app_admin enable row level security;   -- no policies = no API access

-- Pull the admin token out of the incoming request headers.
create or replace function public.admin_token()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.headers', true), '')::json ->> 'x-admin-token';
$$;

-- True when the caller sent the correct admin password.
create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  token text;
  stored_hash text;
begin
  token := public.admin_token();
  if token is null or token = '' then
    return false;
  end if;

  select password_hash into stored_hash from public.app_admin where id = 1;
  if stored_hash is null then
    return false;
  end if;

  return stored_hash = crypt(token, stored_hash);
end;
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Lets an admin change the password from inside the app.
create or replace function public.set_admin_password(new_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Not an admin';
  end if;
  if length(coalesce(new_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  update public.app_admin
     set password_hash = crypt(new_password, gen_salt('bf'))
   where id = 1;
  return true;
end;
$$;

grant execute on function public.set_admin_password(text) to anon, authenticated;


-- =====================================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ---------------------------------------------------------------------
-- Rule of thumb:
--   * Everybody can READ everything (it's a private league app).
--   * Only the admin can write, EXCEPT: anyone can add themselves to
--     users, cast a vote, or sign up for a side event.
-- =====================================================================

-- Read-only-for-all + admin-writes tables
do $$
declare t text;
begin
  foreach t in array array[
    'announcements','polls','rules','keepers','events','history','side_events'
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

-- users: anyone can read and add themselves; only admin can delete.
alter table public.users enable row level security;
drop policy if exists "public read"   on public.users;
drop policy if exists "anyone insert" on public.users;
drop policy if exists "admin write"   on public.users;
create policy "public read"   on public.users for select using (true);
create policy "anyone insert" on public.users for insert with check (true);
create policy "admin write"   on public.users for all using (public.is_admin()) with check (public.is_admin());

-- votes: anyone can read and cast; only admin can change/remove.
alter table public.votes enable row level security;
drop policy if exists "public read"   on public.votes;
drop policy if exists "anyone insert" on public.votes;
drop policy if exists "admin write"   on public.votes;
create policy "public read"   on public.votes for select using (true);
create policy "anyone insert" on public.votes for insert with check (true);
create policy "admin write"   on public.votes for all using (public.is_admin()) with check (public.is_admin());

-- side event signups: anyone can read and join; only admin can remove.
alter table public.side_event_signups enable row level security;
drop policy if exists "public read"   on public.side_event_signups;
drop policy if exists "anyone insert" on public.side_event_signups;
drop policy if exists "admin write"   on public.side_event_signups;
create policy "public read"   on public.side_event_signups for select using (true);
create policy "anyone insert" on public.side_event_signups for insert with check (true);
create policy "admin write"   on public.side_event_signups for all using (public.is_admin()) with check (public.is_admin());


-- =====================================================================
-- 4. SET YOUR ADMIN PASSWORD  <-- EDIT THIS LINE
-- =====================================================================

insert into public.app_admin (id, password_hash)
values (1, extensions.crypt('CHANGE-ME-ADMIN-PASSWORD', extensions.gen_salt('bf')))
on conflict (id) do nothing;

-- To change it later, either use the Admin page inside the app, or run:
--   update public.app_admin
--      set password_hash = extensions.crypt('new-password', extensions.gen_salt('bf'))
--    where id = 1;


-- =====================================================================
-- 5. OPTIONAL STARTER DATA (delete this section if you don't want it)
-- =====================================================================

insert into public.rules (category, title, content, sort_order)
select * from (values
  ('scoring','Format','Half PPR. 6 points per passing TD. Kickers count.',1),
  ('keeper','How many','Each team may keep up to 2 players.',1),
  ('keeper','Cost','A kept player costs the round they were drafted in, minus one round.',2),
  ('trade','Deadline','Trades close at the start of Week 11.',1),
  ('waiver','Type','FAAB with a $100 season budget. Waivers run Wednesday morning.',1),
  ('playoff','Bracket','Top 6 teams. Weeks 15-17. Top 2 seeds get a first round bye.',1),
  ('general','Dues','$50 per team, due before the draft.',1)
) as v(category,title,content,sort_order)
where not exists (select 1 from public.rules);
