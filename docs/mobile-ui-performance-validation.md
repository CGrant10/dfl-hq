# Mobile UI and broadcast performance — 1.375.0

The review captured Home, Clubhouse, Trade Board, Analyzer, Sportsbook, Wall, History and Notifications using current league data at 390 px and 320 px. Every route fit the viewport without runtime exceptions. Home broadcast and injury-report detail were captured separately.

## Changes

- Keep the watchlist title and Refresh action in the same header row, with a 44 px tap target. It previously inherited a full-width title row from the lineup summary.
- Keep Clubhouse refresh and motion controls together at widths up to 360 px, below the freshness indicator.
- Reflow the Analyzer lineup verdict and projected score into separate rows when the panel is narrow relative to the user's text size. Normal mobile sizing remains side by side.
- Reuse a versioned stylesheet already in the shell when a lazy caller requests its plain path. Preserve stylesheet order, origin and meaningful query parameters, and share pending loads. This removes the second watchlist stylesheet.
- Insert all hidden broadcast sizing candidates together, then measure them, avoiding a DOM replacement and forced layout for each card. The previous and batched measurements produce identical reserved heights for the actual 11-slide deck at 320, 390 and 768 px under the same layout conditions.
- Pause autoplay and live polling when the broadcast leaves the viewport or the document is hidden. Preserve explicit pauses. Serialize slow refreshes and ignore responses after the stage is stopped. Browsers without IntersectionObserver retain the existing behavior.

## Validation

- `pnpm check`: 1,522 tests across 179 files, identifier check, TypeScript and build passed. Three new loader tests cover versioned reuse, shared pending loads, different origins, meaningful parameters, insertion order and load failure.
- Fifteen browser lifecycle checks: offscreen/visible rotation and polling, overlap prevention, manual pause, tab visibility, disposal, late responses and the older-browser fallback.
- Twenty-four UI combinations: Analyzer and Clubhouse at 320/390/768 px, light/dark themes, and 100%/200% root text size. No horizontal overflow, header clipping or overlapping lineup verdict/score; relevant buttons remain at least 44 px high. Exactly one watchlist stylesheet.
- Screenshot review checks the mobile layouts and readable injury-slide text/player portraits. Measurements compare layout work only; they are not whole-app startup or network-speed claims.

The controlled browser comparison used the same deck, styles and width, alternating the old and batched procedures. Median measurement time over five warmed samples:

| Viewport | Previous | Batched |
| --- | ---: | ---: |
| 320 px | 82.1 ms | 32.7 ms |
| 390 px | 56.1 ms | 21.4 ms |
| 768 px | 36.5 ms | 12.1 ms |

Artifacts, screenshots and scripts: `/workspace/dfl-ui-performance-1375/`.

## Follow-up suggestions

1. Offer generation runs synchronously on the Trade Board. The audit saw a roughly 624 ms long task around that navigation; profile that computation directly, then move expensive searches into a worker if it is the cause.
2. History's final tab and some Analyzer jump links need sideways scrolling at 320 px. A subtle scroll cue would make them easier to discover.
3. The app has accumulated more than forty shell/shared stylesheets. Consolidate them with screenshot comparisons across themes to reduce request and CSS maintenance overhead.

The review used Chromium, current read-only league data, and a fixture for notification/watchlist capability reads. It does not establish Safari rendering, push delivery or complete accessibility compliance. Changing live scores are expected between screenshots.
