# DFL HQ — NEXT SESSION

**Live thread: keepers.** Two of four goals from the keeper brief are shipped
and verified. Pick up at "What to do next" below.

Arena is paused and its handoff moved to `ARENA-NEXT.md`. Do not reopen it.

Current version: **1.107.0**. Read the v1.106.0 and v1.107.0 commit messages —
they carry the full reasoning and are more detailed than this file.

---

## Read this first, or you will waste a pass

**Verify before you build.** Twice in the last sessions a brief described
infrastructure as already existing when it did not (a "keeper rules engine", a
"Share Keeper Board", `sleeper_draft_picks`). Grep the repo and read the live
database before consuming anything.

**The service worker serves stale JS.** Every deploy and every harness run.
Clear `caches` and unregister the service worker, or you will verify against
old code and believe a fix failed. This has bitten every session.

**PostgREST caps reads at 1000 rows.** `sleeper_draft_picks` has 1080. A
verification script that forgets this will "discover" that 2025 is missing and
blame the sync. Paginate with `Range` headers.

**Vitest passing is not visual verification.** The convention in this repo is a
throwaway `_verify/` harness that swaps `js/supabase.js` (and `js/sleeper.js`,
to skip the 5MB player map) via an HTML import map, then drives the REAL page
modules. Delete `_verify/` before committing. Never write to production to test.

---

## What is done — do not rebuild

### v1.106.0 — keeper rules are configuration

`js/keeper-rules.js` is the **only** keeper calculation in the app. Everything
consumes `evaluate()`. The old prose recogniser (`COST_RULES`,
`costRuleFrom()`) is deleted — do not reintroduce a second formula.

`keeper_rules` table, one row per **effective season**, seeded with the
commissioner's stated rules and confirmed live:

```
max_keeper_seasons 3 · cost_basis original_draft_round
round_adjustment 1  · min_keeper_round 1 · progression fixed_from_original
```

R8→R7 in years 1/2/3 then ineligible; R2→R1; R1→R1 (floor holds; no
compounding). Changing a future season cannot rewrite the past — `configFor()`
takes the newest set effective at or before the target season, and a saved
keeper row is a fact.

**Original ≠ latest.** `originalQualifyingRound()` takes the EARLIEST pick on
record. The keeper right is established by the first time the league drafted
the player; taking the newest pick made players cheaper every time somebody
re-drafted them. Verified: Bijan went R8 in 2022 and R1 in 2025 — cost is R7.

**Tenure counts canonical rows only.** `priorKeeperSeasons()` ignores rows with
no `player_id`. Legacy nickname rows ("Puka", "JJettas", "NA") are surfaced
verbatim by `legacyKeeperNames()` for review and never matched. Do not
fuzzy-backfill them — false history is worse than incomplete history.

### v1.107.0 — the commissioner picks a member, then a player

`js/keeper-entry.js`. Add keeper → member → their newest **populated** roster
(searchable) → tap a player → review autofilled facts → save. Returns to the
member step with a count per member. "Add by hand" keeps the generic editor for
corrections.

Grouped Available / Needs review / Unavailable with the reason on every row.
Unavailable is listed but not clickable; **review IS clickable** — a missing
original round is what a commissioner is there to supply.

New rows carry `member_id` + `player_id` plus snapshots (`player_name`,
`player_pos`, `player_team`, `team_snapshot`) and the audit trail
(`original_round`, `keeper_year`, `calculated_round`, `rules_season`,
`round_overridden`). Overrides are shown in the accent before saving and are
never silently recalculated.

Reuses `js/focus-trap.js`. Do not write another focus utility.

---

## What to do next, in this order

### 1. Share Keeper Board  ← start here

Add "Share Keeper Board" to the Keepers page: a purpose-built image of the
**whole league's** keeper selections for the selected season, in the Medicine
identity. Not a screenshot.

- Audit `js/share.js`, `js/fact-share.js`, `js/golf-share.js` first and reuse
  the existing canvas/export/share-API/filename helpers. Do not build a second
  image system.
- Every member appears in canonical order. A member with no keeper shows an
  understated "No keeper submitted" — an incomplete board must not look
  complete.
- Enrich new rows (position, NFL team) from `player_id`; legacy rows still show
  their stored name and round. Never hide a keeper because it cannot be
  enriched.
- Optional rule-summary line via `describeRules(config)`; omit it rather than
  print something confusing.
- Same flow must work partial and complete — the data decides.
- **Verify by generating and looking at actual images**: no submissions,
  partial, full, legacy rows, long team name, long player name.

### 2. Golf → Medicine identity

Golf still reads as a separate green/blue product. `js/pages/golf.js` has a
hard-coded `TEAM_COLORS` array; `css/golf.css` and every `js/golf-*.js` share
renderer need auditing too.

- Classify each colour: A branding, B semantic state (under/over par, live,
  winner), C neutral. Replace A only. Keep B.
- Centralise the small branded share palette — a DOM-independent constants
  module, not five copies.
- **Generate every Golf share image type and inspect them.** Grep is not
  verification (§36 of the brief was explicit).
- Do not touch scoring, matches, battle, draft, guest auth or the offline
  queue. Styling only.

### 3. Ticker / BottomLine + nav and route motion

App-shell polish, last because it touches everything. Ticker above the bottom
nav from data the app already has (next event, open poll, announcement, golf
status, champion). No fake urgency language. Suppress on Broadcast, Admin, live
Arena and focused Golf surfaces. `prefers-reduced-motion` must not marquee.
Subtle tab-bar active transition and a short route fade/translate — read the
existing `page-in` behaviour in `js/router.js` first.

---

## Open question for the commissioner

Keeper costs are now live against real draft history. **Nobody has confirmed
the calculated rounds against what the league believes them to be.** Ask, and
trace any disagreement before building on top. The one known soft spot: players
whose earliest pick is 2020 may predate the synced history (2019 has no Sleeper
draft board), and the entry sheet warns about exactly those.

---

## Standing constraints

Do not touch: Arena, Golf scoring/matches/battle/draft/guest auth/offline
queue, Home broadcast ranking, splash, finances, poll voting, calendar logic,
History lore, member identity model, admin auth, service-worker/update
algorithm, Medicine palette values, `focus-trap.js`.

Do not redo the v1.105.0 History work (tabscroll, Yearbook picker, Moments
folding) or the focus-trap integration. Regression-test them after shared CSS
changes; rewrite only on a real regression.

Migrations are additive and re-runnable. `SCHEMA.md` is the run-order baseline —
keep it current. Legacy keeper rows are never deleted.

**Version bumps move together:** `package.json`, `sw.js` cache name,
`version.txt`, and the `dfl-app-version` meta in `index.html`.

Verify with: `npx tsc --noEmit`, `npx vitest run` (152 tests as of 1.107.0 —
preserve them), `npx vite build`, plus a harness pass for raw-JS UI.
