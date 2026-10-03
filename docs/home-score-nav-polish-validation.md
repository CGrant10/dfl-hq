# Home scores and navigation polish — v1.269.0

The matchup preview labels each number Projected. GameDay labels each matchup number Actual points, with the link to the full matchup on its own quiet line. Only the preview generator provides the new broadcast score label, so other scoreboard sports and scoring rules are untouched.

The primary navigation uses Trades and keeps Sportsbook and Clubhouse unbroken. Mobile labels use sentence case, matching twenty-pixel icons, and consistent spacing. Home card headings and padding follow one scale. League highlights use compact rows, timestamps, and icons; lead-change text has slightly more weight. GameDay reserves four static placeholder rows while loading and a stable score width, without fake player stats or animation.

Validation: all 995 tests, typecheck, identifier checks, and production build passed. Browser checks verified Projected/Actual labels, full navigation labels without word breaks or clipping at 320, 390, and 560 pixels, photos, keyboard tabs, refresh, expanded lineup persistence, and motion preferences. Home and shared Clubhouse status checks passed automated WCAG A/AA and overflow checks at mobile/desktop sizes, Dark/Medicine/Fairway themes, and enlarged text. Browser checks blocked production writes.
