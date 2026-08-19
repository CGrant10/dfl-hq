# DFL HQ — NEXT SESSION

**Live thread: the Sportsbook and commissioner roles.** Keepers is finished and
verified; the whole keeper roadmap that used to sit at the bottom of this file
shipped. Pick up at "What to do next".

Arena is paused and its handoff moved to `ARENA-NEXT.md`. Do not reopen it.

Current version: **1.109.28**. The reasoning for the keeper work is in the
v1.106.0 → v1.109.3 commit messages. The 1.109.4 → 1.109.28 span was released
in small increments with short messages, so for those the code is the record.

---

## Read this first, or you will waste a pass

**The service worker AND the browser HTTP cache both serve stale JS.** After
clearing the SW, module imports still come back from the HTTP cache (python's
`http.server` sends no cache headers, so the heuristic freshness window is
long) and a working fix can look broken for twenty minutes. The `_verify/`
harness that works builds its import map from the server's directory listing
and remaps **every** `/js/*.js` to a `?bust=<timestamp>` URL — one shared bust,
not a per-import one, or `members.js` gets two identities and `currentMember()`
returns null in the other.

**PostgREST caps reads at 1000 rows.** `sleeper_draft_picks` has 1080.
Paginate with `Range` headers.

**Vitest passing is not visual verification.** Throwaway `_verify/` harness,
import map swapping `js/supabase.js` and `js/sleeper.js`, driving the REAL page
modules. Delete `_verify/` before committing. Never write to production to test.

**A refused write under RLS is a cheerful 204, not an error.** It matches zero
rows and returns success. Any privileged save must ask for the row back and
report the refusal, or it will toast "Saved" over a write that did not happen.

**Bump all four version markers in the same commit.** The 1.109.4 → 1.109.28
span did not, and the history shows the cost: four separate "Bump …" commits
per release, then `Restore app shell after version bump`, `Keep release markers
aligned with restored shell` (three times), and four identical
`Release DFL HQ 1.109.24` commits. Something was rewriting `index.html` from a
stale copy between the bumps. One commit, four files, verified together.

---

## What is done — do not rebuild

### Keepers — closed

The cost basis is the **previous season's** draft round (a 2026 keeper costs one
round earlier than that player's 2025 DFL round), corrected in v1.108.0 from an
earlier version that priced from the player's earliest DFL pick.
`priorSeasonDraftRound(picks, id, {targetSeason})` reads season
`targetSeason - 1` **and no other** — a missing record is `review`, never an
older season. `decisionContext(targetSeason)` is the only place the season
offsets are written down.

`js/dfl-scoring.js` `scorePlayer(stats, scoringSettings)` is a dot product over
the league's own synced `scoring_settings`. It reproduces all six of the
league's real week-1 2025 matchup scores to the cent. **Do not print Sleeper's
`pts_ppr` as "DFL points"** — DFL scores an interception at -2 and has yardage
bonuses, worth 17 points on one quarterback's season.

Market data is **Sleeper's own ADP**, not FantasyPros: no key, no server, no
name matching. `js/keeper-market.js` normalises it and nothing downstream knows
the provider. The Advisor evaluates **QB/RB/WR/TE only**, filtered at the front
door of `candidates()` and again in the market normaliser.

Ranking is `4 × roundValue + productionFinish + marketFinish` on a shared 0–24
scale. **Do not cap that scale** — the first cut clamped it and made the order
of a roster's best players alphabetical. No score is ever displayed.

`POOR VALUE` requires all three of: strictly worse than the market, not already
at the rules' floor (`atFloor`), and a weak prior-season finish. Market
strength deliberately does not rescue a player. v1.109.2 fixed a version that
put the label on every first-round keeper.

The Advisor card carries **no methodology prose**. `blockers()` shows only the
four states where a figure is missing for a fixable reason with no other way to
say so (rules not migrated, no rules for the season, picks not synced, scoring
not synced). A fully-synced league sees nothing there — that is the point.
Three notes that fired on a healthy league were removed in 1.109.3; do not
reintroduce them.

Also shipped: the keeper rules editor (Admin → Keeper rules,
`js/pages/admin_keepers.js`, no keeper arithmetic in the file — it all comes
from `keeper-rules.js`), keeper entry (`js/keeper-entry.js`), and the Share
Keeper Board (`js/keeper-board.js`, every member appears, undecided members get
an understated "No keeper submitted").

### Sharing — the phone rule

`shareCanvas()` offers a **download only where there is no Web Share API at
all**. Where a share sheet exists but refuses files, the words go instead;
where a share fails or is cancelled, nothing is written and nothing is claimed.
Falling back to `saveFile()` on a phone quietly drops PNGs into the camera roll.
Applies to every share path — keeper board, golf board, team sheet, match
poster, lore card.

### Commissioner roles — the second way in

`commissioner_roles_schema.sql`, `js/pages/admin_commissioners.js`. Per-member
commissioner PINs with twelve scoped permissions (announcements, calendar,
polls, keepers, golf, sportsbook, broadcast, fees, history, rules, members,
sleeper) and an `is_owner` bit that grants all of them. The shared Admin
password still works and is now "master admin".

`isAdmin()` means "some privileged session exists" for backwards compatibility.
When the scope matters use `isMasterAdmin()`, `isCommissionerOwner()` or
`hasPermission(scope)`. A commissioner session **drops the moment the selected
member changes** (`commissionerStillMatchesMember()`), and logging in as one
clears the other — the two are exclusive by construction.
`js/profile-commissioner.js` badges active commissioners from the
`public_commissioners()` RPC so the roles table itself is never exposed.

### Profile PIN locks

`profile_lock_schema.sql`, `js/member-lock.js`. Optional per-member PIN in front
of *choosing* a member. It is not an identity — passing it proves nothing to the
database, it only unlocks the picker for the app session (`sessionStorage`).
Implemented by intercepting `button[data-member]` clicks in the **capture**
phase and replaying the click after `profile_verify_pin`; a remembered identity
gets a non-cancellable gate. A member claims their own first PIN; changing it
later needs the current PIN, and only an Owner can reset it. The PIN inputs
carry `autocomplete="one-time-code"` and `-webkit-text-security` specifically to
stop password managers treating them as a login.

### DFL Sportsbook

`js/pages/sportsbook.js` plus three migrations. SIN is play money: 500 to
start, +50 per elapsed day, catch-up capped at ten days per return, all applied
by `sportsbook_touch_wallet()` when a member opens the page.

**There is no cron job.** The board maintains itself on visit:
`sportsbook_maintain_auto_board()` locks expired props for a commissioner
ruling and refills the open slots with League Lore chaos props, and
`sportsbook_maintain_golf_board()` + `sportsbook_reprice_open_golf()` rebuild
the golf lines. Each is wrapped in its own try/catch so a missing migration
degrades one board rather than the page.

Golf lines are priced from **real handicaps** (`golf_profiles`, derived
`rating` with a recorded `rating_source`), not from placeholders — moneyline,
spread, margin total and tournament, sorted in that order, with real player
names. Saving a Golf Profile reprices every open golf line in the same call
(`golf_save_profile_and_reprice()`).

**Re-running `sportsbook_golf_schema.sql` voids and refunds open `golf:%`
markets** so corrected lines can regenerate. It is the one migration in the
repo that moves SIN. Know that before re-running it against production.

### Shell

DFL seal in the header and splash, staged splash loading
(`css/splash-loading.css`), tightened route transitions and tab response,
BottomLine refreshing only when league data actually changes
(`js/bottomline.js`), Home hierarchy curated across 1.109.12–15, and Golf moved
into the app shell with `js/brand-ink.js` replacing the hard-coded
`TEAM_COLORS`. `index.html` and `js/router.js` both got substantially smaller.

---

## What to do next, in this order

### 1. Test the four new features  ← start here

The suite has been **280 tests since 1.109.3** and every release since then
added a feature without adding a test. Sportsbook, commissioner permissions,
profile locks and golf-profile rating derivation have **zero coverage**, and
three of the four are the parts of the app that decide who is allowed to do
what. The existing `js/*.spec.js` files are the pattern to follow.

`hasPermission()` is the highest-value target and the easiest: it is pure
logic over `commissionerAccess`, and the cases that matter are master-admin,
owner, scoped hit, scoped miss, no session, and a session whose member no
longer matches.

### 2. Have the commissioner walk the permission matrix

Twelve scopes across every admin screen, and nobody has confirmed that a
non-owner commissioner sees exactly what they should. Log in as a scoped
commissioner and check each tab — including that privileged saves report RLS
refusals rather than toasting "Saved".

### 3. Confirm the corrected keeper costs with the commissioner

Still open from the 1.108.0 correction. The numbers changed for half the league
and nobody has checked them against what the league believes. Production had
exactly one canonical row (Saquon Barkley) whose old basis coincidentally
matched, so nothing is *wrong* in the database — but the displayed costs are
new.

### 4. Golf Sportsbook pricing, once there is real betting

The last four releases were all pricing and board-ordering adjustments made
against synthetic activity. Leave it alone until members have actually placed
bets, then look at whether the handicap-derived lines hold up.

---

## Standing constraints

Do not touch: Arena, Golf scoring/matches/battle/draft/guest auth/offline
queue, Home broadcast ranking, splash, finances, poll voting, calendar logic,
History lore, member identity model, admin auth, service-worker/update
algorithm, Medicine palette values, `focus-trap.js`.

Migrations are additive and re-runnable. `SCHEMA.md` is the run-order baseline
and lists all 38 files — update it in the same commit that adds a migration.
Legacy keeper rows are never deleted, and no automated pass rewrites an approved
keeper row — the audit reports, a commissioner decides.

**The one deliberate exception, added in v1.109.39:** a MEMBER may replace or
remove their own keeper for a season that is not locked, whoever entered it. The
first cut refused when the row came from the commissioner and that was the wrong
model — it is their roster and their keeper, and a commissioner entering one on
their behalf is a convenience, not a decision taken away from them. The
commissioner's lever is `keeper_season_state`: close the season and nobody
moves.

**Version bumps move together, in one commit:** `package.json`, `sw.js` cache
name, `version.txt`, and the `dfl-app-version` meta in `index.html`.

Verify with: `npx tsc --noEmit`, `npx vitest run` (280 tests as of 1.109.28 —
preserve them), `npx vite build`, plus a harness pass for raw-JS UI.
