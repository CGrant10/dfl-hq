-- =====================================================================
-- DFL HQ - editable bottom ticker
-- ---------------------------------------------------------------------
-- Run after members_schema.sql and commissioner_roles_schema.sql.
-- Safe to re-run.
--
-- Manual rows are ordinary ticker lines. Five seeded rows are override slots
-- for the ticker's automatic facts. On an automatic row, blank label/text/route
-- means "keep the generated value"; editing any of them changes only the ticker
-- wording, never the event, poll, golf outing, announcement or champion record.
-- =====================================================================

create table if not exists public.ticker_items (
  id         bigint generated always as identity primary key,
  label      text not null default '',
  text       text not null,
  route      text not null default '',
  weight     int  not null default 0,
  active     boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Null = hand-written line. Named values are the five automatic ticker slots.
alter table public.ticker_items add column if not exists auto_source text;

-- Keep one override row per automatic source without changing manual rows.
create unique index if not exists idx_ticker_auto_source
  on public.ticker_items(auto_source) where auto_source is not null;
create index if not exists idx_ticker_active on public.ticker_items(active, weight desc);

-- Seed the automatic slots. Blank values deliberately mean "use automatic".
insert into public.ticker_items(label,text,route,weight,active,auto_source)
values
  ('','','',-100,true,'next_event'),
  ('','','',-100,true,'golf'),
  ('','','',-100,true,'poll'),
  ('','','',-100,true,'notice'),
  ('','','',-100,true,'champion')
on conflict (auto_source) where auto_source is not null do nothing;

alter table public.ticker_items enable row level security;

drop policy if exists "public read" on public.ticker_items;
create policy "public read" on public.ticker_items for select using (true);

do $$
begin
  execute 'drop policy if exists "commissioner write" on public.ticker_items';
  if exists (select 1 from pg_proc where proname = 'has_commissioner_permission') then
    execute 'create policy "commissioner write" on public.ticker_items for all '
         || 'using (public.has_commissioner_permission(''broadcast'')) '
         || 'with check (public.has_commissioner_permission(''broadcast''))';
  else
    execute 'create policy "commissioner write" on public.ticker_items for all '
         || 'using (public.is_admin()) with check (public.is_admin())';
  end if;
end;
$$;

select
  case
    when auto_source is not null then 'automatic override'
    when not active then 'off'
    when starts_at is not null and starts_at > now() then 'scheduled'
    when ends_at   is not null and ends_at   < now() then 'expired'
    else 'showing'
  end as state,
  auto_source,
  weight,
  coalesce(nullif(label, ''), '(automatic label)') as label,
  coalesce(nullif(text, ''), '(automatic text)') as text
from public.ticker_items
order by (auto_source is null) desc, weight desc, created_at desc;
