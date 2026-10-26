# Weekend Home reel — 1.484.0

Home's Weekend highlights section now includes the current Thursday-through-Monday
NFL slate. This replaces 1.483.0's separate daily editions: the combined weekend
stays available until Tuesday 06:00 America/Chicago. A publisher's earlier expiry
still wins. Tuesday/Wednesday add no empty card, and cached previous-week footage
cannot reappear in the next edition. The collector refreshes real available
weekend games every three minutes, including games already finished; no fake or
manually dated highlights are inserted.

Clips with a validated official direct MP4 now play inside a native inline video
player in the DFL reel. Tapping a Home card starts that clip; View reel starts the
chronological queue. Native controls provide play/pause, seeking and fullscreen,
and completion advances to the next clip. Autoplay refusals leave native controls
available. There is always an explicit official ESPN fallback; missing URLs and
playback errors preserve that route. Closing, expiry and Home navigation stop
playback and release the media source. Backgrounding pauses playback. Metadata
refreshes preserve the currently playing node and position.

The browser contacts ESPN directly for video; the server stores metadata and
URLs only. No files are copied, hosted or preloaded by the Home rail. Only HTTPS
MP4s on the exact publisher CDN and expected media path are accepted, with no
credentials, alternate ports, query redirects or fragments. Database constraints,
RLS and read-only browser permissions remain in place. The native integration
avoids the third-party iframe privacy failure documented for 1.483.0.

## Verification

- `pnpm check`: 264 files / 2,210 tests pass, including weekend boundaries, Tuesday
  clearing, previous-week rejection, both DST changes, publication restrictions
  and direct-source validation. Final SVG polish rechecked themes, types, names,
  production build and the focused mobile matrix.
- 100 focused mobile browser checks pass at 320/390px in Light/Dark. Includes real
  native media decoding with a small synthetic test stream, automatic next clip,
  preserved playback node during refresh, source fallback, immediate close/expiry
  shutdown, viewport edges, touch targets, focus return and reduced motion.
- Separately tested actual publisher footage with the production controller in
  all four phone/theme combinations: 1920x1080 frames and advancing currentTime,
  inline playback, no media/page errors, and source released on close. No mocked
  media in these tests. Screenshots inspected at both phone sizes/themes.
- Compiled Home first-launch and open-reel route teardown pass. That lifecycle
  test also checks source-only fallback for missing video metadata.
- Local Postgres 17 verifies the actual migrations, Sunday-to-Tuesday retention,
  unextendable cutoff, direct-source constraints, persistent RLS and denied
  browser writes. Deno check passes for the collector. New-table security-advisor
  findings remain empty.
- Production collector returned HTTP 200: 13 started games, 48 clips, zero failed
  summaries or scoreboards. All 48 rows have direct sources and expire Tuesday
  2026-10-27 11:00 UTC (06:00 Central). Shared collector/retention stay enabled.

Evidence: `/workspace/dfl-highlight-review/` (100-check matrix),
`/workspace/dfl-highlight-review/real-weekend/` (real footage screenshots), and
`/workspace/dfl-startup-review/` (compiled route checks). Physical installed
Safari/iOS and future publisher availability remain unverified; the ESPN fallback
remains available. No new paid provider or dependency was added.
