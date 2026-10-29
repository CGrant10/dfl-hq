# Broadcast finish and mobile screen space — 1.516.0

Home’s wide broadcast now uses a shorter shared frame with stronger story-specific
layouts. The pinned scoreboard also frees more space for the page.

- A 390px phone’s broadcast is 232px tall, versus 268px previously. Rotation
  reserves the same height throughout the edition. Enlarged system text still
  gets more room; it is not forced into the compact frame.
- Champion and Chip Eater cards use a larger, fully contained house illustration,
  a quiet adjoining color panel and a prominent complete team name. Especially
  long award names get a smaller headline without truncation. Member avatars
  never replace the award art.
- Matchup stories lead with aligned boxy totals, separate full team names, then
  the sourced roast and confirmed final margin. Archive metrics use a short
  category heading so their number is not repeated in the headline. Trades retain their exact
  receipt link, compact lead-player routes and sourced balance. Metric,
  rivalry, news and injury cards retain distinct compositions. Missing category
  labels have a readable fallback rather than a lone icon.
- Auto Scout uses a contained real player photo on a neutral theme panel. Its
  portrait and image explicitly clear inherited player-card gradient plates.
- A 280ms compositor transition moves each whole slide; the headline and art
  arrive together. Direct swipes retain the existing pointer/velocity behavior.
  Motion off and Reduced Motion disable transitions and decorative animation.
- The compact scoreboard puts the exact week/phase between the teams, removing
  its separate caption row. Real-data Light/Dark checks measure 56px, down from
  74px. Full names, chosen photos, score precision, neutral forecasts and tap to
  the original matchup remain. Long names/enlarged text can grow naturally.
  Other contextual scroll bars lose 4px of vertical padding; 44px minimum touch
  targets and dismiss controls remain. Fixed bars switch text/surface colors
  together: a generic button background fade previously passed through a
  low-contrast midpoint when changing Light to Dark. CI caught this; the
  correction preserves scale feedback and the compositor scroll effects.
- The independent daily opener, limited current edition, archive rotation,
  stale-news cutoff, one-pass playback and Wall-last order remain. No new feed,
  poll, dependency, image asset, font request, scroll-frame read or idle loop.

## Validation

- `pnpm check` passes; the final suite has 2,404 tests / 291 files. Final
  theme/type/name checks and production build also pass. Production remains 90 modules,
  three startup/four Home and 57 shared styles in one request.
- Broadcast browser gallery: 90 layouts in Light/Dark at 320/390/768px and 56
  enlarged-text layouts at 125%/200%. Complete names, separate copy/art, contained
  artwork, no overflow, stable height, text contrast and 44px transport targets.
  Native forward/reverse swipes, one-pass playback, manual replay, edition refresh
  and Reduced Motion pass. Added a check against inherited portrait plates.
- 63 compact scoreboard checks cover full/aligned names and totals, contrast,
  changed leaders, unknown versus real zero, neutral labeled forecasts, 200%
  text, exact return and mobile height budgets. Existing native/fallback review
  passes 18 cases, shared scrolling 72 checks, sticky alerts 13, and broadcast
  Home integration 8 cases, including motion preferences and keyboard pause.
- The actual built app uses read-only league data in both themes: all five
  current broadcast stories fit the 232px frame; original matchup names and
  Week 8 projected totals (108.6 / 114.6) match their compact copies. No browser
  errors. External mutations are blocked; local profile selection only.
- Physical phone frame pacing and screen-reader speech remain unmeasured.
  No league profile, trade, wager, notification or backend schema was edited.

## Visual evidence

See [the screenshot folder](broadcast-finish-1516/) for Light/Dark award, result,
trade, enlarged-text and real-data checks, plus prior frame/stack baselines.
