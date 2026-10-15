-- Append routed analysis to previously unsupported receipts. Original snapshots stay immutable.
alter table public.trade_alerts add column if not exists routing_review jsonb;
alter table public.trade_alerts add constraint trade_routing_review_shape check (
 routing_review is null or coalesce((
  jsonb_typeof(routing_review)='object'
  and routing_review->>'sleeper_transaction_id'=sleeper_transaction_id
  and routing_review->>'model_version'='dflyzer-trade-v8-sleeper-routing'
  and routing_review->>'analysis_status' in ('graded','partial')
  and jsonb_typeof(routing_review->'result')='object'
  and routing_review->>'reviewed_at' is not null
 ),false));
-- Existing public update privileges cover named delivery/coverage columns only.
revoke update(routing_review) on public.trade_alerts from anon,authenticated;
create or replace function public.keep_trade_routing_review_append_only()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.routing_review is not null then raise exception 'Routing reviews must follow an original receipt';end if;
 elsif new.routing_review is distinct from old.routing_review then
  if current_user not in ('postgres','service_role','supabase_admin')
     or old.routing_review is not null or old.analysis_status<>'review' or old.result is not null
     or not (old.limitations @> '["Multi-team trade: automatic ownership routing is not supported yet."]'::jsonb)
  then raise exception 'Only the sync service may append a routing review to an unsupported receipt';end if;
 end if;
 return new;
end;$$;
revoke all on function public.keep_trade_routing_review_append_only() from public;
create trigger trade_routing_review_append_only before insert or update on public.trade_alerts
 for each row execute function public.keep_trade_routing_review_append_only();
comment on column public.trade_alerts.routing_review is 'One server-generated routed analysis for a formerly unsupported multi-team receipt; original fields remain immutable.';
