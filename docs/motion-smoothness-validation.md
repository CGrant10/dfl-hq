# Mobile motion and responsiveness — 1.458.0

This pass reviews shared motion and interaction behavior across Home, Clubhouse, Trade, Sportsbook, player sheets, matchup navigation and Arena. It preserves the existing layouts, live score flights, broadcast effects, swipe previews and fixed navigation. There are no new data requests, database changes, dependencies or frame loops.

## Reproduced issues and fixes

- A rapid second tab selection restarted the shared underline at the previous tab’s destination. A controlled interruption at 90ms reproduced an 18.70px position jump and a 4.43px width jump. The new glide reads the currently drawn line before changing its target; both jumps measure zero in the same fixture. Opposite-direction interruptions are also checked.
- Native touch input reproduced delayed `:active` feedback: the button remained full size during the hold, then visually stayed pressed after release. A single delegated, passive press controller now marks the visual state on pointer down without replacing native clicks. Release, cancellation, a drag beyond 10px, scrolling, Escape, window blur, page hiding, rotation and motion preference changes release it. Keyboard activation remains native, disabled controls never press, and no pointer capture or preventDefault is introduced. Explicit actions use a brief 90ms press / 150ms release, including native dialogs and Arena controls. Tab geometry remains unscaled.
- Score docks rewrote unchanged ARIA labels/visibility on every scroll frame. These writes are now conditional; current team names, scores, context changes and accessibility labels still update when their content changes. Clamped title transforms and progress writes also skip unchanged values.
- Tab edge cues now read all strip/root geometry before writing visibility and positions, and avoid repeated identical style writes. Cue appearance, native horizontal scrolling and keyboard reveal behavior are preserved.
- A filled action in a native dialog could inherit the legacy accent-colored hover text after touch, making red text on a red fill in Light mode. The dialog action retains the theme’s existing action foreground. Ghost, secondary, danger and member/NFL colors retain their own treatment.

## Measurements

The same isolated production Home/Trade scroll fixture was run before and after with 60 scroll positions and two warm passes at 390px. Home attribute mutations fell from 222 to 102 (54%); the warm Trade pass fell from 240 to 60 (75%). Unchanged `aria-label`, `aria-hidden` and hidden-state mutations dropped to zero. Remaining style writes drive the visible effects. Raw CDP timings and mutation counts are in `docs/motion-smoothness/`; timings vary with the hosted browser and should not be interpreted as phone frame rates or a guaranteed user latency improvement.

Anonymous production phone telemetry was inspected read-only. The latest available release in the seven-day sample was 1.452.0 with only two interaction samples, which is insufficient to establish current-release performance. No new tracking or real league activity was generated for the audit.

## Verification

- `pnpm check`: 2,007 tests across 244 files, release/type/name/theme checks and the production build passed. Final build retains startup at three modules and Home at four; the previous 1.457.0 bundle is unchanged.
- New production shared-controller review: 90 checks across 320/390/768px in Light/Dark. Covers interrupted underline positions, trusted touch hold/release, cancellation, scrolling over controls without accidental activation, unchanged layout, keyboard input, disabled controls, Arena-style actions, native popup presses/readable foregrounds, reduced motion, app motion-off, cleanup, page overflow and stable scroll metadata.
- Existing continuous swipe-tab review, 37 route checks, scroll-flight/depth regression, matchup snapshot transitions and mobile player/bet-sheet gesture review passed. Existing Arena regression: 309 checks, no browser exceptions, all-racer visibility and commissioner/viewing controls intact. Sheet tests submitted no bets or backend writes.
- Actual Light/Dark screenshots of mobile score flights/docks and native action states were inspected. Samples and machine-readable checks are in `docs/motion-smoothness/`. The motion regression now runs within the existing Home design review workflow.

Physical iPhone/Android frame pacing, iOS native touch/browser quirks and VoiceOver/TalkBack speech remain unverified. The test fixtures use production controllers/styles with isolated league data and do not establish complete WCAG conformance or a universal 60fps guarantee.
