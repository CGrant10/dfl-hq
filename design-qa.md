# Stadium lights on ordinary opening — 1.596.0

final result: passed

The user approved the update stadium's championship light wave and requested it
on normal opening too. The existing round-logo Quiet Sheen launch remains the
layout/identity target; shield stays confined to updates/app icon. The same
stadium image, masks and light-wave keyframes now serve both screens. Ordinary
HQ opening uses an 850ms wave with 60/120ms stagger and an 80ms final-bank
transition, fitting its existing fast dismissal instead of waiting for the wave.
Golf/Broadcast openings retain their existing presentation.

Evidence: `/workspace/dfl-opening-1596/`. `opening-comparison.png` places the prior
opening, new Dark opening and new Light opening together at 390×844 CSS/pixels,
deviceScaleFactor 1. All captures are browser-rendered app content without device
chrome. The prior image is `/workspace/dfl-reboot-1594/boot/launch-390.png`; current
320/390/768px captures and state results are in `opening/`. The adjacent screens
show the round artwork, labels and stadium fixtures clearly without a further
focused crop. Original selected launch mock remains
`/workspace/generated_images/exec-94f0ee76-493c-4be8-90a0-45ab1c5c27b5.png`;
the background-light addition is the user's explicit refinement to that target.

Review:
- Typography/content: existing boxy white DFL HQ and gold season label; no new
  informational subtext, percentages, controls or shield on ordinary launch.
- Layout: original logo sizing/spacing/position retained; decorative banks have
  no layout or pointer interaction. 320/390/768px Light/Dark show no overflow.
- Color: the same explicit dark Medicine Wheel brand plate under both themes;
  original red/gold ribbon boards and white floodlights. No new palette option
  or retired blue. Update peak/final-bank contrast checks continue to pass.
- Images: original transparent round logo, shield and 124.6KB stadium WebP are
  reused. Only opacity animates over static feathered masks, once per opening.
  There is no additional asset or startup module. The existing stadium is now
  included with the install cache for offline opening; other art stays deferred.
- Motion/readiness: document visibility pauses the effect; Reduced Motion and
  app motion off disable its movement. The final bank responds only to real
  first-route readiness; slow-route fallback never claims completion. Existing
  full/short minimums, 1.2s fallback, 1.5s normal safety and 160ms ready dismissal
  remain; ordinary startup never waits for the image or lighting sequence.

QA fixes:
- P2: background URLs in custom properties resolved relative to the CSS folder
  outside the preview. Both bootstrap and required-update renderer now anchor
  to document.baseURI. Unit coverage asserts a nested /dfl-hq/ URL. Actual app
  startup observes the correct URL, four banks, one round mark and no shield.
- Reduced-motion inspection uses the app's existing effectively-zero 1µs global
  timing policy; no light-wave animation runs in that state.
- Screenshot capture can outlast a deliberately fast splash while waiting for
  fonts. Visual captures and fresh-launch readiness measurements are separate;
  application timing was not extended for testing.

Browser checks: 320/390/768 Light/Dark, full/short opening, motion off, Reduced
Motion and a background delayed 2.5s all pass. Measured post-ready dismissal in
this harness was about 108–258ms; this is not a physical-device benchmark.
Update wave/final bank/contrast and compact/landscape preview-to-Home checks pass.
Real current-member Home/navigation was checked in both themes, with provider
writes blocked. Actual startup DOM/image URL is asserted before the splash is
removed. No league, account, roster, wager or notification data was changed.

Validation: 2,626 tests / 313 files, release/theme/type/name checks and production
build/bundle verification pass (89 modules, startup 3, Home 4). Public verification
follows merge. No unresolved P0/P1/P2 findings. Physical iOS pacing, VoiceOver and
native offline installation were not measured; worker cache behavior is unit
verified. Implementation checklist: shared lights, correct paths, original
identity, fast readiness, preferences, cache policy and browser review complete.
