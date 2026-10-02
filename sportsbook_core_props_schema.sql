-- Main full-game prop lines only. Read-only curation; accepted tickets and
-- historical markets remain intact and continue through the existing grader.
create or replace function public.sportsbook_prop_index()
returns table(id bigint,title text,lore_note text,provider_event_id text,
 provider_key text,provider_updated_at timestamptz,closes_at timestamptz,
 status text,source text,category text)
language sql stable security invoker set search_path='' as $$
 with classified as (
   select m.*, case lower(trim(split_part(m.title,'·',2)))
     when 'passing yards' then 'passing_yards'
     when 'passing tds' then 'passing_touchdowns'
     when 'passing touchdowns' then 'passing_touchdowns'
     when 'rushing yards' then 'rushing_yards'
     when 'receptions' then 'receptions'
     when 'receiving receptions' then 'receptions'
     when 'touchdowns' then 'touchdowns'
     when 'rushing + receiving tds' then 'touchdowns'
     when 'rushing touchdowns' then 'rushing_touchdowns'
     when 'receiving touchdowns' then 'receiving_touchdowns'
   end as stat_key
   from public.sportsbook_markets m
   where m.source='provider' and m.category='Player Props'
     and m.status='open' and (m.closes_at is null or m.closes_at>now())
 ), ranked as (
   select m.*, row_number() over (
     partition by coalesce(m.closes_at::text,m.provider_event_id,''),
       regexp_replace(lower(trim(split_part(m.title,'·',1))),'[^a-z0-9]','','g'),
       case when m.stat_key in ('touchdowns','rushing_touchdowns','receiving_touchdowns') then 'scoring_td' else m.stat_key end
     order by (m.stat_key='touchdowns') desc,
       date_trunc('minute',m.provider_updated_at) desc nulls last,
       coalesce((regexp_match(m.lore_note,'(?:^| · )([0-9]+) books?\y','i'))[1]::int,0) desc,
       m.id desc
   ) as pick
   from classified m where m.stat_key is not null and m.provider_line is not null
     and (m.stat_key not in ('touchdowns','rushing_touchdowns','receiving_touchdowns') or m.provider_line=0.5)
 )
 select m.id,m.title,m.lore_note,m.provider_event_id,m.provider_key,
   m.provider_updated_at,m.closes_at,m.status,m.source,m.category
 from ranked m where m.pick=1 order by m.provider_event_id,m.id;
$$;
revoke all on function public.sportsbook_prop_index() from public;
grant execute on function public.sportsbook_prop_index() to anon,authenticated;
