# Shared-image style refresh — v1.285.0

All 13 generated image types now share a compact heritage-seal header, Medicine Wheel markers, thin rounded frame, quiet footer and consistent typography. The shared frame is fixed to Medicine Wheel and draws synchronously, so exports do not follow the sender's theme or interrupt the native share gesture.

Profiles lead with the member name, monogram and career statistics, followed by aligned trophy/crime receipts. Trade packages sit directly beneath the heading and flow into the recommendation, complete descriptions, lineup deltas and balance. Standard trades fit a 1080×1350 image; larger deals expand for every player and full description. Sportsbook entries flow from picks to price and stake/return, expanding for longer tickets. Keeper rows start under their heading and grow the image for larger boards. Golf cards use compact anniversary labels; matchups use two team panels with monograms, aligned scores and a shared result. Scorecards and leaderboards retain readable rows as they grow. Weekly cards use rounded panels, a consistent heading and footer, and complete matchup lists.

Validation:
- pnpm check passes type checks, identifier checks, 1,026 tests across 114 files and build, including the offline module dependency check.
- Chromium renders all 13 PNG types with populated fixtures and confirms text stays inside the frame. Exports are byte-identical under Dark, Light, Medicine Wheel, Medicine Wheel Light and Fairway.
- Stress fixtures verify a three-team trade retains all long descriptions, a ten-leg settled ticket retains every pick, a twelve-golfer scorecard expands, and all six recap matchups remain visible. Content expands the image instead of reducing it to unreadable text.
- Native share API stub receives a valid PNG while browser user activation remains true. Existing share/download/text fallbacks are unchanged; no external share was sent.
- Populated and empty galleries and individual exports visually reviewed. PNG palette contrast checks remain covered by the existing shared-ink tests. Native iOS share behavior was not directly exercised.
