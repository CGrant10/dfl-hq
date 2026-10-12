# Home injury wire and shared swipes — 1.390.0

Home now places a separate Injury wire below the broadcast. It contains every current ESPN injury entry, with DFL starters first, then rostered bench players, NFL skill players and other positions. Within each group, priority combines player importance with availability severity: comparable ruled-out players precede questionable players, while important questionable players can precede low-impact outs. Usable current expert ranks supply importance; unavailable/stale ranks fall back to ADP and existing player projections. Statuses retain their actual source wording and uncertainty.

The Home broadcast no longer adds automatic injury slides. The complete searchable report and its roster filters remain available from the wire. Injury loading runs independently of the larger Home analysis request; roster relevance updates when analysis arrives. Existing five-minute injury refreshes update the wire and report without replacing the broadcast.

The wire advances one row every five seconds using native smooth scrolling. It runs only while at least half the panel is visible, the document is visible and motion is enabled. Manual touch/wheel scrolling pauses it until Play. Keyboard focus and mouse hover hold movement. Dialogs pause it; a slow covered-state check also handles dialogs removed before their close event reaches document. At the end, the wire returns to the first row. All rows remain manually scrollable and use lazy photos/content visibility. Keyed refreshes preserve player buttons, loaded photos and the reader’s scroll anchor.

Broadcast and tab gestures now share stable pointer tracking. Horizontal intent captures the stable container; child capture-transfer events are ignored, genuine cancellation and secondary fingers release it. Broadcast autoplay holds during a gesture, and incoming deck refreshes wait until release. Ghost-click suppression expires and resets on a fresh touch; arrow controls remain usable immediately. Backward slides enter from the correct side.

A delegated page controller extends finger-following movement to Home feed/position views, Clubhouse, GameDay views, Sportsbook product/market/bet views, History, Rules, Calendar, keeper years and finance years where their views are available. Inner groups own their gestures. Native buttons remain the source of selection and remembered state. Forms, input controls, scrollable tables/tab strips and the GameDay reel retain their own interactions. Player-card row buttons permit horizontal movement while ordinary taps still open the player. Trade entry modes are excluded because they change editing workflows.

## Verification

- Full local check: 1,634 tests in 193 files, release consistency, identifier checks, TypeScript and generated builds passed. The final tree is also gated by full CI and Home/Trade browser reviews.
- Gesture tests exercise 60 alternating captured swipes, pointer-ID mismatches, implicit/genuine capture loss, ghost-click reset, vertical scrolling, secondary fingers and stop cleanup.
- Priority tests cover league relevance, comparable severity, star-versus-depth impact, usable/stale experts and retention of 127 report entries.
- Read-only real-app mobile checks passed at 320, 390 and 768px: 12 forward/12 reverse broadcast gestures, wraparound, an immediate arrow click, a real full report exceeding four entries, row separation, automatic/manual scrolling, reduced motion, nested position selection, Clubhouse section swipes, connected player returns and route cleanup.
- Isolated browser checks cover keyed focus preservation, dialog pause/resume, late data/clock cleanup, forward/backward views in each main tab pattern, and swiping/tapping player buttons. No league writes, wagers, posts, syncs or notifications were sent.
- The Home review fixture includes the wire and checks rapid broadcast reversal and a deck refresh under an active finger.

Evidence is in `/workspace/dfl-injury-swipes-1390/`. Chromium was available; physical iOS/WebKit and assistive-technology testing were not performed. A fixed-delay legacy animation assertion was changed to await the actual captured animation completion.
