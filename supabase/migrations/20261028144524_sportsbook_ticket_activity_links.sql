-- Existing targeted settlement notices now open their exact ticket.
-- No historical messages, bets, membership rules or delivery settings are changed.
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
      'sportsbook', '#/sportsbook?product=book&ticket=' || new.id::text, 'members', array[new.member_id]::bigint[]
    );
  end if;
  return new;
end;
$$;

revoke all on function public.notify_settled_sportsbook_ticket() from public, anon, authenticated;

