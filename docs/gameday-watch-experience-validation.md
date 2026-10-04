# GameDay Watch experience — 1.291.0

Home gains a compact Watch action and subtle matchup lighting using each team's
existing identity accent. Watch opens a full-screen native dialog with large
actual scores, both ordered starting lineups, expandable benches, player photos,
and the existing WebGL fire and frost surfaces. Phone rosters stack; desktop
rosters sit beside one another. Scores continue using Home's existing visible
60-second refresh, including manual Refresh inside Watch.

Each matchup has a brief Web Animations entrance with portraits, the recorded
series, and deterministic DFL banter. Enter matchup proceeds to the trackers;
the entrance is remembered for the browser session and replayed with Intro.
Reduced motion and Motion off cancel entrance and score feedback; there is no
automatic carousel or blocking intro timeout. Close/Escape restores the Watch
button's focus. Player spotlights retain their own native modal and GPU surface.

Matchup reactions (Choke, Cooking, Fraud watch, Respect) are shared through
`gameday_reactions`, scoped by league, season, week, and matchup. Counts reload
every 20 seconds while Watch is open and the document is visible. Clicking
again removes that member's reaction. A composite primary key prevents duplicate
votes. Policies match the existing Wall selected-member identity; an insert must
match the request member and an actually synced fixture. Clients receive only
select/insert/delete grants. Writes request returned rows so refusals cannot
silently appear saved. No notifications or Wall posts are generated.

The DFL reel combines up to two current player performances with actual archived
scoring highs, closest wins, largest blowouts, and highest-scoring losses.
Current/future fixtures and missing scores are excluded from archived claims;
unplayed 0–0 fixtures and ties are excluded from win/loss records. Historical
scores retain their recorded season/week; identity names follow current member
names. Buttons, arrow keys, or horizontal swipes move between cards. Reel opens
the section directly; no new feed is added to Home. Successful lead changes
briefly display New lead and a Web Animations accent ring, without moving score
glyphs or changing the existing hot/cold eligibility rules.

## Verification

- `pnpm check`: TypeScript, identifier checks, 1,039 tests across 117 files, and
  the production build passed. Five new tests cover truthful entrance history,
  record margins, ties, missing/future fixtures, and isolated reaction scopes.
- Python Playwright/Chromium with external writes blocked tested native modal
  entry/exit, no keyboard autofocus, exact QB/RB/RB/WR/WR/TE/Flex/Kicker/Def order,
  both rosters/benches, photos, nested spotlight isolation, selected-matchup
  retention on refresh, focus restoration, reaction toggling and refused saves,
  reel navigation, session intro memory, replay, and reduced-motion cancellation.
- axe WCAG A/AA checks passed at 320, 390, and 1280 pixels in light/dark mode and
  with 200% root font sizing. The Watch dialog has no horizontal overflow.
- Read-only NFL/Sleeper fixtures exercised actual Home→Watch refreshes with hot
  and post-halftime cold players, WebGL running/pause/resume, a +6-point change,
  lead reversal, unchanged refresh with no repeated delta, and a cold spotlight.
  Route teardown removed Watch and all score surfaces.
- Supabase transaction tests under the actual `anon` role confirmed own
  insert/read/delete; other-member insert/delete, guest writes, unknown fixture,
  and duplicate rejection; and no update grant. All test data was rolled back.
  Security advisors reported no findings for the new reaction table.

Browser evidence and scripts live in `/workspace/dfl-audit`:
`watch-experience-browser.py`, `watch-experience-browser.log`,
`watch-entrance-mobile.png`, `watch-{320,390,1280}-{light,dark}.png`,
`watch-highlight-reel.png`, and `watch-fire-lead-fixture.png`.
