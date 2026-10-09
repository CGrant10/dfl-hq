# Shared UI motion — v1.349.1

The app now extends the Clubhouse's restrained motion into ordinary navigation and controls. Destination-shaped loading placeholders replace the plain route-loading flash. The header and bottom navigation remain fixed, incoming content remains inert until ready, and a completed route fades in once. Slow/stale route renders remain isolated; error states remove the placeholder and expose Retry.

More, player cards, and the Sportsbook bet slip have finite entrances. Selection markers move across Sportsbook's three control levels, Trade modes, History/year selection, Rules, Calendar, Keeper years, and Finance years. Markers survive full DOM replacement, retain their complete duration after ResizeObserver's initial notification, and realign on viewport or font size changes. Only user actions reveal disclosure or filter content; restored disclosures and background score refreshes do not restart these effects.

Profile identities receive a small entrance. The featured Playoff Race team names enter from opposing sides. Score tables, live score glyphs, odds, and money receive no translation or count-up. Clubhouse retains its own controller, and Golf, Arena, and Broadcast keep their dedicated motion treatment.

The existing per-member Motion setting and OS reduced-motion setting suppress the shared effects. Hidden tabs, rapid selections, route changes, and dialog dismissal cancel transient effects. The More focus trap, Escape dismissal, player-card opener return, native disclosures, and route scroll memory remain intact.

Keepers now separates the title and subtitle and wraps full team labels in a wider identity column. Pick'em wraps full team names with scores and pick percentages below. Calendar, Polls, and Proposals use compact empty states; guest profile actions remain available. Broadcast artwork, share-card layouts, trade valuation, and league data are unchanged.

The Sportsbook's persistent slip preview now sits above mobile navigation instead of covering it. Desktop retains its bottom-corner placement because navigation is at the top.

Completed page fades now have backwards fill only and remove their entrance class on completion. Preference changes also clear that class, preventing a completed route entrance from replaying when motion is re-enabled. The effect releases its page layer without moving scores or changing the entrance duration.

Validation:

- `pnpm check`: typecheck, identifier check, 143 test files / 1,288 tests, and production Arena build passed.
- Fresh Chromium mobile checks across all 19 audited public routes, including actual member views, found no document overflow at 390 px; Keeper and Pick'em checks also passed at 320 px. The header remained 44 px.
- Verified More/player-card entrances and focus behavior; nested Sportsbook tabs; Trade and Yearbook markers after complete control replacement; marker settlement and resize alignment; Wall replies; Analyzer details/team changes; Lore filters; bet-slip opening/dismissal; Motion off across pages; OS reduced motion; route scroll restoration; rapid route changes; and module-load failure recovery.
- Captures used the real public reads through a temporary browser session. Write requests were blocked. No bet, wall post, reply, vote, notification action, profile edit, or production preference change was submitted.
- Saved browser logs and PNG captures accompany the working-session review. These checks do not establish full screen-reader, contrast, iOS Safari, or accessibility conformance.
