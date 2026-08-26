# DFL heritage seal replacement — design QA

## Evidence

- Source visual truth: `icons/dfl-seal-heritage.jpg`
- Source dimensions: 1280 × 1182 RGB.
- Implementation screenshots:
  - `design-qa-assets/brand-mobile-home.png`
  - `design-qa-assets/brand-mobile-golf.png`
- Combined comparison: `design-qa-assets/brand-comparison.png`
- Browser: Codex in-app browser.
- CSS viewport: 394 × 852 at device pixel ratio 1.
- Captured implementation pixels: 378 × 820.
- State: dark theme, signed-in member, home and golf event-list routes.

## Full-view comparison

The combined comparison places the supplied seal beside the running golf page. The top-left brand mark uses the supplied artwork, remains circular, and does not change the topbar height. Golf event cards use the same supplied seal as a large, cropped, low-opacity watermark without a rectangular edge.

## Focused-region comparison

The header and event-card regions are readable in the phone capture, so a separate crop was not required. The splash references the same image URL and retains the existing centered splash dimensions and animation; its timed state was verified from the rendered DOM and source binding rather than a stable screenshot.

## Required fidelity surfaces

- Fonts and typography: unchanged; the replacement introduces no live text or font changes.
- Spacing and layout rhythm: unchanged. The header mark remains 36 × 36 CSS pixels; card watermark boxes retain their established dimensions and placement.
- Colors and visual tokens: the supplied monochrome artwork is preserved. Existing opacity and light-theme inversion rules remain in effect.
- Image quality and asset fidelity: the original 1280 × 1182 JPEG is retained as source truth, with 512px and 64px WebP derivatives used by the app for faster loading. Circular clipping prevents its black rectangular source canvas from appearing as a box. No generated or approximate substitute is used.
- Copy and content: unchanged.

## Findings

No actionable P0, P1, or P2 differences remain. At 36px, the header version is intentionally a recognition mark rather than a detailed illustration; the full detail remains available in the splash and larger watermark treatment.

## Comparison history

- Initial implementation showed the supplied source correctly but retained a rectangular source canvas on watermark layers.
- Fix: applied circular clipping and black image backing only within the circular mark boundary.
- Post-fix evidence: `design-qa-assets/brand-mobile-golf.png` and `design-qa-assets/brand-comparison.png` show clean circular header and card treatments with no visible square edge.

## Interaction and runtime checks

- Home and Golf navigation states loaded successfully.
- Header/profile and bottom navigation remained visible and aligned.
- Browser console: no logo or rendering errors. A pre-existing Supabase warning appeared because the QA session opened the app in multiple tabs under the same browser storage key.
- Production build: passed.
- Test suite: 515 of 515 tests passed. One slower Arena simulation required a 15-second timeout on the verification machine.

## Final result

final result: passed
