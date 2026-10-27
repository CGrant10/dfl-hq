# Replay layout repair and newest-first clips — 1.494.0

The replay stylesheet had accumulated competing pane, height, overlay and small
viewport rules. Replace these with one coherent layout: a properly proportioned
video, game label, caption/navigation row and a useful scrollable drawer. Wide
footage no longer stretches into a tall mostly empty frame. Clip navigation is
outside the native video controls. The player gallery replaces the list within
the drawer while choosing a player, instead of covering other content. Watch's
list explicitly occupies its remaining grid row even with filters hidden;
returning from the gallery closes the picker and restores the list.

The shared verified clip list now sorts by publication time descending, with a
stable numeric ID tie-break. Home, game groups, team filters, search and the
viewer open newest first. Next/autoplay advance through the resulting queue.
Refreshing keeps the current media node and selected clip while newer arrivals
move ahead of it. Publisher restrictions and Thursday expiry are unchanged.

Validation: 2,259 tests across 273 files, full release/theme/type/name/build
checks, Clubhouse's 176 browser checks and 38 live-feed checks pass. Phone replay
checks use deliberately reversed input and verify newest-first ordering,
preserved playback through arrivals, natural video proportions, controls clear
of footage, a usable Watch list, gallery-to-Watch recovery, short/landscape/
desktop/keyboard layouts, motion preferences and media/expiry cleanup. Screens
were inspected in both mobile themes. Real-data verification used a local
production build with backend writes blocked: the first clip matched the latest
publisher timestamp (2026-10-27 02:37:51 UTC), actual 1920px video played, search
and resizing retained playback, and the retained game's 187 plays and 22 stat
lines loaded without page exceptions.

No backend functions, league records, push delivery or notification settings
were changed. Physical installed iOS remains unverified.
