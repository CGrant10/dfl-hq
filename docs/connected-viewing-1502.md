# Connected viewing and usable trade suggestions — 1.502.0

Watching a clip can now continue while browsing the app. A highlight's Minimize
button moves its existing native video into a small dock above navigation.
Expand returns to the original studio while that page is mounted; after leaving,
it opens an independent viewer. Closing releases the source. One dock owns one
video, paused playback stays paused, backgrounding pauses playback, and expiry
removes the clip. Native play controls remain available if the browser refuses
resuming after moving the element. Publisher-only clips retain their ESPN link.

The play feed exposes **Back to live** as soon as someone reads older plays,
then adds the count of new plays without moving their reading position. Finished
games say **Back to latest**. Existing ten-second live refresh, visibility and
offline suspension, final-game polling stop, and side-by-side stats remain.

Player cards link to that player's clips and owning roster's matchup, scoped to
the card's season/week. Back restores the visit's clip/game filters and trade
search; new Trade visits still start league-wide. Edited clip filters take
precedence over an original player deep link when returning. Existing router
visit snapshots preserve page scroll, and new choices use the same history entry.

Generated trade cards include a compact action row:

- **Pass** excludes the exact package, regardless of player display order or tier,
  for that trading team in the search. **Undo** restores the latest pass. Fresh
  visits and resetting the search clear passes. Available tier counts subtract
  passed results. Three-way package keys retain destinations.
- **Save** re-evaluates the package through the existing model and adds it to the
  existing member/season-scoped saved deals (three maximum on this device).
- **Keep player** on a two-team suggestion reruns the full search around a chosen
  outgoing or incoming player and excludes the original package. Existing roster,
  position, injury and value safeguards continue to apply. Three-way suggestions
  retain Analyze, Pass and Save; routing is edited in the existing manual desk.

New controls retain 44px targets, native keyboard/scroll behavior and existing
optional haptics. Dock buttons join the shared press feedback system. Dock and
viewer entrances use finite transform/opacity motion and respect reduced motion.

The completed Clubhouse **Recap** tab begins with a personal final receipt when
the selected member has a confirmed final matchup. It shows actual scores, an
offensive lineup leader, and positive bench regret only against a legal starting
slot (including FLEX and zero-point starters). Saved plays and the last saved
winning lead change appear only when available. Video links require an active
clip matching both game and play. Missing evidence is omitted. Home's existing
recap path leads here; its daily opener and Wall ordering are unchanged.

Recap moments and clips load only when viewing a completed personal recap. No
new backend endpoint, scheduled task, schema change, data grant, push enrollment
or runtime dependency was added. The production build retains three startup and
four Home modules.

## Verification

- `pnpm check`: release markers, themes, typecheck, names, **2,337 tests in 283 files**, and build.
- Connected-viewing browser checks: **116 passed**; NFL live-refresh: **38**;
  Home highlights: **233**. Existing Trade, Clubhouse and player-card suites passed.
- `tools/capture-connected-viewing.py`: real controllers at 320/390/768, Light
  and Dark; same video across docking/navigation, paused media, reopen/cleanup,
  Escape, reduced motion, recap facts, Pass/Undo/Save/Keep, targets, overflow,
  Back and fresh Trade defaults. Isolated rosters and local MP4; no league writes.
- Existing Home highlight, NFL live-refresh, Trade, Clubhouse and player-card
  motion browser suites; Clubhouse also exercises actual player/roster links,
  changed filters on Back and the completed page's personal receipt.
- Screenshot evidence in [connected-viewing-1502](connected-viewing-1502/).
  Portraits and video use representative fixtures, not claimed NFL footage or
  player likeness. Screenshots were inspected in both Medicine Wheel defaults.

Physical iOS/Android decoder behavior, native fullscreen, screen-reader speech
and device haptics were not exercised. A browser can require another Play tap
after moving native video. No push alerts, wagers or test league records were
created during verification.
