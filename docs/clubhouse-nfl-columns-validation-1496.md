# Clubhouse NFL viewing and stat columns — 1.496.0

Play-by-play and Fantasy stats are now explicit shortcuts beneath the Clubhouse
heading. They activate the NFL tab, choose the requested view and scroll to the
content, with reduced-motion and keyboard support. Season/week selection and
Archive share a compact row. Shorter Clips, NFL live and Awards labels preserve
the existing six tab keys, URLs, saved choices and native horizontal navigation.

NFL fantasy stats now have two simultaneous team columns, away left and home
right. Headers show official NFL team identity and game scores; players retain
their existing recorded fantasy points, scoring label, owner and NFL stat line.
Unknown totals remain unknown. The grouping rejects invalid/duplicate sides and
foreign-team rows, preserves the source player order and never sums fantasy
points into an NFL score. The replay viewer uses the same presentation. The mode
switch is more prominent, and duplicate game scores are hidden in the stats view.

Validation: 2,260 tests in 273 files and full release/theme/type/name/build checks
pass. The Clubhouse browser matrix passes 200 checks at 320/390 Light/Dark,
including shortcut routing, two-column geometry, player/team membership, bounds,
contrast, touch targets and replay/video preservation. The live-feed controller's
38 checks pass, covering automatic next plays, stats updates, reader anchoring,
Latest action, offline/visibility recovery and final plays. Mobile entry, paired
stats and replay screenshots were inspected in both themes.

No backend functions, league records, notification preferences or pushes were
changed. Physical iOS and assistive-technology behavior remain unverified.


### 1.496.1 follow-up

A read-only public-data check caught the initial shortcut scrolling before the
async NFL panel had enough content to reach its destination. The game center now
exposes its initial load completion; shortcuts wait for it and cancel their
pending scroll if the user interacts, changes views or leaves Clubhouse. The
mobile browser matrix adds a loaded-heading viewport assertion in all four
phone/theme combinations (204 checks passed); all 38 live-feed checks also pass.
Release/theme/name/type/build checks passed. Both-theme screenshots were inspected.
No live league records are changed.


### 1.496.2 sticky-header clearance

The real-data screenshot exposed the compact Clubhouse bar covering a few pixels
of the NFL title. The panel scroll margin now reuses the shared measured compact
header position and height. A real-data browser probe using the local production
assets passes a stronger assertion: the title clears the visible sticky bar by
at least 8px. NE/CHI shows 20 players and 180 plays with correct columns, team
membership and game selection. The mobile Light/Dark matrix is repeated before
merging; the published build is checked after deployment.
