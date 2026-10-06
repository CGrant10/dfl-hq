# Home layout stability — v1.302.0

The navigation now has a 48px content row (49px including its border), down from 67px, with readable labels, 20px icons, and at least 44px touch targets. Safe-area padding remains included in the measured height and the ticker follows it.

Editorial broadcast stages measure the entire deck at its rendered width and reserve the tallest card's height. The measurement is cached until the width, deck, minimum height, or loaded fonts change. Rotation does not move the GameDay section. Hidden measurement markup is inert, excluded from screen readers, and removed immediately.

The Wall follows More from the league as the final content section, before the app identity and update footer. Its existing deferred loading remains in place.

Validation: pnpm check passed (1,095 tests across 123 files, typecheck, name scan, and production build). Chromium passed all 48 slide layouts across 320/390/768/1280px, asserting constant stage height and GameDay position for every card, content fit, 24 route-state navigation checks, compact navigation and touch targets, final Wall placement, safe-area alignment, and zero page errors. This uses production components with deterministic fixture data, not authenticated live requests.

## Previous cleanup — v1.301.0

Final result: passed in the production-component review.

## Requested refinement

The user asked to clean up text links, make the anniversary banner fit across the screen, and reduce the boxed appearance. This is a scoped refinement of the existing Home screen.

- The native banner fills the Home content width at its original 3:1 ratio, without cropping or a desktop height cap.
- Clubhouse uses a short label in a rounded button with ordinary UI type.
- GameDay, player leaders, league history, and the Wall use compact section controls with accessible names.
- Archive facts and rivalry receipts are full-row links on the page surface, with subtle separators and chevrons. The redundant three-link footer is removed.
- The outer desktop frame, gold section rules, and outlined story cards are removed. Scores, player temperature effects, shared navigation, historical content, and carousel behavior remain.
- The populated Wall preview retains its existing post destinations and uses a shorter Replies label.

## Captured evidence

Before: `/workspace/dfl-ui-before/`. After: `/workspace/dfl-ui-final/`.

Inspected final captures include `home-390.png`, `home-390-full.png`, `home-390-stories.png`, `home-320.png`, `home-1280.png`, player-scroll captures, and broadcast slides. The final desktop capture shows the removed outer frame and full 900px artwork; phones use their full 320px and 390px widths.

The full-width banner is 130px high at 390px. The page now scrolls naturally rather than requiring all four players to fit in the first screen. Browser checks scroll the last row into view and confirm it clears both the fixed header and ticker at 320px and 390px.

Local portrait requests can fall back when the browser cannot reach the external CDN; the production renderer and URLs are unchanged. The fixture uses deterministic league data and does not write to live data. Authenticated live requests, destination-page content, and populated Wall interactions are outside its scope.

## Verification

- TypeScript, unresolved-name scan, 1,095 tests across 123 files, and production build passed.
- Chromium review passed twelve slides across eight treatments and four widths: 48 layouts.
- Full-width native-ratio banner checks passed on phone and desktop.
- Story rows are borderless, transparent, and free of underlined text.
- Section controls have accessible names and targets at least 44px square; keyboard navigation reveals a visible focus outline.
- The shared navigation remains identical across 24 route-state comparisons.
- Phone inset changes still align the ticker with the navigation.
- Carousel navigation and pause, loaded Anton type, 3× effects, reduced motion, no horizontal overflow, and zero page errors passed.

Strict player temperature thresholds and neutral team totals retain their existing behavior. No unresolved issues remain in the reviewed fixture states.
