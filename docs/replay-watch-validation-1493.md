# Persistent replay and snapping drawer — 1.493.0

The portrait drawer follows pointer movement and settles at Watch, Browse or
expanded search. Its grip also accepts arrow/Home/End/Enter keys. Watch contains
a compact Up next preview; browsing restores the clip-list position, filters and
search. A larger player-portrait gallery replaces the long horizontal picker in
the viewer. Clips, Live plays and Stats share one drawer tab row, while the same
native video remains mounted and playing. The header, floating game label and
clip navigation occupy fewer permanent rows; navigation fades while playing
and returns on interaction, pause or keyboard focus.

A clip thumbnail expands toward the player. The next clip's poster stays above
the native video until decoded data is ready, then fades. Request generations
protect rapid selection changes, delayed media and closing/reopening. Media is
paused immediately on close and released after the exit. Publisher fallback,
native seeking/fullscreen, motion preferences and Thursday expiry remain intact.
Only the selected clip loads media; the next preview loads an image.

The embedded game center uses the clip's official NFL week, including retained
clips after the league's Tuesday rollover, and exposes Stats without duplicate
tabs. Cross-week views use recorded weekly PPR rather than unrelated current-week
league scores. Game changes clear stale stats before loading the new edition.
Live polling continues every ten seconds with existing offline/visibility rules.
When reading older plays, new IDs accumulate in a Latest button; it returns to
the newest play and clears the count without restarting video or closing details.

Validation: 2,258 tests in 273 files pass, along with release/theme/type/name and
production build checks. Pure regressions cover snap geometry/flick direction,
official clip week resolution and rejection of unknown/mismatched editions.
The mobile replay matrix covers three snap positions, gallery sizes, keyboard
and pointer resizing, first-frame loading, stale media callbacks, scroll/focus
retention, native playback, reduced motion, expiry and interrupted closing.
Clubhouse checks cover team scopes, exact clip links, the unified live feed and
route cleanup; live-controller checks cover Latest counts, anchoring, final
plays, offline recovery, hidden tabs and uninterrupted native video. Screenshots
were inspected in both phone themes and at short, landscape and desktop sizes.
No backend, league data, notification preferences or push deliveries changed.
Physical iOS and screen-reader testing remain unverified.
