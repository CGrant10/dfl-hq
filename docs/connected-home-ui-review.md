# Connected Home UI — v1.357.0

The Home planning panels now put useful content ahead of repeated labels.
Horizontal touch swipes select Week Ahead views through the existing tab
controller and moving highlight. Player portraits travel from the tapped
identity into the shared player card, and trade receipts expand from their
summary height. Phone champion and Chip Eater slides give the name a full-width
row and keep their existing artwork contained below it.

## Flow review

1. **Home planning — improved.** Removed the duplicate briefing title, forecast
   captions, position header and Start / Sit title. Kept the week forecast,
   actual/projected point labels, live status, current team name, injury warnings,
   lineup gain and Analyzer/Playoff links.
2. **Week Ahead touch navigation — verified.** Swipe forward/back without
   wrapping at the ends. Normal vertical scrolling, short drags, selected text,
   position controls and a second finger do not switch views. Mouse and keyboard
   controls retain their behavior. A swipe uses the same selected tab and rail.
3. **Player details — verified.** A visible source portrait connects to its
   detail portrait in 280ms, above the modal backdrop. The temporary visual is
   hidden from assistive technology and cannot receive taps or focus. Fast and
   slow data responses work. Escape, route changes, rapid dismissal and motion
   cancellation remove the visual and restore the original portrait. Existing
   focus return remains intact. Missing/hidden sources and older browsers use
   the ordinary detail entrance.
4. **Trade receipts — verified.** User-opened receipts expand from the summary
   to their natural height in 260ms. Rapid toggles settle without a fixed height.
   Player controls inside receipts use the shared portrait transition.
5. **Phone broadcast — improved.** Champion/Chip Eater names use the full upper
   row at widths up to 480px. Existing artwork uses `object-fit: contain` in the
   lower illustration column, with subtle transparency. Copy and controls stay
   clear of the artwork. Deck rotation reserves a stable height.

## Validation

- TypeScript, identifier checks, all **1,304 tests**, and production build pass.
  The full suite used two workers after a heavily concurrent run timed out in
  an unchanged Arena timing test.
- 335 browser assertions cover real touch input, highlight alignment, keyboard
  focus, motion preferences, portrait cancellation, four themes and broadcast
  rotation at 320/390/480/768px. These are production-component fixtures with
  isolated player data.
- Long-name broadcast checks also pass at 320/390px with 200% text, alongside
  control-origin gestures and enlarged Home tabs.
- 16 checks against the real app cover player data loading, connected portrait
  motion, focus return and receipt expansion/rapid toggles. All reads were
  guarded; no league writes or wagers were submitted.
- Added six swipe regressions, including the browser's implicit capture transfer
  from child text to the panel. The Home browser workflow now exercises actual
  touch swipes and fast/slow player-card loading.
- The offline shell includes both new modules.

## Accepted screenshots

Fresh captures from this review; each linked image was inspected.

- [Before: repeated lineup labels](/workspace/dfl-connected-1357/before-startsit.png)
- [After: lineup content](/workspace/dfl-connected-1357/after-startsit.png)
- [After: player leaders](/workspace/dfl-connected-1357/after-players.png)
- [Before: narrow champion name](/workspace/dfl-connected-1357/before-champion.png)
- [Phone champion composition](/workspace/dfl-connected-1357/broadcast-light-320-2.png)
- [Phone Chip Eater composition](/workspace/dfl-connected-1357/broadcast-light-390-3.png)
- [Real player details](/workspace/dfl-connected-1357/real-player-detail.png)
- [Real receipt details](/workspace/dfl-connected-1357/receipt-detail.png)

Browser testing used Chromium with phone-sized viewports. Physical iOS devices
and screen-reader output were not tested. The gesture keeps native vertical
panning and pinch zoom; all views remain available by button and keyboard.
