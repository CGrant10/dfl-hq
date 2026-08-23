alter table public.golf_quick_rounds
  add column if not exists is_private boolean not null default false;

drop policy if exists "quick rounds read" on public.golf_quick_rounds;
create policy "quick rounds read" on public.golf_quick_rounds
for select using (
  not is_private or created_by = dfl_current_member()
  or is_admin() or has_commissioner_permission('golf')
);

drop policy if exists "quick players read" on public.golf_quick_players;
create policy "quick players read" on public.golf_quick_players
for select using (exists (
  select 1 from public.golf_quick_rounds r
  where r.id = golf_quick_players.round_id
    and (not r.is_private or r.created_by = dfl_current_member()
      or is_admin() or has_commissioner_permission('golf'))
));

drop policy if exists "quick scores read" on public.golf_quick_scores;
create policy "quick scores read" on public.golf_quick_scores
for select using (exists (
  select 1 from public.golf_quick_players p
  join public.golf_quick_rounds r on r.id = p.round_id
  where p.id = golf_quick_scores.player_id
    and (not r.is_private or r.created_by = dfl_current_member()
      or is_admin() or has_commissioner_permission('golf'))
));

comment on column public.golf_quick_rounds.is_private is
  'When true, only the creator and Golf commissioners can read this round and its scorecards.';
