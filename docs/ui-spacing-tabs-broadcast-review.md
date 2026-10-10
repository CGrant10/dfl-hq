# Edge spacing, tab motion and broadcast — v1.356.0

Fresh screenshots of the current app and read-only interaction checks grounded
this pass. The initial captures are numbered in `/workspace/dfl-ui-1356/`.

## Review and resulting behavior

1. **Screen edges — healthy after correction.** Home had 16px gutters while
   ordinary pages used 14px. All ordinary page surfaces now use 16px on both
   sides, resolving left and right phone safe-area insets independently. Home
   keeps its own full-width wrapper and the same content gutter. Centered
   desktop layouts and the separate Broadcast, Arena and Golf stages remain.
   The spacing matrix covers 17 public pages at 320, 390, 768 and 1280px.
2. **Selectable tabs — healthy, shared motion.** Week Ahead, player-position,
   League Feed and GameDay watch tabs join the existing sliding selection
   controller used by Trade, Sportsbook and archive pages. The line follows the
   selected tab over 260ms, and the selected content fades in over 180ms.
   Mouse and keyboard intent can move it; data refresh does not replay motion.
   Font loading, nested-panel visibility and disclosure changes settle the
   marker at the current geometry. Rapid switches keep a single marker. Native
   tab selection, arrow-key focus, preference-off and reduced-motion behavior
   retain immediate usable content. Removed tab strips release their old marker; reconciled live panels recreate
   it if their renderer removes the decoration.
3. **Broadcast — healthy after correction.** The Auto Scout previously received
   a generic, cropped editorial wordmark. It now carries the actual candidate,
   position/team, existing recommendation and current trade-contact team name.
   The player photo has explicit dimensions and a readable initials fallback.
   The slide retains its Analyzer destination and stage playback/swipe controls.
   Generic editorial wordmarks use contain framing. Arrows and pause controls
   have 44px targets with spacing below the story. Text-size changes invalidate
   the stage height cache. Champion, Chip Eater, injury, slate, trade and other
   existing illustrations and calculations retain their meaning and artwork.

## Verification and evidence

- `pnpm check` passed: TypeScript, unresolved-identifier checks, 145 test files /
  1,297 tests and production build. Final Scout mapping and stage changes also
  passed TypeScript and 66 focused tests.
- Read-only browser checks cover 17-page edge geometry, Home and existing page
  tab transitions, mouse/keyboard focus, rapid switches, nested tabs, reopening
  disclosures, resizing and motion preferences.
- The broadcast review checks all 11 current slides at phone, tablet and desktop
  sizes, fixed height through rotation, and light/dark/Medicine themes. The
  production-component Home fixture supplies extra authored imagery, long text,
  injury cases, scoring/reaction states and independent stage keyboard controls.
- Initial captures whose top edge sat underneath the fixed header were rejected
  as artwork evidence. Final stage captures explicitly leave the header clear.
  A theme sample during a transition was repeated on a settled frame.

Artifacts and reports are in `/workspace/dfl-ui-1356/`, with the production Home
fixture in its `fixture/` subdirectory. Browser requests block league writes;
wallet balance is a UI fixture. No wager, post, reaction, profile save or league
change was submitted. Chromium layout and keyboard checks do not establish
native iOS/Safari or screen-reader conformance; device safe-area behavior was
not physically tested.
