# Digit-attached fire — 1.287.0

Previously the fire branch multiplied its output by (1 - glyph), leaving the number's entire surface untouched. Flames were mainly generated above a per-column top edge, so plain text sat in front of a separate fire crown.

The WebGL shader now samples the actual glyph at four rising offsets to attach smaller flame tongues to the strokes and contours. It adds a moving amber heat glaze and incandescent inner rim inside the glyph silhouette. The existing taller plume contributes less, and the outer glow is restrained. Cold scores use the existing crystalline branch unchanged. Light mode attenuates surface heat to preserve dark text contrast.

DOM text, score formatting/alignment, effect dimensions, trigger thresholds, the 30 FPS cap and existing motion/lifecycle handling are unchanged. No new dependencies, layout reads or texture uploads occur in the animation loop. The new sampling adds four texture reads per fire fragment.

GPU browser validation: WebGL compilation, animated pixel changes, 393/393 solid glyph pixels receiving the new overlay, maximum sampled solid-glyph overlay alpha 135/255. Motion off, reduced motion, closed dialogs and offscreen cards pause rendering; context recovery, absent-WebGL fallback and teardown pass. Actual Home and player spotlight pass WCAG A/AA checks in dark/light modes with no horizontal overflow or JavaScript errors. Production writes blocked during browser checks.

Full validation: TypeScript, name checks, 1,029 tests in 115 files and production build.
