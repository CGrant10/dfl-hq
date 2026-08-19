-- =====================================================================
-- DFL HQ - the bottom ticker gets editable lines
-- ---------------------------------------------------------------------
-- Run after members_schema.sql and commissioner_roles_schema.sql.
-- Safe to re-run.
--
-- The ticker was entirely DERIVED: next event, golf day, open poll, newest
-- announcement, reigning champion - all computed in js/bottomline.js with no
-- row anywhere a commissioner could touch. Good defaults, and no way to say
-- anything the league had not already put in a table.
--
-- This adds hand-written lines ALONGSIDE the derived ones rather than instead
-- of them. A league that writes nothing sees exactly what it saw before, which
-- is why there is no "enabled" switch: an empty table is the old behaviour.
--
-- DELIBERATELY SMALLER THAN broadcast_items. That table has seventeen columns
-- because a slide is a piece of design. A ticker line is a label, a sentence
-- and somewhere to go, so this has five fields worth filling in and no
-- treatment, no image, no background, no dwell.
-- =====================================================================

create table if not exists public.ticker_items (
  id         bigint generated always as identity primary key,
  -- The small caps chip at the front. "Notice", "Reminder", "Golf".
  label      text not null default '',
  -- The line itself. The only required field.
  text       text not null,
  -- A route name, not a URL: bottomline.js maps these to #/<route> the same way
  -- the derived items do, so a typo cannot produce a link out of the app.
  route      text not null default '',
  -- Higher shows first. Manual lines sort above derived ones regardless.
  weight     int  not null default 0,
  active     boolean not null default true,
  -- Optional window. Both null means always.
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ticker_active on public.ticker_items(active, weight desc);

alter table public.ticker_items enable row level security;

drop policy if exists "public read" on public.ticker_items;
create policy "public read" on public.ticker_items for select using (true);

/*
  Written by the shared Admin password or a commissioner holding `broadcast` -
  the same permission that owns the slides, because this is the same job.
  has_commissioner_permission() accepts legacy is_admin().
*/
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

-- ---------------------------------------------------------------------
-- REPORT: what the ticker will show, and what is waiting on a date.
-- ---------------------------------------------------------------------
select
  case
    when not active then 'off'
    when starts_at is not null and starts_at > now() then 'scheduled'
    when ends_at   is not null and ends_at   < now() then 'expired'
    else 'showing'
  end as state,
  weight,
  coalesce(nullif(label, ''), '(no label)') as label,
  text
from public.ticker_items
order by weight desc, created_at desc;
