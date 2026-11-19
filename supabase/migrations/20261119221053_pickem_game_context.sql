-- Public NFL lines and venue weather, delivered by the existing board RPC.
alter table public.nfl_pickem_games add column if not exists game_context jsonb not null default '{}'::jsonb;
alter table public.nfl_pickem_games drop constraint if exists nfl_pickem_game_context_object;
alter table public.nfl_pickem_games add constraint nfl_pickem_game_context_object check (jsonb_typeof(game_context)='object');
notify pgrst, 'reload schema';
