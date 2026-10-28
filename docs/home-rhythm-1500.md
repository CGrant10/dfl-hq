# Home rhythm and factual league banter — 1.500.0

Home chooses its section priority from NFL event states when the first usable
weekly model arrives. Planning leads before kickoff; highlights lead while games
are live, between games, or awaiting confirmed final results. Confirmed receipts
lead after the week. If Sleeper has advanced to the next week, the completed-week
receipts remain first until the next scheduled NFL kickoff is within 24 hours.
Missing schedule data keeps the ordinary order rather than guessing a weekday.

The choice is fixed for the visit. Pointer/keyboard interaction, existing scroll
or focused content prevents late data from rearranging the page. The forecast
and recap controller receives the same frozen phase. Scores, clips and current
advice still refresh. The personal matchup stays first, the daily broadcast
opener stays independent, and the Wall remains last after the archive.

One supporting broadcast story can now use an actual offensive bench player
with at least 25 final points, a confirmed close loss, a confirmed blowout, or
an existing historically verified streak/rivalry story. Only QB/RB/WR/TE players with a completed NFL game qualify; defenders and
kickers never qualify. Bench points are not claimed to have changed a win.
Personal final-score repeats are excluded. Current live samples must be fresh;
missing totals, forecasts, ties and offline/error snapshots never become final
losses. Previous-week stories retain their date and retire when the next slate
has started. Current names and real scores remain attached to the matchup link.

The existing compact wide-card renderer presents these stories. One story is
selected per visit, at most three are featured per Chicago day, with a 20-hour
per-event cooldown in league-scoped local storage. Background refresh preserves
that selection; a corrected/retired fact is removed rather than replaced by a new
roast. Blocked storage falls back safely to deterministic selection. Cooldowns
record selection, not proof that someone read a slide. Sparse data leaves the
ordinary daily/league/archive broadcast in place. No new backend requests,
notification sends, subscriptions or production fixture data are introduced.

Validation includes pure phase/fact/cooldown tests, the production release/theme/
TypeScript/names/test/build checks, and real Chromium rendering at 320/390/768 in
Medicine Wheel Light/Dark. The browser harness exercises all three entry phases,
late pointer/scroll/focus guards, stable section order and scroll during refresh,
bench/close/blowout card composition, and keeping the independent first slide.
The screenshots use isolated sample football data and an illustrative local
highlight poster; they do not create league records or play external videos.
Physical iOS frame pacing and assistive-technology behavior are not established
by these checks. Existing reduced-motion and score/clip behavior stays in force.

The long-name mobile review also tightened result-card gaps and vertical padding
at widths up to 380px, with 13px team labels. Exact scores and the complete team
names remain; the card action stays inside the widescreen surface. This uses
existing theme tokens and leaves the card height unchanged.

Completed verification: 2,312 tests across 280 files passed with TypeScript,
release, names, theme and production build checks. Chromium passed 18 phase/theme/
width cases plus three late-data guards, all generated event layouts, and the
existing 90-layout broadcast suite including one-pass/replay/reduced motion.
Read-only real-data Home rendering with the candidate assets passed in both
Medicine Wheel themes, with three 269px-wide-format slides and no page errors or
horizontal overflow. The existing startup/Home module budgets remain 3/4.
