# Live tickets and Activity refinement — 1.564.0

Extends the approved Matchup Desk and printed-slip direction: compact Inter,
flat ruled surfaces, aligned values and Medicine Wheel Dark/Light tokens. No new
visual concept or replacement artwork. Current games remain primary; early
lines stay collapsed. The printed shared receipt keeps its selected design.

## Evidence and comparison

Baseline captures: `/workspace/dfl-live-1564/activity-before/` and
`/workspace/dfl-live-1564/results-before/evidence/`. Final browser captures:
`/workspace/dfl-live-1564/activity-accessible/` and
`/workspace/dfl-live-1564/live-final/`. Opened and inspected combined comparisons:
`comparison-activity.png` and `comparison-tickets.png` in the same scratch root.
These use identical synthetic records before/after, uniformly displayed at
390px width without stretching; the ticket comparison is scrolled to the same
result examples. Its intermediate renderer uses legacy wrapper typography;
`live-final/390-dark-tickets.png` is the final actual-page layout, with inline
small odds and two bounded rows. Compiled current-data Home/Book evidence is in
`actual/`. Synthetic wagers and inbox entries are fixtures, never real activity.

## Findings and refinements

- My bets previously expanded every leg and placed money below the picks. Stake
  and return now lead; two priority legs show at once. A missed or trailing leg
  is surfaced even when sixth in the accepted order. The full slip retains every
  leg in its original order and the button explicitly names the total count.
- A live tie no longer says Push, nor does one completed leg make an entire
  unresolved multi-leg bet Winning. Trusted final leg observations on an open
  account entry say pending; an estimated losing return is zero. Official paid
  amounts override quoted potential return. Nothing credits a wallet or settles
  an entry in this presentation layer.
- Prop progress uses the accepted line, with explicit over/under comparison.
  Unknown stats stay unknown; a real zero remains visible. Missing/invalid odds
  display an em dash. Invalid progress ranges have no bar. The small fill moves
  through a bounded transform, respects Reduced Motion and app motion settings,
  and preserves its node during refreshed stats. No new polling or frame loop.
- Activity replaces nested rounded cards with ruled rows. Trade previews retain
  full team names, a lead player/photo and explicit additional-player counts.
  Clip previews preserve image ratio; read/dismiss updates preserve unchanged
  rows and photos. Header, metadata, filters and trade rows reflow at large text.
  Receipt/clip destinations, clear confirmation and notification settings stay
  available. No push delivery/settings behavior changes.

## Fidelity surfaces

Typography: existing local Inter; small secondary labels, tabular money/stats,
wrapped names and aligned odds. Layout: existing mobile margins, flat separators,
stake/return summary and 44px actions. Color: shared surface/text/rule/focus tokens,
crimson selection, text-labeled semantic green/red outcomes. No legacy blue or
redundant Medicine Wheel choice. Existing player photos and official Bootstrap
result icons are reused; no new image, font, mascot or shield asset. Full printed
receipt, Share/Save/text and source-row open/close motion remain in place.

## Validation

- `pnpm check`: 2,515 tests across 304 files; release/theme/type/name/build pass.
  Final CSS rebuild passes; 88 app modules, three startup/four Home modules,
  one shared stylesheet request. `pnpm themes` passes after final changes.
- New persistent live-ticket browser fixture: 48 checks, 320/390px Light/Dark,
  accepted versus moved lines, actual zero/missing stats, under/unknown sides,
  priority previews, full six-leg receipt, estimated zero return, live refresh
  preserving node identity, Reduced Motion and 200% text. Added to existing CI.
- Existing result fixture: 48 checks. Sports-desk interaction suite: 80 checks,
  including current/early ordering, draft retention, focus/scroll return,
  interrupted motion, keyboard, app motion off and route cleanup. Shared-image
  regression: 75 checks including full tickets and native-share gesture handling.
- Activity: six Light/Dark × 320/390/768px contexts, plus 200% text at 320/390px;
  filters, settings, clear cancellation, read/dismiss, picker/injury links,
  focus and stable row/photo identity pass without browser errors.
- Real-data compiled Home/Book captures use read-only provider calls and mocked
  account operations. No real wager, claim, notification or league write.

Physical iOS frame pacing, native share delivery and VoiceOver speech are not
measured. Reviewed normal/large layouts have no remaining actionable P0/P1/P2.

final result: passed
