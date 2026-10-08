# App audit polish — v1.330.0

The approved audit pass brings scores, roster verdicts and offers closer to the first phone viewport while retaining the broadcast artwork, share cards, Wall and league entertainment.

- Compact Clubhouse, Analyzer and Trade setup. Clubhouse puts optional activity links after matchups; incomplete recap sharing stays hidden. Trade offers have a keyboard-focusable jump action, with additional-result controls after the visible results.
- Current roster tools prefer member-directory names, including the directory owner when a team name is absent. Historical season names remain unchanged.
- Playoff positions are unique ordered projections. Average simulated finish remains available in the expanded path. Estimated odds that round to certainty show `>99%` or `<1%`; only mathematically clinched/eliminated teams show `100%`/`0%`. Missing odds remain unknown.
- Phone History displays season, champion and runner-up vertically without losing table semantics or commissioner editing. Desktop retains three columns.
- More keeps all 15 destinations in four named groups. Lore, Wall and secondary headers use a consistent reading scale. Sportsbook and Notifications offer direct entry to the existing cancellable profile picker.
- Breaking coverage appears on Home, scrolls with the page and supports a local dismissal. Commissioner alert controls retain their permission checks.

## Validation

`pnpm check` passed: TypeScript, unresolved-name validation, 127 Vitest files / 1,155 tests and the production Arena build. Added regressions cover unique projected positions, odds uncertainty, directory precedence and complete/nonduplicated navigation groups. Exact final-head CI runs the full check plus Home and Trade browser reviews.

A production-origin Chromium check serves the proposed local code with live read-only data before merge. It covers 13 surface/width combinations: Clubhouse at 320/390px; Analyzer; Trade entry/manual; History at 320/390/1280px; Lore; Wall; Sportsbook/Notifications entry; Playoff Race; and Home. More is checked from Analyzer. Screenshots confirm readable phone results, retained artwork and no document overflow. Assertions cover the consistent 44px header, first Clubhouse score above the dock, all History columns fitting, the offers jump/focus, 15 grouped destinations, profile cancellation/focus restoration, unique playoff positions and Home-only alert dismissal. No page errors occurred.

Production writes were blocked. Signed-in betting, commissioner edits, personalized inbox content, physical devices and assistive technology were not exercised. After deployment, repeat the same browser checks using public assets without local overrides and compare changed public assets to the merge commit.
