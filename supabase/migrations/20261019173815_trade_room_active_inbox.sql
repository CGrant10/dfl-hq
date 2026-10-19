-- Closed history must never push a still-open offer out of the inbox.
create or replace function dfl_trade_private.list_rooms(p_pin text) returns jsonb language plpgsql security definer set search_path='' as $$
declare me bigint:=dfl_trade_private.actor(p_pin);
begin
 return (select coalesce(jsonb_agg(to_jsonb(t) order by t.updated_at desc),'[]'::jsonb) from (
  select * from public.trade_rooms where member_ids @> array[me] and (status='pending' or (status='draft' and owner_id=me))
  union all
  (select * from public.trade_rooms where member_ids @> array[me] and status in ('agreed','declined','withdrawn') order by updated_at desc limit 30)
 ) t);
end $$;
