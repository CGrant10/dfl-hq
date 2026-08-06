-- =====================================================================
-- DFL HQ - editable rule categories
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive. Does not touch the admin password. Safe to re-run.
--
-- The rule tabs used to be hardcoded in JavaScript. This moves them into
-- the database so an admin can add, rename and remove them.
--
-- How the two columns differ, and why it matters:
--   key    the permanent id stored on every rule row. NEVER change it,
--          or the rules filed under it lose their tab.
--   label  what people see on the tab. Rename this freely.
-- =====================================================================

create table if not exists public.rule_categories (
  id          bigint generated always as identity primary key,
  key         text not null unique,
  label       text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- Seed the six tabs that used to be hardcoded.
-- ---------------------------------------------------------------------
insert into public.rule_categories (key, label, sort_order)
values
  ('scoring', 'Scoring',  1),
  ('keeper',  'Keepers',  2),
  ('trade',   'Trades',   3),
  ('waiver',  'Waivers',  4),
  ('playoff', 'Playoffs', 5),
  ('general', 'General',  6)
on conflict (key) do nothing;


-- ---------------------------------------------------------------------
-- Pick up any category already in use that is not in the list above, so
-- no existing rule is left without a tab.
-- ---------------------------------------------------------------------
insert into public.rule_categories (key, label, sort_order)
select distinct r.category,
       initcap(replace(r.category, '_', ' ')),
       99
from public.rules r
where r.category is not null
  and r.category <> ''
  and not exists (select 1 from public.rule_categories c where c.key = r.category)
on conflict (key) do nothing;


-- =====================================================================
-- Row Level Security - everyone reads, only the admin writes.
-- =====================================================================

alter table public.rule_categories enable row level security;

drop policy if exists "public read" on public.rule_categories;
create policy "public read" on public.rule_categories for select using (true);

drop policy if exists "admin write" on public.rule_categories;
create policy "admin write" on public.rule_categories
  for all using (public.is_admin()) with check (public.is_admin());
