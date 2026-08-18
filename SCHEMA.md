# DFL HQ — the database baseline

**What a correct current DFL HQ database looks like, and the order to build
one in.** This exists because the repository has 29 `.sql` files (one base plus 28 additive) and the
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

### Front-page broadcast

| # | File | What it establishes |
|---|---|---|
| 27 | `broadcast_items_schema.sql` | Hand-written front-page slides. |
| 28 | `broadcast_items_polish.sql` | Additive follow-up to 27. |
| 29 | `broadcast_v2_schema.sql` | `members.broadcast_image` / `lookalike_image` / `chaos_image`, plus automatic-slide overrides. |

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
- **Username** — legacy compatibility only. The `users` table is write-only
  and nothing reads it; the `username` columns on `votes` and
  `side_event_signups` exist to display historical rows. Nothing new should
  depend on it.
