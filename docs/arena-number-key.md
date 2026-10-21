# Arena wide viewing and number key — 1.456.0

Portrait now has a wide TV-style race window with the numbered roster underneath,
as requested. Landscape puts the same number key beside the field. All racers
remain in the same fixed field view. The shorter stadium/toolbar treatment gives
landscape more racing space. Portrait adds larger, matching character portraits
beside each person's name; no external image fetch is needed.

Each racer has a high-contrast badge that stays in screen pixels rather than
shrinking with the character. The number key, selected-racer toolbar, standings
and podium use the same race number. Race numbers are assigned by starting lane;
custom uniform numbers remain on the clothing. Two people can therefore choose
the same jersey number without losing their distinct identities.

The name list stays in lane order while the live standings below the stage
continue showing position changes. Tapping a name highlights the corresponding
body, badge and toolbar without changing the camera. Portrait shows full names;
compact landscape shows first names, adding a last initial when first names
repeat. Accessible button labels always include the full name and race number.
Buttons retain focus during live uniform refreshes. Thirty-two-racer lists and
shorter viewports scroll inside the roster, preserving the controls and field.

The portrait picture intentionally uses less height than the previous tall field.
Characters in the race window are consequently smaller; the fixed-size badges,
name list and larger roster portraits provide the identification. The shared
clock, randomized paths, official finishing order and character rigs are unchanged.

## Verification

- `pnpm check`: release consistency, themes, TypeScript, unresolved-name scan,
  1,995 tests and production bundles. The prior 1.455.0 bundle is unchanged.
- Isolated real-controller review: Light/Dark at phone/tablet widths, wide
  portrait/landscape, native fullscreen/fallback, all twelve visible number
  badges, 44px roster targets, live focus, matching character portraits,
  duplicate custom jerseys, kit changes, replay, controls and cleanup.
- Actual painted bodies remain inside the field with 2, 12 and 32 racers at
  start, middle and finish. Number badges use at least 11px type. The roster
  preserves actual names and accessible full-name labels.
- Character review: 5,092 poses, four distinct silhouettes in identical kits,
  motion off and bounded texture reuse. No artwork clipping or browser errors.
  Warm full-renderer timings are recorded over 180 RAF-paced frames; these are
  desktop headless measurements, not physical mobile FPS claims.

Evidence is in [arena-number-key/](arena-number-key/), including mobile Light/Dark
screenshots, landscape screenshots and controller/character JSON reports.
The fixtures use synthetic data and never connect to the league database.

Physical iOS/Android frame pacing, native mobile fullscreen and comprehensive
screen-reader speech remain unverified. No database migration is required.
