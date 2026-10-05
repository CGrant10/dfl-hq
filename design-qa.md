# Quiet Editorial Home — v1.297.0

Source visual truth: `/workspace/generated_images/exec-c1f11ce4-6b24-4b36-8ffd-c952f1aac75a.png` (latest ideation option 1). User amendment: retain existing fire and ice effects and their timing rules.

Implementation: `/workspace/dfl-audit/editorial-1.297.0/home-390.png`.
Full-view paired evidence: `/workspace/dfl-audit/editorial-1.297.0/comparison.png`.
Viewport: 390 × 844 CSS pixels, deviceScaleFactor 1. Source 853 × 1844 pixels displayed at 390 × 844 beside the 390 × 844 implementation using browser HTML. Source ratio differs by less than 0.3%; no device chrome is included.
State: medicine palette, Home, first league matchup slide, compact GameDay, collapsed rankings. Scores reflect read-only live data, not static mock scores. The verification member is azhee28, so identity and commissioner-only controls differ from the mock's cgrant10 account.

## Comparison history

- P2: Opening slide headings and its action clipped inside the original 163px content box. Fixed the stage/content allocation and reduced internal gaps. Final comparison shows the complete heading, teams, score-source labels and All matchups action.
- P2: Legacy four-row faceoff grid and Home margins created excessive space. Reset grid rows and slot margins; moved live tracker details into a remembered disclosure. Existing lineup, bench, leaders, banter and highlights remain available.
- P2: Injury preview overflowed its compact slide. Kept two players per slide, removed duplicate description text from the preview, compressed rows, and retained the full report button and dialog. Evidence: `slide-next.png`; original injury detail remains in the report.
- P2: Rankings column headings wrapped because the previous TEAM spanning rule expected five grid tracks. Restored five matching tracks and aligned rank, portrait, name, record and movement.
- P2: The final-matchup share button added a large block to the summary. Converted it to a quiet text-sized action beside the disclosure when collapsed; sharing remains available.

## Required fidelity surfaces

- Typography: existing locally hosted Rajdhani for display/data and system sans for controls. Modest headings, compact actions, tabular scores, wrapping team names. Existing accessible thermal score labels retained.
- Spacing/layout: continuous flat surface, hairline dividers, 20px mobile gutters, compact broadcast and GameDay, grouped rankings. No nested Home cards. The persistent ticker and actual/projected score labels are retained production features, so lower ranking rows continue below the first viewport. Rankings remain directly below GameDay rather than behind a disclosure.
- Colors/tokens: member theme inks retained, medicine palette by default, red/yellow role switch unchanged in behavior. No broadcast weave, light sweep, corner decoration, gradients or textures introduced. Banner artwork and existing GPU score effects retain their approved treatments.
- Images/assets: reuse the exact approved anniversary WebP and supplied DFL seal. Keep existing real league/team/player portraits and identity fallbacks rather than inventing fake team logos. Existing uploaded broadcast art remains real media, displayed without decorative layers. Standard icons reuse the app's sprite library. No new illustration assets or CSS art added.
- Copy/content: current Week 4 fixtures, actual score-source labels, live scores, Week 3 power rankings and owner row. All matchups opens Clubhouse matchups. Existing injury/history/custom-story slides remain in the carousel. GameDay exposes its full tracker through a disclosure and Watch.

## Verification

- Browser-rendered 320, 390 and 1280px captures: no horizontal overflow.
- Carousel next/previous, progress, pause/play; rankings expand/collapse; player tracker tabs; refresh preserves open disclosure; Watch opens and closes.
- Scoped axe audit over Home, topbar and nav: zero WCAG A/AA violations; zero browser page errors.
- Real WebGL fixture checks: player >15 hot at any point; team >120 hot; cold suppressed until after halftime; hot and cold render in compact Home and Watch. Motion off and reduced motion stop the renderer. Test-only response overrides made no production writes.
- `pnpm check`: typecheck, identifier scan, 1086 tests across 122 files, and production build passed.
- Service worker precaches the new stylesheet and release/cache versions advance together.

## Follow-up polish

P3: Source mock shows invented multicolor team monograms and fewer production controls. Existing identities, refresh/motion/share actions and the persistent ticker are intentionally retained. This adds a little vertical scroll compared with the mock.

final result: passed
