# Trade and live matchup motion — 1.467.0

Player portraits now connect roster selections and the search sheet to their
committed trade package. Removal returns toward the available roster and restores
keyboard focus. Three-team recipient changes use the selected player's evaluated
route. These transitions run only when both endpoints are visible; they never
scroll the page to manufacture an effect. Selected rows stay 44px tall for normal
names. Trade values, package limits and routing rules are unchanged.

A visible trade link connects to the selected receipt summary using native View
Transitions. Browser Back from the Home wire restores the originating trade card,
its focus, scroll position and the page's disclosures. A short bounded resize
observer holds the anchor through delayed Home content, then releases on user
input. Fixed alerts retain normal visit scroll restoration. Unsupported browsers
and disabled/reduced motion use the same navigation without the morph. Interrupted
routes discard old transition names and cannot repaint a newer destination.

An absolute 2px team-color underline identifies the actual leader on Home,
Clubhouse and GameDay watch. It glides across in 420ms only after a fresh verified
lead change from an existing leader. It stays static on initial load, with motion
off and at final; tied or projected scores have no advantage marker. Scores and
names keep their exact geometry. Existing player milestones retain their stings.

## Verification

- `pnpm check`: 2,043 tests in 248 files, release/theme/type/name checks and the
  production build passed. Theme, type/name checks and build repeated after
  refining motion cleanup.
- Actual production Trade handlers at 320/390px in real Medicine Wheel Light/Dark:
  selection/removal, compact rows, rapid repeated taps, three-team recipient
  changes, search-sheet transfers, focus restoration, motion-off/reduced-motion,
  and leaving during a flight. Four complete scenarios; no browser errors.
- Actual router plus production Home wire/receipt components: 37 checks across
  320/390px Light/Dark and unsupported-browser fallback. Verified exact Back
  anchors/focus, saved disclosures, delayed layout, releasing on input, preference
  handling, interruption, three-team receipts and cleanup.
- Existing offer-to-verdict/back connections and the full Trade review passed.
  Existing route review: 37 checks. Home score-collapse review: 18 cases, native
  and fallback scroll drivers, no browser errors.
- Focused actual Home score effects in Light/Dark: stable score glyph geometry,
  underline travel, no initial/repeat/stale/final-correction celebration, ties,
  hidden/covered/offscreen suppression, player milestone priority, preference
  changes and natural cleanup. No extra lead-change caption is added.

Inspected [Light player selection](trade-live-motion-1467/pick-390-light.png),
[Dark selection](trade-live-motion-1467/pick-320-dark.png),
[Light receipt](trade-live-motion-1467/receipt-390-light.png),
[Dark receipt](trade-live-motion-1467/receipt-390-dark.png),
[Light lead marker](trade-live-motion-1467/lead-light.png) and
[Dark lead marker](trade-live-motion-1467/lead-dark.png).
[Player checks](trade-live-motion-1467/pick-checks.json) and
[receipt checks](trade-live-motion-1467/receipt-checks.json) are retained.
These are isolated sample rosters and scores; no league data was changed.

Physical iPhone/Safari frame pacing, low-power mode and high-refresh devices
remain unverified. Portrait checks include the existing initials fallback when
external player pictures are unavailable. No new artwork, palette entries or
explanatory product text was added.
