# Quick Round fixed controls design QA

- Source visual truth: `C:\Users\GUEST\Documents\Codex\2026-08-22\this\.codex-remote-attachments\01a02a28-03bc-7100-b90c-d17b7441ff40\67708fde-b847-4258-9a18-7990cc583a44\1-Photo-1.jpg` and `2-Photo-2.jpg`, with the user's explicit direction to retain only Shots and Putts in the entry sheet.
- Implementation screenshots: `qa/quick-round-simple-mobile-v125.png` and `qa/quick-round-scorecard-mobile-v125.png`.
- Combined comparisons: `qa/quick-round-simple-comparison-v125.png` and `qa/quick-round-scorecard-comparison-v125.png`.
- Browser surface: Codex in-app browser at the local Vite preview.
- Viewport and density: 373.6 × 809.6 CSS px at device scale factor 1; implementation captures are 374 × 810 px. Source images were 592 × 1280 px and were compared at their original density against implementation captures normalized to 592 × 1280 px.
- State: Red Trail Links Quick Round, Hole 1, one golfer, existing score 6 and two putts. DFL top bar, bottom line, and five-item navigation retained.

## Findings

No actionable P0, P1, or P2 differences remain for the requested scope.

- Controls and copy: the sheet retains the reference's player header, Enter action, blue vertical steppers, and clear hierarchy while intentionally removing tee direction, miss-hit, putt distance, club, hazards, penalties, drinks, and mode buttons. “Score” is relabeled “Shots” to match the user's language.
- Spacing and layout: the compact sheet is fully visible above the bottom line and navigation. The fixed app workspace measures exactly one viewport; body scroll height equals client height and vertical overflow is hidden.
- Scorecard: the white paper treatment, blue legend band, score marks, course heading, and Golf-home back arrow remain. The table is horizontally scrollable (842 px content inside a 374 px viewport) with vertical overflow hidden.
- Typography and colors: the existing DFL type system and medicine-inspired red, yellow, white, green, and earth palette are retained. No medicine-wheel graphic was introduced.
- Image and asset fidelity: existing app logo and icon assets are retained; no source asset was replaced with a placeholder, emoji, CSS drawing, or improvised SVG.
- Accessibility: every stepper has a specific accessible label, the back control identifies its Golf-home destination, and the persistent navigation remains available.

## Full-view comparison evidence

`qa/quick-round-simple-comparison-v125.png` shows the reference control language beside the simplified implementation. The player identity, primary action, and two requested steppers remain visually aligned with the source while the removed advanced controls no longer consume vertical space.

`qa/quick-round-scorecard-comparison-v125.png` shows the source scorecard beside the fixed implementation. Both retain the same title-to-table-to-legend reading order, with the implementation keeping the existing DFL chrome as requested.

## Focused comparison evidence

The two requested controls are large and legible at phone size, with Shots and Putts centered in equal columns. A separate focused crop was unnecessary because labels, values, and controls are clearly readable in the full-size combined comparison.

## Primary interactions tested

- Existing Hole 1 score opens the compact sheet without changing production data.
- Enter closes the sheet.
- Scorecard opens the dedicated fixed scorecard view.
- The scorecard preserves horizontal scanning while vertical overflow remains disabled.
- Body metrics remain `scrollHeight === clientHeight` and `scrollY === 0` in both scoring and scorecard states.
- The back arrow still targets `#/golf`, and the five-item bottom navigation stays visible.
- Browser console showed no change-related runtime error.

## Comparison history

1. First fixed-sheet pass inherited the height of the content wrapper, placing the sheet under the app header. Fix: the Quick Round outing wrapper now fills the available viewport. Post-fix evidence places the entire 285 px sheet between the round content and persistent bottom chrome.
2. Post-fix scoring metrics show a 649.6 px Quick Round workspace inside the phone viewport, with the sheet at y=330.4–615.6 and the bottom line/navigation below it.
3. Post-fix scorecard metrics show no vertical document overflow and a dedicated 842 px horizontal score surface inside the 374 px viewport.

## Follow-up polish

No P3 follow-up is required for this scoped change.

## Final result

passed

---

# Full-hole satellite GPS design QA

## Evidence

- Source: `C:/Users/GUEST/Documents/Codex/2026-08-23/loo/.codex-remote-attachments/01a02fb4-48a5-7c92-8158-223b000a2851/719cbe15-e418-4ac4-93bb-a04e599a6e6b/1-Photo-1.jpg` (591 x 1280 px).
- Implementation capture: `work-gps-implementation.jpg` (1280 x 720 CSS-pixel viewport at DPR 1.25; GPS panel 520 x 676.8 CSS px).
- Combined comparison: `gps-design-comparison.jpg`; both views were normalized to 720 px high with aspect ratio preserved.
- State: Rolla tournament beta, member view, Hole 1, no accepted live-location reading, Add score state.

## Comparison

The implementation matches the reference's primary composition: a full-height satellite hole image, compact translucent hole navigation, a solid player-to-green line, a centered yardage pill, player and green markers, a floating GPS action, imagery attribution, and a bottom score dock. The header, line, pill, and score dock remain legible over the imagery. The implementation intentionally retains DFL typography, team identity, navy surfaces, and green scoring action instead of copying TheGrint branding or phone chrome.

The desktop panel is constrained while the mobile breakpoint fills the viewport. The implementation's course terrain differs from the reference because the two views depict different courses. Its pins also retain the existing DFL marker language. These are P3 differences only.

## Interaction and runtime checks

- Opened GPS from the member tournament screen.
- Advanced through all nine physical Rolla holes and confirmed each loaded its own imagery, line, official yardage, and fallback image; repeated-nine event numbering uses the corresponding physical-hole geometry.
- Tapped Add score inside GPS and confirmed the map closed and the existing score-entry sheet opened.
- Confirmed normal map tiles loaded with a static Esri image underneath as a visible fallback.
- Confirmed no new console errors after the final reload and interaction pass.

## Comparison history

1. Initial state — P0: a missing position was converted to zero yards, allowing the map to dereference nonexistent coordinates and remain an empty blue box. The external map loader also did not wait for both script and stylesheet readiness.
2. First corrected state — P1: imagery rendered, but framed only the published landing-target segment because that coordinate had been treated as the tee.
3. Final state: null-distance handling was corrected, the loader waits for both resources, a satellite fallback was added, and the tee is projected from the green through the published fairway target using the official hole yardage.

No P0, P1, or P2 issues remain.

final result: passed

---

# Fairway Light typography, cards, and golf scoring QA

## Evidence

- Source: `C:/Users/GUEST/Documents/Codex/2026-08-23/loo/.codex-remote-attachments/01a02fb4-48a5-7c92-8158-223b000a2851/91416fa3-59d7-42a4-acbe-b3dfe25467f2/1-Photo-1.jpg` (591 x 1280 px).
- Fairway admin surface: `design-qa-assets/fairway-admin-v1.143.0.png`.
- Combined source comparison: `design-qa-assets/fairway-admin-comparison-v1.143.0.jpg`.
- Fairway profile and shared cards: `design-qa-assets/fairway-profile-v1.143.0.png`.
- Tournament member scoring and scorecard: `design-qa-assets/fairway-beta-play-v1.143.0.png` and `design-qa-assets/fairway-beta-scorecard-v1.143.0.png`.
- Quick Round: `design-qa-assets/fairway-quick-round-v1.143.0.png`.
- Browser surface: Codex in-app browser at 591 x 1280, matching the reference screenshot dimensions. The user's original Medicine Wheel setting was restored after capture.

## Comparison

Fairway Light now carries the reference's Rajdhani-style condensed hierarchy, thin outlined white cards, generous spacing, and restrained shadows across shared page surfaces. The green wash was removed: page backgrounds and secondary surfaces are neutral cool gray, while green and blue remain purposeful action and structure colors. Existing component dimensions and layout tokens were preserved to avoid shifting page geometry.

The live tournament view clearly labels `STROKE PLAY` in both the hole header and round header, retains separate Scorecard and Leaderboard controls for members, and shows a plain numeric add/edit score control without a hole-result shape. The scorecard keeps result circles and squares inside score cells and inserts Front 9 after hole 9, Back 9 after hole 18, then +/− and Total 18.

Quick Round inherits Fairway Light cleanly: the formerly dark Add score card is light, the GPS medallion remains legible, and the hidden individual card reports Front 9, Back 9, +/−, and the round total. No half-white overlay or low-contrast copy appeared in the captured state.

## Interaction and runtime checks

- Switched from Medicine Wheel to Fairway Light through the visible Appearance control and verified the selected state.
- Opened tournament event 12 as a member and confirmed the visible `STROKE PLAY` state, yardage, GPS action, Scorecard button, and Leaderboard button.
- Opened the tournament scorecard and confirmed the exact summary-column order and all 18 yardage/par headings.
- Opened Quick Round event 14 and confirmed its active theme, light Add score control, GPS medallion, and live nine-hole totals.
- Verified through focused tests that Beta setup cannot mount the GPS bubble, organizer setup includes the guest-code setter, and score-entry result labels were removed.
- Browser interactions were read-only except for the temporary theme selection, which was restored. No production score or setup record was changed.

## Comparison history

1. P1: Fairway Light covered the page with a green tint and retained generic card typography. Fix: neutralize page and secondary surfaces, set Fairway's body face to the existing display font, and apply thin bordered, shadowless cards.
2. P1: add-score controls reused result markers that belong on the scorecard. Fix: render only the entered stroke number in add/edit controls; retain result shapes in scorecard cells.
3. P1: scorecards ended with only a total and differential. Fix: add Front 9, Back 9, +/−, and round-total summaries in the requested reading order, including live recalculation.
4. P1: Tournament Beta setup had no visible guest-code step and scoring format selection was ambiguous. Fix: add an open-by-default guest-access card when no code exists, plus selected-state copy and explicit play-format labels.
5. P2: the GPS module treated a Beta setup shell as a playable card and appended a floating bubble to the document. Fix: require the Beta GPS slot before mounting.

No actionable P0, P1, or P2 differences remain for the requested scope.

final result: passed

---

# Shared GPS calibration and active-theme QA

## Evidence

- Source visual truth: `C:/Users/GUEST/Documents/Codex/2026-08-23/loo/.codex-remote-attachments/01a02fb4-48a5-7c92-8158-223b000a2851/719cbe15-e418-4ac4-93bb-a04e599a6e6b/1-Photo-1.jpg`.
- Rolla member GPS: `design-qa-assets/rolla-gps-light-v1.142.0.png`.
- Quick Round light and dark: `design-qa-assets/quick-round-light-v1.142.0.png` and `design-qa-assets/quick-round-dark-v1.142.0.png`.
- Quick Round GPS: `design-qa-assets/quick-round-gps-light-v1.142.0.png`.
- Combined reference comparison: `design-qa-assets/gps-reference-comparison-v1.142.0.png`; both source and implementation were normalized to 720 px high with aspect ratio preserved.
- Browser surface: Codex in-app browser at the live local preview, 1280 x 720 screenshot viewport.
- States: Rolla tournament member view, Hole 1; Red Trail Links Quick Round, Hole 2; active Light and Dark themes. The user's original Medicine Wheel theme was restored after capture.

## Comparison

The calibrated Rolla map preserves the reference's full-hole satellite composition, player-to-green line, prominent distance pill, hole navigation, floating live-GPS control, attribution, and bottom scoring dock. The score dock now uses a light surface in Light mode and the primary Add score action remains green and legible. DFL identity and controls remain intentionally distinct from TheGrint branding.

Quick Round now uses the app's semantic surface, text, border, accent, warning, and score-result tokens. Its hole header, player name, score summary, Scorecard action, Add score control, and bottom round actions remain readable in both captured themes. The same hole GPS opens from the yardage medallion and retains official yardage when browser geolocation is denied.

## Calibration and interaction checks

- Commissioner-only tee and green calibration is stored on the shared `golf_course_holes` record, not in one device's local storage.
- A commissioner can select a hole, choose Set tee or Set green, then tap the satellite map or use the phone's current GPS position.
- A good location fix within 140 yards of a calibrated tee automatically selects and locks that physical hole for the session.
- Follow mode is on by default, recenters as accepted GPS fixes arrive, and can be resumed after a manual map drag.
- Shared geometry overrides the original Rolla fallback coordinates for every member and for both tournament and Quick Round surfaces.
- Browser geolocation was denied by the in-app browser, so the accepted-fix movement path was verified through focused distance/detection tests rather than fabricated browser coordinates.
- Live database checks confirmed the new geometry columns, existing public-read and commissioner-write RLS coverage, and the calibration-editor foreign-key index.

## Comparison history

1. P0: nullable shared coordinates were initially converted with `Number(null)`, producing a valid-looking zero coordinate and a blank/incorrect map. Fix: reject null or empty latitude/longitude values before numeric conversion. The satellite map and Rolla hole geometry were rechecked afterward.
2. P1: Quick Round's fixed workspace used hard-coded dark surfaces and low-contrast copy in Light mode. Fix: replace the active workspace, scoring sheet, scorecard, controls, and result markers with the app's theme tokens. Light and Dark captures are readable.
3. P1: the GPS score dock stayed dark in Light mode. Fix: the dock, calibration sheet, and GPS controls now inherit the active theme while the satellite overlay retains high-contrast map controls.
4. P2: the new `gps_updated_by` foreign key initially lacked a covering index. Fix: add `golf_course_holes_gps_updated_by_idx`; the Supabase performance advisor no longer reports that warning.

No actionable P0, P1, or P2 differences remain for the requested scope.

final result: passed

---

# Commissioner identity card system QA

## Evidence

- Source visual truth: `C:/Users/GUEST/Documents/Codex/2026-08-23/loo/.codex-remote-attachments/01a02fb4-48a5-7c92-8158-223b000a2851/91416fa3-59d7-42a4-acbe-b3dfe25467f2/1-Photo-1.jpg`.
- Implementation screenshots: `C:/Users/GUEST/Documents/Codex/2026-08-23/loo/outputs/admin-card-standard/profile-fairway.png` and `C:/Users/GUEST/Documents/Codex/2026-08-23/loo/outputs/admin-card-standard/golf-fairway-final.png`.
- Combined comparison: `C:/Users/GUEST/Documents/Codex/2026-08-23/loo/outputs/admin-card-standard/comparison-final.png`.
- Source pixels: 591 x 1280, normalized to 390 x 844.
- Implementation pixels and CSS viewport: 390 x 844 at device scale factor 1.
- State: signed-in member, Fairway Light, Profile and Golf card families.

## Findings

No actionable P0, P1, or P2 differences remain at the shared-component level.

- Fonts and typography: Rajdhani, uppercase headings, tracked micro-labels, weights, and line height match the Commissioner identity card language.
- Spacing and layout rhythm: the 16px radius, 16px inset, thin edge, restrained depth, and 12px stack gap reproduce the reference rhythm without changing route-specific layouts.
- Colors and visual tokens: Fairway cards use the same pale wash, sage hairline, deep blue-green text, and low elevation as the reference. Other palettes derive the same treatment from their semantic tokens.
- Image quality and asset fidelity: existing crest artwork remains the original raster asset. A Fairway watermark treatment issue found in the first capture was fixed and the clean reload is clear.
- Copy and content: no app copy, score, event data, or control was changed.

## Comparison and interaction evidence

The normalized side-by-side view shows the source Commissioner card beside implemented Profile and Golf cards. Card edges, wash, type, capitalization, label tracking, button treatment, and depth are consistent. The Golf crest is an intentional feature-level identity layer over the shared surface. The full mobile view retained enough card detail that a separate focused crop was unnecessary.

- Navigated Home, Keepers, Golf, and Profile through the mobile shell.
- Switched to Fairway Light, captured the target states, and restored Medicine Wheel.
- Reloaded Golf to verify the watermark fix after a clean paint.
- Browser logs contained no errors. Repeated local reloads produced development-only Supabase multiple-client warnings; no interaction failed.

## Comparison history

1. Initial comparison: one P2 paint artifact appeared behind a Fairway Golf watermark.
2. Fix: include Fairway in the light-surface watermark treatment and perform a clean reload.
3. Post-fix comparison: the artifact is gone and the card surface remains consistent with the Commissioner reference.

final result: passed
