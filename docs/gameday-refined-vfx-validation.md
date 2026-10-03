# Refined GameDay effects — v1.277.0

Removed visible score icons while retaining screen-reader temperature cues. Player totals align to the same right edge for hot, cold, and neutral states; typography and score thresholds remain unchanged. Smaller GPU drawing bounds and a shorter flame field keep the effect close to the digits. Domain-warped turbulence adds curling detail, softer flame edges, and smaller, fewer embers. Team/spotlight spacing is tighter to match the smaller effect.

The app continues to use direct WebGL rendering. SwiftUI is a native Apple UI framework and cannot replace rendering in this browser app. No additional animation framework or download is needed.

Validation: all 1,013 tests across 112 files, typecheck, identifier checks, and build passed. Read-only browser fixtures verified icon removal, numeric alignment, halftime eligibility, live updates, spotlights, motion settings, accessibility, and enlarged mobile layouts. GPU fixtures verified changing framebuffer pixels, offscreen suspension, context recovery, fallback, and teardown. Browser tests blocked production writes.

## v1.283.0 natural flame movement and hotter core

The fire shader now combines large curling flow with a finer rising disturbance, and varies the length of adjacent flame tongues independently. A density-based color ramp adds a pale yellow core near the digit edges and deeper orange at the thin tips. Emitter dimensions, score alignment, eligibility thresholds, ice effects and animation resource limits stay unchanged; no new dependencies.

Validation: pnpm check passes all 1,022 tests, type checks, identifier checks and build. Chromium compiles and animates the shader with changing framebuffer pixels; verifies motion off, reduced motion, offscreen suspension, GPU context recovery, fallback and teardown. Live-data browser checks verify nine lineup slots, player detail scores, theme contrast, accessible labels, motion controls, refresh and route cleanup, with no WCAG A/AA violations or overflow. Dark/light GPU screenshots reviewed.
