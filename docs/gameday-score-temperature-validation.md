# GameDay score temperatures — v1.273.1

Player fantasy scores above 15 get warm numbers, a flame marker, and short ember movement. Scores below 10 get a blue frost treatment once the player's NFL game is final. Scores from 10 through 15 stay neutral. Upcoming, live low-score, and unknown-status players are not marked cold; missing points remain unknown.

Team totals above 120 get flames and a warm faceoff tint. Totals from 100 through 120 get a quiet gold Steady treatment. Below 100 gets frost only when the week is marked complete or all known submitted starters have finished. Unknown game status or remaining starters keep low team totals neutral. These effects describe absolute fantasy performance, independently of which opponent is ahead.

The same player-score treatment appears in My team, Opponent, Leaders, Bench, and player spotlights. Recorded numbers remain intact. Flame and snowflake markers have accessible names; team states also have compact labels. Colors use readable variants for light and dark surfaces.

The flame and frost movement uses small CSS opacity/transform animations that finish after a few cycles. Motion off and the system reduced-motion setting preserve static cues without animation, including inside spotlights. No sounds or new notifications are triggered.

Validation: 1,009 tests across 112 files, typecheck, identifier checks, and build passed. Threshold tests cover exact player/team boundaries, missing and negative points, unfinished scores, finished roster detection, and numeric/accessibility output. Read-only browser fixtures verify hot/steady/cold team and player states, live low-score neutrality, finished low-score frost, Motion on/off in the panel and spotlight, and reduced motion. Dark, Medicine, Fairway, 320/390/1280-pixel layouts, mixed hot/cold states, spotlights, and enlarged text passed automated WCAG A/AA and overflow checks. Enlarged team score bounds were checked against their faceoff cells. Production writes were blocked throughout validation.

Visual follow-up: pointed flame shapes stay behind the digits, and the spotlight score uses a tight line height so the flame base does not hang below the number. The player spotlight was rechecked against actual weekly stats in both light and dark themes.
