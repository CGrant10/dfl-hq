# DFL HQ

The headquarters and record book for a 12-team fantasy football league: every
season's standings and results, owner profiles and career records, rules,
keepers, polls, finances, the calendar and the hall of fame.

Sleeper is used as a data source — the league's seasons are imported from it to
power the history and analytics.

The production app is plain HTML, CSS and vanilla JavaScript, served directly by
GitHub Pages. TypeScript, Vite, and PixiJS tooling now support the staged Arena
renderer migration without changing the current deployment. Supabase is the
database. It installs to a phone home screen as a PWA.

---

## 1. File structure

```
dfl_hq/
├── index.html               app shell: header, page container, tab bar
├── manifest.json            name, icons, colours, shortcuts for install
├── sw.js                    service worker: offline app shell
├── version.txt              current version; drives the update button
├── schema.sql               run this once in Supabase
├── sleeper_schema.sql       Sleeper tables (additive, run once)
├── finance_schema.sql       League Finances tables (additive, run once)
├── members_schema.sql       member profiles + Sleeper hidden flag (run once)
├── rules_schema.sql         editable rule tabs (additive, run once)
├── polls_schema.sql         member-owned changeable votes (additive, run once)
├── golf_schema.sql          golf outings + one shared card per team (run once)
├── golf_courses_schema.sql  course library: pars, yardage, stroke index (run once)
├── golf_draft_schema.sql    captains drafting players into teams (run once)
├── golf_bag_schema.sql      private club distances (run once)
├── golf_matches_schema.sql  the tournament: rounds, 2v2s, singles, guests (run once)
├── README.md                this file
├── css/
│   └── style.css            the whole theme; colours live in :root at the top
├── icons/                   generated app icons
└── js/
    ├── config.js            ← YOUR SUPABASE URL + ANON KEY GO HERE
    ├── supabase.js          database client + admin client + query helpers
    ├── install.js           "Add to Home Screen" prompt (Android + iOS help)
    ├── members.js           who is using this device
    ├── teams.js             162 team colours for the personal theme
    ├── theme.js             applies a team's colours, safely, to the accent
    ├── store.js             localStorage: league name, remembered admin password
    ├── ui.js                small helpers (escaping, dates, toasts, grouping)
    ├── sections.js          field definitions for every editable table
    ├── form.js              builds a form from those fields, and reads it back
    ├── inline.js            the Add/Edit/Delete buttons admins see on the pages
    ├── crud.js              whole-table manager, used by Admin → Members / Rule tabs
    ├── sleeper.js           read-only Sleeper API wrapper + player name cache
    ├── sync.js              pulls Sleeper data into Supabase (admin only)
    ├── router.js            hash router (#/home, #/rules, …)
    ├── app.js               start-up: name prompt, admin restore, service worker
    └── pages/
        ├── home.js          dashboard
        ├── rules.js         rules by category
        ├── keepers.js       keepers by year and team
        ├── polls.js         voting + results
        ├── calendar.js      events + side events
        ├── history.js       hall of fame
        ├── finances.js      dues, payouts, expenses, summary
        ├── admin.js         password gate + the league-wide jobs only
        ├── admin_sleeper.js league ID, sync button, sync log
        └── admin_finance.js the five finance editors
```

**Where to make changes**

| I want to… | Edit |
|---|---|
| Change colours | the `:root` block at the top of `css/style.css` |
| Add a rules category | nothing to edit — **Admin → Rule tabs** |
| Add a field to an edit form | the table's `fields` array in `js/sections.js` — it appears in the inline dialog and the admin manager both |
| Put Edit buttons on new content | `editControls()` + `addControl()` + `wireInline()` from `js/inline.js` |
| Add a whole new page | add a file in `js/pages/`, register it in `routes` in `js/router.js`, add a link in `index.html` |

---

## 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard open **SQL Editor → New query**.
3. Paste in all of `schema.sql`.
4. Find this line near the bottom and put your real password in it:

   ```sql
   new_password text := 'CHANGE-ME-ADMIN-PASSWORD';   -- <<< EDIT THIS
   ```

   If you leave the placeholder, the script deliberately stops with an error
   rather than leaving a password that is published in this repo.

5. Press **Run**. It creates all the tables, the security rules, and a few
   starter league rules you can delete later.
6. Then run the additive files, each in its own new query:
   `sleeper_schema.sql`, `finance_schema.sql`, `members_schema.sql`,
   `rules_schema.sql`, `polls_schema.sql`. `polls_schema.sql` needs `members`
   to exist, so run it after `members_schema.sql`.

Re-running the whole file later is safe, and it **does** reset the admin
password to whatever is on that line.

### Where the Supabase keys go

Open **Project Settings → API** and copy two values into `js/config.js`:

```js
export const SUPABASE_URL = "https://abcdefghijkl.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJI...";
```

- The **anon / public** key is meant to be in browser code. It is fine that it
  ends up on GitHub.
- Never put the **service_role** key in this project. That one bypasses all
  security.

### How the admin password works

There is no login system and no user accounts. Instead:

- The bcrypt hash of your admin password sits in the `app_admin` table, which
  has Row Level Security on and **no policies** — so the app can never read it.
- When you sign in on the Admin page, the app sends the typed password to
  Supabase in an `x-admin-token` header on every request.
- Postgres runs `is_admin()` on each write. Every table's write policy requires
  it to return true.

So the password is never stored in your JavaScript, and hiding the admin
buttons is only cosmetic — the database itself refuses writes from anyone who
doesn't send the right password. You can change the password later from the
Admin page.

---

## 3. Test locally

You need a real web server; opening `index.html` straight off the disk breaks
JavaScript modules and service workers.

From the folder **above** `dfl_hq`:

```bash
python -m http.server 8794 --directory dfl_hq
```

Then open <http://localhost:8794>.

Tips while testing:

- If a change doesn't show up, the service worker is serving the old file.
  In Chrome: **DevTools → Application → Service Workers → Unregister**, then
  hard reload (Ctrl+Shift+R).
- To reset your league name, clear the site's localStorage, or just tap your
  name in the top-right corner and type a new one.

---

## 4. Deploy to GitHub Pages

This project lives in its own repository: **github.com/CGrant10/dfl-hq**, published
at **<https://cgrant10.github.io/dfl-hq/>**.

The contents of this folder sit at the repository root, so `index.html` is at the
top level. Everyday updates are just:

```bash
git add -A
git commit -m "What changed"
git push
```

One-time GitHub Pages setup (already done if the site loads): on GitHub go to
**Settings → Pages → Build and deployment**, set Source to *Deploy from a branch*,
Branch `main`, folder `/ (root)`, and Save. The first build takes a minute or two.

Every path in the app is relative, so serving from the `/dfl-hq/` sub-path works.

### Add it to a phone

The app shows its own prompt the first time you visit, but here is the manual
route on each platform.

**iPhone / iPad — Safari only**

1. Open <https://cgrant10.github.io/dfl-hq/> in **Safari**. Chrome and Firefox on
   iOS *cannot* install web apps; the option simply isn't there.
2. Tap the **Share** button (square with an arrow).
3. Scroll down, tap **Add to Home Screen**, then **Add**.

It opens full screen with no Safari chrome. iOS has no install API, so the app
can only show instructions — there is no one-tap install button on iPhone.

**Android — Chrome**

1. Open the site in Chrome.
2. Either tap **Install** on the app's own banner, or use **⋮ → Install app**.
3. Confirm. It lands in the app drawer like any other app.

Long-pressing the installed icon gives shortcuts straight to Finances, Polls and
History.

**Desktop — Chrome or Edge**

1. Open the site.
2. Click the **install icon** in the address bar (a monitor with a down arrow),
   or **⋮ → Cast, save and share → Install page as app**.
3. It opens in its own window with no tabs or address bar.

### Checking it really installed

- The app opens with **no browser address bar**.
- The icon is the league crest, not a screenshot of the page.
- Turn on airplane mode and reopen: the app shell still loads. Pages that need
  league data will show an error, which is expected — dues and standings live in
  Supabase and need a connection.

### Screen sizes

Verified with no horizontal page scroll on every page at 320, 390, 430, 673,
768, 1100 and 1280 px wide — that covers older iPhones through Pro Max, Galaxy
Ultra, both Z Fold screens, tablets and desktop.

Two layout behaviours worth knowing:

- **Under 900px** the navigation is a bottom tab bar (a phone pattern) and
  scrolls sideways if the screen is too narrow for all nine items.
- **900px and up** the navigation moves to a row under the header, because a
  bottom tab bar looks wrong on a large screen.
- Wide tables (dues, standings) scroll **inside their own card**. The page
  itself never scrolls sideways.
- The manifest deliberately does **not** lock orientation, so tablets, foldables
  and desktop can use landscape.

### Publishing an update

Whenever you change a file, bump the version in **all three** places. They must
match exactly or the in-app update button misfires:

1. `APP_VERSION` in `js/config.js`
2. `CACHE_NAME` in `sw.js`
3. `version.txt` at the project root

Then commit and push.

### The update button

The app compares its own `APP_VERSION` against `version.txt` on the server:

- on start-up, and again every time the app is brought back to the foreground
- when anyone taps **Check for updates** at the bottom of the dashboard

If the server is ahead, a bar appears with an **Update** button. Pressing it
unregisters the service worker, deletes every cache, and reloads with a
cache-buster — while keeping you on the page you were looking at.

`version.txt` is deliberately excluded from the service worker cache. Caching
the file whose job is to detect a stale cache would defeat the point.

---

## 4b. Sleeper integration

Sleeper is the data source behind the record book. This pulls a read-only copy
of every season the league has played so DFL HQ can show standings, career
records, owner profiles and season history. Nothing is ever written back.

### One-time setup

1. Run **`sleeper_schema.sql`** in the Supabase SQL editor. It is additive — it
   only adds new tables and will *not* reset your admin password.
2. Find your Sleeper league ID. Open the league on sleeper.app in a browser; the
   long number in the address bar is it:
   `sleeper.app/leagues/`**`1048291837465738240`**`/team`
3. In the app: **Admin → Sleeper**, paste the ID, **Save league ID**, then press
   **Sync Sleeper Data**.

Use the ID for the **current** season. Sleeper makes a new league every year and
links back to the previous one, so the sync walks that chain automatically and
picks up every past season in one go.

### What gets pulled

| Table | Contents |
|---|---|
| `sleeper_leagues` | one row per season: name, scoring settings, playoff spots, champion, runner up |
| `sleeper_users` | Sleeper user ID, username, display name, team name |
| `sleeper_rosters` | players and starting lineup, per season |
| `sleeper_standings` | wins, losses, ties, points for/against, final rank, made playoffs |
| `sleeper_matchups` | week by week: both teams, both scores, winner |
| `sleeper_transactions` | trades, waivers and free agent pickups |
| `members` | **hand written**: nickname, team name, awards, notes (see below) |

### History is never overwritten

Every table is keyed by season (and week where it matters) and written with an
upsert. Re-syncing the current season updates this year's rows and physically
cannot touch a previous year. Run the sync as often as you like.

### Where the synced data shows up

- **History → Hall of Fame** — champions and runners up per season, straight
  from the playoff brackets, plus your hand-written awards and moments.
- **History → Seasons** — final standings for any season.
- **History → All-time** — career records for every owner.
- **Profile** — one person's full record, keepers and dues.

There is no separate Owners page: per-person detail lives on profiles, and the
league-wide view lives in History.

### Notes and limits

- **Only an admin can sync.** The sync runs in your browser and writes with the
  admin client, so the same RLS rules apply — a normal visitor calling the API
  directly is refused.
- **Average finish** uses the regular-season standings order (record, then points
  for), which is Sleeper's own tiebreaker. Championships come from the actual
  playoff bracket, not from the standings.
- **Unplayed weeks are skipped**, so future weeks don't get stored as 0–0.
- **Failed waiver claims are ignored**; everything else is kept with the full
  Sleeper payload in `details`.
- **Player names** aren't in the roster data — Sleeper keeps them in a separate
  ~5MB file. The app stores player IDs and only downloads that name list if a
  screen actually needs it, then caches it for a week.

---

## 4c. League Finances

Dues, payouts, expenses and side-competition money, one season at a time.
Members can see everything; only an admin can change anything.

### Setup

Run **`finance_schema.sql`** in the Supabase SQL editor. Additive, safe to
re-run, does not touch the admin password.

### Everything is calculated, nothing is stored twice

The only numbers in the database are the raw ones you type: the buy-in, each
person's amount due and amount paid, each payout, each expense. Everything else
is worked out when the page is drawn:

| Shown | How it's worked out |
|---|---|
| Total prize pool | buy-in × number of teams in the dues table |
| Remaining balance (per team) | amount due − amount paid |
| Payment status | Paid if paid ≥ due · Partial if part-paid · Unpaid if zero |
| Outstanding | total due − total paid |
| Side competition pool | buy-in × players, unless you set an override |
| **League balance** | **collected − expenses − payouts** |

That means a stored total can never quietly disagree with the rows it came
from. Mark a payment received and every figure on the page moves with it.

The page also warns you when payouts exceed the prize pool, or when more money
has been committed than collected.

### Editing

**Admin → Finances**, then the sub-tabs:

| Sub-tab | What it edits |
|---|---|
| Buy-in | the per-team buy-in for a season, plus season notes |
| Dues | one row per team: owner, team, due, paid, date, notes |
| Payouts | any number of prize categories, with optional winner |
| Expenses | trophy, draft food, domain, whatever |
| Competitions | March Madness, survivor, golf pool — buy-in, players, pool, winner |

Every row carries a **season**, which defaults to the current year. That is what
keeps years apart — editing 2026 cannot touch 2025. To record an old year, just
type the older season number.

Dues rows can optionally be linked to a synced Sleeper account, so the name in
the finance table matches the owner profile.

### Note on side competitions

`finance_competitions` is deliberately separate from the older `side_events`
table used on the Calendar page. Calendar side events are about **who is
playing** (sign-ups); finance competitions are about **the money**. If you would
rather have one combined thing, they can be merged later.

---

## 4d. Member profiles

No accounts, no passwords. Opening the app asks **"Who are you?"** and shows the
league roster. Tapping a name remembers it on that device.

### Setup

Run **`members_schema.sql`** in the Supabase SQL editor. It:

- adds a `hidden` flag to `sleeper_users`
- creates the `members` table
- **seeds the member list from your visible Sleeper roster**, filling in joined
  year and championship counts from the seasons already synced

So after running it the picker is populated — no typing twelve names in.

If the members table is empty, the app quietly falls back to typing a free-text
name, so a fresh install is never locked out.

### Hiding people a sync drags in

A synced league usually contains people who are not current members. Deleting
them is pointless — the next sync brings them back — so every Sleeper account
carries a `hidden` flag instead.

**Anyone new that a future sync finds starts hidden.** Nothing appears in
History or in the member picker until an admin ticks them at **Admin → Sleeper →
Who shows up**. Running the schema hides `Eadycloud15` and `braves236` and leaves
your twelve current members visible.

### The profile page

Reached from the name chip in the header, or `#/profile`. It shows the
hand-written profile alongside everything else the app knows: career record,
win %, average finish, playoff appearances, titles, season-by-season history,
keepers, and dues status. There is a placeholder card for deeper Sleeper stats.

Tap any other member at the bottom to view their profile.

### Team colours

On your own profile, **App colour** lets you pick a team from the NFL, NBA, MLB,
NHL or college, and the app takes its accent colour. 162 teams are included.

Brand colours are not UI colours, so each one is corrected before use: anything
too dark to read against the near-black background is lightened **in HSL**, so
the hue survives. Blending toward white would turn Chiefs red into pink; raising
lightness keeps it red. Text drawn on the accent flips between dark and light
depending on brightness. Every one of the 162 teams was checked to clear a
readable contrast floor.

The choice is saved on the device. "Also save to my profile" stores it on the
member record too, but that is an admin-write table, so for most people the
local save is what sticks.

### Feel

- No blue tap-highlight box, no long-press text-selection callout on buttons and
  chrome; real content stays selectable.
- Pinch-to-zoom is off, so the layout does not shift under a stray thumb.
- Pages fade and slide in, cards stagger slightly behind them, and taps scale
  the thing you pressed.
- All of it is disabled automatically for anyone with "reduce motion" turned on.

---

## 4e. Rule tabs and polls

### Rule tabs are editable

Run **`rules_schema.sql`** once. The six original tabs are seeded, plus any
category your rules already use.

Then **Admin → Rule tabs** lets you add, rename and reorder them. Two columns:

- **Tab name** — what people see. Rename it freely.
- **Permanent id** — stored on every rule row. **Do not change it** once rules
  are filed under it, or those rules lose their tab.

If a tab is deleted while rules still point at it, the Rules page keeps showing
that tab anyway, derived from the rules themselves. Deleting a tab must never
make rules silently disappear. The page also works if `rules_schema.sql` has
not been run — it falls back to building tabs from the rules.

### Polls

Run **`polls_schema.sql`** once, after `schema.sql` and `members_schema.sql`.
Until you do, the Polls page opens but says voting is not switched on yet.

**Everyone** sees the whole board: the tallies, and the names under each answer.
Nothing is gated behind voting first.

**Your vote is yours.** Tapping a different answer moves you — it never adds a
second vote. `cast_vote()` deletes your old row and writes the new one in one
step. "Remove my vote" takes it back entirely. Both only work while the poll is
open.

**Admins** additionally get Add, Edit, Delete, Close/Reopen and Reset votes,
inline on the Polls page.

A vote belongs to a **member profile**, not to a typed name — whoever is picked
in "Who are you?" is who the vote is filed under.

Votes cast for an option that is later renamed or removed are **not** deleted or
hidden — they keep showing, marked *(removed)*, so a tally can never be quietly
rewritten by editing the question. Those answers are never selectable again.

**What the database enforces:** one vote per member per poll, no voting on a
closed poll, no answers that aren't on the ballot, and no writing to the votes
table except through the two functions (or as admin). What it *cannot* enforce:
that a caller really is the member they claim to be — there are no member
passwords, so identity is asserted, not proven, exactly as it already is in the
"Who are you?" picker. If that ever matters, give members a short PIN and check
it in a header the way `is_admin()` checks the admin password.

---

## 4f. Golf: the tournament

Run **`golf_matches_schema.sql`** once, after `golf_schema.sql` and
`golf_draft_schema.sql`. Until it is run the tournament board does not appear
(and an admin sees a one-line note naming the file). It is safe to re-run, and
safe to run over an earlier version of itself.

**The day.** Two captains draft twelve players into two teams of six. Those two
teams stay put all day and every point lands on one of them. The day is three
rounds of nine holes on the same nine:

| Round | Format | Points on offer |
|---|---|---|
| 1 | 2v2 — pairs in draft order | one per match |
| 2 | 2v2 — pairs can be anybody | one per match |
| 3 | Singles, built by hand | one per match |

Level is level under either scoring: a halved match is worth nothing to either
side, so a nine can finish 2–0 with one halved, or 1–1, or 0–0.

### Stroke play or match play

Each round card carries a **Stroke play / Match play** switch, independent of
the format — a 2v2 nine can be match play and a singles nine can be stroke play.

| | How a match is won | When it ends |
|---|---|---|
| **Stroke play** | fewest strokes over the nine | when both cards are full |
| **Match play** | most holes won; a big number on one hole costs no more than a small one | as soon as somebody is up by more holes than are left — **3&2** is three up with two to play |

Both are computed from the **same strokes**, so the switch can be flipped
mid-round — even after a card is finished — and nothing is edited. It re-reads
the nine. That difference is not academic: a card where somebody takes a 12 on
the first and then wins five holes is a **1 up win** under match play and a
**6-stroke loss** under stroke play.

A match-play card gains the running row a paper card has — `1UP 2UP 2UP 3UP` —
shown from the top side's point of view, with the strip header naming whose.

**The board** shows the running team total with each round's own tally beneath
it, so the nine just played stays readable after the next one starts. That is
why rounds are their own rows and matches are never rebuilt in place — round 2's
pairs are usually nothing like round 1's, and rebuilding would either delete the
previous nine's strokes or silently re-read them as the new pairing's.

**Setting the day up.**

1. Add the players and get them onto two teams — the captains draft, or the
   random/balanced generator.
2. **Add a 2v2 round**, then **Build the pairs**: each team is paired in draft
   order (the first two a captain picked go together) and pair 1 plays pair 1.
   As many matches as the smaller team can field, so 6 v 6 gives three.
3. For round 2, add another 2v2 round. Build the pairs again, or press **Add a
   match** and fill the seats in yourself — no generating required.
4. For round 3, **Add a singles round**, then **Add a match** for each 1v1 you
   want and pick the two players. Nobody is paired for you, so a round with
   fewer players in it than the others is fine.

**Moving people about.** Every seat is a picker. Choosing somebody already in
that round **swaps** the two, because a player gets one seat per round — the
database enforces it (`uq_golf_match_players_round`), not just the screen. A
player is in all three rounds, just never twice in one.

**Scoring.** Open a match and both sides are on the one card: whoever is holding
the phone writes down both numbers, which is why anyone in the match (and any
admin) can score either side. Strokes are queued on the device first and sent
when the course has signal — see `js/golf-offline.js`.

**Two rules worth knowing.**

- The point is not awarded until the match is **decided**. Under stroke play
  that means both cards are full — "one up with one to play" is not a win, and a
  card with a hole missing is not a round, so it reads "Dave & Matt: 1 to go"
  instead of declaring a winner. Under match play it can come earlier, because
  3&2 genuinely is the end of the match.
- Only holes **both** sides have posted are compared while a round is live, so a
  pair five holes in never appear to be losing by twenty to a pair one hole in.

**Rebuilding and deleting.** `golf_build_pairs` refuses to run over a round that
already has strokes rather than orphaning them — clear that round's strokes
first. **Delete round** removes a nine entirely, its matches, pairs and strokes.
Both only ever touch the round you press them on.

---

## 4g. Golf: guests, and folding cards away

**Guests.** Half a golf field is usually not in the fantasy league. In the
**Players** card, type a name and press **Add a guest**: that writes a
`golf_participants` row with `guest_name` set and no `member_id`, so the guest
exists in this event only. They never appear in the "Who are you?" picker, the
keeper tables or any member dropdown — but they can be drafted, paired, put in a
singles match and scored like anybody else.

Two consequences, both deliberate:

- A guest cannot be a **captain**, because a captain is stored as
  `golf_teams.captain_member_id`, a `members.id`.
- A guest cannot **enter their own strokes** — they have no member to select on a
  device. Anyone else in their match writes their numbers down, which is how the
  card works anyway.

`js/golf-people.js` decides what to call a player, in one place, because a guest
reading as "Unknown" on one card and by name on another is exactly the bug that
splitting the name across seven screens would produce.

**Folding cards away.** The event page is long, and most of it is setup that
becomes screen filler once the day is under way. Any card marked
`data-collapse="some-key"` grows a **Hide/Show** bar — the draft board, the
leaderboard, Teams, the team editor, Players, the generator, and each round.
The state is remembered per key per device, so a card you folded stays folded
next week, and it survives the page's own redraws. A folded card keeps its score
on the fold bar (`data-collapse-badge`), so folding a finished nine does not hide
the number you folded it to stop scrolling past. See `js/collapse.js`.

---

## 5. Day-to-day use

**Everyone**

- First open asks who you are; the choice is saved on that device. Tap the name
  in the header to change it.
- Vote in polls and change your answer whenever you like, join side events, read
  everything.

**Commissioner**

- Go to **Admin**, enter the password. From then on, **Add / Edit / Delete
  buttons appear beside the content itself** — announcements and events on Home,
  rules on Rules, polls on Polls, keepers, history entries, side events, and each
  member's own profile. There is no separate screen to walk to for routine edits.
- The **Admin** page keeps only the league-wide jobs: Members (adding people,
  ordering the picker), Rule tabs, Finances, Sleeper syncing, and the password.
- Close a poll from the poll itself — everyone can already see the results.
- Sign out from the Admin page when you're done on a shared device.

---

## 6. Database tables

| Table | Holds | Who can write |
|---|---|---|
| `users` | league names people have used | anyone can add themselves |
| `announcements` | commissioner posts | admin |
| `polls` | question, options (JSON array), active flag | admin |
| `votes` | poll_id, member_id, username, answer — one row per member per poll | members via `cast_vote()` / `clear_vote()`; admin directly |
| `rules` | category, title, content, sort order | admin |
| `keepers` | team, player, round cost, notes, year | admin |
| `events` | title, date, description | admin |
| `history` | year, category, winner, notes | admin |
| `side_events` | brackets, pick'em pools, survivor contests | admin |
| `side_event_signups` | who joined a side event | anyone can join once |
| `app_admin` | the bcrypt admin password hash | nobody via the API |
