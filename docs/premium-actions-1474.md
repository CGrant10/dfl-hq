# Player quick actions and Arena finish exports — 1.474.0

A held player portrait/name now opens a compact action sheet. An explicit,
keyboard-accessible Actions button sits beside shared interactive identities.
View player activates the original control, retaining GameDay's live context and
portrait-first card transition. Build trade appears only after the existing
cached player-card loader confirms an opponent-owned player and the member's
roster; it supplies the actual team, partner and target IDs. Sleeper uses the
existing official generic launcher. Nothing loads for every player row.

The delegated hold waits for 450ms, cancels on pointer movement, scrolling,
cancellation, visibility changes and navigation, and never captures the pointer
or prevents vertical scrolling. Native compatibility clicks retargeted to the
new modal backdrop cannot immediately dismiss it. A replacement live row can
still open the correct player. The sheet shares existing drag, dismissal,
viewport and reduced-motion behavior.

Existing buttons without `.btn`/`.linkbtn` now receive the same restrained press
feedback. Tabs and the travelling selection rail retain their fixed geometry.
Theme-based focus outlines, action dividers, touch targets, corners and surfaces
make the new controls consistent with the existing mobile UI. This does not
replace unrelated page layouts or their identity colors.

A completed stadium race has Share finish beside its replay controls. The
preview offers an official finish PNG, native file sharing when supported,
download and a result link. On supported browsers, Create replay clip records an
eight-second silent video: the final stretch, followed by a two-second official
order hold. The full field and numbered racer key remain visible; the order
appears at the finish. Long races accelerate the captured stretch. MP4 is
preferred when supported, with WebM alternatives and an image fallback. The
export uses the existing deterministic race and renderer and never issues race
commands. A manifest must agree with every official place and recorded time;
missing or inconsistent history cannot manufacture replay footage. Motion-off
keeps the static image option. Video playback requires the viewer to press Play.

Recording runs only after an explicit request. Closing, navigation and
backgrounding during recording cancel capture; tracks, animation frames,
renderer observers and preview URLs are released. The existing app scoreboard,
orientation and race state are independent. Preview images wait for local fonts
and stadium artwork, and video receives a finish poster rather than a black
preview.

The existing Crowd sound toggle now remembers the member's device preference.
Audio remains gesture-gated, with a short starting whistle and a restrained
three-note finish signature beneath the finite crowd swell. Backgrounding and
leaving stop voices; late resume promises cannot override a newer mute/stop.
No background audio loop, new polling, database schema or league writes.

## Verification

- `pnpm check`: release, themes, names, TypeScript, unit suite and production
  bundles. Startup remains three modules and Home remains four.
- 56 isolated production-component browser checks: Light/Dark at 320/390px,
  actual touch holds and scrolling, keyboard focus, exact trade routes, original
  player-card entry, press cancellation, real PNG and video downloads, recording
  cancellation, 32 racers, unsupported video and motion-off. [Checks](premium-actions-1474/checks.json).
- The downloaded clip was inspected with ffprobe: H.264 MP4, 960×1058,
  approximately 8.01 seconds and 1.2MB. Browser support chooses its actual type;
  the extension matches that type.
- 337 stadium-controller checks, including fullscreen exit before sharing,
  remembered mute preference and the existing race/orientation/commissioner
  regressions. [Checks](premium-actions-1474/arena-checks.json).
- Existing player-card motion regression and 90 shared touch/tab/scroll motion
  checks passed. The full themed Home review checks the identity layout in
  context, including mobile gutters and live controls.

Reviewed actual screenshots: [Light actions](premium-actions-1474/quick-light-390.png),
[Dark actions](premium-actions-1474/quick-dark-390.png),
[Light finish](premium-actions-1474/finish-light-390.png),
[Dark finish](premium-actions-1474/finish-dark-390.png),
[32-racer export preview](premium-actions-1474/finish-32.png).

Physical iPhone/Safari playback, installed-app share targets, hardware sound
levels and low-power-device frame pacing remain unverified. Unsupported file
sharing retains a download; unsupported recording retains the finish image and
link. Fixture captures never contact the league database.
