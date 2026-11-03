# Editorial broadcast — 1.532.0

Implements the selected light editorial concept across the Home broadcast in
both Medicine Wheel themes. Awards use a dedicated illustration column, trades
use compact receiving rows, and metric stories separate their headline and
figure. Original award artwork and the daily opener remain; examples are not
injected into the live edition.

A thin progress line replaces the always-visible segment rail. Previous,
Pause/Play and Next remain visible, and the counter opens a numbered story
chooser. Choosing a story closes the chooser; Escape and focus departure close
it too. The clock pauses while choosing and resumes correctly if live activity
rebuilds the controls. Exact receipt routes, three-team routing, autoplay,
visibility gating and touch manipulation keep their existing controllers.

The stage reserves the height needed by the entire edition once, so rotations
never move the surrounding page. Narrow phones and enlarged text use roomier
rows rather than clipping names or keeping artificially narrow text columns.
All surfaces, actions and dividers use existing palette tokens.

Validation: `pnpm check` passes 2,422 tests, theme/release/type/name checks and the
production build. Production-component browser checks pass 90 normal and 56
larger-text layouts, both themes, current-story selection, ten-story picker,
keyboard dismissal, picker pause/refresh recovery, swipe/replay and Reduced
Motion. Read-only compiled Home captures additionally pass 20 layouts across all ten actual league slides in Light and Dark, with zero page errors.

See [visual QA](../design-qa.md), [combined comparison](broadcast-editorial-1532/comparison-light.png),
[focused trade comparison](broadcast-editorial-1532/comparison-trade.png), and
[validation summary](broadcast-editorial-1532/validation.json).
