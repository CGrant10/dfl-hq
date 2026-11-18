# Quiet Sheen loading and System Reboot updates — 1.594.0

final result: passed

Selected visual targets:
- Startup: `/workspace/generated_images/exec-94f0ee76-493c-4be8-90a0-45ab1c5c27b5.png`.
- Update: `/workspace/generated_images/exec-81447016-ece5-4987-bf47-c5dc3df03e83.png`.
- The user selected the first displayed image from each set, then explicitly
  requested the System Reboot interaction. Existing round launch artwork and
  supplied shield/update stadium artwork are reused, rather than generated
  approximations of the brand. Shield remains confined to updates/app icon.

Evidence: `/workspace/dfl-reboot-1594/`. Browser-rendered idle, keyboard focus,
actual refresh/scanning, Reduced Motion and app-motion-off states are in `final/`.
Bootstrap/handoff states are in `boot/`; short/landscape layouts are in `edges/`.
Real current-member Home, including shared navigation and scroll states, was
reviewed in Light and Dark in `actual/`; provider writes were blocked. No account,
league, notification or wager was mutated. The public update preview exercises
an explicitly simulated reboot, without downloading an update or replacing a
worker. The production update handler adds no animation wait to its existing
refresh/worker lifecycle.

Comparison normalization: source images are 852×1846; implementations are
390×844 CSS/pixels at deviceScaleFactor 1. Sources are downsampled and cropped by approximately one pixel to 390×844
for `update-final-comparison.png` and `launch-final-comparison.png`, each showing
source and browser-rendered implementation together. Additional update captures
are 320/390/768×844; compact screens 320×568, 390×667 and 844×390. No device
chrome is included. The adjacent 390px screens make the logo, type and button
readable without a further focused crop. `themes-final-comparison.png` compares
the explicit dark brand plate under both application themes.

Findings and fixes:
- P2: initial shield looked too small because the existing SVG includes generous
  transparent padding. Increased its wrapper, retained the established optical
  alignment correction, and compensated for bottom whitespace. Final shield,
  hierarchy and primary action match the selected composition.
- P2: initial Rajdhani headline/action rendered optically smaller than the mock.
  Increased display/label sizes and refined the title/mark/anniversary rhythm.
  Final screenshot has the intended two-line hierarchy and readable action.
- P2: legacy HQ splash selectors hid/delayed the new activity rule. Scoped the
  final HQ presentation to both launch modes with sufficient specificity. Browser
  checks confirm a visible rule immediately, with no delayed entrance animation.
- P2: contrast inspection found the update eyebrow and muted version below 4.5:1.
  Kept the accessible red button fill, lightened the separate red label and muted
  version. All final update text passes automated contrast checks in both themes.
- The local Vite preview rewrites config import URLs, preventing the existing
  preview renderer from loading. Its narrow config-import replacement now
  supports both raw public and Vite-rewritten sources.

Required fidelity surfaces:
- Typography: existing bundled Rajdhani/Inter; strong condensed headline,
  unclipped single-line labels, compact version/status; no new fonts.
- Spacing: selected full-screen composition; optically centered shield and round
  logo; 52px primary action, safe-area-aware padding; short screens scroll rather
  than clipping content. Keyboard focus remains visible.
- Color: explicit black/white/red/gold brand plate stays legible in both Medicine
  Wheel defaults. No retired crest blue, new theme option or palette override.
- Images: original transparent assets, correct alpha masking and optical axis;
  no rasterized UI, invented crest, hard glow edge or animated image/filter.
- Copy: selected headline/anniversary/action retained; only functional installing,
  opening and SYSTEM READY statuses added. No rotating loading jokes/subtext.

Interaction checks: logo download/decode starts the finite idle sheen; updating
uses a transform/opacity scan and pauses when hidden; motion preferences disable
it. A short-lived, one-use session marker continues the update plate across
reload only for the matching release. Actual first-route paint produces SYSTEM
READY and a 240ms fade; a slow route yields to its existing loading state without
claiming readiness. Existing 1.2s/1.5s startup fallbacks are retained. Expired,
future/mismatched and blocked-storage cases open normally; current route is
preserved. Ordinary startup uses the selected round logo, quiet activity line
and one sheen, with existing fast ready dismissal.

Validation: 2,624 tests / 313 files pass, including new handoff/marker tests.
Release coherence, theme guard, TypeScript, identifier checks, application build
and bundle verification pass (89 modules; startup 3, Home 4). Final Chromium
captures show no page exceptions. Public release verification follows merge.

P3/limits: the static mock's permanent lens-like glint is represented by a finite
masked sheen; the rule is indeterminate rather than a false progress percentage.
Physical iOS update pacing, VoiceOver speech and a genuine cross-version worker
installation remain unmeasured. The currently installed older release owns its
next Update button; this release enables the new animation for later updates.

Implementation checklist: selected hierarchy/assets, reboot lifecycle,
preferences, focus/contrast, compact layouts, browser review and checks complete.
