# Startup bundles and scrolling trade alert — 1.421.0

Home keeps the full breaking alert at the top. Once it scrolls behind the header, a 44px bar keeps the teams, balance and exact receipt link available. The existing compact scoreboard sits below it. Returning to the top, dismissing the alert, opening More/a dialog or leaving Home removes the compact copy. It respects reduced motion and mobile safe areas. Commissioner actions remain on the full alert with their existing permission checks.

## Production JavaScript

`pnpm build` still generates shared CSS, the trade worker and the Arena runtime, then builds the complete app graph with `vite.app.config.js`. The Vite development server still serves authored modules for live editing; static previews use the committed production bundles after `pnpm build`. Source modules also remain available to the existing isolated browser fixtures. Production boots `js/bundle/<release>/app.js`; pages use the same bundled state rather than importing a second raw SDK/member/router graph.

The initial static graph consists of three local modules, and Home's static graph consists of four. Optional controls and subsequent pages load separately. The external Supabase SDK remains pinned to the existing CDN version. These graph counts do not include SDK modules, CSS, images, API calls or service-worker installation traffic and are not a phone-speed multiplier.

Asset URLs continue to point at the existing images, fonts, player-value snapshot and standalone trade worker. Golf enhancements use explicit lazy imports. Legacy Arena branches also have explicit imports so they survive bundling. Page entries retain stable names within the versioned directory, allowing interrupted imports to Retry with a fresh query while retaining the shared app state.

## Offline/update coherence

- A release has its own immutable bundle directory. The builder retains one previous release for tabs finishing an update.
- The worker imports that release's generated precache manifest. A mismatched/empty manifest or missing/invalid compiled script rejects installation before activation.
- The effective precache contains the compiled graph, static assets, existing SDK dependencies and the standalone trade worker. It omits the duplicate raw app graph.
- The existing document/worker release handshake still runs before app imports. Update refetches avoid downloading unused raw pages.
- Offline bundle availability does not make live league reads available offline. The existing Offline/Retry behavior still applies when a connection is required.

`tools/check-app-bundle.mjs` parses the emitted graph, checks every import, retryable page entry and cached module, verifies release paths and enforces startup module budgets. CI rebuilds the committed output and rejects drift or untracked generated chunks. The existing source-name/export checks continue to cover authored files; generated bundles have their own graph/build checks.

## Validation

The full suite passes 1,778 tests. Worker tests cover incomplete/mismatched manifests, invalid script responses and offline Retry URLs. The compact-alert browser fixture covers phone/desktop sizing, score-dock stacking, overlays, exact receipt navigation, dismissal, reduced motion and teardown. Live-data browsing and real old-worker upgrade/offline checks are recorded in the session QA artifacts.

Keeper call badges also use theme-aware text on a neutral fill, replacing the hard-to-read text over a saturated gradient.
