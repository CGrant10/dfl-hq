# DFL HQ — the database baseline

**What a correct current DFL HQ database looks like, and the order to build
one in.** This exists because the repository has 41 `.sql` files (one base plus 40 additive) and the
README's setup section still lists eleven of them, which is the state it was
in several features ago. If the two disagree, this file is the one being
maintained.

This is an orientation document, not a migration system. There is no
`schema_migrations` table and nothing tracks what has been applied — every
file below is written to be **additive and safe to re-run**, so when in doubt
the answer is "run it again".

---

## Run order

Dependencies are real: a file that adds a column to `members` needs
`members_schema.sql` to have created the table. Run top to bottom.

### Core — required for the app to boot at all

| # | File | What it establishes |
|---|---|---|
| 1 | `schema.sql` | Every base table, the admin password + `is_admin()`, and the baseline RLS policies. Contains the `CHANGE-ME-ADMIN-PASSWORD` line you must edit. **Re-running resets the admin password.** |
| 2 | `members_schema.sql` | `members` — the canonical league identity every other table points at. |

### Identity and participation — required

| # | File | What it establishes |
|---|---|---|
| 3 | `polls_schema.sql` | `votes.member_id`, `cast_vote()`, `clear_vote()`. Without it the Polls page loads but cannot vote, and says so. |
| 4 | `side_events_member_schema.sql` | `side_event_signups.member_id`, the `(side_event_id, member_id)` uniqueness rule, and a member-scoped insert policy. Without it the Side Events tab loads but cannot join, and says so. |
| 5 | `profile_schema.sql` | `members.bio`, `members.pet`, and the member-scoped self-edit function. |
| 6 | `presence_schema.sql` | `dfl_presence()` — the aggregate "somebody else is here" counter. Degrades silently if absent. |
| 7 | `settings_schema.sql` | `app_settings` (the dashboard logo). |
| 8 | `rules_schema.sql` | Editable rule categories. |

### Sleeper

| # | File | What it establishes |
|---|---|---|
| 9 | `sleeper_schema.sql` | Leagues, users, standings, matchups. |
| 10 | `sleeper_history_schema.sql` | The record book on top of them. |

### Finances

| # | File |
|---|---|
| 11 | `finance_schema.sql` |

### Calendar

| # | File | What it establishes |
|---|---|---|
| 12 | `events_time_schema.sql` | `events.event_time`. |

### Golf — in this order

| # | File | What it establishes |
|---|---|---|
| 13 | `golf_schema.sql` | Outings, teams, one shared card per team. |
| 14 | `golf_courses_schema.sql` | The course library: pars, yardage, stroke index. |
| 15 | `golf_draft_schema.sql` | Captains drafting players into teams. |
| 16 | `golf_matches_schema.sql` | The tournament: rounds, 2v2s, singles. Needs 13 and 15. |
| 17 | `golf_guest_schema.sql` | Event-scoped guest passes. |
| 18 | `golf_identity_schema.sql` | Golf display names, `dfl_current_member()`. |
| 19 | `golf_scores_policy_fix.sql` | Closes an anonymous-write hole on `golf_scores`. **Security fix — not optional.** |
| 20 | `golf_bag_schema.sql` | Private club distances. |
| 21 | `golf_time_schema.sql` | `golf_outings.event_time`. |

### Arena

| # | File | What it establishes |
|---|---|---|
| 22 | `arena_schema.sql` | Events, participants, results. |
| 23 | `arena_sprites_schema.sql` | Custom racer images. |
| 24 | `arena_broadcast_schema.sql` | `bc_state`, `bc_started_at`, `bc_offset_ms` — the shared race clock. The Race View cannot run a race without these. |
| 25 | `arena_pick_racer_schema.sql` | Members choosing their own racer; also defines `dfl_current_member()`. |

### Draft data — required for the Keeper Advisor

| # | File | What it establishes |
|---|---|---|
| 26 | `sleeper_draft_schema.sql` | `sleeper_draft_picks` (season, round, pick_no, player_id, picked_by) and `sleeper_leagues.max_keepers`. Run it, then **Sync Sleeper**. Without it the Keeper Advisor still loads but every player reads "never drafted in this league". |

### Keeper rules — required for keeper costs

| # | File | What it establishes |
|---|---|---|
| 27 | `keeper_rules_schema.sql` | `keeper_rules` (season-aware keeper configuration, seeded with the commissioner's stated rules) and stable identity columns on `keepers` (`member_id`, `player_id`, snapshots, `basis_round`, `basis_season`, `keeper_year`, `calculated_round`, `round_overridden`). Without it the Keeper Advisor loads and says so; no keeper cost is shown. |
| 27a | `keeper_basis_correction.sql` | Corrects the keeper **cost basis** to `previous_season_draft_round` — a 2026 keeper is priced from the 2025 draft, not from the player's earliest DFL pick. Widens the two CHECK constraints, renames the stored values, adds `keepers.basis_round` / `basis_season`, and **reports** (never rewrites) saved rows created under the old basis. Safe to run before or after 27. |

### Front-page broadcast

| # | File | What it establishes |
|---|---|---|
| 28 | `broadcast_items_schema.sql` | Hand-written front-page slides. |
| 29 | `broadcast_items_polish.sql` | Additive follow-up to 28. |
| 30 | `broadcast_v2_schema.sql` | `members.broadcast_image` / `lookalike_image` / `chaos_image`, plus automatic-slide overrides. |

### Commissioner roles and profile locks

| # | File | What it establishes |
|---|---|---|
| 31 | `commissioner_roles_schema.sql` | `commissioner_access` (per-member PIN hash, scoped `permissions`, `is_owner`), `is_commissioner()`, `has_commissioner_permission()`, `my_commissioner_access()`, `save_commissioner()`, `disable_commissioner()`. Needs `pgcrypto`. The shared Admin password keeps working untouched — this adds a second, narrower way in, so screens can migrate one at a time. Without it Admin → Commissioner Access cannot load and only the master password grants privilege. |
| 32 | `profile_lock_schema.sql` | `profile_locks`, `profile_lock_status()`, `profile_verify_pin()`, `profile_set_pin()`, `profile_disable_pin()`, `profile_owner_reset_pin()`. Needs `pgcrypto`. A member claims their own first PIN; changing or clearing it afterwards needs the current PIN, and only a commissioner **Owner** can reset it — which is why this runs after 31. |

### Sportsbook — in this order

| # | File | What it establishes |
|---|---|---|
| 33 | `sportsbook_schema.sql` | `sportsbook_wallets` / `_ledger` / `_markets` / `_outcomes` / `_bets`, plus `sportsbook_touch_wallet()`, `sportsbook_place_bet()`, `sportsbook_create_market()`, `sportsbook_settle_market()`, `sportsbook_leaderboard()` and `public_commissioners()`. SIN is play money: 500 to start, +50 per elapsed day, catch-up capped at ten days per return. **Also defines `public_commissioners()`, which the profile commissioner badge reads** — so a database with 31 but not 33 shows no badges. |
| 34 | `sportsbook_auto_schema.sql` | `sportsbook_markets.auto_key`, `sportsbook_auto_templates`, `sportsbook_maintain_auto_board()`, `sportsbook_void_market()`. Keeps an offseason board alive **without a cron job** — every Sportsbook visit maintains it: expired auto props go `locked` and wait for a ruling, fresh League Lore chaos props refill the open slots. |
| 35 | `sportsbook_golf_schema.sql` | `sportsbook_maintain_golf_board()` and the golf pricing helpers (`_side_odds`, `_spread`, `_margin_total`, `_american`, real player names via `_golf_player_name`). Needs 33, 34 and the golf tournament tables (16). **Re-running voids and refunds open `golf:%` auto markets** so corrected lines can regenerate — that is deliberate, and it is the one file here that moves SIN. |
| 36 | `golf_bag_public_schema.sql` | `golf_bag_visibility` — opt-in public bags, default private. Needs `golf_bag_schema.sql` (20). |
| 37 | `golf_profile_schema.sql` | `golf_profiles` (handicap index, 9/18 averages, derived `rating` and its `rating_source`), `golf_save_profile()`, `sportsbook_reprice_open_golf()` and `golf_save_profile_and_reprice()`. Needs 20 and 35: saving a handicap reprices every open golf line, so it has to be installed after the lines exist. Also **replaces** several `sportsbook_golf_*` rating functions from 35 with handicap-aware versions — run 35 first, then this, or the older definitions win. |

### Arena write access for commissioners

| # | File | What it establishes |
|---|---|---|
| 38 | `arena_commissioner_policy.sql` | Commissioner-aware `"admin write"` policies on `arena_events`, `arena_participants` and `arena_results`, keyed to the **`broadcast`** permission. Needs 31. Closes a real gap: 31 rewrote the policy for seven tables and no arena table was among them, so the Admin UI offered a `broadcast` permission that granted nothing and a commissioner-PIN session could not start, pause, skip or reset a race. Skips any arena table whose own migration has not been run, and **reports** which commissioners can now run a race. `has_commissioner_permission()` still accepts legacy `is_admin()`, so the shared Admin password is unaffected. |

### Members choose their own keeper

| # | File | What it establishes |
|---|---|---|
| 39 | `keeper_self_entry_schema.sql` | `keeper_season_state` (the commissioner's per-season freeze), plus `keeper_self_status()`, `keeper_set_self()`, `keeper_clear_self()` and `keeper_set_season_lock()`. Needs 27, 27a and 26; `profile_lock_schema.sql` (32) is optional and strengthens it. **The `keepers` table policy is deliberately NOT relaxed** — every function is `security definer`, so a member can only ever write a keeper through them, with four rules applied: your own keeper, a player from your own roster last season, the season not locked, and the cost computed from `keeper_rules` + `sleeper_draft_picks` rather than accepted from the client. A member who has set a Profile PIN must present it; one who has not is trusted exactly as far as votes trust them. Also adds `keepers.self_submitted` (existing rows default to `false`, which is correct — everything already in the table was entered by a commissioner), and a member can only ever replace or remove their OWN submissions: a commissioner-entered keeper is refused with a sentence rather than deleted to make room. Ends with a readiness report. |

### Sportsbook — the daily SIN is claimed

| # | File | What it establishes |
|---|---|---|
| 40 | `sportsbook_claim_schema.sql` | `sportsbook_claim_daily()`, and `sportsbook_touch_wallet()` rewritten to **report only**. Needs 33. The allowance used to be applied by `touch_wallet()` when the page loaded, so opening the Sportsbook was indistinguishable from taking part; the credit now sits behind a button. The economy is unchanged — 500 to open, 50 per elapsed day, ten days of catch-up, and the clock still advances across every elapsed day so a long absence is not a windfall. `for update` on the wallet row makes a double tap safe. **Drops `sportsbook_touch_wallet()` before recreating it** — the new version adds two OUT parameters, and a row type defined by OUT parameters is part of the signature, so `create or replace` refuses with 42P13. Plain drop, never cascade; `sportsbook_place_bet()` calls it but PL/pgSQL resolves calls at run time, so it survives. Ends with a report of who has SIN waiting. |

### Not schema

`sql/seed_rolla_country_club.sql` is course **data**, not structure. Optional,
run whenever.

---

## Shared helpers, and where they are defined

`public.dfl_current_member()` reads the `x-member-id` request header and is
defined **identically in three files** (`arena_pick_racer_schema.sql`,
`golf_identity_schema.sql`, `side_events_member_schema.sql`). Each is a
`create or replace`, so whichever runs last wins and they agree. That is
deliberate — each file stands alone — but if the definition ever needs to
change, it has to change in all three.

`public.is_admin()` lives in `schema.sql` and nowhere else.

The newer features each read the calling member through their **own** local
copy of the same header logic rather than calling `dfl_current_member()`:
`request_member_id()` (`commissioner_roles_schema.sql`), `profile_member_id()`
(`profile_lock_schema.sql`) and `sportsbook_member_id()`
(`sportsbook_schema.sql`). Same `x-member-id` header, three more places the
definition would have to change.

---

## What the app does when a migration is missing

The app is written to survive a partial database rather than white-screen, and
these branches are **load-bearing** for anyone whose Supabase project is
behind. Do not remove them without knowing the production database has caught
up:

| Missing | What happens |
|---|---|
| `polls_schema.sql` | Polls loads, shows "Run polls_schema.sql", falls back to reading votes without `member_id`. |
| `side_events_member_schema.sql` | Side Events loads, shows "Run side_events_member_schema.sql", falls back to reading sign-ups without `member_id`. |
| `broadcast_v2_schema.sql` | Home reads `members` with `select("*")` rather than naming the image columns, so a missing column is not a 42703 that takes the front page down. |
| `presence_schema.sql` | The presence line is simply absent. `beat()` returns quietly. |
| `arena_broadcast_schema.sql` | Race control toasts "Run arena_broadcast_schema.sql". |
| `golf_matches_schema.sql` | The tournament board does not appear; the rest of golf works. |
| `sleeper_draft_schema.sql` | The Keeper Advisor loads and says draft rounds are missing, naming the file to run. |
| `keeper_rules_schema.sql` | The Keeper Advisor loads, omits the rule summary, shows every cost as "—" and names the file to run. |
| `commissioner_roles_schema.sql` | Admin → Commissioner Access shows its load error. `hasPermission()` returns false for everyone except the master password, so scoped screens fall back to master-only. |
| `profile_lock_schema.sql` | `profile_lock_status()` throws, `member-lock.js` swallows it and treats every member as unlocked. The owner reset button toasts "Run profile_lock_schema.sql in Supabase first". |
| `sportsbook_schema.sql` | The Sportsbook route loads and shows "The Sportsbook could not load" with the Postgres error. Nothing else is affected. |
| `sportsbook_auto_schema.sql` | The Sportsbook loads with whatever hand-written markets exist; the auto board simply never refills (`autoReady` false, caught and ignored). |
| `sportsbook_golf_schema.sql` | The Sportsbook loads; the golf board is absent and a single note names the failure. Non-golf markets are untouched. |
| `golf_profile_schema.sql` | Golf Bag loads without the profile form; golf lines keep their rating-only prices from 35. |
| `golf_bag_public_schema.sql` | The bag visibility toggle cannot save and says so; bags stay private, which is the safe direction. |
| `sportsbook_claim_schema.sql` | The Claim button toasts "Run sportsbook_claim_schema.sql in Supabase" and no SIN is credited at all — `touch_wallet()` from 33 still drips it automatically, so nothing is lost, but the button does nothing. |
| `keeper_self_entry_schema.sql` | The "Your keeper" card does not appear on the Keepers page at all, and the member-entry freeze is absent from Admin → Keeper rules. `keeper-self.js` treats the missing RPCs as "this league has not opted in" rather than as an error. Commissioner entry is unaffected. |
| `arena_commissioner_policy.sql` | A commissioner cannot run a race: Start / Hold / Skip / Reset are all refused. The Race View now **says so** rather than counting down locally and stopping a second later — but the shared Admin password is the only way to start a race until this is run. |
| `keeper_basis_correction.sql` | Everything still works: `js/keeper-rules.js` reads the old `original_draft_round` / `fixed_from_original` values and normalises them, so the *calculation* is already corrected in code. Only the stored wording, the two new `keepers` columns and the audit report are missing. |

Rows that a migration could not map safely are **preserved, never deleted**.
`polls_schema.sql` leaves unmatched votes with a NULL `member_id`;
`side_events_member_schema.sql` does the same and prints a report of exactly
which rows it left behind and why. Both pages display those rows under their
stored legacy name.

---

## Identity model

One sentence each, because four different things in this app could loosely be
called "who you are":

- **Member** — `members.id`. The canonical league identity. Everything that
  records participation keys on it: votes, side-event sign-ups, golf scores,
  arena racer picks, profile.
- **Golf guest** — an event-scoped pass (`golf_guest_schema.sql`). No member
  row. Never a league member.
- **Admin** — an authorisation state proved by the `x-admin-token` header. Not
  a person, and it does not imply or replace a member identity.
- **Commissioner** — a per-member privileged session proved by the
  `x-member-id` + `x-commissioner-pin` header pair, carrying a list of scoped
  permissions (or `is_owner`, which grants all of them). Unlike Admin it **is**
  attached to a person, and it drops the moment the selected member changes.
  `isAdmin()` is true for either; use `isMasterAdmin()`,
  `isCommissionerOwner()` or `hasPermission(scope)` when the difference
  matters.
- **Profile lock** — not an identity at all: an optional PIN gate in front of
  *choosing* a member. Passing it proves nothing to the database; it only
  unlocks the picker for the app session.
- **Username** — legacy compatibility only. The `users` table is write-only
  and nothing reads it; the `username` columns on `votes` and
  `side_event_signups` exist to display historical rows. Nothing new should
  depend on it.
