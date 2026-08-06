# DFL HQ

League headquarters for a 12-team fantasy football league. Sleeper still runs
scoring, rosters and matchups — this app holds the rules, announcements, polls,
keepers, calendar, history and side events.

Plain HTML, CSS and vanilla JavaScript. No build step, no npm, no framework.
Supabase is the database. It installs to a phone home screen as a PWA.

---

## 1. File structure

```
dfl_hq/
├── index.html               app shell: header, page container, tab bar
├── manifest.json            name, icons, colours, shortcuts for install
├── sw.js                    service worker: offline app shell
├── schema.sql               run this once in Supabase
├── sleeper_schema.sql       Sleeper tables (additive, run once)
├── finance_schema.sql       League Finances tables (additive, run once)
├── members_schema.sql       member profiles + Sleeper hidden flag (run once)
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
    ├── crud.js              reusable "manage a table" widget for the Admin page
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
        ├── owners.js        career profiles (Sleeper + hand written)
        ├── finances.js      dues, payouts, expenses, summary
        ├── admin.js         password gate + all the editors
        ├── admin_sleeper.js league ID, sync button, sync log
        └── admin_finance.js the five finance editors
```

**Where to make changes**

| I want to… | Edit |
|---|---|
| Change colours | the `:root` block at the top of `css/style.css` |
| Add a rules category | `CATEGORIES` in `js/pages/rules.js` (the Admin dropdown follows it) |
| Add a field to an admin form | the section's `fields` array in `js/pages/admin.js` |
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
Owners.

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

Whenever you change a file, bump the version in **two** places so phones pick
it up instead of serving the cached copy:

1. `APP_VERSION` in `js/config.js`
2. `CACHE_NAME` in `sw.js`

Then commit and push. The new service worker installs on next open, clears the
old cache, and the app refreshes with the new files.

---

## 4b. Sleeper integration

DFL HQ does **not** replace Sleeper. Sleeper still runs scoring, rosters and
matchups. This pulls a read-only copy of the league's numbers so the app can
show career records, owner profiles and season history.

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
| `owner_profiles` | **hand written**: nickname, team name, league notes |

### History is never overwritten

Every table is keyed by season (and week where it matters) and written with an
upsert. Re-syncing the current season updates this year's rows and physically
cannot touch a previous year. Run the sync as often as you like.

### Owner profiles

The **Owners** page merges the two halves:

- from Sleeper — career record, win %, total points, average finish, playoff
  appearances, championships
- from `owner_profiles` — nickname, team name, and whatever notes you write

Edit the hand-written half at **Admin → Owners**. The Sleeper account dropdown
fills itself from whoever has been synced, so run a sync first.

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

**Anyone new that a future sync finds starts hidden.** Nothing appears on Owners
or in the member picker until an admin ticks them at **Admin → Sleeper → Who
shows up**. Running the schema hides `Eadycloud15` and `braves236` and leaves
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

## 5. Day-to-day use

**Everyone**

- First open asks for a league name; it's saved on that device. Tap the name in
  the header to change it.
- Vote in polls (one vote per name per poll), join side events, read everything.

**Commissioner**

- Go to **Admin**, enter the password, and use the tabs to add or edit
  announcements, polls, rules, keepers, events, history and side events.
- Close a poll by unticking "Poll is open for voting" — everyone can then see
  the results.
- Sign out from the Admin page when you're done on a shared device.

---

## 6. Database tables

| Table | Holds | Who can write |
|---|---|---|
| `users` | league names people have used | anyone can add themselves |
| `announcements` | commissioner posts | admin |
| `polls` | question, options (JSON array), active flag | admin |
| `votes` | poll_id, username, answer — one row per person per poll | anyone can vote once |
| `rules` | category, title, content, sort order | admin |
| `keepers` | team, player, round cost, notes, year | admin |
| `events` | title, date, description | admin |
| `history` | year, category, winner, notes | admin |
| `side_events` | brackets, pick'em pools, survivor contests | admin |
| `side_event_signups` | who joined a side event | anyone can join once |
| `app_admin` | the bcrypt admin password hash | nobody via the API |
