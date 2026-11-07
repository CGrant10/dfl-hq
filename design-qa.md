# Broadcast Window — 1.561.1

Source visual truth: `/workspace/generated_images/exec-4838ed52-a6f4-4adb-875c-c456f4d97097.png`, the first displayed clip-viewer concept selected by the user.
Implementation: `/workspace/dfl-replay-1561/window/component-390-dark.png` (real controller, native video and game center). Browser viewport 390×844 CSS px, deviceScaleFactor 1; the dialog capture is 378×820 pixels. Source is 852×1846 pixels. Both component images are uniformly scaled to 390px width, preserving their aspect ratios, in `/workspace/dfl-replay-1561/comparison-final.png`. Focused caption/control/grid comparison: `/workspace/dfl-replay-1561/comparison-details.png`. No device frame or browser chrome is included.

## Findings and comparison history

The initial combined comparison (`comparison-final-01.png`, `comparison-details-01.png`) found a P2 optical sizing difference: the next/previous frames and filter backgrounds looked larger than the mock. Their functional hit areas remain 44px tall, while the visible frames and pills were reduced to match the quieter reference. The same state was captured again; both final combined images were opened and inspected. No actionable P0/P1/P2 differences remain.

Earlier implementation checks caught short-phone video compression and an undersized search-results viewport. Avoided subtracting dialog viewport margins twice, gave Watch its measured caption space, reduced the optical grip row, and adjusted Browse's height allocation. The 320×568, 844×390 and 1280×800 cases now pass, including keyboard viewport behavior and complete preview images. Native matchup tiles were tightened and adjacent logos suppressed so the neighboring team codes and scores stay readable while peeking. Active game identity remains complete.

## Fidelity surfaces

- Typography: the project's local Inter, 800 brand, 650 caption, 700 tabs, 750 section heading and clear 12px clip titles. Large display/share lettering is not used in the viewer. Consistent line heights, aligned scores and complete main captions; thumbnail captions use the existing two-line browsing treatment. All content stays in its own region.
- Layout: compact branded header, continuous matchup strip, full-width 16:9 footage, caption with outside-video controls, compact resize grip, separate Clips / Plays / Fantasy tabs and two-column grid. Full preview images remain visible. Real queues continue scrolling beyond the four items shown in the mock; no four-item runtime cap is introduced.
- Colors: shared Medicine Wheel Dark/Light surfaces and text tokens. The red fill token supplies selection rules and small pills; the existing accent supplies focus and replay/minimize cues. Light adapts to bone/white surfaces. The existing generated stadium asset adds a faint header edge wash without a boxed glow. Borders are quiet shared lines; no retired blue accents or extra theme options.
- Images/icons: supplied round DFL logo, actual NFL team marks, real provider media/posters. Standard Bootstrap Icons paths are unmodified and attributed in `icons/bootstrap-icons-LICENSE.txt`; icons are hidden from assistive technology and controls have names. No CSS-drawn substitute logos or generated NFL footage is shipped. The isolated fixture uses one real ESPN Chase action photograph encoded as a still video, so its repeated thumbnails, opponent and example captions are test data rather than claims of a real matching play. Production retains each clip's own video/poster/source URLs.
- Content: real matchup identities/scores/status are taken only from the matching week's verified board. Archived clips retain their game labels without invented scores. Zero scores remain zero. Games without clips clear the previous footage and offer Plays. Filters use real All / TD / Big Play metadata instead of assuming the mock's team pills can classify a clip's ownership. Publisher fallback and compact Watch/Browse controls remain available; these purposeful additions preserve existing access and resizing behavior.

## Verification

72 focused browser checks pass at 320/390px in Light and Dark: verified game/clip identity, four complete preview images, native finger-following and return swipes, reduced-motion keyboard selection, clip-type filters without playback replacement, no-clip recovery, delayed old-game response protection, consistent Plays/Fantasy routing, same-element minimizing/restoring and close cleanup/focus. No uncaught errors or horizontal overflow.

Explicit replay game/mode selections override saved NFL-view choices; the default saved-choice behavior remains unchanged on other NFL surfaces. The delayed-response and remembered-game cases pass.

The existing complete reel journey passes 280 checks, including source fallback, enlarged text, image errors, interrupted resizing, keyboard controls, autoplay boundaries, refresh continuity, short/landscape/desktop viewports and teardown. Evidence: `/workspace/dfl-replay-1561/{window,review,short}`. A further single-theme short-screen pass has 82 checks. Native controls and the video's element stay intact during resizing and minimizing; no extra polling or per-frame gesture render loop was introduced.

`pnpm check`: 2,498 tests / 302 files, release agreement, theme colors, types, unresolved names and production build pass. Final visual adjustments pass the focused browser suite and names/build checks. A compiled-renderer smoke check at the real `/dfl-hq/` base path loads the actual brand image, four game entries and native video with no overflow or browser errors (`/workspace/dfl-replay-1561/compiled/preview.png`). The build retains 88 app modules, three startup/four Home modules and one shared-style request. Fixtures isolate remote reads and block writes; no real messages or league changes were made. Physical iOS frame timing, native-control styling and VoiceOver speech remain unmeasured.

Implementation checklist: selected direction applied to the existing production component; real media and round branding retained; functional matchup/clip/tab actions tested; responsive failures fixed; combined full/focused comparisons reviewed; themes and production bundle checked. P3: platform-native video controls and font rasterization naturally vary by browser.

## Integration and enlarged-text follow-up

The full Clubhouse integration initially retained an assertion for the old personalized title. It now checks the selected DFL REPLAY brand plus the actual personal scope, exact player headline and one-clip queue. Personal filtering behavior remains intact.

The 200% text captures exposed crowded navigation, overlapping matchup text and a constrained video caption. The viewer now detects enlarged text through its existing resize controller, uses readable vertical mode choices, gives Plays/Fantasy the full workspace, and makes the Clips player scrollable. Matchup tiles grow with type and stay within the track. The normal 320/390px presentation retains the selected mock's layout. This adds no new observer or per-pointer-frame typography measurement.

Reviewed revised enlarged-text screenshots in `/workspace/dfl-replay-1561/clubhouse-release/{320,390}-{light,dark}-replay-large-text.png` against the earlier `/workspace/dfl-replay-1561/clubhouse/` captures. Existing close/Back actions remain visible and reachable. Complete label bounds and workspace height are checked, rather than relying only on outer overflow.

The rail also adopts the game center's newer verified score/status. A compact header/highest-play observation preserves the existing freshness rules without retaining duplicate box scores, adding polling or regressing a newer board. Tests cover observed final scores, newer boards and different seasons.

Final 1.561.1 validation: `pnpm check` passes 2,500 tests in 302 files plus release/theme/type/name/build checks; all 349 full Clubhouse checks and 72 focused replay-window checks pass. Revised 320px Dark and 390px Light enlarged-text captures were opened and inspected; complete mode labels, readable active matchup scores and a full stats workspace are preserved. No polling or startup-module increase.

final result: passed
