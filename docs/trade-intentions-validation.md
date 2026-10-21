# Trade intentions — 1.457.0

Trade now includes a compact intentions editor shared across Find offers, Check a trade and Deal Room. Managers can label their own current players Available, Listening or Keeping and select QB/RB/WR/TE needs. The team picker shows other managers’ published labels read-only and can open an offer search with that exact team. The default Trade entry still searches all teams. Existing ticket sharing and Sleeper handoff remain available.

These are manager statements, not inferred willingness or acceptance probabilities. Keeping removes a player from unanchored suggestions; explicitly choosing that player overrides the restriction and labels the offer accordingly. Both teams and all intermediate teams in multi-team suggestions are respected, including candidates introduced during fair-offer repair/refinement. No players are removed from the actual roster used to evaluate lineup impact. Available/Listening and stated starter needs break ties only inside the existing comparable lineup, price and risk bands. Bigger packages do not earn extra listing credit. Player prices, evidence, category thresholds and verdicts stay unchanged.

Labels are scoped to the current season/league and current roster ownership. After 21 days they stop affecting suggestions until confirmed again. Newly acquired or unlisted players have no claimed manager status. Dropped players’ old labels are ignored. Preferences refresh only on the Trade page, every 60 seconds while visible and without the editor open; identical effective preferences do not restart the worker. The new API module is lazy. Startup remains three modules and Home four.

## Mobile and motion

The sheet uses a 240ms eased entry, a 150ms exit and an interruptible 200ms height adjustment between teams. Position chips transition color in place without recreating their controls. Save/refresh keeps the entry button, focus and scroll position; failed saves retain edits, duplicate saves are disabled, and closing restores focus. Previously generated cards remain visible but disabled during a worker refresh, with an updating status; replacement results fade in for 180ms. Reduced motion and the app’s motion-off setting skip these effects. Route teardown clears the dialog, animations and polling. An early tap waits for the existing pending read, rather than constructing an empty draft with an outdated revision.

## Data access

Migration `20261021153056_trade_manager_intentions` is deployed to DFL HQ. The new table has RLS and no direct public/anon/authenticated table grants. Public RPC wrappers are security invokers with an empty search path; private implementations live in the existing unexposed trade schema. League-visible reads expose only current active managers and current roster ownership. Writes derive the manager through the existing selected-member/optional profile PIN contract and derive their roster server-side. This does not introduce a new authenticated identity system.

Position/status/schema limits, current season/league, player ownership and expected revisions are checked server-side. An advisory transaction lock also serializes initial creation, so stale devices cannot replace newer statements. PINs and credentials are never part of the stored preference row. Direct table writes and client-selected owner IDs are unavailable.

## Verification

- `pnpm check`: 2,007 tests across 244 files, release/theme/type/name checks and production builds passed. Production keeps the previous 1.456.0 bundle unchanged.
- Model/data tests cover expired/invalid signals, roster changes, explicit Keeping overrides, starter-only need fit, package-size neutrality, ranking quality precedence, unchanged trade value/verdicts, three-team restrictions, member changes and PIN recovery.
- Production Trade controller and intentions UI with isolated services: 162 browser checks, mobile 320/390/768px, Light/Dark; edit/save, read-only teams, direct search, failed saves, duplicate protection, stale revisions/reload, wrong/correct PIN, early opening, focus, 44px controls, overflow, reduced motion, app motion-off and teardown. Captures and check results are in `docs/trade-intentions/`.
- Existing Trade browser regression passed at 320/390/768px with no page exceptions or document overflow; three-way routing, saved comparisons, counts, fresh-injury review and ownership validation remain intact. Existing connected-offer motion checks passed at 320/390px.
- Isolated PostgreSQL 17 fixture uses the production trade actor function and checks public/anon/authenticated access, active membership, profile PINs, own-roster writes, malformed fields/positions/statuses, stale revisions, clears, roster transfer/drop and season changes. Run `supabase/tests/trade_intentions_fixture.sql` only in a fresh isolated database; it includes its migration and assertions.
- Live REST: league list returned 200/empty; a no-member save was rejected with 42501. Production has zero intention rows: no real manager preferences or offers were written during verification.
- Supabase advisors introduced no warning-level security findings. The new informational no-policy finding is intentional for a table with all direct grants revoked and deliberate RPC-only access; see https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy. No performance finding references this table/functions. The member foreign key is covered by the primary key.

Physical iPhone/Android animation pacing, native select/keyboard behavior and VoiceOver/TalkBack speech remain unverified. Browser captures use isolated sample rosters; remote player photos are blocked in the fixtures, so initials are expected. These checks do not establish complete WCAG conformance.
