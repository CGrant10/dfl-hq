-- Opt-in, device-specific Wall delivery. No historical inbox messages are queued.
alter table public.notification_messages drop constraint notification_messages_category_check;
alter table public.notification_messages add constraint notification_messages_category_check check(category in ('announcements','trades','polls','fees','matchups','weekly','sportsbook','waivers','events','updates','wall'));
create table if not exists public.wall_push_outbox (
 message_id bigint not null references public.notification_messages(id) on delete cascade,
 subscription_id bigint not null references public.push_subscriptions(id) on delete cascade,
 attempts integer not null default 0 check(attempts between 0 and 5),
 claim_token uuid,
 available_at timestamptz not null default now(),
 completed_at timestamptz,
 result text check(result in ('delivered','disabled','expired','failed')),
 primary key(message_id,subscription_id)
);
create index if not exists wall_push_due_idx on public.wall_push_outbox(available_at) where completed_at is null and attempts<5;
create index if not exists wall_push_subscription_idx on public.wall_push_outbox(subscription_id);
alter table public.wall_push_outbox enable row level security;
revoke all on public.wall_push_outbox from public,anon,authenticated;
grant all on public.wall_push_outbox to service_role;

create or replace function private.queue_wall_push() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.category='wall' and new.source_key ~ '^wall:(post|reply):[0-9]+$' and new.audience='members' then
   insert into public.wall_push_outbox(message_id,subscription_id)
   select new.id,p.id from public.push_subscriptions p
   where p.enabled and p.member_id=any(new.target_member_ids) and p.categories @> '["wall"]'::jsonb
   on conflict do nothing;
 end if;
 return new;
end;$$;
revoke all on function private.queue_wall_push() from public,anon,authenticated;
drop trigger if exists queue_wall_push on public.notification_messages;
create trigger queue_wall_push after insert on public.notification_messages for each row execute function private.queue_wall_push();

create or replace function public.claim_wall_push_batch()
returns setof public.wall_push_outbox language sql security invoker set search_path='' as $$
 with due as (
   select message_id,subscription_id from public.wall_push_outbox
   where completed_at is null and attempts<5 and available_at<=now()
   order by available_at,message_id limit 20 for update skip locked
 )
 update public.wall_push_outbox q set attempts=q.attempts+1,claim_token=gen_random_uuid(),available_at=now()+interval '3 minutes'
 from due where q.message_id=due.message_id and q.subscription_id=due.subscription_id returning q.*;
$$;
revoke all on function public.claim_wall_push_batch() from public,anon,authenticated;
grant execute on function public.claim_wall_push_batch() to service_role;

create or replace function private.wall_conversation_notice() returns trigger
language plpgsql security definer set search_path='' as $$
declare targets bigint[]; owner_id bigint; post_id bigint; author text;
begin
  if tg_table_name='member_wall_replies' then
    post_id:=new.post_id;
    select member_id into owner_id from public.member_wall_posts where id=post_id;
  else post_id:=new.id; end if;
  select display_name into author from public.members where id=new.member_id;
  select array_agg(distinct m.id) into targets from public.members m
    where m.id<>new.member_id and
      (m.id=owner_id or position(lower('@{'||m.display_name||'}') in lower(new.body))>0);
  if cardinality(targets)>0 then
    insert into public.notification_messages(title,body,category,target_url,audience,target_member_ids,sent_by_member_id,source_key)
    values(left(coalesce(author,'Member')||case when owner_id is not null then ' replied on the Wall' else ' mentioned you on the Wall' end,80),
      left(new.body,240),'wall','#/wall?post='||post_id,'members',targets,new.member_id,
      'wall:'||case when owner_id is not null then 'reply:' else 'post:' end||new.id);
  end if;
  return new;
end;
$$;
revoke all on function private.wall_conversation_notice() from public,anon,authenticated;
