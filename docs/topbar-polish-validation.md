# Header polish — v1.268.0

Header controls use matching 36-pixel minimum heights, ten-pixel corner radii, consistent spacing, and restrained system typography. Mobile keeps the seal and removes the wordmark to preserve room for search, notifications, the named role switch, and profile. At narrow widths the profile shrinks rather than forcing overflow.

Member view is red both when a commissioner is previewing and when they have not entered a PIN. Commissioner view is yellow. Role colors remain consistent across themes, with darker readable text on light surfaces. The locked state's accessible copy still explains that returning to Commissioner requires a PIN. Permission gates and authentication behavior are unchanged.

Validation: all 995 project tests, typecheck, identifier check, and production build passed. Browser checks at 320, 390, 560, and 1280 pixels verified nonoverlapping controls and minimum heights. Dark, Medicine, and Fairway role variants passed automated WCAG A/AA and overflow checks. Reload verified initial locked Member styling without toggling. A local public-commissioner directory fixture exposed the role control on the unlocked test profile; visual Commissioner/Member fixtures changed DOM presentation only, never permission gates or credentials. Production writes were blocked.
