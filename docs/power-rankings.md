# Weekly power editions — 1.450.0

Home previously ordered completed results by win percentage, then total points.
It now separates power from standings. The compact board shows the top three
and the reader’s team, with all 12 available on demand. Each row opens a small
sheet with all-play results, scoring pace, recent weeks, lineup forecast and
factual DFL banter. Team names always come from the current member directory.

## Model

The results component is 60% season all-play win rate, 30% recent scoring and
10% actual record. Each completed week compares a team with every other team;
ties count half. Recent form uses the last three scores relative to each week’s
league median, weighted 1/2/3 toward the newest. That relative score is mapped
to 0–1 with `clamp(.5 + (relative - 1) * 1.25)`.

After three completed games, power combines 75% results with 25% current
available-lineup percentile. The first two completed games use 60%/40%. The
legal lineup is QB, RB, RB, WR, WR, TE, FLEX (RB/WR/TE), K and DEF. Projections
are scored with the live league’s scoring settings. Extra bench QBs cannot
inflate the estimate. Current injuries come from the already refreshed weekly
feed, avoiding repeated full-player-directory downloads on Home. Known Out/inactive/IR and bye players give way to legal
replacements; Questionable/Doubtful players remain eligible, without invented
injury discounts. Missing rostered projections disable the lineup component
for the entire board, rather than penalizing one team with a fake zero.

Scores are league-relative indices from 0–100, not win probabilities. Equal
scores break on actual points, then stable roster ID. The Team Analyzer’s
projected roster grades and trade values retain their own purpose and model.

## Accuracy check

`node tools/backtest-power.mjs` reproduces the performance-weight comparison
using 576 complete regular-season DFL games from 2019–2025. The fixture contains season-local
roster IDs and scores, without member identities. Candidate weights were
selected on 2019–2023 only. Evaluation predicts next-week scoring order after
Weeks 3–13 (through Week 12 in 2019/2020, before those seasons’ playoffs), excluding score ties from comparison denominators.

| Dataset | New results model | Record-first baseline |
| --- | ---: | ---: |
| 2024 validation | 52.62% (382/726) | 49.45% (359/726) |
| 2025 holdout | 55.25% (400/724) | 51.93% (376/724) |

The selected 60/30/10 weights scored 56.69% on training seasons. This is a
modest historical improvement, not proof of future accuracy. Pairwise results
within the same week are correlated. Historical injury/roster forecasts are
unavailable, so the lineup component and its 25%/40% blend were **not**
backtested. The full report is in [power-rankings/backtest.json](power-rankings/backtest.json).

## Publication and failure behavior

`sync-sleeper` inserts an edition after Sleeper advances beyond the completed
week. It requires contiguous, complete, identified slates, accepts finalized
zero/negative scores, excludes live/future weeks, and scopes reads by league
and season. If the week-state lookup is unavailable, previews stop at the last
validated publication, rather than counting positive live scores. Adaptive game
polls skip publication. Existing editions are not
updated; later trades/injuries cannot rewrite their scores or rank movements.
Names remain current, and the detail sheet can show a changed current lineup
separately. Missing publications produce an explicitly marked Preview.

The initial Weeks 1–5 were rebuilt from results only; Week 6 includes the
current Week 7 forecast. Older rebuilt editions are labeled Rebuilt. A current
roster model is available separately, using the analyzer’s season baseline
only when weekly forecasts are unavailable. It is never presented as a saved
preseason roster. Week 1 has no invented movement against that current model.

The additive migration `20261020175526_league_power_publications.sql` is live.
RLS and grants allow public reads and service inserts, with no anonymous/member
writes or service update/delete access. All six initial editions were validated
before insertion; public-client reads returned six editions of 12 teams.
The scheduled worker is deployed as `sync-sleeper` v20 and retains its custom authentication; an unauthenticated
request returns 401. Publication failures leave other sync work available and
retry on the next full sync. Reverting the frontend leaves the additive table
and saved history intact.

## Verification

- Full `pnpm check`: 237 files / 1,954 tests; theme, name, type, release and bundle checks pass.
- Targeted final model/publisher/roster checks pass; the deployed Edge Function passes Deno check.
- Browser review exercises 12 teams, 320/390/768px, long names, escaping,
  200% text enlargement, 44px targets, row details, keyboard focus/Escape,
  all-team disclosure, week boundaries, route cleanup, reduced motion and
  app motion-off. Weekly movement reveals once per edition, without an idle loop.
- Light/Dark captures are in [power-rankings/](power-rankings/). The full Home
  suite also covers legacy theme aliases, shared navigation, layout and contrast.

Device hardware, comprehensive screen-reader speech and future-season
prediction performance remain unverified.
