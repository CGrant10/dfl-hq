-- One public, read-only payload for Home's first paint.
create or replace function public.home_bootstrap(home_today date default current_date)
returns jsonb language sql stable security invoker set search_path = ''
as $$
select jsonb_build_object(
  'events', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.events where event_date >= home_today order by event_date limit 3) x),'[]'::jsonb),
  'announcements', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.announcements order by created_at desc limit 3) x),'[]'::jsonb),
  'polls', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from public.polls where active is true order by created_at desc limit 3) x),'[]'::jsonb),
  'leagues', coalesce((select jsonb_agg(to_jsonb(x)) from (select season,status,champion_user_id from public.sleeper_leagues order by season desc) x),'[]'::jsonb),
  'golf', coalesce((select jsonb_agg(to_jsonb(x)) from (select id,name,course,event_date,event_time,status from public.golf_outings where status <> 'final' order by event_date limit 1) x),'[]'::jsonb),
  'standings', coalesce((select jsonb_agg(to_jsonb(x)) from (select season,sleeper_user_id,wins,losses,ties,rank,points_for from public.sleeper_standings) x),'[]'::jsonb),
  'golf_done', coalesce((select jsonb_agg(to_jsonb(x)) from (select id,name,finalized_at from public.golf_outings where finalized_at is not null order by finalized_at desc limit 5) x),'[]'::jsonb)
);
$$;
revoke all on function public.home_bootstrap(date) from public;
grant execute on function public.home_bootstrap(date) to anon, authenticated;
