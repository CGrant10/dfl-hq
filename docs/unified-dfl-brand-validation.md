# Unified DFL shield — 1.410.0

The approved `icons/app-update-aligned.svg` is the source for every new brand export. Its corrected shield border, stripe, feathers, lettering and colors are rendered directly in Chromium; no artwork is regenerated or redrawn. `tools/build-brand-assets.py` exports centered transparent marks, graphite launcher tiles, a monochrome notification badge and the standalone icon SVG.

Manifest icons and shortcuts use new versioned 192/512px URLs. Android's maskable export keeps all logo pixels inside the central 40% radius safe circle; Apple receives a true 180px touch icon. The manifest id, start URL and scope remain unchanged. Stable legacy PNG URLs are updated too, so existing notification payloads continue to work without backend changes. Existing iOS Home Screen icons may retain their cached image until removed and added again; Android updates depend on the browser/launcher refresh cycle.

Current in-app branding now uses the corrected shield on the splash, header, default home footer, clubhouse decoration, broadcast logo slides, generic page marks and share-card branding. Arena and the update-screen glow retain their approved SVG source. Custom uploaded league crests, member photos and historical story images are preserved. Circular clipping and opaque black backgrounds are removed from shield watermarks; a small outline shadow keeps the white logo legible on Home's light paper. Share cards keep their layouts, using a compact 256px graphite logo tile for contrast on either background.

Validation includes export dimensions, opaque launcher fields, transparent white notification badge, decoded manifest/shortcut icons, unchanged installed app identity, exact Android safe-circle bounds, current shell/share/update sources, mobile overflow at 320/390/430px and runtime errors. Browser review blocks business writes. Full `pnpm check` passed 1,706 tests in 201 files; 38 focused share, broadcast, clubhouse and update tests also passed after the final asset reference changes. Shared browser CI and deployed asset parity are required before completion.

Artifacts: `/workspace/dfl-brand-1410/`.
