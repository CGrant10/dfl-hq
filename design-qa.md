# Home typography and layout correction — v1.299.0

Source visual: selected option-3 mock, `/workspace/generated_images/exec-b10c2c8d-0155-43a7-a138-d5ddf329ec7c.png` (853 × 1844), normalized to 390 × 844. User refinement: smooth large text and scores, correctly fitted broadcast slides, consistent page spacing.

Earlier reviewed capture: `/workspace/dfl-review/capture-final/home-390.png`. The stepped display font and tightly packed score/status text are visible in this capture. The earlier fixture covered the opener and two simple announcements; it did not cover real scoreboard, slate, stat, champion, event, hero, and injury layouts.

P1: Pixel-shaped display font. Replaced with the existing smooth Anton display font and natural line heights; removed synthetic text stroke. Score effects now use phone density, bounded by a six-million-pixel shared surface budget.

P2: Fixed slide height could clip real content or collide with navigation. Header and controls now have reserved space, and Home stage height grows to accommodate the active slide. Layout refreshes after fonts load and when width changes. The expanded fixture includes all production treatments and actual matchup/trade/next-move generators.

P2: Conflicting late CSS overrides and compressed line boxes caused inconsistent gutters and crowding. Retired the pixel-font overrides; sections now share the responsive gutter. Final labels have their own score column clear of fire/ice. Rows use natural line boxes and consistent vertical spacing.

Post-fix browser capture and same-viewport full/focused visual comparison are pending. Full application authentication and live league requests remain outside the read-only component fixture.

final result: blocked
