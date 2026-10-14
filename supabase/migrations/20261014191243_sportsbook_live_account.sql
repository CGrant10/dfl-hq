-- One statement snapshot, using the existing selected-member read APIs only.
-- No direct table privileges, wallet creation, claims or settlement writes.
create or replace function public.sportsbook_my_live_account()
returns jsonb
language sql stable security invoker set search_path=''
as $$
  select case when public.sportsbook_member_id() is null then null else
    (select pg_catalog.jsonb_build_object(
      'member_id',w.member_id,'balance',w.balance,'checked_at',pg_catalog.statement_timestamp(),
      'bets',coalesce((select pg_catalog.jsonb_agg(b order by (b.status='open') desc,b.created_at desc,b.id desc)
        from public.sportsbook_my_bets(30,false) b),'[]'::jsonb),
      'ledger',coalesce((select pg_catalog.jsonb_agg(l order by l.created_at desc,l.id desc)
        from public.sportsbook_my_ledger(16) l),'[]'::jsonb)
    ) from public.sportsbook_leaderboard() w where w.member_id=public.sportsbook_member_id())
  end;
$$;
revoke all on function public.sportsbook_my_live_account() from public;
grant execute on function public.sportsbook_my_live_account() to anon,authenticated;
