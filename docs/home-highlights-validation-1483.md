# Home GameDay highlights — 1.483.0

The Home reel collects ESPN-published NFL touchdowns and big plays throughout
that game day. A shared server collector runs every three minutes; Home reads
only compact metadata when the section approaches the viewport, then refreshes
at two-minute intervals while visible. Empty days add no empty card. The latest
eight clips appear in Home; View reel provides the full chronological queue.

Thursday clips expire Friday at 06:00 America/Chicago, Sunday clips Monday at
06:00, and Monday clips Tuesday at 06:00. Other NFL game days use the same rule.
The clock honors daylight saving changes. Publisher expiry can remove a clip
earlier. Frontend timers and foreground checks remove expired content even if a
request fails; database RLS immediately hides it, with cleanup every five minutes.
Existing league history and football-moment records are unaffected.

## Playback scope

Each poster opens its exact official ESPN clip page in a new tab. ESPN's iframe
player returned HTTP 200 but failed actual Chromium playback initialization with
third-party localStorage/privacy errors. This release therefore does not promise
embedded video, automatic video playback, every play, or immediate NFL footage.
Clip availability and regional playback depend on the publisher. Videos are not
downloaded, copied or stored. The app stores headlines, source URLs, poster URLs,
game labels, durations and expiry only. No paid service was added.

## Verification

- Full `pnpm check`: 264 files / 2,206 tests; theme, type, name, release and
  production-build checks pass. Bundle: 85 modules, 3 startup / 4 Home.
- Dedicated mobile browser harness: 76 checks at 320/390px in Light/Dark.
  Covers horizontal scrolling, full queue, image failure fallback, source links,
  selection stability during refresh, expiry while open, failed network reads,
  focus return, reduced motion, viewport fit and 4.5:1 caption contrast.
- Actual compiled Home first-launch checks pass at plain launch and #/home,
  including opening the reel and navigating away while open. No uncaught errors.
  All league/provider fixtures are isolated; no membership or league writes.
- Local Postgres 17 test passes: anonymous/authenticated readers see only
  unexpired metadata, cannot write, and invalid expiry is rejected. Retention
  preserves current clips; DST and initially disabled collector verified.
- Edge function Deno check passes; production rejects GET (405) and
  unauthenticated POST (401). The private cron header is checked server-side.
  Service credentials and the existing Vault token never enter frontend assets.
- Protected real-source dry run for Sunday 2026-10-25 at 22:00 UTC returned
  11 games / 37 eligible clips / zero failed summaries, without database writes.
  Expired Sunday footage was not seeded into Monday production.
- Supabase security-advisor findings for the new table: none. Existing unrelated
  project findings are outside this feature's scope.
- Publisher poster resizing tested HTTP 200 JPEG: 47,024 bytes versus a
  232,991-byte original. Thumbnail errors fall back once to the validated source.

Evidence: `/workspace/dfl-highlight-review/` and
`/workspace/dfl-startup-review/`. Screenshots were inspected for both phone sizes
and themes. Physical installed iOS/Safari playback and provider availability at
future live kickoffs are unverified.
