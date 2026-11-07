# Trade result reading — 1.559.0

Check a Trade starts with the existing overall recommendation. Complete outgoing
and incoming packages follow in equal columns, with current team names, player
portraits, fully readable replacement buttons and right-aligned player values.
Package totals align beneath both sides, including unequal package counts.
Balance, lineup impact, injury/availability flags, required drops and deeper
evidence follow the packages. Three-team results retain every explicit route
and receive the same verdict-first hierarchy. Values and recommendations still
come from the same evaluator used by offer suggestions.

Large text reflows result packages into full-width rows. The existing comfortable
reading preference remains supported. The roster picker keeps value digits on
one line. Native editing, replacement, Undo, recipients, saved offers and
shareable-card data remain on the existing handlers.

Expanded offer editing keeps both packages compact and replaces the separate
name/Swap rows with one accessible full-player replacement button. Portrait,
name and visible Swap cue all open the same picker. Team identity stays visible
above each package. The review action uses the shared action fill/ink tokens,
with a minimum 44px target. Draft edits retain unaffected portraits.

The existing connected portrait transition uses a short opacity settle for
analysis and return, with an eased 320ms opening/260ms return. It measures any
in-flight portrait before canceling the prior flight, so an interrupted Back
starts at the painted position. No transform is applied to the text surface,
keeping portrait destinations stable. Flights stay bounded to six and clean up
on interruption, resizing, navigation and teardown; Reduced Motion/app motion
preferences remain authoritative. No extra polling, backend functions or
provider calls. Styling extends the existing shared sheets.

Validation: pnpm check passes release/theme/type/name checks, 2,486 unit tests
and production build. Application module counts remain 88, with three startup
and four Home modules. Real-page/component coverage includes:

- 100 editing checks across Light/Dark at 320/390px: hierarchy, equal columns,
  aligned totals, readable names/contrast, 200% reflow, swap/cancel/Undo, selected
  checkboxes, three-team recipients, scrolling, Reduced Motion and cleanup.
- 104 offer-board checks: compact complete offers, comparison alignment,
  actual-player replacement via Swap cue, theme contrast, preserved photos,
  reset, large-text comparison and three-team destinations.
- 112 offer-reading checks, including 768px, native disclosure reversal, lazy
  previews and preserved reading position while extending offer results.
- Connected transition checks at 320/390px, including a paused frame-zero
  interrupted return compared to the previous actually painted position.
- Existing picker motion/control cases in both themes and sizes; 37 receipt
  motion/route checks. Current-data compiled offers, comparisons, expanded edits
  and result/Back flows render in both themes without errors or page overflow.

Fixtures block league writes. Actual app verification permits provider reads
only. No test trades, shares or league messages are sent. Physical Safari frame
pacing and VoiceOver speech are not measured.
