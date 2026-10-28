# Player-card reading and continuity — 1.507.0

The shared card now puts the selected game's short stat line beside a separate
season PPR reference, with Compare and Watch before the game history. Secondary
links remain available under “More player tools.” Existing game scrubbing,
expandable box scores, sharing, score effects and links are retained.

## Reading and data

- The headline line follows the selected week, including real zeroes and combined
  rushing/receiving touchdowns. It never invents unavailable box-score fields.
- Season PPR/g uses reported PPR totals divided by actual appearances. A missing
  total or zero appearances leaves the reference hidden. Historical cards do not
  receive today's season total.
- Season totals use the existing shared cache and load outside the critical
  player-detail request. A late result patches only the average, preserving the
  primary controls, visible scroll position and reserved layout space. Old member,
  player or opening responses cannot update a successor card.
- Source context remains in the header; complete player and owner names wrap.
  Theme tokens, restrained outlines and root-relative text match the other desks.

## Motion and return

- Stable viewport-bounded sheet geometry and a top-aligned portrait keep data
  arrival out of the photo's path. The existing portrait-first entrance and quiet
  connected return remain intact.
- A delayed headshot fades into the travelling portrait over the initials. Failed
  or cancelled image work cannot leave a layer behind or reopen the card.
- More tools use the shared finite, reversible native disclosure controller.
  A new opening resets tools and game selection to their defaults.
- Focus return can find the original trade offer after its DOM refreshes, rather
  than another occurrence of the same player. Ordinary close, pull-to-dismiss,
  reduced motion and Motion off keep their existing behavior.

## Validation

- `pnpm check`: 2,358 tests / 287 files; themes, release markers, typecheck, names
  and production build. Bundle remains 90 modules, three startup / four Home.
- Player finish review: 43 checks in Light/Dark at 320/390/600px, including delayed
  averages and images, cancelled late photos, old responses, 200% root text,
  expandable tools, warm opening resets and exact refreshed-offer focus return.
- Player game review: 84 checks, including actual touch scrubbing, vertical scroll,
  selected-game headlines, live updates, primary actions, PPR reference, stat
  expansion, sharing, missing data and motion preferences.
- Existing portrait motion review: 37 checks for portrait-first sequencing,
  stationary arrival, early close, cached reopening, resize, scroll resets and
  motion preferences. Shared sheet review: 87 checks including connected returns,
  real drags, keyboard viewport changes, stale previews, failures and retry.

Browser fixtures use the production card/controllers with backend writes blocked.
Test photos are stand-ins. Physical iPhone frame pacing, VoiceOver and Android
TalkBack were not measured here.

## Inspected mobile screenshots

- [320px Light](player-card-polish-1507/light-320.png) · [Dark](player-card-polish-1507/dark-320.png)
- [390px Light](player-card-polish-1507/light-390.png) · [Dark](player-card-polish-1507/dark-390.png)
