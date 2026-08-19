-- =====================================================================
-- DFL HQ - the league activity log
-- ---------------------------------------------------------------------
-- Run after members_schema.sql. Everything else is optional: this file
-- attaches triggers only to the tables that actually exist, so a project
-- missing golf or the sportsbook installs the parts it has. Safe to re-run.
--
-- WHY A TRIGGER AND NOT A CLIENT CALL
--
-- The obvious way to build a feed is to have each screen post "I did a thing"
-- after its own save. That records the screens somebody remembered to
-- instrument, which is not the same as what happened - and this app already has
-- three places that write keepers, two that write the arena clock, and an admin
-- CRUD helper that writes anything at all.
--
-- Triggers record the WRITE. A row cannot change without the log seeing it,
-- whether it came from the app, the Supabase table editor, or a migration.
--
-- WHAT IT DELIBERATELY DOES NOT STORE
--
-- No column values, no diffs, no old/new payloads. A feed on the front page
-- that quotes what changed would leak PIN hashes the moment somebody added a
-- trigger to the wrong table, and it would turn every edit into a public
-- retelling. It stores: which table, which row, insert/update/delete, who was
-- holding the app, and when. The app turns that into a sentence.
-- =====================================================================

create table if not exists public.activity_log (
  id           bigint generated always as identity primary key,
  entity       text   not null,          -- the table that changed
  entity_id    text,                     -- the row's id, as text: they are not all bigint
  action       text   not null check (action in ('insert','update','delete')),
  -- Who was holding the app. NULL is honest and common: a Supabase table-editor
  -- edit, a migration, or a member who never picked a name.
  member_id    bigint references public.members(id) on delete set null,
  -- Whether the writer was using a privileged session at the time. Read from
  -- the request, not inferred later, because a commissioner can be demoted.
  as_commissioner boolean not null default false,
  -- A short human label the WRITER can supply for context ("2026 keeper"), used
  -- when the entity alone does not say enough. Never a column value.
  label        text   not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists idx_activity_created on public.activity_log(created_at desc);
create index if not exists idx_activity_entity  on public.activity_log(entity, created_at desc);

alter table public.activity_log enable row level security;

-- Everybody reads it. That is the point of a feed on the front page.
drop policy if exists "public read" on public.activity_log;
create policy "public read" on public.activity_log for select using (true);

/*
  NOBODY WRITES IT DIRECTLY.

  No insert policy at all. Rows arrive only through the trigger function below,
  which is security definer - so the log cannot be forged by a client, and
  cannot be edited or cleared by one either. A commissioner who wants something
  gone deletes it in Supabase, deliberately, with both hands.
*/
drop policy if exists "admin write" on public.activity_log;

-- ---------------------------------------------------------------------
-- The request's member id, and whether they held a privileged session.
-- Local copies, like every other feature in this app that reads the headers.
-- ---------------------------------------------------------------------
create or replace function public.activity_request_member()
returns bigint language sql stable as $$
  select nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint;
$$;

create or replace function public.activity_request_privileged()
returns boolean language plpgsql stable as $$
begin
  /*
    Two ways in: the shared admin token and a commissioner PIN. Both are
    headers, so both are visible here, and neither is trusted for anything
    except this label - the actual authorisation happened in the policy that
    let the write through in the first place.
  */
  return coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-admin-token', '') is not null
    or nullif(current_setting('request.headers', true)::jsonb ->> 'x-commissioner-pin', '') is not null,
    false);
exception when others then
  return false;
end;
$$;

-- ---------------------------------------------------------------------
-- THE TRIGGER. One function for every table, so there is one behaviour.
-- ---------------------------------------------------------------------
create or replace function public.activity_record()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  row_id text;
  note   text := coalesce(tg_argv[0], '');
begin
  /*
    to_jsonb on the row and then ->> 'id' rather than NEW.id, because this one
    function serves tables whose primary keys are named and typed differently.
    A table with no `id` logs a null entity_id rather than failing the write it
    is only supposed to be watching.
  */
  if tg_op = 'DELETE' then
    row_id := to_jsonb(old) ->> 'id';
  else
    row_id := to_jsonb(new) ->> 'id';
  end if;

  insert into public.activity_log(entity, entity_id, action, member_id, as_commissioner, label)
  values (
    tg_table_name,
    row_id,
    lower(tg_op),
    public.activity_request_member(),
    public.activity_request_privileged(),
    note
  );

  /*
    AFTER trigger, so the return value is ignored - but a logging trigger must
    never be the reason a real write fails. Any error here is swallowed and the
    write stands: a missing line in the feed is a nuisance, a refused keeper is
    a bug.
  */
  return null;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- ATTACH, to whatever exists.
--
-- `label` is the second value in each pair and is what the feed says when the
-- table name alone is not a sentence. Keep them short and lowercase; the app
-- capitalises.
-- ---------------------------------------------------------------------
do $$
declare
  item record;
begin
  for item in select * from (values
    ('keepers',              'keeper'),
    ('announcements',        'announcement'),
    ('events',               'calendar event'),
    ('side_events',          'side event'),
    ('polls',                'poll'),
    ('rules',                'rule'),
    ('rule_categories',      'rule section'),
    ('history',              'history entry'),
    ('members',              'member profile'),
    ('keeper_rules',         'keeper rules'),
    ('keeper_season_state',  'keeper season lock'),
    ('arena_events',         'arena event'),
    ('arena_results',        'arena result'),
    ('golf_outings',         'golf outing'),
    ('golf_profiles',        'golf profile'),
    ('sportsbook_markets',   'betting line'),
    ('sportsbook_bets',      'bet'),
    ('rule_proposals',       'rule proposal'),
    ('commissioner_access',  'commissioner access')
  ) as v(table_name, label)
  loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = item.table_name
    ) then
      raise notice 'skipping %: table not present', item.table_name;
      continue;
    end if;

    execute format('drop trigger if exists trg_activity_%I on public.%I',
                   item.table_name, item.table_name);
    execute format(
      'create trigger trg_activity_%I after insert or update or delete on public.%I '
      'for each row execute function public.activity_record(%L)',
      item.table_name, item.table_name, item.label);
    raise notice 'activity log attached to %', item.table_name;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- THE FEED, as one read.
--
-- Collapses a burst into one line. The important distinction is RECORDS, not
-- trigger hits: saving one keeper can legitimately update that same row twice,
-- and an Arena race updates the same event row several times as its shared
-- clock/state advances. Those are still one keeper and one Arena event to a
-- human reader. Multiple distinct ids in the same five-minute bucket remain a
-- real batch and keep their real count.
-- ---------------------------------------------------------------------
create or replace function public.activity_feed(row_limit int default 12)
returns table (
  entity          text,
  label           text,
  action          text,
  member_id       bigint,
  display_name    text,
  as_commissioner boolean,
  row_count       bigint,
  last_at         timestamptz
) language sql stable as $$
  select
    a.entity,
    max(a.label)            as label,
    a.action,
    a.member_id,
    max(m.display_name)     as display_name,
    bool_or(a.as_commissioner) as as_commissioner,
    count(distinct coalesce(a.entity_id, 'activity-log:' || a.id::text)) as row_count,
    max(a.created_at)       as last_at
  from public.activity_log a
  left join public.members m on m.id = a.member_id
  group by a.entity, a.action, a.member_id,
           floor(extract(epoch from a.created_at) / 300)
  order by max(a.created_at) desc
  limit greatest(1, least(coalesce(row_limit, 12), 50));
$$;

grant execute on function public.activity_request_member() to anon, authenticated;
grant execute on function public.activity_request_privileged() to anon, authenticated;
grant execute on function public.activity_feed(int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- REPORT: which tables are being watched.
-- ---------------------------------------------------------------------
select
  c.relname as watched_table,
  t.tgname  as trigger_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where t.tgname like 'trg_activity_%' and not t.tgisinternal
order by c.relname;
