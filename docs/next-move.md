# Useful next moves — 1.451.0

Home no longer promotes the first raw waiver suggestion. It prioritizes an
unfilled slot, an owned healthy backup, a healthy IR return, a verified lineup
upgrade, a meaningful skill-position pickup, and a verified trade target. A
routine kicker or defense tweak does not become the headline action. When no
useful upgrade exists, Home says to hold depth.

Kicker and defense pickups can only displace another kicker or defense. An
unlocked starting kicker/defense can be replaced in the same slot, including
a known bye. Injured players, reserve/taxi ownership, valuable depth and useful
healthy outlooks are protected. IR activation is presented separately from
waivers and never invents a player to cut.

Ordinary skill pickups require at least 3 projected current-week lineup points
or 4 in a future week; QB pickups require 5 in this one-QB format. Confirmed
empty-slot coverage is handled separately. Gains use a legal nine-player
lineup and exclude locked moves. Trade targets require verified ownership and
at least 3 projected points over the modeled starter; they open the existing
trade finder with that target, without claiming a fair package is guaranteed.

Advice requires current-week roster data checked within two minutes. Failed
refreshes and offline state replace named add/drop advice with a refresh
action. Sleeper roster/waiver actions use existing HTTPS routes; trade actions
open the app's target-specific trade finder. No transaction is submitted.

Validation: full release check passes (238 test files / 1,975 tests). The
isolated production Home fixture checks six advice scenarios in Light and Dark
at 320, 390 and 768px, including long names, 44px targets, no horizontal overflow,
retained link focus, refresh failures and contextual links. There are no browser
errors. Actual reviewed screenshots and the 36-state check record are in
`docs/next-move/`. Physical mobile hardware, screen-reader speech and actual
external Sleeper app handoff remain unverified. No live roster was changed.
