# Update shield centering — 1.411.0

The update logo's 512px image box was centered, but the shield itself is symmetrical around x=270. That put its body and tip about seven display pixels to the right on larger phones. The update-only wrapper now shifts left by 14/512 of its width. The image and its glow move together; artwork and launcher exports are unchanged.

Browser checks derive the shield axis from the actual SVG's white frame pixels, then verify that the rendered axis matches the viewport midpoint at 320×568, 390×844, 430×932 and 768×1024. They also verify image/mask alignment, visible glow pixels, motion-off and reduced-motion handling, overflow, usable actions and asset/runtime failures. The public update preview loads the same renderer and stylesheet as the app and performs no app/business actions.

Full release checks and production asset parity run before completion. Artifacts: `/workspace/dfl-update-center-1411/`.
