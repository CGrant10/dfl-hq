# Update logo visibility — 1.388.0

The previous glow’s inline CSS variable contained a relative mask URL. CSS resolved it against css/update-gate.css, producing css/icons/app-update-512.png (404). Its timeline ran, but no highlight painted. The glow now uses the decoded image’s absolute currentSrc/src URL, with matching anonymous image loading. It waits for image decode and a visible paint frame before starting, then sweeps once with even easing. The Update action remains available throughout. Repeated checks for the same version reuse the visible gate rather than rebuilding it and restarting animation/focus.

Validation: four readiness/lifecycle tests plus existing update/module tests passed (59 total). At 320×568, 390×844 and 768×1024, a three-second image delay held the glow until decode; the image/mask loaded without 404s, screenshot pixel differences verified a visible highlight, repeated checks kept the same gate, the update button remained enabled, and reduced motion/motion-off suppressed the effect. No horizontal overflow or page errors. Name checks, typecheck, release guard and build passed.

A public replayable preview at design/update-preview.html uses fresh public update renderer/CSS and the current release label. It boots no app, invokes no update action and sends no league data. It provides Replay glow and Back to DFL HQ, and passed mobile checks at 320 and 390px. Earlier verification checked animation timing but did not detect the missing mask; this validation includes actual paint and asset responses.

Focused mobile review screenshots and recommendations are in /workspace/dfl-mobile-review-1388/review.md. UI recommendations are not part of this release; the shipped application change fixes the update screen.
