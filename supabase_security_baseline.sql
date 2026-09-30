-- DFL HQ targeted API hardening.
-- These tables are RPC-only. The browser may execute the narrow functions,
-- but it cannot read or mutate their backing rows directly.
revoke all on table public.app_performance_events from anon, authenticated;

revoke all on function public.record_app_performance(jsonb) from public, anon, authenticated;
grant execute on function public.record_app_performance(jsonb) to anon, authenticated;

revoke all on function public.app_performance_summary(integer) from public, anon, authenticated;
grant execute on function public.app_performance_summary(integer) to anon, authenticated;

comment on table public.app_performance_events is
  'Anonymous aggregate RUM events. Direct API access is intentionally revoked; use the bounded RPCs.';
comment on function public.app_performance_summary(integer) is
  'Commissioner-gated summary. Execute is exposed for the custom member-header auth model; the function performs its own permission check.';
