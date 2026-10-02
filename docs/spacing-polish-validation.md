# Spacing and control polish — v1.264.0

Restores Power Rankings to Home as a visible section immediately after the matchup broadcast, outside More from the league. Its full-ranking expansion remains available. Home cards have consistent side gutters, separated sections, more space within ranking rows and smaller headings. Existing league features and the Wall's bottom position remain intact.

The polish emphasizes presentation: flatter card surfaces, more breathing room within cards, calmer summaries, smaller system-font button/link labels, natural casing and reduced letter spacing. Activity, Sportsbook product and Clubhouse tabs use compact underline treatments. Buttons retain usable touch areas, keyboard focus and native semantics; scaling and lifting animations no longer apply to controls. Home's weekly links use concise labels and a shared action row.

Validation:
- TypeScript check, production build, all eight Home tests and whitespace checks pass.
- Browser checks cover Home, Analyzer, Clubhouse, Sportsbook, Facts and Trade at 320/390/1280px. Home rankings are visible outside a disclosure; the weekly button label is 13px, naturally cased, with a touch area at least 44px tall.
- Home, Sportsbook and Trade also checked in Dark, Medicine and Fairway themes and with enlarged text at 320px. Checked views have no horizontal overflow or automated WCAG A/AA violations.
- Browser production writes are blocked; Sportsbook wallet initialization uses a local response fixture.

Physical screen-reader and native-phone sessions were not performed.
