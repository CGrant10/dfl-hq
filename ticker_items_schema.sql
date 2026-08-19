-- =====================================================================
-- DFL HQ - editable bottom ticker
-- ---------------------------------------------------------------------
-- Run after members_schema.sql and commissioner_roles_schema.sql.
-- Safe to re-run.
--
-- Manual rows are ordinary ticker lines. Five seeded rows are override slots
-- for the ticker's automatic facts. On an automatic row, the special
-- "(automatic: …)" text means "keep generating this line". Replace it with
-- normal text to override only the ticker wording; the underlying event, poll,
-- golf outing, announcement or champion record is never changed.
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

alter table public.ticker_items add column if not exists auto_source text;

create unique index if not exists idx_ticker_auto_source
  on public.ticker_items(auto_source) where auto_source is not null;
create index if not exists idx_ticker_active on public.ticker_items(active, weight desc);

insert into public.ticker_items(label,text,route,weight,active,auto_source)
values
  ('','(automatic: next event)','',-100,true,'next_event'),
  ('','(automatic: golf)','',-100,true,'golf'),
  ('','(automatic: poll)','',-100,true,'poll'),
  ('','(automatic: notice)','',-100,true,'notice'),
  ('','(automatic: champion)','',-100,true,'champion')
on conflict (auto_source) where auto_source is not null do nothing;

-- Upgrade the blank slots from the first version of this migration so the
-- existing Ticker manager can tell the five automatic rows apart.
update public.ticker_items
set text = case auto_source
  when 'next_event' then '(automatic: next event)'
  when 'golf' then '(automatic: golf)'
  when 'poll' then '(automatic: poll)'
  when 'notice' then '(automatic: notice)'
  when 'champion' then '(automatic: champion)'
  else text end
where auto_source is not null and coalesce(text,'') = '';

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
  text
from public.ticker_items
order by (auto_source is null) desc, weight desc, created_at desc;
