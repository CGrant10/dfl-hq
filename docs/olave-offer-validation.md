# Olave offer discovery — 1.377.0

Verified October 11, 2026 against the current Sleeper league roster snapshot,
including Chris Olave (8144) on The Bayou Bombers (roster 3).

## Root cause and change

The FantasyPros PPR rest-of-season snapshot exceeded its 72-hour source-age
limit. The public source itself was still stale when a refresh was attempted.
The model correctly excluded those rankings from player values, but its Fair
classification also depended on expert confidence. That put every otherwise
balanced offer into Aggressive, for all eleven potential trading partners.

Fair now requires the same >=90% value balance, both roster impacts >=-0.75,
both weekly lineup changes >=-1, current modeled player inputs, and supported
availability. Expert availability remains a separate review flag. Missing
projections, production fallbacks, stale core inputs, and out/reserve players
still cannot qualify. Steal retains all existing requirements, including strong
fresh evidence, a favorable gap outside sensitivity ranges, and no incoming QB.

An empty selected category now shows up to three alternatives under their actual
category, retaining the selected anchors and package limits. The selected tab
stays selected. A button opens all offers of the alternative category. This does
not relabel alternatives as Fair or Steal.

## Validation

The same saved roster data produces Fair Olave offers for 10 of 11 partners,
compared with none before the change. The remaining roster does not meet the
unchanged balance and roster-fit limits. No unsupported Steal was created.

Regression coverage includes stale/unavailable/mismatched expert feeds, missing
expert matches, anchored receiver discovery, unchanged core-input exclusions,
and bounded alternatives with their original ratings. Phone browser checks use
production page handlers and the real saved roster snapshot at 320px and 390px,
covering Fair review badges, Steal alternatives, tab switching, analyzing an
Olave offer, and horizontal overflow. No league writes are made during testing.
