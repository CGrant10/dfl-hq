# Sportsbook Matchup Desk and printed ticket — 1.562.0

Source visual truths (resolved from displayed option order):
- Page: earlier option 2, `/workspace/generated_images/exec-3a11505c-8a82-4104-9287-8f59b3c99f2b.png`.
- Share: latest option 2, `/workspace/generated_images/exec-08d8c0b3-0043-4600-bfad-a9fa87fe793b.png`.

Browser implementation: `/workspace/dfl-book-1562/visual/book-reference-state.png` and `slip-won.png`. Full source/implementation comparisons are `/workspace/dfl-book-1562/comparison-page.png` and `comparison-slip.png`; detailed selection/totals comparison is `comparison-slip-detail.png`. These combined images were opened and inspected together, not judged from filenames or separate captures.

The page source is 1487×1058 with an app crop at (100,56), 470×953, uniformly scaled to 390×791 CSS pixels. Its surrounding presentation/share graphic is excluded. The corresponding actual page capture uses 390×791 at deviceScaleFactor 1. Additional real-page checks use 320/390/430×844, both themes and 200% text. The ticket source is 1096×1440; the implemented 1080px-wide canvas grows with measured content. Both are displayed at 390px width without distortion. Fixture dates, teams and selected-pick counts differ; these are illustrative tests, not live match/result claims. Actual-provider compiled captures are in `/workspace/dfl-book-1562/actual/`.

## Findings and comparison history

The initial pass found a P2 oversized floating pick bar, excess header/section spacing, and a selected check covering the owner photo. The bar now uses one row with count/combined odds, Review and Clear; all selected legs remain in the existing review sheet. The paired board keeps photos visible. The masthead, secondary rows and redundant week eyebrow were tightened, and the own-matchup names/photos given clearer emphasis. Re-captured the page and inspected `comparison-page.png` against `comparison-page-initial.png`.

The first ticket pass used underweighted labels and the app font for receipt tallies. It now bundles the licensed IBM Plex Mono Latin font (14.7KB WOFF2), strengthens selection/owner lettering, and uses the selected italic banter treatment. Revised `comparison-slip.png` and `comparison-slip-detail.png` were inspected against `comparison-slip-initial.png`.

No actionable P0/P1/P2 findings remain. The reference's smaller visual controls are adapted to 44px touch targets. The production shell stays consistent with other pages; its header/nav are not replaced with the mock's decorative framing. Consequently fewer lines fit without scrolling than in the illustrative board. The board preserves each market's real lock time, member ordering and complete names. It retains the recognizable Sportsbook route title rather than the concept name “Matchup Desk”; no new personalized duplicate card or invented date/odds is added.

## Required fidelity surfaces

- Typography: local Inter for compact app text and strong tabular odds; uppercase own-matchup names are distinct without breaking words vertically. Receipt headings/selections use Inter, tally/reference/date use licensed IBM Plex Mono. Full names wrap and the export grows rather than shrinking to unreadable type. Labels, odds and price baselines align. Comfortable/large text is retained.
- Spacing/layout: paired team identities on a flat ruled surface, centered VS, equal full-width odds controls below each team, outside own-matchup rule and slim review strip. Tiny devices/enlarged type can stack the sides. The paper receipt has a brand/reference header, entry/owner/status area, numbered selections, individual outcome icons, ruled tally, dark payout strip and banter footer. Long/full tickets grow vertically; compact omissions are explicit.
- Colors/tokens: all page text, surfaces, borders, selected controls and rail colors use shared Medicine Wheel tokens. Pressed price contrast checked in Light/Dark. The fixed light exported ticket matches the selected bone/crimson/charcoal art direction regardless of the app theme; result colors are meaningful. No retired blue or extra theme option.
- Images/icons: actual round DFL seal and existing member-photo preference/fallback pipeline; no shield or mascot substitutes. The blank perforated paper is a generated raster asset matching the source, compressed to 22KB. The receipt's check/cross/push/clock use official Bootstrap Icons paths with existing MIT attribution. No new page artwork/request. The clean dynamic status stamp deliberately omits the mock's distressed ink texture; decorative barcode/hash flourishes are omitted rather than implying a retrieval action. These are P3 treatments.
- Content: real accepted odds, stake, settlement and return values remain authoritative. Open/live results use pending/potential wording; provisional hits do not imply paid tickets. Lost/void/pulled returns preserve existing semantics; no profit is shown as a winning payout. Only available verified final numbers appear. Ticket references/date are actual metadata, never generated example IDs or the current week's date. Fixtures test ten full picks and a losing final leg.

## Verification

`pnpm check`: 2,505 tests in 303 files plus release agreement, themes, types, names and production build. Build retains 88 app modules, three startup/four Home modules and one shared-style request.

Real-page fixture at 320/390/430px in both themes checks paired price geometry, complete names, 44px targets, selected contrast, claim bounds at 200% text, prop/Over/Under layout, Pick’em, reduced motion and rapid tab settling. Mock claim failure/retry, single-flight, authoritative balance and late navigation stay intact. New visual checks pass 44 cases, including loaded owner photos, theme contrast, enlarged names and all receipt text inside safe bounds for won/open/lost/void/pulled/ten-pick states. Existing share suite passes 75 checks, including gesture-bound native Share, Save, remembered non-ticket style, full exports, focus, route teardown and unchanged other share types. Existing slip suite passes 24 layouts, including six picks, review/confirmation, stake updates, balance changes and close focus. Result fixture passes 48 checks for final/provisional results and failed-feed recovery. Compiled actual-data app captures render Book/props/Pick’em in both themes without horizontal overflow or browser errors. All account changes/claims are fixtures and remote mutations are blocked.

Implementation checklist: both selected targets applied to existing production components; existing controls/actions preserved; generated paper and real identity assets placed; P2 issues fixed and re-captured; combined comparisons reviewed; Light/Dark and enlarged text checked; release/build and relevant browser interactions validated.

Physical iOS animation frame pacing, OS share sheet delivery and VoiceOver speech were not measured. No real wager, league change or message was sent.

final result: passed
