# Home head-to-head motion — 1.464.0

The preceding fix prevented unrelated broadcasts from replacing moving elements, but the scroll path still measured the matchup on every frame. Traveling scores also switched from Anton to the UI font; the right avatar moved across its own team name to reach a left-aligned destination. These visual handoffs were missing from the simplified scroll fixture.

The full Home now uses a browser ViewTimeline with an exit-crossing range when supported. Its transform/opacity keyframes are prepared from measured endpoints, and the browser samples them against document scrolling. The fallback uses the same path with cached geometry. Neither path reads matchup geometry during steady scrolling. Six prepared copies remain mounted, fully transparent at the endpoints, so crossing either boundary does not rebuild them.

The compact right side mirrors its source, keeping each avatar outside its team name. Traveling names keep one font size and wrapping. Scores retain their actual font and tracking throughout the handoff. The source header and versus marker fade with the original teams. Source layout remains in the document.

Home uses `overflow: clip` to retain its existing decorative clipping without creating an inner scroll container. Score-feedback badges and freshness updates do not rebuild the flight. Height-only viewport changes do not rebuild it; width, header, source dimensions, live scores, current names and loaded-photo changes still refresh it. Dialog opening cancels the copies, and closing/removing a root- or body-mounted dialog restores the current scroll position. The rankings controller also removes its dialog synchronously on teardown instead of waiting for a queued native close event. Motion-off, reduced motion, visibility changes and teardown cancel owned effects.

## Evidence

- `pnpm check`: 2,022 tests / 246 files, theme scan, names, types and generated builds. The previous 1.463.0 bundle is unchanged.
- Full Home browser fixture: native and deliberately forced fallback, Light/Dark, 320/390/430px, loaded profile-photo stand-ins, nine forward/reverse sample positions per layout, accurate opacity, complete names, avatar/name separation and no horizontal overflow.
- Both paths retain their six copies through a 120-frame reversal and perform **zero matchup rectangle reads**. The native path performs **zero inline flight-style writes**. Height-only viewport changes preserve the nodes and timeline position. Both paths pass actual touch input under 4× simulated CPU slowdown, modal dismissal, live score/name updates, reduced motion, motion-off and cleanup.
- Rankings detail checks also pass synchronous page teardown, portrait reversal, focus restoration and complete long names.
- The original scroll suite retains its section entrances, endpoint geometry, unrelated-update, live-data and resize regressions. The shared motion-quality suite passes all 90 checks, including stable accessible labels after the matchup has fully left view.
- A separate full-Home 120-frame trace before the change recorded 119 matchup reads, 4 Layout events and 1,271 observed DOM mutations. The corresponding native trace recorded 0 matchup reads, 0 Layout events and 241 mutations. Background Home effects were still active. These are browser trace observations, not physical-device frame-rate guarantees.

Selected actual Light/Dark mobile screenshots and fixture measurements are in [home-score-motion-1464](home-score-motion-1464/). Loaded photo tests use the existing public NFL-thumbnail fixture as a stand-in. Physical iPhone/Safari frame pacing, low-power mode and high-refresh displays remain unverified; the native path is feature-detected and the fallback is exercised explicitly.
