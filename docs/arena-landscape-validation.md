# Stadium landscape viewing — 1.407.0

The phone/touch-tablet stadium viewer requires landscape for setup, live races, pauses, completed races and replays. A native modal rotate screen blocks portrait interaction and keeps a Back to Arena exit. Touch-device landscape entry opens an immersive race layout, which can be closed to reach the page controls. Its keyboard focus and scroll lock are scoped to the expanded viewer. The lobby and its uniform editor remain usable in portrait; short landscape editor screens use a side-by-side preview and controls.

Open landscape requests fullscreen from the tap, then requests `screen.orientation.lock('landscape')` where supported. Unsupported APIs keep manual rotation available. The rotate gate stays above fullscreen until the viewport is actually landscape. Expanded viewing retains the CSS fallback, safe-area padding and a close control. Short landscape Full-field views put the map and live leader close-up side by side, with the overlay confined to the map. Only this viewer's orientation lock is released on fullscreen exit or teardown.

Portrait blocks decorative/render RAFs while the shared-clock snapshots continue. Rotation resumes from current server time. The prompt's finite phone animation respects Arena Motion off, app Motion off and OS reduced motion. All gate listeners, modal state and portrait scroll lock are removed when leaving.

`pnpm check` passed 1,704 tests across 200 files, typecheck, names, release checks and builds. Final typecheck/builds also passed after the controller refinement. The isolated shared-clock mobile review passed 68 checks, including unsupported fullscreen, supported lock requests, protection within fullscreen, fallback expansion, manual rotation, completed/replay gates, portrait lobby/editor, pause/resume, official order and cleanup. No browser errors. API capability cases use controlled browser mocks; physical iPhone/Safari orientation cannot be programmatically forced and still requires turning the device. No real race or league writes.

Artifacts: `/workspace/dfl-arena-landscape-1407/`. Production verification follows deployment.
