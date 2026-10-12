# Mobile motion and broadcast copy — 1.389.0

Home’s opener now reads “Win your fucking matchup.” with “Nobody gives a shit about your projected points.” underneath. The original artwork remains, with a theme-aware shade behind the copy. Its measured headline and body fit at 320, 390 and 768px without moving into the transport controls.

Editorial broadcast artwork gets a bounded four-pixel scroll offset. Copy, scores and injury portraits keep their positions. A 650ms light pass plays on visible slide changes; unchanged deck refreshes retain the current slide. Scroll reads/writes are coalesced into one requested frame, with no ongoing frame loop at rest or work while offscreen. The controller removes its overlay, observers and listeners on route exit.

Player cards retain their existing connected entrance. Closing now returns the portrait to a visible source row over 160ms while the sheet dismisses. Both stationary portraits are hidden during that return and restored on completion or interruption. Missing/offscreen sources use the regular dismissal. Cleanup is idempotent, including late completion of a cancelled flight; native dialog focus returns to the original or replacement trigger.

Week Ahead panels follow horizontal touch movement, with resistance at the first/last tab. The next panel settles directionally over 240ms alongside the existing selection highlight. Short drags settle back. Vertical scrolling, selected text, controls, mouse interaction and a second finger retain their prior behavior. The shared fade yields to the swipe animation, and leaving Home removes the gesture listeners.

Clubhouse keeps its opposing team entrances. Selecting another matchup adds a short directional faceoff transition and quicker opposing identity slides. Refreshing scores does not replay a matchup selection. Saved wall reactions get a single emoji bounce; removing or failing to save a reaction does not celebrate.

## Verification

- Release version consistency, TypeScript, identifier checks and generated builds passed.
- Full local check passed: 1,622 tests in 191 files. Four additional connected-portrait lifecycle tests passed afterward with the focused motion checks; CI runs the final complete tree.
- Broadcast lifecycle tests cover frame coalescing, bounded offsets, offscreen/hidden/preference suppression and stopped observers. Connected-portrait tests cover hidden/restore behavior, late completion, offscreen fallback and disabled motion.
- Read-only browser checks used real Home, player card and Clubhouse data: 320/390/768px, no document overflow, steady headline geometry, one finished sweep, finger-following tabs, directional settling, portrait return/focus restoration and route cleanup.
- Reaction checks used isolated fake data only: successful saves, failure, removal, disabled motion and OS reduced motion. No reactions, wall posts, syncs, bets or notifications were sent to the league.
- Home review fixture now also asserts live drag movement, directional settling and return-flight cleanup.

Browser evidence is in `/workspace/dfl-motion-1389/`. Chromium was available; physical iOS, WebKit and assistive-technology testing were not performed. The local full browser fixture initially encountered its existing fixed-delay reduced-motion check in GameDay moments; final CI browser review remains the merge gate.
