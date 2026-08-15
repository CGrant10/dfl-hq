# Arena TypeScript + PixiJS migration

The live application remains build-free during the migration. GitHub Pages
continues to serve the existing HTML, CSS, and JavaScript until the PixiJS
renderer reaches feature parity.

## Invariants

- `js/arena/race.js` remains the authority for seeded outcomes until its
  TypeScript port passes deterministic parity tests.
- Supabase stores shared state, seed, timestamps, and results; it never stores
  per-frame positions.
- Arena and Broadcast must use the same renderer contract.
- The DOM renderer remains an automatic fallback for canvas/WebGL failures.
- Pet identity and customization are data inputs, never race-performance inputs.

## Delivery phases

1. Tooling and typed renderer contracts.
2. TypeScript port of the deterministic simulation with parity fixtures.
3. Pixi scenery, camera, speed-field, and responsive viewport.
4. Pet SVG-to-texture pipeline, animation states, trails, and reactions.
5. Shared countdown, pause/resume, reconnect, leaderboard, and winner scene.
6. Device matrix and fallback validation; enable PixiJS by default.

## Required validation

- portrait and landscape phones
- short landscape browser windows
- desktop Chromium, Safari, and Firefox
- OBS Browser Source at 1280×720 and 1920×1080
- pause/resume, refresh mid-race, reconnect, reset, and replay
- 12 racers with customized Pets
- reduced GPU capability and WebGL initialization failure
