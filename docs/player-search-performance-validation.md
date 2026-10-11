# Player search performance — 1.374.1

League search and the personal watchlist now normalize searchable player text once per Sleeper player snapshot. League search also sorts once, retaining active-first alphabetical order. Queries stop after the existing 12 league results or eight watchlist results instead of constructing every matching row.

The league index uses a WeakMap keyed by the loaded player dictionary. The watchlist keeps its index only while its mounted panel uses that dictionary. `loadPlayers` returns a new dictionary when refreshed; both rebuild on that identity change. Blank queries do not build an index. The watchlist retains its current NFL-team and fantasy-position restrictions. The helper is included in the service worker app shell.

Validation:

- Four regression tests cover previous result ordering and multiword matching, one enumeration across repeated queries, refreshed team metadata, watchlist eligibility and limits, and early termination after eight matches out of 20,000 rows.
- Existing league-search result tests pass.
- Browser verification with 12,229 actual Sleeper players compares both implementations over ten name/team/position queries, checks visible search results and clearing/no-results behavior, and checks for runtime exceptions.
- A local browser benchmark measured median repeated-query computation across five batches of 40 queries: league search 9.10 ms → 0.31 ms; watchlist 6.04 ms → 0.035 ms. Building the 901-player watchlist index took 18.1 ms once. These are environment-specific computation measurements, excluding network time, rendering and the league search's existing debounce; they do not measure whole-app startup.
- Release gate: `pnpm check` (types, names, full unit suite and build).

Browser artifacts and benchmark results are in `/workspace/dfl-search-performance-1374/`.
