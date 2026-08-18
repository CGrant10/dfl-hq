-- =====================================================================
-- DFL HQ - The keeper cost basis is the PREVIOUS SEASON's draft round
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive and safe to re-run. Run AFTER keeper_rules_schema.sql.
--
-- WHY THIS FILE EXISTS
--
--   keeper_rules_schema.sql seeded the cost basis as 'original_draft_round'
--   and described it as "the player's ORIGINAL qualifying DFL draft round".
--   That is not the league's rule. The keeper cost for a season is measured
--   from the player's DFL draft round in the season IMMEDIATELY BEFORE it:
--
--     2026 keeper  ->  2025 DFL draft round
--     2027 keeper  ->  2026 DFL draft round
--
--   This was not an academic distinction. On the league's own 2025 rosters,
--   90 of 178 slots have an earliest DFL round that differs from their 2025
--   round - Ja'Marr Chase went R8 in 2021 and R1 in 2025, and the old rule
--   priced him at R7 instead of R1.
--
-- WHAT THIS DOES, AND THE PART IT REFUSES TO DO
--
--   1. widens two CHECK constraints so the corrected vocabulary is legal
--   2. renames the stored values on the configuration rows
--   3. adds basis_round + basis_season to `keepers`, so a NEW row records
--      which draft its cost came from - the old `original_round` column had
--      no season beside it, which is why a saved row could not be checked
--   4. reports which saved rows were created under the old basis
--
--   IT DOES NOT REWRITE ONE KEEPER ROW. An approved keeper record is a
--   historical fact - the commissioner looked at a number and said yes to it -
--   and replacing that with a number a migration guessed is worse than
--   leaving a discrepancy visible. `original_round` keeps meaning exactly what
--   it meant on the rows that already carry it. Section 4 prints the rows a
--   commissioner should look at; auditSavedBasis() in js/keeper-rules.js is
--   the same check in the app.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The configuration vocabulary
--    Both constraints are widened to accept the old value AND the new one
--    before anything is renamed, so this file can be run against a database
--    in either state and re-run afterwards.
-- ---------------------------------------------------------------------

/*
  The constraints were declared inline in keeper_rules_schema.sql, so Postgres
  named them itself. Dropping by a guessed name would silently do nothing and
  leave the UPDATE below to fail, so they are found by what they constrain
  rather than by what they are probably called.
*/
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
     where ns.nspname = 'public' and rel.relname = 'keeper_rules'
       and con.contype = 'c'
       and (pg_get_constraintdef(con.oid) like '%cost_basis%'
         or pg_get_constraintdef(con.oid) like '%progression%')
  loop
    execute format('alter table public.keeper_rules drop constraint %I', c.conname);
    raise notice 'dropped old check constraint %', c.conname;
  end loop;
end;
$$;

alter table public.keeper_rules
  add constraint keeper_rules_cost_basis_check
  check (cost_basis in ('previous_season_draft_round', 'original_draft_round'));

alter table public.keeper_rules
  add constraint keeper_rules_progression_check
  check (progression in ('fixed_from_basis', 'escalates_per_year', 'fixed_from_original'));

-- The default for any row created from here on.
alter table public.keeper_rules
  alter column cost_basis  set default 'previous_season_draft_round',
  alter column progression set default 'fixed_from_basis';


-- ---------------------------------------------------------------------
-- 2. Rename the stored values
--    The rule itself is unchanged - one round earlier, floor R1, three
--    seasons. Only what the cost is measured FROM changes, and the strings
--    now say so. js/keeper-rules.js also reads the old spellings and
--    normalises them, so an un-migrated database keeps working; this makes
--    the stored data agree with the code rather than relying on that.
-- ---------------------------------------------------------------------

update public.keeper_rules
   set cost_basis = 'previous_season_draft_round'
 where cost_basis = 'original_draft_round';

update public.keeper_rules
   set progression = 'fixed_from_basis'
 where progression = 'fixed_from_original';

-- The seeded note described the wrong rule in prose. Corrected only where it
-- is still the seeded text, so a note the commissioner has since written is
-- never overwritten.
update public.keeper_rules
   set notes = 'Keeper cost is one round earlier than the player''s DFL draft round in the '
             || 'season immediately before the keeper season (a 2026 keeper is priced from the '
             || '2025 draft), floor of Round 1, cost fixed from that basis, three keeper '
             || 'seasons maximum.'
 where notes like 'Seeded from the commissioner%';


-- ---------------------------------------------------------------------
-- 3. Keeper rows record WHICH DRAFT the cost came from
--    Additive. `original_round` is left in place and untouched: on the rows
--    that have it, it is what v1.107.0 wrote, and that remains the honest
--    record of how that row was produced.
-- ---------------------------------------------------------------------

alter table public.keepers
  -- the previous season's DFL draft round the cost was measured from
  add column if not exists basis_round  int,
  -- WHICH season that round is from. The column v1.107.0 should have had:
  -- a round with no season beside it cannot be checked against anything.
  add column if not exists basis_season int;

comment on column public.keepers.basis_round is
  'The DFL draft round this keeper cost was measured from - the season immediately before `year`.';
comment on column public.keepers.basis_season is
  'Which draft season basis_round came from. Always year - 1 for rows written by the app.';
comment on column public.keepers.original_round is
  'LEGACY (v1.107.0 only): the player''s EARLIEST DFL draft round, written when the app '
  'wrongly used that as the keeper basis. Not written by new rows and never recalculated. '
  'Use basis_round / basis_season.';


-- ---------------------------------------------------------------------
-- 4. Which saved rows were created under the old basis
--    A REPORT, not a fix. Nothing below writes anything.
-- ---------------------------------------------------------------------

do $$
declare
  r            record;
  v_checked    int := 0;
  v_mismatch   int := 0;
  v_nobasis    int := 0;
begin
  for r in
    select k.id, k.year, k.player, k.player_id, k.original_round, k.basis_round,
           k.calculated_round, k.round_cost, k.round_overridden,
           p.round as prior_round
      from public.keepers k
      left join public.sleeper_draft_picks p
        on p.player_id = k.player_id
       and p.season    = k.year - 1
     where k.player_id is not null
     order by k.year desc, k.id
  loop
    v_checked := v_checked + 1;
    if r.prior_round is null then
      v_nobasis := v_nobasis + 1;
      raise notice 'REVIEW  keeper #% (% %): no % draft pick on record - a commissioner must supply the round',
        r.id, r.year, r.player, r.year - 1;
    elsif coalesce(r.basis_round, r.original_round) is distinct from r.prior_round then
      v_mismatch := v_mismatch + 1;
      raise notice 'REVIEW  keeper #% (% %): saved basis R% but the % draft round is R% %',
        r.id, r.year, r.player,
        coalesce(r.basis_round, r.original_round), r.year - 1, r.prior_round,
        case when r.round_overridden then '(row is a deliberate override)' else '' end;
    end if;
  end loop;

  raise notice '---';
  raise notice 'keeper rows with a player_id checked: %', v_checked;
  raise notice '  basis differs from the previous season''s draft round: %', v_mismatch;
  raise notice '  no previous-season draft record at all: %', v_nobasis;
  raise notice 'NOTHING WAS CHANGED. Approved keeper rows are historical facts; the';
  raise notice 'commissioner reviews the rows above and edits any that are wrong by hand.';
  raise notice 'Legacy nickname rows (no player_id) are not checked and not touched.';
end;
$$;
