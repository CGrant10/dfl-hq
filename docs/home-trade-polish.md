# Home and Trade entry polish — 1.448.0

Home has a distinct masthead, The DFL Daily, including its loading announcement.
Clubhouse retains its own route name. Per-team Actual/Final labels are visually
hidden while score semantics, phase status and the collapsing scoreboard remain
intact. Upcoming projections keep their visible Projected label.

Trade starts with team/package settings collapsed. Both player targeting buttons
and selected player chips stay outside that disclosure, before intent/results.
New visits reset the disclosure even when an earlier draft saved it open;
explicit incoming player-target links retain their existing expanded context.
The offer engine, valuation and eligibility rules are unchanged.

## Visual evidence

| Screen | Dark | Light |
| --- | --- | --- |
| Home, 390px | [Screenshot](home-trade-polish/home-dark.png) | [Screenshot](home-trade-polish/home-light.png) |
| Trade, 390px | [Screenshot](home-trade-polish/trade-dark.png) | [Screenshot](home-trade-polish/trade-light.png) |

These screenshots use production components with isolated roster fixtures and
blocked external writes. Trade's first offer begins at 594px in both themes;
both pickers have at least 44px targets. No horizontal overflow or browser errors
were found in these captures. Home uses the production navigation shell; the
Trade fixture has simplified shared chrome. Player images may use initials
when external image requests are blocked.

Release checks include themes, TypeScript, identifier checks, 1,934 unit tests
and production build validation. Browser suites exercise Home layout/scrolling
and Trade search, targeting, package controls, draft restoration, routing,
receipts, theme reflow and enlarged text. Physical devices and comprehensive
screen-reader behavior remain unverified.
