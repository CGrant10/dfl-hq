# Trade editing and readable analysis — 1.509.0

Analyze Trade now gives each package full-width player rows on phones, with names,
portraits and values aligned together. Wider screens retain the two-column view.
The complete package comes before the projected lineup detail. “Value balance,”
“You receive,” “Value out” and “Value in” replace less consistent labels; the
uncertain-data recommendation reads “Check data.” Grading rules are unchanged.

## Editing

- Tap a player's name in the analysis or Swap in the builder to open the existing
  searchable player sheet. Only that owner's unselected players are available.
  Cancelling leaves the package intact and returns focus to the tapped player.
- Replacement retains the package's order and the outgoing player's explicit
  recipient. Other participants, routes, filters and open analysis sections stay
  intact. A redraw or page exit closes and invalidates the replacement sheet.
- Undo restores the preceding add, removal, replacement, recipient edit or clear.
  It restores exact packages and routes, not a new suggested offer. It is scoped
  to the active desk; changing participants or reloading starts a fresh history.
- While choosing players, a compact native sticky reference keeps the leading
  outgoing/incoming names, additional-player counts and current balance/lineup
  values visible. Its Review action leads to the full package; Undo stays
  available after clearing the last player. It takes the place of the generic
  scrolling page label and becomes static in short viewports.
- Picking a roster player preserves the tapped row's screen position. Changed
  headline values use a finite 180ms transition. Motion off and reduced motion
  remain immediate; no new scroll animation loop or backend request was added.

## Validation

- `pnpm check`: 2,373 tests / 288 files; release agreement, themes, types,
  unresolved names and production build. Bundle remains 90 modules,
  three startup / four Home. 55 shared styles ship in one request.
- 84 production-controller browser checks in Light/Dark at 320/390px: full-name
  space, contrast, replacement/Cancel, focus, unchanged opposite package, exact
  Undo, retained disclosures, sticky reference, scroll position, search, three-way
  destinations, 200% root text, reduced motion and leaving with a sheet open.
- Existing offer-reading review: 100 checks at 320/390/768px, including lazy
  previews, reverse/keyboard disclosure motion, exact offer return, Keep controls,
  current lineup changes and routed packages. Existing selection-motion review
  passes in all four 320/390px Light/Dark scenarios.
- Existing full Trade review passes at 320/390/768px: routing, counters, saved
  proposals, ownership/injury rechecks, sharing and receipt access. Read-only
  real league-data checks pass for replacement, Cancel, Undo and Back in both
  themes, with no browser errors.
- Seven editor integrity tests cover ordered replacement, unknown routes, illegal
  or duplicate selections, exact Undo, changed participants/ownership, immutable
  snapshots and the eight-player limit.

Browser fixtures block league writes; images use initials when network images
are unavailable. Physical phone frame pacing and screen readers were not measured.

## Inspected screenshots

- [Analysis Light 320](trade-editing-polish-1509/analyze-320-light.png) · [Dark](trade-editing-polish-1509/analyze-320-dark.png)
- [Analysis Light 390](trade-editing-polish-1509/analyze-390-light.png) · [Dark](trade-editing-polish-1509/analyze-390-dark.png)
- [Editing Light](trade-editing-polish-1509/editing-320-light.png) · [Dark](trade-editing-polish-1509/editing-390-dark.png)
- [Three-team routing](trade-editing-polish-1509/three-team-390-light.png) · [200% text](trade-editing-polish-1509/large-text-320-light.png)
