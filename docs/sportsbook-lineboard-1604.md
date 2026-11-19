# Sportsbook — 1.604.0

The selected compact lineboard replaces the extra market dropdown with Fantasy
and Pick’em tabs and an external My bets button. Existing bets remain available,
including retired NFL props. Three matchup pairs lead; All 6 expands the rest.
Early lines stay collapsed. Existing identity and sheet/motion systems remain.

## Freshness and accepted prices

Visible-book projections read current Sleeper starters and this league’s actual
scoring every 30 seconds, using short caches and the existing visibility-aware
refresh loop. The private Sportsbook job now runs every five minutes and updates
both sides of available matchup quotes. Once a market closes, projections can
continue changing while its offered odds stay locked. Stored ticket/leg prices
are immutable. Confirmation binds to the reviewed odds under the same market
lock; a last-moment price move rejects the entry for another review.

No NFL props catalog/index or paid-provider ingestion runs in the new flow.
Only market rows referenced by existing tickets are loaded for history. The
player-card props link and custom-line creation form are hidden while paused.

## Backlog settlement

The worker resolves supported historical SGO props through a recorded Sleeper
stat and an exact final NFL game. Namesakes require an unambiguous valid stat
record and matching club/kickoff. Missing stats are not treated as zero; unknown
provider scoring remains ungraded. Settlement and quote refresh fail separately.

The deployed version 17 of sync-sportsbook-feed is byte-identical to the tested
bundle and preserves existing authorization. The first live maintenance pass
updated six matchup quotes and graded all five overdue legs on the outstanding
prop ticket. Accepted lines matched stored market lines. The ticket closed as a
loss. A repeated pass graded zero legs; no repeat payout or debit was created.

## Validation

The full suite passed 2,720 tests before the final deduplication regression was
added; focused follow-up suites pass. Browser evidence covers compiled current
league data at 320/390px in both themes, enlarged type, tab/keyboard navigation,
week controls, six-game expansion, selection and slip opening/closing. The
24-layout slip suite and 48 result/share checks pass. No UI capture places bets.

Transactional SQL probes roll back all test data and verify open repricing,
stale-response rejection, locked-price preservation with projection updates,
settled-market exclusion, accepted-leg snapshots, service-only quote publishing,
and rejection of stale confirmed prices. Physical phone timing is not measured.

Build and test the exact edge bundle with:

    node tools/build-sportsbook-edge.mjs
    node tools/test-sportsbook-edge.mjs /tmp/dfl-sportsbook-edge/index.js

Evidence: /workspace/dfl-book-1604/.
