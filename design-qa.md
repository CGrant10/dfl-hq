# Weekly Archive desk — 1.566.0

Extends the approved Sportsbook/Clubhouse direction with compact Inter, flat
ruled matchup rows, tabular scores, current owner pictures and Medicine Wheel
Light/Dark tokens. No new concept, generated art, mascot or shield placement.

## Evidence and comparison

Baseline: `/workspace/dfl-archive-1566/before/history-{light,dark}.png`, the actual
compiled History entry point, previously Hall of Fame plus a Weekly archive
shortcut. Final fixtures: `/workspace/dfl-archive-1566/finished/`, at 320/390/768×844
CSS pixels in Light/Dark with 200% text. The full renderer, data loader and shared
motion controller run against isolated league data. Avatars are explicit fixture
placeholders; normal captures use the existing page fonts, styles and SVG defs.
Compiled real-data captures and exact-matchup/Back journey: `actual-final/` in the same
scratch root. Entry-point comparisons intentionally contain different sections:
the new Weeks view leads while Hall of Fame remains a tab, not removed content.
Combined entry-point comparisons are in `comparison-history-{light,dark}.png`.
No screenshots are stretched, device-framed or used as app assets.

## Findings and refinements

- Weekly history was a separate Clubhouse destination. History now has a Weeks
  tab, a compact native season select, a horizontally browsable week strip and
  a full-recap link. The redundant old shortcut is removed. The selected season
  carries between Weeks and Yearbook. Existing stored section choices remain;
  fresh visits default to Weeks. Hall of Fame, Moments, Yearbook, career totals,
  records and commissioner editing remain available.
- Only weeks explicitly completed by the existing index are offered. Scores
  come from the selected week's existing cached RPC, not a guess from the
  newest nonzero score. Bad/missing scores, invalid rosters, conflicting winners
  or duplicated games withhold weekly honors. Real zeros and ties remain real;
  equal margins share honors. An unavailable deep link never silently displays
  another week.
- Each matchup has two aligned name/photo/score lines and a native expanding
  detail. Details show winning margin, combined points, verified entering-week
  records, owner profiles and the exact Clubhouse matchup link. Incomplete
  historical coverage produces an unknown record, never invented wins/losses.
  First-week records correctly begin 0–0. No lineup/provider reads on expansion.
- Closest finish and biggest beatdown lead, with one stable results-based roast.
  These are compact actions into the corresponding matchup. No fictional
  comeback, bad lineup decision or winner claim is inferred. All-tie weeks are
  explicitly tied rather than awarded a fake beatdown.
- Disclosure motion reuses the finite, reversible shared controller. Switching
  weeks/sections stops old animations and ignores late reads. Same-season week
  changes preserve the strip, buttons and shared sliding rail. Native strip
  scrolling only browses. Reduced/app-off motion stays immediate. Rendering
  waits for week data so generic Back restoration finds the actual details and
  strip before restoring open state/position.
- Actual compiled captures caught a selected week remaining offscreen when the
  route loading grid became the normal page. A scoped ResizeObserver now aligns
  it after that width change, stops on leave and respects intentional browsing
  and Back restoration. This uses no animation-frame/scroll loop.
- Visual checks caught an initially unstyled fixture (missing base URL); the
  fixture now loads the real styles and asserts grid/Inter rendering. Large
  text puts Full recap on its own line rather than wrapping it into a narrow
  stack. Native 44px controls and full team-name wrapping remain usable.

## Fidelity surfaces

Typography: existing local Inter; primary names 13px, scores 15px, small secondary
labels, tabular figures. Layout: normal app margins, quiet rules, compact highlight
columns that stack at larger type. Colors: shared surface/text/line/action/focus
tokens, crimson selection and the existing Medicine Wheel links. No stale blue
or redundant theme choice. Assets: existing owner photos/photo-source preferences,
initial fallback and original SVG chevron; no new media/font request. Content:
all old History sections survive and current team names apply across seasons.

## Verification

- `pnpm check`: 2,526 tests / 305 files, plus release/theme/type/name/build checks.
  Eleven new model tests cover completion, score precision, unknown/zero scores,
  ties, duplicate/conflicting data, current/deleted identity, entering records
  and stable receipts. Existing modules' tests stay intact.
- Persistent `tools/capture-archive-weeks.py`: 157 checks, six viewport/theme
  contexts, actual styles, contrast, 44px controls, 200% text, precise links,
  reversible/keyboard disclosure, reduced/app-off motion, stable controls,
  retry/index recovery, delayed reads, leaving while pending, incomplete/tied
  weeks, native scrolling without selection and Back restoration. Wired into
  the existing league-identity CI job.
- Compiled real-data checks verify the exact matchup destination and Back to the
  expanded Archive row, both themes, no overflow/errors. Provider reads are
  allowed; all account/league/notification writes are mocked or blocked.
- Build retains 88 app modules, three startup/four Home modules and one shared
  stylesheet request. Archive adds no background timer/poller, provider or new
  roster request; cached index/week reads happen on opening/selection only.

Physical iOS frame pacing and VoiceOver speech remain unmeasured. No actionable
P0/P1/P2 finding remains in the reviewed layouts and interactions.

final result: passed
