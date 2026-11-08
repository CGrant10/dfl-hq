# GameDay replay selection — 1.565.0

This is an interaction refinement of the existing approved Broadcast Window.
Its Inter typography, game scores, native video, four-clip grid, theme tokens,
media ratio, icons and layout stay in use. No replacement asset or concept.

## Evidence and result

The original controller reproducibly changed the selected game after a native
touch scroll (`/workspace/dfl-ready-1565/replay-before.log`). The final persistent
browser fixture passes 88 checks. Normal phone screenshots reviewed:
`replay-final/window-320-light.png` and `replay-final/window-390-dark.png` in the
same scratch root. Before/after use the same synthetic games/clips, 320/390×844
CSS pixel viewports and deviceScaleFactor 1, without stretching or device frames.
Video bars and duplicate placeholder pictures are isolated media/image fixtures;
production sources/art are retained. Actual bundled app verification uses real
league reads with clip fixtures (`compiled/compiled-browse-{light,dark}.png`).

Scrolling, momentum and wheel input only browse games. Intentional taps,
previous/next controls and Enter/Space select. Arrow/Home/End browse focus
without also changing clips. Updated scores keep the browsed position and media
node. Drag releases cannot activate a game; a fresh tap works immediately.
Reduced Motion retains immediate explicit selection. No new timer or polling
loop, CSS change, font/image request or hidden video/player is added.

Existing Plays/Fantasy/no-clip/late-response flows, four complete grid previews,
native video framing, minimizing/restoring playback and close-to-opener focus
pass in both themes. Mobile Clubhouse, live refresh/return, effects, Sportsbook
and notifications checks are documented in `docs/gameday-ready-1565.md`.
`pnpm check` passes 2,515 tests / 304 files plus theme/type/name/release/build.
Final build retains 88 app modules, three startup/four Home modules. No real
wager, notification or league mutation was made during browser verification.

No remaining actionable P0/P1/P2 finding in the changed interaction. Physical
phone push receipt, iOS frame pacing and VoiceOver speech remain unmeasured.

final result: passed
