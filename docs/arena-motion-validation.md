# Stadium motion and uniform controls — 1.406.0

Uniform customization uses four explicit part selectors, quick named color swatches and a native custom-color control for the selected part. Presets retain their NFL/fan identity when colors change, and the preview identifies customized presets. The preview keeps the atlas aspect ratio. A throttled input could leave the final color unpainted when Motion was off; static previews now repaint every input immediately.

The speed stroke is replaced with speed-dependent stride cadence, bounded body bob/lean, four subtle turf particles and one low-opacity pose trail during surges. Motion off, pause and finished runners remain still. Normalized kits and number ink are cached to avoid repeating appearance work on every frame. Race paths, draw, ordering and shared clock are unchanged.

Full field uses football field proportions, compact numbered racers and a dedicated live close-up of the leading pair with actual field spots and the gap in yards. Close-ups reserve space for helmets/badges. Idle/countdown/pause overlays are confined to the overview map, with the live close-up left visible. Auto and Follow cameras remain available.

`pnpm check` passed 1,702 tests across 199 files, typecheck, names, release consistency and builds. After the final input repaint change, typecheck, the 10 focused kit/motion tests and builds passed again. The isolated shared-clock Chromium review passed 49 checks, including independent saved kits, palette part targeting, custom colors, immediate reduced-motion repaint, camera selection, overlays, pause/resume, duration edits, late joins, official finishing order, replay, cleanup and 320/390/768px layout. No browser errors. All writes during the fixture review stayed inside the isolated fixture; no real race or league data was changed.

Artifacts and comparative paced rendering measurements: `/workspace/dfl-arena-motion-1406/`. These are headless Chromium measurements, not physical-phone frame-rate guarantees. Production verification follows deployment.
