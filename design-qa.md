# Championship stadium update lighting — 1.595.0

final result: passed

The user selected Championship Atmosphere: one wave through the stadium light
banks, faint Medicine Wheel red/gold stadium illumination, and a final bank at
completion. Existing selected update-screen hierarchy and supplied shield remain.
The visual layout reference is the first selected update mock at
`/workspace/generated_images/exec-81447016-ece5-4987-bf47-c5dc3df03e83.png`.
The prior shipped layout is `/workspace/dfl-reboot-1594/final/dark-390-idle.png`.

Browser evidence: `/workspace/dfl-lights-1595/{final,lights,boot,edges,actual}`.
`light-sequence-comparison.png` places the previous screen, the new wave and
completed light-bank state together at 390×844 CSS/pixels, deviceScaleFactor 1.
These adjacent full-screen images make the logo, typography and fixtures readable
without a separate crop. The original 852×1846 mock was normalized to 390×844
in the preceding 1.594 review; this refinement intentionally reframes the stadium
so the actual floodlights are visible. Typography, shield and action positions
are unchanged. No new illustration, font, icon or network image was introduced.

Review:
- Typography/content: the approved boxy headline, anniversary, functional statuses
  and 52px Update action remain. No new explanatory text or fake progress.
- Layout: masks and light images share the original stadium aspect ratio and
  responsive frame. Safe-area padding, compact/landscape scrolling, focus and
  button access remain intact at 320×568, 390×667 and 844×390, as well as
  320/390/768×844. No horizontal overflow.
- Color: existing black/white/red/gold artwork supplies the light and ribbon-board
  colors. Both Light/Dark use the explicit dark update plate. Contrast passes
  while lights peak and after the final bank; no old crest blue/theme option.
- Image/motion: the original stadium is reused under static feathered masks;
  only opacity animates. Three banks run once with staggered starts, then settle.
  The final bank remains dark until real first-route readiness. The shield's
  repeating scan was removed; its original single idle sheen remains.
- Handoff: an elapsed start time preserves the lighting phase across reload. The
  ready reveal fades over 420ms; the 1.2s slow-boot yield remains. The update-only removal guard allows
  1.8s so a late ready event can finish its fade; ordinary launches keep 1.5s.
  A fallback/mismatched release never triggers the completion bank. Visibility
  listeners pause and clean up; Reduced Motion/app motion off stay static.

The browser checks verify single animation iterations, staggered wave phases,
background-tab pause, static preference states, completion opacity and contrast.
Existing marker tests now check elapsed phase and visibility. Startup, reboot,
ready, fallback, stale-marker and short launch checks pass. The preview's explicit
2.2s demonstration exercises navigation back into Home without replacing a worker
or refreshing caches. Production refresh has no animation wait. Real current-
member Home/navigation was checked in Light/Dark with all provider writes blocked.
No league, account, notification, wager or roster data was changed.

QA history: the first capture script checked a short splash after its normal
fast dismissal under concurrent build/test load. Moving that inspection earlier
confirmed the existing timing; application startup was not slowed for captures.
No unresolved P0/P1/P2 visual findings. Original shield/portrait/asset fidelity
is retained. Physical iOS animation pacing, VoiceOver speech and genuine worker
cross-version installation are not measured by these browser tests.

Validation: 2,624 tests / 313 files pass; release coherence, theme, TypeScript,
identifier and build/bundle checks pass (89 modules, startup 3, Home 4).
Public release verification follows merge.

Implementation checklist: finite lighting wave, reload phase, ready bank,
preferences/visibility, mobile layout/contrast, browser preview and checks complete.
