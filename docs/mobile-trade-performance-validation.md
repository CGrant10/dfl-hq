# Mobile responsiveness and shared styles — 1.376.0

## Background offer searches

The Trade Board previously called the offer model synchronously while building its page. A profile attributed about 575 ms to `suggestTrades`. Searches now run in a classic web worker, compiled from the same model and query adapter. Classic workers avoid requiring module-worker support on older mobile browsers.

A worker receives the current player/roster snapshot once and handles ordinary, anchored, league-wide and multi-team queries. Changing an uncached query terminates the outdated computation. Completed queries reuse the worker; results are cached for up to twelve queries per mounted page. Navigation and manual mode cancel pending searches. Timeouts, worker errors and malformed messages expose a retry state rather than a false “no offers” result. There is no synchronous fallback.

The setup remains usable while searching. Async completion replaces only the offers region, preserving an open player picker, its search text and focus. During the existing intent-highlight transition, old offers become inert so they cannot be loaded under the new selected intent.

## Mobile polish

- Decorative edge chevrons identify overflowing tab strips and Analyzer jump links. They disappear at the scroll limits, stay out of the accessibility tree and cannot intercept touch events. Keyboard focus scrolls an offscreen tab into view. The moving tab highlight remains unchanged.
- Wall titles and achievements retain member-color tint while mixing toward the theme's readable text color. Small labels have full opacity and wrap at narrow widths and larger text sizes. Championship and NFL badges retain their existing special treatments.

## Shared CSS

Thirty contiguous shared stylesheets become one `css/app-shared.css` request, preserving source order and relative asset paths. The original source sheets remain editable and are listed in `css/shared-styles.json`. Core and route-specific sheet anchors remain separate, including their cascade positions. Bundle metadata lets lazy callers reuse an included source sheet; the neutral-navigation marker remains present.

`pnpm build` generates the shared sheet and worker bundle before building Arena. Both generated artifacts are committed. CI rejects stale generated output and runs Home visual checks when the shared bundle changes. The service worker caches the consolidated sheet and worker rather than downloading the thirty source sheets too.

This removes 29 shell stylesheet requests. Separate gzip sizes total 88,009 bytes; the consolidated sheet was 68,364 bytes in the initial measurement (about 22% less). That is a local gzip comparison, not a claim about every network or compression configuration.

## Validation

- `pnpm check`: 1,527 tests in 180 files, type/name checks and production builds passed. Four new worker-client tests cover reuse, cancellation, late responses, retry, timeout and disposal; one loader test covers bundled-source reuse.
- Existing Trade browser review at 320/390/768 px passed, including routing to recipients, retained five-player anchors, counteroffers, stale-ownership rejection and injury review before sharing.
- Eight worker/model parity queries cover all three intents, league-wide search, anchors, more than four required players and multi-team queries.
- Nine source/bundle style comparisons cover 320/390/768 px and light/dark/medicine themes. Computed typography, colors and layout match.
- Browser tests confirm that delayed results preserve a typed/open picker, and worker failure/retry preserves the package.
- Eight actual-data pages captured at 320/390 px: no page-wide overflow or runtime exceptions.
- Scroll cues appear, follow keyboard focus, hide when unnecessary and dispose their observers/styles. Wall labels clear 4.5:1 against the sampled backgrounds for five extreme accent colors across seven themes; all seven themes fit at 100% and 200% root text size.
- Actual 12-team data, 159-player pool, same 96 returned offers: with Chrome renderer CPU throttling at 4×, the synchronous reference caused a 2,023 ms maximum timer gap; the worker path's maximum gap was 46 ms. This demonstrates renderer responsiveness. Worker elapsed time is not an apples-to-apples algorithm-speed comparison under renderer throttling.

Scripts, screenshots and raw reports: `/workspace/dfl-mobile-1376/`. Chromium emulation does not establish physical-device or Safari behavior.
