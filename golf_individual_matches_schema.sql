-- Individual tournament matches: every participant can play the same round
-- without first being assigned to a team. Safe to run more than once.

alter table public.golf_match_sides
  alter column team_id drop not null;

alter table public.golf_match_sides
  drop constraint if exists golf_match_sides_slot_check;
alter table public.golf_match_sides
  add constraint golf_match_sides_slot_check check (slot >= 1);

create or replace function public.golf_sync_individual_match(p_round_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outing bigint;
  v_format text;
  v_scored bigint;
  v_players bigint;
  v_match bigint;
  v_side bigint;
  v_participant record;
  v_slot int := 0;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;

  select outing_id, format into v_outing, v_format
  from public.golf_rounds where id = p_round_id;
  if v_outing is null then raise exception 'No such round'; end if;
  if v_format <> 'singles' then raise exception 'Only a singles round can be an individual field'; end if;

  select count(*) into v_scored
  from public.golf_match_scores ms
  join public.golf_match_sides s on s.id = ms.side_id
  join public.golf_matches m on m.id = s.match_id
  where m.round_id = p_round_id;
  if v_scored > 0 then
    raise exception 'This round already has strokes. Clear it before changing the individual field.';
  end if;

  select count(*) into v_players
  from public.golf_participants where outing_id = v_outing;
  if v_players < 2 then raise exception 'Add at least two golfers first'; end if;

  delete from public.golf_matches where round_id = p_round_id;
  update public.golf_rounds set scoring = 'strokes' where id = p_round_id;
  insert into public.golf_matches (outing_id, round_id, match_number)
  values (v_outing, p_round_id, 1) returning id into v_match;

  for v_participant in
    select id from public.golf_participants
    where outing_id = v_outing
    order by coalesce(sort_order, 2147483647), id
  loop
    v_slot := v_slot + 1;
    insert into public.golf_match_sides (match_id, team_id, slot)
    values (v_match, null, v_slot) returning id into v_side;
    insert into public.golf_match_players (side_id, participant_id)
    values (v_side, v_participant.id);
  end loop;

  return v_match;
end;
$$;

revoke all on function public.golf_sync_individual_match(bigint) from public;
grant execute on function public.golf_sync_individual_match(bigint) to anon, authenticated;

select 'Individual tournament matches ready' as status;
