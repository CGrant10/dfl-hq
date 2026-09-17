# DFL Home — Design QA

- Source visual truth: `C:/Users/GUEST/Documents/Codex/2026-08-31/okay/.codex-remote-attachments/01a05a88-a21b-7f51-8231-82aa8376e4e7/2ed396b2-207f-4ece-aa01-3c590a12054e/1-Photo-1.jpg`
- Browser-rendered implementation: `qa/home-implementation.png`
- Combined comparison: `qa/home-comparison.png`
- Browser/runtime evidence: `qa/home-console.json`
- Viewport: 592 × 1280 CSS px at DPR 1.
- Source pixels: 592 × 1280. Implementation pixels: 592 × 1280. No density normalization required.
- State: Martin77 signed in, current live DFL data, My Week active.

## Findings

No actionable P0, P1, or P2 visual mismatches remain.

- Fonts and typography: the implementation uses the app's Rajdhani display face with source-matched condensed headlines, cream body copy, uppercase metadata, and numeric emphasis. Live names and scores wrap or clamp without breaking the composition.
- Spacing and layout rhythm: the browser measurements align the major source bands: top bar 100px, anniversary ending at 194px, featured card ending at 555px, Power Rankings at 569–983px, Weekly Report at 983–1169px, and the enlarged persistent navigation below.
- Colors and visual tokens: Home is intentionally locked to the source's black/cream/green broadcast palette so member light themes cannot wash it out. Red is absent from the primary composition except when live movement semantics require a down state.
- Image quality and assets: the real DFL crest, mark, member profile images, and existing stadium asset are used. The matchup watermark and stadium atmosphere remain subtle enough to preserve text contrast.
- Copy and content: the source hierarchy and labels are preserved while scores, team names, rankings, movement, records, and report stories come from live DFL data.

## Full-view Comparison Evidence

`qa/home-comparison.png` contains the original 592 × 1280 source and browser-rendered implementation together. Both use the same four-part Home composition and nearly identical vertical proportions: anniversary masthead, rotating matchup feature, always-visible Power Rankings, and a three-column Weekly Report above the persistent navigation.

## Focused Region Comparison Evidence

- Featured card: four tabs, large outcome headline, two-column score treatment, crest watermark, progress rule, pagination dots, and pause control are present and aligned.
- Power Rankings: header, week context, personal rank, league leader, top three, ellipsis, highlighted personal row, records, movement, and view-all action match the source structure.
- Weekly Report: three separated highlights, icon rail, compact metadata, stronger titles, and readable two-line live-data handling match the source density.

## Interaction And Runtime Checks

- Playwright selected My Week, Power Ranks, Next Move, and Report successfully; every tab reported `aria-selected="true"` in turn.
- The rotation control changed from Pause to Play and preserved its accessible label.
- TypeScript, unresolved-name validation, 68 test files / 763 tests, and the production Vite build pass.
- The only console network responses are the already-known optional `trade_alerts` table 404s; they degrade safely and do not alter or block Home. The table still requires its Supabase migration before trade alerts can activate.

## Comparison History

1. Previous release incorrectly validated Analyzer styling instead of Home against the approved mock. That evidence was discarded.
2. First correct browser capture exposed the saved light member palette washing out the source design and a profile reminder covering the screen. The reminder was dismissed in the QA harness and Home received an isolated dark broadcast token set.
3. Second capture aligned the major bands but showed undersized chrome, a hidden anniversary tagline, lower utility content entering the first viewport, and tiny report copy. The top and bottom chrome were resized, the incorrect tagline selector was fixed, the dashboard/report heights were measured to the source, and report copy was shortened and enlarged.
4. Final browser capture and combined comparison show no remaining P0/P1/P2 fidelity issues.

## Follow-up Polish

- P3: the mock depicts commissioner-only controls and a profile photo in the header. The live header continues to show controls according to the signed-in member's actual privileges and available profile data.

final result: passed
