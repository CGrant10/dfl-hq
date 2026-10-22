# Portrait-first player cards — 1.468.0

The selected player's photo travels first, before the panel is visible. Once it
lands, the panel expands from that portrait while the photo stays in place.
Details fetch concurrently: a matching cached card remains available during
revalidation, and a first visit uses the original photo in the loading layout.
A slow request does not delay the photo or cause a second flight when data arrives.

The sequence uses one 280ms portrait movement followed by a 240ms panel reveal.
Source and destination controls keep their layout. One frame lets native focus
and scroll events settle before movement starts. Closing mid-flight returns from
the visible photo, including before the panel opens. Native close events from an
older opening cannot cancel a newly opened card. Reduced motion and motion-off
use the static card; resize interrupts into a usable static view.

Verified at 320/390px in Medicine Wheel Light/Dark using the production player-card
controller and a loaded local headshot fixture. Checks cover the strict photo /
panel ordering with held data, stationary photo through expansion and data arrival,
mask and visibility cleanup, dismissal before arrival, viewport interruption,
immediate reopening, reopening scrolled stats, reduced motion and motion-off.
The existing mobile sheet review also exercises drag, reverse travel, refresh
failure/retry, cached content and member changes. No league data or wagers were
written. `pnpm check` passed 2,043 tests plus release/theme/type/name checks and
production build; type/name and build checks were repeated after the timing fix.

Screens inspected: [photo first in Light](player-card-motion-1468/portrait-first-light-390.png),
[photo first in Dark](player-card-motion-1468/portrait-first-dark-390.png),
[panel expanding](player-card-motion-1468/panel-expand-dark-390.png),
[complete Light card](player-card-motion-1468/portrait-open-light-390.png) and
[complete Dark card](player-card-motion-1468/portrait-open-dark-390.png).
[Browser ordering checks](player-card-motion-1468/player-card-motion-checks.json)
are retained. Real iPhone/Safari frame pacing and low-power/high-refresh devices
remain unverified. Colors, advice, scoring and player-card actions are unchanged.
