# Arena full-field viewing — 1.446.0

The Arena now uses one full-field view throughout the race, pause, finish and
both replay modes. Every lane, starting endzone and touchdown endzone stay in
frame. Auto/Follow controls, split-screen duels, automatic camera cuts and the
extra lead-battle close-up panel are removed. Selecting a standings row highlights
that racer’s lane and position without changing the view. Photo replay retains
its quarter-speed timing and uses current leaders for the commentary.

The existing portrait theater, expanded/native fullscreen, commissioner controls,
uniform editor, crowd reactions, motion preference and shared official results
remain. No path, clock, draw or database authority changes. Canvas-only profile
photo requests and the extra camera-animation loop are removed.

The isolated browser fixture observes actual atlas body draws and checks every
racer is inside the field on 320/390/768px Light and Dark, expanded landscape,
and 1440px desktop. Two- and 32-racer fields additionally cover highlight changes
and early/middle/final race frames. Replay, reset, pause, editing, removal,
keyboard focus and readiness remain covered. `pnpm check` runs the release,
theme, type, name, unit and generated-build checks. The obsolete pack-camera
unit cases are removed with their camera helper; actual all-racer visibility
is now verified in the production renderer rather than an unused zoom function.

Current screenshots and browser results: `/tmp/dfl-1446-arena-final/`.
Physical iOS/Android fullscreen and hardware GPU frame rates remain unverified.
