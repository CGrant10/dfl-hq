# Expert evidence and confidence — v1.341.0

The current FantasyPros PPR rest-of-season consensus is connected to player values. The initial public snapshot contains 354 offensive players and eight contributing experts, updated October 8, 2026. Only numeric rank facts and player identities are published, with attribution and a source link; analyst notes and premium data are excluded.

Fresh, safely matched ranks contribute at most 15% of a player's value. DFL-scored forward production, projections and positional replacement remain the main inputs. The expert value component retains the same one-QB discount. Expert opinion does not change lineup point projections or establish an injury return date. Source ranks are converted to a bounded model index, not an external trade price.

The ranking loader checks season, scoring, source timestamp, consensus count and payload coverage. It uses the published GitHub snapshot plus the app snapshot, bounds each network request to 2.5 seconds, and excludes rankings older than 72 hours. Matching requires an unambiguous normalized name, offensive position and NFL team; duplicate matches are rejected. A scheduled workflow refreshes every six hours, validates the source, commits only the snapshot and explicitly rebuilds Pages. Failed refreshes preserve the previous snapshot without refreshing its source date. The PR workflow checks the refresh against the real provider without publishing.

Verdict confidence is qualitative evidence support: Strong, Mixed or Limited. Missing/stale inputs, unmatched expert records, forecast/ranking disagreements, wide expert splits, injuries, fallback forecasts and thin completed-game samples require review. Overlapping value ranges suppress strong winner claims. Uncertain deals do not receive a robbery roast. Incoming QB packages remain excluded from Steal. Current labels are preserved across multiplayer routing and exported receipts. Existing v3/v4 receipts keep their frozen values and asset-winner interpretation; new snapshots use v5.

Sleeper dual offensive eligibility is respected when a player's primary position is defensive, including Travis Hunter's WR eligibility. A selected owner-held player missing from the rated pool is flagged rather than silently counted as free value.

Read-only actual-data browser checks matched 156 of 158 rated rostered players. Amon-Ra plus a second player for CeeDee produced Review/Mixed support rather than Steal; current availability tags were shown. Ordinary QB values remained discounted and Josh Allen retained his projected premium. Phone checks at 320/390/768px found no overflow. Tests opened Home Wall replies and a direct post, browsed/shared the 2019 Week 1 archive, and downloaded actual PNG receipts in clean/full/photo styles. A forced player-photo failure recovered to a downloadable card without the photo. Share highlights and full descriptions both retain confidence.

Validation: full local check passed before final hardening; final targeted tests and TypeScript passed afterward. The release requires complete exact-head CI, refresh-source verification, production trade-handler browser checks, successful deployment and public-site verification. Python refresh validation covers format mismatches, incomplete/single-expert data, source age and exclusion of analyst notes. No league writes were made during browser verification.

## Current behavior — 1.612.0 (November 25, 2026)

The section above records the 1.341.0 release. Current consensus weighting is
30–50% before spread and new-context adjustments; current source refreshes are
scheduled every 30 minutes, not every six hours. The visible analyzer polls each
minute while active, with one-minute current stats/projections, five-minute
player/injury caches and five-minute completed-week stats. Those are retrieval
intervals, not a guarantee the upstream provider has published new information.
Backfield snapshots are scheduled every six hours and cached five minutes.

Reproduced the reported Coleman/Rice/Croskey-Merritt for McCaffrey/Brown package
using current league rosters/scoring, public Sleeper weekly results, dated ESPN
injury reports and FantasyPros PPR ROS facts. Before this release, each package
was 91 model value points: McCaffrey supplied 81 and Brown 10. Coleman was already
recognized as the lead back with expanded usage; Brown's doubtful designation
and starting-QB absence were already present. The model was not pricing Brown
as an equal to Coleman.

Found and corrected a calendar-window gap: only four calendar weeks were
passed to recent form, leaving returning players with one result. Recent form
now receives all completed weeks and selects the last three played games per
player. Missing/non-playing samples remain missing, while explicit zero-point
results remain included. Coleman remains above his old role projection without
assuming a recent touchdown spike is his guaranteed future scoring rate.

A current dated injury report can supersede an older weekly healthy placeholder;
a later explicit Sleeper status/news update supersedes that report. Current
poor production gets more weight when a player is presently out/doubtful, even
when new prose no longer repeats an earlier setback. Consensus published before
material injury or QB news gets 35% of its normal weighting (70% for routine
questionable status alone). Once consensus is dated after that context, ordinary
weighting resumes. These are bounded model assumptions, not calibrated injury
probabilities or medical return estimates. Current production already earned
is never changed by an injury or opinion adjustment.

In the captured reproduction after the fix, the packages remain fairly close
on estimated price (90 sent / 87 received). The model projects about +2.8 starter
points/week through McCaffrey, with a loss of RB coverage; that projection does
not establish that sacrificing healthy depth is the manager's best decision.
Suggestions and manual checks now show incoming player names, injury tags and
QB/role risks directly. A risky incoming package uses the `Risky return` card
heading independently of its numerical price balance. Existing protected-player,
handcuff, roster-depth, one-QB, multi-team, counter and IR exclusion rules remain.

Regression evidence: `tools/fixtures/trade-context-2026-11-25.json` contains only
public player facts and league scoring, with no member identities. Tests verify
played-game selection, grounded role changes, injury/news chronology, historical
point preservation, opinion ordering and incoming-only risk for directed trades.
Full test and mobile evidence is recorded in theme-audit.md and the task's
`/workspace/dfl-trade-values-1612/` artifacts. Model prices are estimates; no
external expert source supplies these exact package prices.
