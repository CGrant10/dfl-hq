# Arena character presence — 1.455.0

Portrait spectators now enter an immersive field in their current orientation.
Closing returns to the room and remains closed through subsequent rotations.
Commissioners still start inline with their race controls. No orientation lock,
close-up camera, split field or hidden racer is introduced. The inline portrait
field also gains vertical space and a smaller room heading.

The old shared sprite cycle is replaced in the Arena, editor and podium by an
articulated football character renderer. Members have a stable Speedster,
Powerhouse, Playmaker or Showboat build, with different shoulder/limb/helmet
proportions, stride length, cadence, arm swing, bounce, uniform patterns and
accessories. Twenty-four distinct running poses and eight touchdown poses replace
the repeated illustration poses. Fan kits have themed helmet details and moving
bandanas; helmets have a shaded shell, rim light, visor/cage and team abbreviation
or decal. Gloves, socks, cleats, jersey numbers and towels remain readable in a
small field view. Portrait bodies are broader and taller, with larger helmets.

Unsaved defaults vary skin, helmet, pants and colors by member identity. The
editor uses the same defaults as the room. Existing saved kits and their PIN,
revision and realtime update behavior are preserved. Build identity is generated
from the member ID; this release adds no persisted customization fields. The
current uniform controls and NFL/Pokémon/anime collections remain available.

Character identity and pose selection are cosmetic. Existing race paths, shared
clock, seeds, finish times, official ordering, replay and commissioner commands
are unchanged. The model test compares every race row at countdown, start,
mid-race, final sprint and finish with and without character data.

## Verification

- `pnpm check`: release consistency, themes, TypeScript, names, 1,994 tests and
  production builds. The 1.454.0 bundle is retained without modification.
- The real isolated stadium controller review covers 320/390/768px Light/Dark,
  native fullscreen and CSS fallback, explicit Close/rotation, controls, profile
  edits, live kit updates, pause/resume/reset, replay, podium, crowd, reduced
  motion and cleanup. Every actual painted body is checked inside the field for
  2, 12 and 32 racers, including edge lanes at start, middle and finish.
- Size assertions inspect nontransparent character pixels, rather than counting
  transparent texture gutters. Twelve-racer phone inline bodies are roughly
  39–40 CSS px tall; portrait theater checks require at least 46px. Tablet inline
  bodies exceed 50px. These numbers vary slightly with the running pose.
- The separate character review checks 5,092 poses across every preset and the
  four builds, distinct silhouettes in identical uniforms, motion-off stillness,
  and texture reuse with 32 racers. No clipped artwork or browser errors.
- Rendering uses lazy pose caches, bounded to 32 atlases, with one field draw
  loop. Poses are painted on first use; warm animation composites cached frames.
  The new characters require no sprite downloads or external logo fetches.
  The review records actual full-renderer CPU timings over 180 RAF-paced frames
  after warmup. This is a headless desktop measurement, not a device FPS claim.

Evidence: [character lineup](arena-character-presence/character-lineup.png),
[motion strip](arena-character-presence/motion-strip.png),
[portrait watch view](arena-character-presence/portrait-live-immersive.png),
[Light room](arena-character-presence/full-field-390-light.png),
[Dark room](arena-character-presence/full-field-390-dark.png), and the controller
and character JSON reports in the same folder. All data is synthetic/local;
these reviews never connect to the league database.

Physical iOS/Android frame pacing, memory pressure, native mobile fullscreen,
audio and comprehensive screen-reader speech remain unverified. Thirty-two
racers fit but necessarily have smaller bodies than the twelve-member league.

## Rollout

Release 1.455.0 uses the existing application update flow and service worker.
No database migration or league data modification is required.
