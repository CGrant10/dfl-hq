-- Retire both automatic and saved Arena winner slides; keep race results intact.
drop trigger if exists arena_result_aftermath_broadcast on public.arena_results;
drop function if exists public.dfl_arena_aftermath_broadcast();
update public.broadcast_items set active=false
 where kicker='ARENA AFTERMATH' and treatment='champion'
 and (href like '#/arena-results?id=%' or href like '#/arena?id=%');
