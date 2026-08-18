# DFL HQ — NEXT SESSION

**Live thread: keepers.** The keeper rule correction and the value-based
Advisor are shipped and verified. Pick up at "What to do next".

Arena is paused and its handoff moved to `ARENA-NEXT.md`. Do not reopen it.

Current version: **1.109.0**. Read the v1.106.0, v1.107.0 and v1.108.0 commit
messages — they carry the full reasoning.

---

## Read this first, or you will waste a pass

**The service worker AND the browser HTTP cache both serve stale JS.** This
bit again in 1.108.0: after clearing the SW, module imports still came back
from the HTTP cache (python's `http.server` sends no cache headers, so the
heuristic freshness window is long) and a working fix looked broken for twenty
minutes. The `_verify/` harness that worked built its import map from the
server's directory listing and remapped **every** `/js/*.js` to a
`?bust=<timestamp>` URL — one shared bust, not a per-import one, or `members.js`
gets two identities and `currentMember()` returns null in the other.

**PostgREST caps reads at 1000 rows.** `sleeper_draft_picks` has 1080.
Paginate with `Range` headers.

**Vitest passing is not visual verification.** Throwaway `_verify/` harness,
import map swapping `js/supabase.js` and `js/sleeper.js`, driving the REAL page
modules. Delete `_verify/` before committing. Never write to production to test.

---

## What is done — do not rebuild

### v1.108.0 — the keeper basis was wrong, and the Advisor now has real data

**THE CORRECTION.** v1.106.0 priced a keeper from the player's EARLIEST DFL
pick. The league's rule is the **previous season's** draft round: a 2026 keeper
costs one round earlier than that player's **2025** DFL round. This was not
academic — 90 of the 178 slots on the league's 2025 rosters had an earliest
round that differs from their 2025 round (Chuba Hubbard R14 in 2021 → R3 in
2025; the old code charged R13 instead of R2).

`originalQualifyingRound()` is gone. `priorSeasonDraftRound(picks, id,
{targetSeason})` reads season `targetSeason - 1` **and no other** — a missing
record is `review`, never an older season. `decisionContext(targetSeason)` is
the only place the season offsets are written down. `evaluate()` takes
`basisRound` / `basisSeason`. The earliest-draft "may predate it" warning is
deleted; the only question is whether a 2025 pick exists.

`cost_basis` is `previous_season_draft_round` and `progression` is
`fixed_from_basis`. The v1.106.0 spellings are still read and normalised, so an
un-migrated database keeps working. `keeper_basis_correction.sql` renames the
stored values, adds `keepers.basis_round` / `basis_season`, and **reports**
rows saved under the old basis without touching one. `original_round` is legacy
and never written again. Production had exactly one canonical row (Saquon
Barkley) and its old basis coincidentally matched, so nothing needs review.

**PRODUCTION IS REAL AND IT IS DFL-SCORED.** `js/dfl-scoring.js`
`scorePlayer(stats, scoringSettings)` is a dot product over the league's own
`scoring_settings` (already synced onto `sleeper_leagues`). Verified twice:
it reproduces all six of the league's real week-1 2025 matchup scores to the
cent, and a season total equals the sum of its eighteen weeks. Do **not** print
Sleeper's `pts_ppr` as "DFL points" — DFL scores an interception at -2 and has
yardage bonuses, worth 17 points on one quarterback's season.
`positionalFinish()` ranks over every player at the position in the league.

**MARKET IS SLEEPER, NOT FANTASYPROS.** The brief expected a FantasyPros key in
an Edge Function. Sleeper already publishes ADP:
`api.sleeper.app/projections/nfl/<season>?season_type=regular&order_by=adp_ppr&position[]=…`
— keyed on the **Sleeper player id**, with `adp_std`/`adp_half_ppr`/`adp_ppr`,
positions and `last_modified`. No key, no server, no secret, no name matching.
`js/keeper-market.js` normalises it to `{playerId, rank, positionRank, adp,
projectedRound, source, scoringFormat, updatedAt}` and nothing downstream knows
the provider. `resolveProviderPlayer()` exists and is unused — it is there for
the day a name-keyed provider arrives, and it leaves ambiguity unresolved.

**THE ADVISOR EVALUATES QB/RB/WR/TE ONLY.** Filtered at the front door of
`candidates()` and again in the market normaliser. The commissioner's entry
sheet still lists kickers and defences; an advisor does not.

Ranking is `4 × roundValue + productionFinish + marketFinish`, each finish
mapped onto a shared 0–24 scale. Do not cap that scale — the first cut clamped
it and made the order of a roster's best players alphabetical. No score is ever
displayed; every term is on the card as its own fact with its own season.

Labels (`BEST VALUE`, `BEST PLAYER`, `SAFE CHOICE`, `VALUE PLAY`,
`FINAL-YEAR VALUE`, `POOR VALUE`) each have an explicit tested criterion and
are gated on the four fallback levels. `POOR VALUE` never fills the accent
headline slot — it is true, but in the accent it reads as a recommendation.

### v1.107.0 — the commissioner picks a member, then a player

`js/keeper-entry.js`. Unchanged except that every round is now season-labelled
("2025 Draft R8 · 2026 Keeper R7") and new rows write `basis_round` /
`basis_season`. Do not rebuild the flow. Reuses `js/focus-trap.js`.

---

## What to do next, in this order

### 1. Ask the commissioner to confirm the corrected costs  ← start here

The numbers changed for half the league. Nobody has checked them against what
the league believes. Spot-check a handful before building anything on top.

### 2. Share Keeper Board

Purpose-built image of the whole league's keeper selections for a season, in
the Medicine identity. Audit `js/share.js`, `js/fact-share.js`,
`js/golf-share.js` first and reuse the canvas/export/share-API helpers. Every
member appears; no keeper shows an understated "No keeper submitted". Legacy
rows show their stored name. Verify by generating and LOOKING AT images.

### 3. Golf → Medicine identity

`js/pages/golf.js` has a hard-coded `TEAM_COLORS`; `css/golf.css` and every
`js/golf-*.js` share renderer need auditing. Classify each colour A branding /
B semantic state / C neutral and replace A only. Generate every Golf share
image type and inspect them. Styling only.

### 4. Ticker / BottomLine + nav and route motion

App-shell polish, last because it touches everything.

---

## Standing constraints

Do not touch: Arena, Golf scoring/matches/battle/draft/guest auth/offline
queue, Home broadcast ranking, splash, finances, poll voting, calendar logic,
History lore, member identity model, admin auth, service-worker/update
algorithm, Medicine palette values, `focus-trap.js`.

Migrations are additive and re-runnable. `SCHEMA.md` is the run-order baseline.
Legacy keeper rows are never deleted and approved keeper rows are never
rewritten — the audit reports, a commissioner decides.

**Version bumps move together:** `package.json`, `sw.js` cache name,
`version.txt`, and the `dfl-app-version` meta in `index.html`.

Verify with: `npx tsc --noEmit`, `npx vitest run` (277 tests as of 1.109.0 —
preserve them), `npx vite build`, plus a harness pass for raw-JS UI.
