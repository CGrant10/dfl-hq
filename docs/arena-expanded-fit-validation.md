# Expanded stadium screen fit — 1.408.0

Production review caught a CSS fallback expanded viewer at x=16/y=60 with its bottom at 450px in an 844×390 viewport. The page and room entrance animations retained fixed-position containing blocks even with their animated transform overridden. Arena now opts out of those generic filled entrance animations; its own scene motion continues. The expanded-state ancestor reset keeps the watch view opaque and free of containing blocks.

The expanded canvas now uses its parent's content width, so landscape notch padding is respected. Scoreboard and overlay insets use the same safe-area values.

The fixture now includes the actual `page-in` shell, checks the expanded rectangle against the viewport, and simulates 32px landscape safe areas for canvas and scoreboard. All 76 fixture checks pass with no page errors. The guarded real app on localhost passes 16 checks, including the exact 844×390 expanded rectangle at x=0/y=0, portrait gates, full-field side-by-side layout, replay, cleanup, and portrait lobby/editor. No real race or kit saves were performed.

`pnpm check` passed 1,704 tests and all build/release/type checks. Final source validation is repeated by PR CI. Artifacts: `/workspace/dfl-arena-fit-1408/`.
