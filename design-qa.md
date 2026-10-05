# Connected app design QA — 1.294.0

**Findings**

No actionable P0/P1/P2 findings remain in the changed surfaces. One player card now serves Search, GameDay, injuries, Trade, Clubhouse and sportsbook. Navigation memory, unfinished trade packages and rivalry chapters connect the existing experience. History, League Fees, Rules and profile settings use quieter controls and clearer spacing. Home's approved layout and power rankings remain intact.

**Evidence and normalization**

- Approved app direction: `/workspace/dfl-audit/connected-before-trade.png`. Existing player photos, restrained controls, editorial headings and Medicine Wheel accents are the production target. These utility pages are adaptations of that direction, rather than identical copies of Trade.
- Before/after page captures: `connected-before-{history,finances,rules,profile}.png` and `connected-final-{history,finances,rules,profile}.png` under `/workspace/dfl-audit/`.
- Combined final full-view comparison: `connected-comparison-utility.png`, viewport 1660 × 920. Four columns use the same 390 CSS-pixel width and deviceScaleFactor 1. Reference and implementation captures use 390 × 844 with the same member, league data and Light palette.
- Focused controls comparison: `connected-comparison-controls.png`, region 1220 × 360, same source frames and density. Headline, divider, tab typography and panel alignment were reviewed together.
- Settings comparison: `connected-comparison-settings.png`, viewport 840 × 920, same expanded disclosure and scroll region. Focused appearance comparison: `connected-comparison-appearance.png`, same 390-pixel column normalization. Appearance element captures include the fixed navigation at their lower edge; control review uses the unobscured upper region.
- Iteration evidence: `connected-comparison-iteration.png` preserves the initial excessive finance spacing alongside the final layout.
- New surface evidence: `connected-player-card.png`, `connected-player-card-cold.png`, `connected-final-clubhouse.png`. Actual Josh Allen identity and previous league meetings were inspected. Cold eligibility is additionally verified through state assertions; the screenshot alone is not a timing benchmark for the WebGL effect.
- Final static comparison captures disable transitions and entrance animation identically for source and implementation to compare settled layouts. Functional and GPU tests separately retain normal motion.
- Browser state uses an isolated existing-member session. Production-write guards block analytics, presence, votes and other mutations during QA.

**Required fidelity surfaces**

- Fonts/typography: local Rajdhani retains the app's editorial headlines. Utility tabs and small navigation actions use system type at 13 pixels, with 44-pixel interaction heights. Player names remain readable with the existing photo treatment.
- Spacing/layout: unified utility headers and dividers align to content edges. Finance summaries have a compact value/label hierarchy; historical tables retain readable row spacing. Settings have light borders and separated feedback rows. The player dialog uses a bounded portrait, recent-form columns and compact actions.
- Colors/tokens: new accents use Medicine Wheel red `#C8102E` and yellow `#EFC94C`; backgrounds and text follow the selected app palette. Existing semantic financial colors and user palette preferences remain respected.
- Image quality/assets: actual Sleeper player portraits are reused. No replacement illustration or decorative asset was introduced. Fire/ice retain the existing shader and readable score ink.
- Copy/content: roster ownership, fantasy points, injury sources, three recent weeks and matchup calls come from existing data. Exact identity matching avoids ambiguous player names. Unknown stats stay unknown; zero stays zero. Completed results and ties are recorded correctly. Injury tags do not become unsupported promises that a player will play.

**Comparison history**

1. [P2] The player portrait inherited only view-scoped styles and expanded outside GameDay. Added explicit shared-dialog portrait sizing and checked the actual identified photo.
2. [P2] Initial finance summaries added too much vertical space. Reduced statistic padding and reviewed the before/initial/final comparison.
3. [P2] Earlier History selectors and route presentation rules overrode quiet tabs and Rules headers. Scoped the final utility rules to the view, restored system typography on tabs and aligned all three headers.
4. [P2] Transparent feedback rows exposed the old gray grid background. Removed the parent background and retained thin dividers. Medicine Wheel Light feedback descriptions also needed higher contrast; corrected the text token.
5. A preliminary capture sampled entrance fades. Re-captured source and implementation in the same settled motion state before judging fidelity.
6. Final combined full-view and focused comparisons passed. Utility content differs intentionally from the Trade reference. No actionable P0/P1/P2 findings remain.

**Interactions and validation**

- Shared player card: actual identity/portrait, exact-name lookup, ownership, known zero versus unavailable stats, league scoring, source tags, retry and stale-request protection checked. Escape and Close restore focus to Search or GameDay; Search retains its query. Player action opens the correct own-team trade builder with the selected player and partner.
- Memory: chosen GameDay matchup survives closing, player-card return and navigation. Clubhouse tab/week restore while explicit links override remembered choices. Manual trade players, intent, filters and scroll survive navigation and reload; expired, cross-member and no-longer-owned selections are rejected.
- Rivalry: real previous meetings, reversed sides, win/loss/tie record, saved calls and final grading tested. No fabricated calls or future/unplayed results enter the story. The extra detail uses an existing expandable section rather than another Home card.
- Accessibility: axe A/AA passed on the shared card, utility pages, expanded settings and rivalry sections at 320/390/1280 widths across Dark, Light, Medicine Wheel and Medicine Wheel Light. Keyboard interaction, 200% text and horizontal-overflow checks passed. Reduced-motion and existing halftime cold thresholds remain respected. Automated checks cover the changed surfaces, not a claim of a complete manual screen-reader audit.
- Performance: identical isolated GPU test measured two contexts allocated initially before, zero after for neutral/offscreen surfaces; visible fire still rendered 37 draws over 1.2 seconds (approximately 30 fps). Offscreen draws remained zero. Weekly reads now coalesce in flight and share a 30-second cache; forced refresh, sync invalidation, failed-request retry and vote deadlines are tested. Route warming is sequential and skipped for hidden pages, Save-Data and slow connections. Live backend timing varies; no universal page-speed percentage is claimed.
- Actual Home, History, League Fees, Rules, Profile, Clubhouse and Trade routes passed under 4× CPU throttling. No JavaScript errors. Production writes were prevented during testing.
- `pnpm check`: typecheck, unresolved-name checks, 1077 tests in 121 files and production build passed.
- Logs: `/workspace/dfl-audit/connected-check-final.log`, `connected-browser-final.log`, `connected-interactions-final.log`, `connected-vfx-performance.log`.

**Implementation Checklist**

- [x] Reuse one player card across existing entry points.
- [x] Remember navigation choices and validate unfinished trade drafts.
- [x] Connect rivalry history, actual predictions and final outcomes.
- [x] Measure GPU behavior and deduplicate weekly reads.
- [x] Polish utility pages without changing Home's structure.
- [x] Inspect combined full-view and focused comparisons.
- [x] Complete functional, accessibility and build checks.

**Follow-up Polish**

[P3] Injury and portrait quality depend on current provider data. The card clearly identifies available injury sources and retains existing image fallbacks.

final result: passed
