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
├── manifest.webmanifest     name, icons, colours for "Add to Home Screen"
├── sw.js                    service worker: offline app shell
├── schema.sql               run this once in Supabase
├── README.md                this file
├── css/
│   └── style.css            the whole theme; colours live in :root at the top
├── icons/                   generated app icons
└── js/
    ├── config.js            ← YOUR SUPABASE URL + ANON KEY GO HERE
    ├── supabase.js          database client + admin client + query helpers
    ├── store.js             localStorage: league name, remembered admin password
    ├── ui.js                small helpers (escaping, dates, toasts, grouping)
    ├── crud.js              reusable "manage a table" widget for the Admin page
    ├── router.js            hash router (#/home, #/rules, …)
    ├── app.js               start-up: name prompt, admin restore, service worker
    └── pages/
        ├── home.js          dashboard
        ├── rules.js         rules by category
        ├── keepers.js       keepers by year and team
        ├── polls.js         voting + results
        ├── calendar.js      events + side events
        ├── history.js       hall of fame
        └── admin.js         password gate + all the editors
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
4. Find this line near the bottom and change the password:

   ```sql
   values (1, extensions.crypt('CHANGE-ME-ADMIN-PASSWORD', extensions.gen_salt('bf')))
   ```

5. Press **Run**. It creates all the tables, the security rules, and a few
   starter league rules you can delete later.

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

- **iPhone:** open the site in Safari → Share → *Add to Home Screen*.
- **Android:** open in Chrome → menu → *Install app* / *Add to Home screen*.

### Publishing an update

Whenever you change a file, bump the version in **two** places so phones pick
it up instead of serving the cached copy:

1. `APP_VERSION` in `js/config.js`
2. `CACHE_NAME` in `sw.js`

Then commit and push. The new service worker installs on next open, clears the
old cache, and the app refreshes with the new files.

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
