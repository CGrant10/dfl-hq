# Wall and trade player selection — v1.358.0

The Wall composer displayed its photo upload and framing controls before a
member needed them. Trade offer anchors used long native player lists without
search or portraits. Both now follow Home and Clubhouse's compact presentation.

## Changes

- The Wall starts with a one-line composer, photo button and Post action. Writing
  expands the text area and reveals existing draft and mention controls. Photo
  tools open on demand; closing them retains the attached image and framing.
- Posted photos on the Wall and Home preview open in a full-screen native dialog.
  It shows the complete original upload, including photos cropped in the feed,
  animates from the post, supports 2× zoom with scroll/pan, keeps Close available,
  restores focus, and dismisses on route change. Failed images have a status.
- Offer/wanted-player controls open searchable roster sheets. Rows show portraits
  (initials if unavailable), position, NFL club, current owner, injury status,
  projected points per game and existing trade value. Position filters combine
  with name/team searches. Missing data remains unavailable. Search tolerates
  punctuation and accents.
- Choosing a row dispatches the existing select change handler. League-wide
  targets still choose the actual owner and preserve outgoing anchors. Package
  limits, multi-team destinations, valuations, recommendations, drafts, saved
  deals and share cards retain their behavior. Native selects remain usable if
  the enhancement cannot initialize.
- Search Escape closes the sheet on the first press. Keyboard controls, native
  modal focus, replacement-control focus return, visible-viewport sizing, motion
  Off and reduced motion are respected. Stale choices cannot be applied.

## Evidence and verification

Fresh screenshots and logs are saved in `/workspace/dfl-wall-trade-1358/`.

1. **Wall feed — healthy:** `wall/01-wall-390.png` shows the compact composer and
   existing post/reaction/reply layout. `wall/02-composer-390.png` verifies
   expanded writing, mention and framing controls.
2. **Photo viewer — healthy:** `wall/03-photo-390-12.png` shows the complete
   portrait upload. `real-wall-photo.png` confirms an existing league photo
   opens with its original proportions. Checks cover wide/portrait uploads,
   zoom, failed images, Home previews/replies, route dismissal and focus return.
3. **Trade roster sheet — healthy:** `trade/trade-320-search-sheet.png` verifies
   narrow search results and readable metadata. `real-player-picker.png`
   confirms real roster portraits, injury tags and actual player values.

`tools/capture-trade-review.py` exercises production Trade handlers with isolated
rosters: search, position filters, keyboard dismissal, selected-player exclusion,
stale choices, motion preferences, enlarged text, themes, league-wide anchors,
multi-team routing, share payloads, saved comparisons, reloads, counteroffers and
changed ownership at 320, 390 and 768px.

`tools/capture-wall-review.py` runs the production Wall renderer, draft, mention,
framing, conversation and photo-viewer controllers with mocked data. Drafts
survive reload, mentions remain usable, attachments survive collapsing controls,
and enlarged text/themes do not overflow at the same widths. Review writes are
blocked. CI runs both browser reviews.

Repository checks passed: TypeScript, identifier validation, 149 Vitest files /
1,313 tests, and the production Arena build. Final targeted regressions also
cover offline shell imports. Real-data browser checks are read-only; no post,
reaction, wager or trade was submitted.

Checks cover Chromium, keyboard navigation, reflow and motion preferences. They
do not establish physical iOS/Safari, screen-reader or full accessibility
conformance. Photo viewing uses a dark backdrop in all app themes; the trade
picker follows the selected palette.
