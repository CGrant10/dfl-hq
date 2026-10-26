# Player-first highlight browser — 1.487.0

Home and Clubhouse now share a clip browser with a readable vertical list rather
than an unlabeled thumbnail filmstrip. Every row has the full headline, NFL game,
play type, duration, sequence and current-clip state. Phone layouts keep the
player above the scrollable list; wider windows put the list alongside the video.
Short landscape screens retain navigation, and constrained keyboard viewports
prioritize search/results while preserving the media node.

Player chips include portraits and available clip counts, both on the preview
rail and inside the viewer. Your Team's chips use its weekly roster; This Matchup
uses both rosters, and League uses the current league player model. Search also
finds captioned players who are absent from that model. Selecting a player makes
a chronological playlist starting at that player's first clip. Search narrows
names, plays and games without restarting the currently selected video; Clear
restores the queue without a restart. Previous/Next, clip-row selection and
keyboard arrows support browsing, while native video arrows still seek normally.
Reopening starts at the beginning of the chosen player's playlist.

Counts come from actual available clip metadata, not inferred fantasy scoring.
Name matching now recognizes a small, explicit set of unique nicknames such as
CMC/JSN/Hollywood Brown, while retaining game/week/NFL-team checks. Searching a
full roster name can find a nickname-captioned clip. Unknown or ambiguous names
may still be omitted from the chips; free-text caption search remains available.
The existing publisher URLs, native playback, source fallback and Tuesday-morning
expiry are unchanged. No backend/API/schema/dependency change was needed, and
filtering makes no new provider requests.

## Verification

- Full `pnpm check`: 266 files / 2,223 tests pass, including the browse model,
  nickname attribution, false-match guards, player counts and chronological order.
  Final types, names, themes and production build also pass after UI polish.
- 156 shared-reel browser checks in Light/Dark at 320/390px: readable rows, correct
  counts, pre-playback Home filters, name search, no-result recovery, no video
  restart while typing/clearing, player playlists, reopening, scroll reset,
  visible focus restoration after filtering away the opener, expiry and cleanup.
- The matrix also covers 320×568, 844×390 and 1280×800, plus a simulated smaller,
  offset visual viewport with the search field focused. Navigation/results fit;
  these checks do not constitute physical iOS keyboard testing.
- 96 actual Clubhouse renderer checks pass, including roster-only chips, search
  restricted to Your Team, metadata reuse, rapid scope changes, stale-response
  rejection and native playback shutdown. The real compiled first-launch/route
  checks also pass without browser errors or league writes.
- Inspected mobile Light/Dark and short/wide screenshots. Browser labels, counts,
  search placeholder and metadata meet 4.5:1 contrast; actions retain 44px targets.
  Shared Medicine Wheel tokens remain canonical. No new theme options.

Evidence: `/workspace/dfl-highlight-review/` and
`/workspace/dfl-clubhouse-live-review/`. Local UI/media checks use isolated public
metadata and a synthetic decoder test stream. Physical installed Safari and
future publisher availability remain unverified.
