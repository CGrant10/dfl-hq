# Connected detail motion — 1.461.0

Player cards now return their portrait to the original row over 280ms while the sheet fades with an 8px settling movement. Previously the returning portrait ran alongside a 220ms full-height mobile sheet exit. The backdrop now follows the same 280ms clock. The position of an interrupted opening is retained when reversing; the portrait is never restarted from the stationary hero. Direct header pulls keep their existing finger-following and offscreen dismissal. Missing/offscreen sources fall back to the ordinary sheet exit.

Two additional connections reuse the existing lightweight top-layer helpers:

- A selected comparison result moves into the chosen side's portrait. Its name and metadata fade in as the image settles. The scroll reset finishes before measuring the destination. Selection cancels obsolete opening flights; closing during a right-side flight returns the left player from its own image.
- A team picture connects a power-ranking row to its details and returns on close. Reversing during entry starts from the displayed frame. Unmounting the rankings cancels the copy and removes its dialog.

Copies ignore input and are hidden from accessibility tools. Focus returns to the opener. App motion-off and system reduced motion use immediate content changes. Viewport changes, scrolling, route exits and canceled animations restore the original portraits; repeated dismissals cannot run a stale close against a reopened sheet. No new animation library, requests, palette or theme options were added.

## Verification

`pnpm check` passed: release agreement, theme audit, TypeScript, name resolution, 2,018 tests across 246 files, and generated builds. A final targeted run covered shared portrait lifecycle, sheet geometry, ranking identity and player-card actions; the final app build contains 79 modules, with 3 startup and 4 Home modules. The 1.460.0 bundle is unchanged.

The browser scripts exercise production controllers with deterministic read-only data and loaded 350×254 PNG portraits. A single recorded photo is reused, so these images verify framing and motion, not player-specific photo identity. No league data or wagers are written.

- `tools/capture-sheet-review.py` (87 checks): mobile Light/Dark and legacy-theme layouts at 320/390/600px; interrupted portrait return; synchronized sheet/backdrop; rapid reopen; route change, motion-off and viewport interruption; body scrolling, header drag and keyboard viewport behavior; focus and late-data safety.
- `tools/capture-comparison-review.py` (50 checks): Light/Dark at 320/390px, contrast and overflow; picker-to-side geometry; close during selection; same-frame selection/close; correct left-player return while the right side is moving; reduced motion and existing refresh/gesture behavior.
- `tools/capture-power-review.py` (18 grouped results): Light/Dark at 320/390/768px; real team-photo fallbacks, focus and details; connected team-photo reversal and teardown; continuous ranking expansion, resize/week changes, motion opt-outs and 200% text sizing.

The full Home integration also waits for actual portrait/dialog cleanup within a bounded timeout instead of assuming the former dismissal duration.

Curated captures in `connected-detail-motion/` show interrupted returns and comparison/ranking entry frames. All active effects are paused together for the player-card and comparison midpoints. Physical iOS/Android frame pacing, native keyboards and screen-reader speech remain unverified; browser checks do not establish device-level frame rates.
