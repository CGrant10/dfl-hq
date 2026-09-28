-- DFL HQ notification control-center upgrade. Safe to re-run after
-- notifications_schema.sql and sportsbook_entries_schema.sql.

alter table public.notification_messages
  drop constraint if exists notification_messages_category_check;
alter table public.notification_messages
  add constraint notification_messages_category_check check (category in (
    'announcements','trades','polls','fees','matchups','weekly',
    'sportsbook','waivers','events','updates'
  ));

alter table public.push_subscriptions alter column categories set default
  '["announcements","trades","polls","fees","matchups","weekly","sportsbook","waivers","events"]'::jsonb;

/* A settled ticket leaves an automatic receipt in the member's DFL inbox
   without requiring the commissioner to grade or announce it. */
create or replace function public.notify_settled_sportsbook_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'open' and new.status in ('won','lost','void') then
    insert into public.notification_messages
      (title, body, category, target_url, audience, target_member_ids)
    values (
      case new.status when 'won' then 'Sportsbook ticket cashed'
        when 'lost' then 'Sportsbook ticket settled'
        else 'Sportsbook ticket refunded' end,
      case new.status when 'won' then 'You won ' || coalesce(new.payout, new.potential_payout, 0) || ' SIN. Your bankroll has been paid.'
        when 'lost' then 'That ticket did not hit. The result and every leg are ready in My Bets.'
        else 'The ticket was voided and ' || new.stake || ' SIN was returned to your bankroll.' end,
      'sportsbook', '#/sportsbook', 'members', array[new.member_id]::bigint[]
    );
  end if;
  return new;
end;
$$;

revoke all on function public.notify_settled_sportsbook_ticket() from public;

drop trigger if exists sportsbook_ticket_notification on public.sportsbook_bets;
create trigger sportsbook_ticket_notification
after update of status on public.sportsbook_bets
for each row execute function public.notify_settled_sportsbook_ticket();
