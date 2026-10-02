# Page simplification — v1.263.0

Home leads with the matchup broadcast, weekly lineup priority and one league highlight. Rankings, weekly reports, side games and activity are inside More from the league; the Wall remains last in that activity section. Pick’em deadlines stay outside the disclosure. A failed weekly fetch replaces its loading state with an Analyzer retry link.

Analyzer leads with weekly availability and its best suggested move. Further moves, full lineup, lineup lab, strategy, season grades, player outlook, comparisons and standings are available through labeled disclosures. Injury warnings and cached-data warnings remain visible. Historical trend data loads on opening its section. Finding links open any enclosing detail sections before scrolling.

Clubhouse shows the member’s matchup first and puts other games behind one summary. Its overview leads with one award, with the remaining awards and recap results available on request. Sportsbook separates fantasy matchups, props and other lines into keyboard-operable tabs; open tickets lead, while settled tickets and trends are secondary. Player deep links select props, and Pick’em links select the correct product. Trade starts with the manual builder and separates generated offers into their own tab; analyzing an offer opens its populated builder. Facts leads with daily lore and trivia, while history and searchable collections open on request; browsing starts with six items.

Native detail sections and activity choices remember preferences on the device, scoped to the selected member. Presentation storage contains no wagers or league records. The service worker includes the new shared module and release cache.

Validation:
- Typecheck, identifier scan, all 981 tests across 107 files, production build and diff whitespace check pass.
- Browser checks cover all six pages at 320/390/1280px, Home preference restoration after reload, Analyzer tools expansion, lore searching and pagination, Sportsbook tab clicks/arrow keys, and Trade activity switching.
- Additional browser checks cover keyboard offer selection into the populated builder, Dark/Medicine/Fairway themes on Home/Sportsbook/Trade, and enlarged text at 320px. Fairway’s empty trade-selection labels now use the main text color for sufficient contrast.
- Tested views have no horizontal overflow or automated WCAG A/AA findings. Production writes are blocked in browser checks; the wallet initialization uses a local response fixture.

Automated accessibility checks do not replace physical screen-reader and phone testing.
