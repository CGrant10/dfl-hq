-- =====================================================================
-- DFL HQ - app settings (currently: the dashboard logo)
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run. Additive, safe to
-- re-run, touches nothing that already exists.
--
-- A plain key/value table so a one-off league preference does not need its
-- own table and its own migration every time. `value` is text, which is
-- enough for a URL, a number, a flag, or a small data: URI.
--
-- The logo is stored as a data: URI of a 256x256 PNG, downscaled in the
-- browser before it is saved. That keeps it well under a megabyte, avoids
-- needing a Storage bucket and its policies, and means the crest is part of
-- the same row everything else reads - so it works offline like the rest.
-- =====================================================================

create table if not exists public.app_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "public read" on public.app_settings;
create policy "public read" on public.app_settings for select using (true);

drop policy if exists "admin write" on public.app_settings;
create policy "admin write" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());
