# Update-screen feather attachment — 1.397.0

The white shield border emerged at different angles on either side of the feather medallion. The update screen now uses a self-contained SVG that preserves the original artwork and replaces only that border segment and its inner red stripe with parallel straight paths. The medallion is restored from the original bitmap after the correction, preserving its lettering, feathers and color detail. The surroundings remain transparent so the existing glow follows the repaired mark.

The launcher images, Apple touch icon, notification badge, manifest and original update PNG are unchanged. The corrected mark is loaded only by the update screen, including its public replayable preview; no reinstall is required for this screen change.

Verification checks the actual SVG and glow at 320×568, 390×844 and 768×1024, pixel differences during the light sweep, motion-off/reduced motion, enabled actions, overflow and asset responses. The existing update tests and full release checks also run. The bitmap embedded in the SVG is byte-for-byte identical to the original update image. Generated image alternatives were rejected because they changed more of the artwork than the requested repair.
