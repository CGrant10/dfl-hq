# Trade Intentions portraits — 1.460.0

The dialog is appended to `body`, outside the main `.view`. Shared portrait
styles were scoped to that main view, leaving the intentions sheet with only a
34×40px wrapper and unconstrained images. A reproduced 350×254px loaded image
spilled across subsequent rows; its fallback initials also remained visible.

The intentions sheet now defines its portrait container, image fit/clipping and
centered fallback explicitly. Row sizes and trading controls stay unchanged.
Colors use existing theme tokens. Successful loads hide initials; failed loads
retain the fallback. No player IDs, picture URLs or trade data were changed.

The production-controller browser review now supplies a recorded, oversized
Sleeper thumbnail rather than blocking every portrait request. One deliberate
404 exercises the real missing-photo path. It checks loaded image containment,
initials, read-only manager portraits, phone edges and existing save/PIN/conflict,
focus and motion behavior at 320/390/768px in both themes. The recorded PNG comes
from https://sleepercdn.com/content/nfl/players/thumb/6794.jpg and is reused as a
size fixture; it does not represent each named player's identity in screenshots.

Inspected actual Light/Dark captures at 320px and 390px in
[trade-intentions-portraits](trade-intentions-portraits/). Physical iOS/Android
rendering and native select menus were not separately measured.

`pnpm check` passes all 2,017 tests and verifies the generated release bundles.
The retained 1.459.0 bundle is unchanged. The browser checks are also part of the
Trade intentions GitHub workflow, including changes to the portrait fixture.
