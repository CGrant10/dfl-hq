-- Tournament Beta: members may write only the individual side they occupy.
-- Classic Tournament keeps its established rule that any player in a match
-- can keep both sides of the shared foursome card. Commissioners remain able
-- to edit every score through the existing admin/commissioner policies.

create or replace function public.golf_can_write_match_side(p_side_id bigint)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when o.event_type = 'tournament_beta' then exists (
      select 1
      from public.golf_match_players mine
      join public.golf_participants participant on participant.id = mine.participant_id
      where mine.side_id = p_side_id
        and participant.member_id = public.golf_current_member()
    )
    else public.golf_in_match(s.match_id)
  end
  from public.golf_match_sides s
  join public.golf_matches m on m.id = s.match_id
  join public.golf_outings o on o.id = m.outing_id
  where s.id = p_side_id;
$$;

revoke all on function public.golf_can_write_match_side(bigint) from public;
grant execute on function public.golf_can_write_match_side(bigint) to anon, authenticated;

drop policy if exists "player write golf match scores" on public.golf_match_scores;
create policy "player write golf match scores" on public.golf_match_scores for all
  using (public.golf_can_write_match_side(side_id))
  with check (public.golf_can_write_match_side(side_id));
