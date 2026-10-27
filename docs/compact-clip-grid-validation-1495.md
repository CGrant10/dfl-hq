# Compact clip grids — 1.495.0

The replay picker now uses two columns of smaller thumbnail cards on phones.
Compact two-line headlines, game/kind labels and duration make several clips
visible together. The selected card has an accent border, a Playing badge and
its existing accessible pressed state. Full headlines remain in the button's
accessible name and title. Newest-first ordering, filtering, native video,
drawer positions and exact-play links are unchanged.

Clubhouse game groups use the same compact two-column approach on phones and
three columns on wider screens. The Home preview rail remains a rail.

Validation: full release/theme/type/name/unit/build checks pass; 2,259 tests in
273 files. The replay browser harness passes 233 checks, including two columns,
at least four complete preview images visible together, the unique selected
badge, playback/selection/filter preservation, phone/theme/viewport layouts,
focus, reduced motion and expiry. Clubhouse's 176 checks also pass. Light/Dark
screenshots were inspected at both phone widths. No backend, league records,
notification settings or pushes changed; physical iOS remains unverified.
