# Home typography and layout correction — v1.299.0

final result: passed

## Evidence and scope

Source visual truth: selected option-3 mock, `/workspace/generated_images/exec-b10c2c8d-0155-43a7-a138-d5ddf329ec7c.png` (853 × 1844). The user's refinement explicitly asks for smooth large text and scores, properly fitted broadcast slides, and consistent page spacing.

Reviewed application commit: `9e1dfe0eba9c34e3d03ec0e051b185a57805a4cc`.

Browser-rendered evidence: `/workspace/dfl-review/polish-final/home-390.png`, `home-390@3x.png`, `home-390-normalized.png`, `home-320.png`, `home-1280.png`, all twelve `slide-*.png` captures, and `browser-checks.json`. [Download the workflow artifact](https://github.com/CGrant10/dfl-hq/actions/runs/37343105072).

The source was resized to 390 × 844. Implementation CSS viewport is 390 × 844; captures use deviceScaleFactor 1 (390 × 844 pixels) and 3 (1170 × 2532 pixels). The 3× capture was downsampled to 390 × 844 with Lanczos for the combined comparison. State: Home, dark presentation, active Home navigation, commissioner header, opener, deterministic week-5 sample matchup, two hot players and two eligible cold players.

Full-view combined evidence: `polish-final/comparison.png`. Focused combined evidence: `shell-hero-comparison.png` and `leaders-nav-comparison.png`. Both the full comparison and focused comparisons were opened and inspected after the final correction; 320px, desktop, and individual slide captures were inspected as well.

The read-only fixture renders production styles, carousel, Home markup helpers, actual matchup/trade/next-move slide generators, navigation symbols, player portraits, and WebGL effects. Authenticated live requests, live score polling, and every destination route are outside this fixture's verification scope.

## Findings and comparison history

| Priority | Earlier evidence | Correction | Post-fix evidence |
| --- | --- | --- | --- |
| P1 | The merged v1.298.0 screenshot used stepped display letterforms for headings and large numbers. | Replaced the pixel-shaped font with the existing smooth Anton font, removed synthetic strokes, and restored natural text line boxes. Render effects at phone density with a six-million-pixel surface budget. | Final focused comparisons; computed font family is Anton, stroke is 0px, and a 390px canvas renders 1170 pixels at 3× density. |
| P2 | The earlier fixture tested an opener and two simple announcements, leaving real slide treatments uncovered. Fixed height could clip content or collide with controls. | Reserve header and control space, measure active content, grow Home stage height when needed, and refit after font loading and resize. Added all eight treatments and actual Home generators. | 48 browser states: twelve slides at 320, 390, 768, and 1280px. Content fits, controls remain clear, and no horizontal overflow occurs. |
| P2 | First expanded run found the inherited narrow injury status grid overflowing its 86px column. | Reset statuses to one shrinkable column, allow readable wrapping, and apply the shared gutter. | Subsequent browser runs pass the injury treatment at every width; final injury screenshot retains both players and the full-report control. |
| P2 | The first smooth-font capture pushed the last player row below the ticker. | Tightened opener gaps and line height, normalized header controls, and retained compact 44px player rows. | Final 390px stage is 254px; the last row ends at 745.89px and ticker starts at 748px. Explicit visibility regression check passes. |
| P2 | A child-scoped gutter variable was unavailable to the topbar, clipping the seal. Competing late overrides also produced uneven spacing. | Define the gutter on the Home body state, retire stepped-font overrides, align the header and sections, and flatten the league disclosure's extra inset. Cold Final labels occupy a separate score column. | Seal spans x=11.7–60.3px at 390px; header and section gutters align. Full and focused comparisons show clear labels and all four rows. |

No unresolved P0, P1, or P2 findings remain in the reviewed states.

## Required fidelity surfaces

- **Typography:** Smooth local Anton display text replaces the fictional stepped font in accordance with the user's refinement. Rajdhani remains for small app UI and system text for body copy. Loaded fonts, weights, line height, wrapping, and 0px synthetic stroke were checked. Anton is narrower than the fictional mock's display face; this is an intentional smooth-font substitution, with the section hierarchy retained.
- **Spacing and layout:** At 390px, the topbar is 57px, banner 130px, opener 254px, and leaders 215.59px. These preserve the reference's approximate 59/129/253/215px proportions. Header and persistent controls stay aligned, the six-tab navigation remains visible, and the fourth row clears the ticker. Narrow matchup metadata wraps into readable rows. Rich slides can grow to fit real content.
- **Colors and tokens:** Charcoal surfaces, cream type, gold headings and active navigation, hot orange/red, and cold blue remain consistent with the anniversary artwork and selected mock. Team totals remain neutral.
- **Images and quality:** Native anniversary artwork, existing league seal, generated stadium background, real player portrait renderer, and library navigation icons remain. Broadcast artwork fills its frame; no new placeholders or generated assets were introduced. The existing seal is a supplied raster asset.
- **Copy and content:** Opener headline, two-line body, and Clubhouse action are retained. Existing production broadcast slides, temporal labels, score labels, player identities, and league tools are retained. Fixture values stay in the review tool and do not enter production data.

## Validation

[Full repository checks](https://github.com/CGrant10/dfl-hq/actions/runs/37343104813) passed: 1,092 tests across 123 files, typecheck, unresolved-name scan, and production Arena build.

[Browser review](https://github.com/CGrant10/dfl-hq/actions/runs/37343105072) passed:

- Twelve slides, all eight production treatments, four viewport widths (48 states), including image-backed announcements, injury cards, fantasy scoreboards, golf scoreboards, and weekly slates.
- No horizontal overflow, clipped primary sections, content/control collisions, clipped league seal, or ticker-covered fourth player row at the reference viewport.
- Next/previous navigation, pause, active dots, Clubhouse target, valid six-tab SVG symbols, WebGL rendering, and reduced motion stopping effects.
- Loaded smooth font, no synthetic score stroke, 3× phone-density effects, and zero browser page errors.

Existing strict hot >15 and cold <10 thresholds, the cold halftime/final gate, defense exclusion, and neutral team totals are unchanged. Full authentication and live league API behavior were not exercised in the fixture.

## Implementation checklist

- [x] Smooth large type and phone-resolution effects.
- [x] Shared responsive gutters and compact readable score/status rows.
- [x] Every broadcast treatment fits with separate header and controls.
- [x] Full/focused source comparison and responsive screenshots inspected.
- [x] Full repository and expanded browser checks passed.

Follow-up polish: Exact fictional mock glyph shapes and icon outlines are not reproduced. Animated fire/ice differs by frame from the artistic still reference; the player effects remain attached to the numbers.
