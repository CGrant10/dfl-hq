# Mobile detail sheets — 1.392.0

Player cards and Sportsbook slips share a phone header grip, 12px outer gutters, 220ms entry/exit motion, and a backdrop that responds to a pull. Dragging the fixed header moves the dialog directly. A short pull returns in 200ms; a deliberate distance or downward flick dismisses it. Content scrolling, close buttons, input fields and bet review/confirmation retain their native control paths. Grabbing an unfinished return continues from its current position.

Pointer IDs, direction intent, cancellation, secondary fingers, viewport changes, reduced motion and cleanup are handled in one controller. Busy bet submissions cannot be dismissed. Player dismissal retains the portrait return and restores the opener's focus; late player data cannot reopen a closed sheet. Existing viewport bounds keep headers and footers above a phone keyboard.

The Sportsbook retains an entered stake when the slip is dismissed and reopened, alongside its existing picks. The local stake draft resets for another member, an explicit clear, or a successful placement. It does not bypass the existing stake validation, price refresh, review, or confirmation.

Validation includes 1,642 unit tests in 194 files, release consistency, names, TypeScript and generated builds. The isolated browser fixture uses the production player renderer and extracted bet-slip controller. It checks three palettes at 320/390/600px, exact sheet width/gutters, controls, finger/backdrop movement, short and long pulls, native body scrolling, focus return, stake retention/member separation, viewport changes, keyboard bounds, motion preferences and late data. Fixture bets cannot reach a backend. CI runs this review after the full Home review and retains screenshots with that job's artifacts. Home and Trade reviews are release gates.

Local evidence: `/workspace/dfl-sheets-1392/`. Keyboard bounds use a simulated visual viewport in Chromium; physical iOS and assistive-technology checks were not performed. No wagers, league posts, syncs or notifications were sent.
