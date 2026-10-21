# Trade discovery and member portraits — 1.459.0

The Steal search was losing valid compact packages in its broad shape/partner
sampling budget. A read-only comparison against the same current-league snapshot
found five returned Steals for one roster before the change and 22 afterward.
All twelve rosters returned more qualifying offers in the comparison; results
remain capped at 132. The anonymized counts are in
[discovery-comparison.json](trade-search/discovery-comparison.json). These are
candidate counts, not acceptance probabilities or claims about future live data.

A second pass considers supported one- and two-player packages on each side,
then sends at most 128 additional candidates per opponent through the existing
full evaluator. It respects anchors, requested shapes, package limits, manager
intentions, ownership, goal and horizon. Larger packages still use the existing
search. Deduplication happens before full evaluation. No player price, positional
factor, uncertainty band, injury rule, incoming-QB exclusion, similar-star
premium rule or minimum roster-fit requirement was loosened. More players do
not increase a verdict by themselves.

Fresh visits now clear all offer filters, including saved send anchors, player
counts, goal and horizon. Manual trade drafts remain saved. Restricted empty
searches can reset to all teams while keeping the chosen tier. Empty Steal
results report up to two common blockers and retain honestly labeled closest
offers. They do not manufacture a Steal to fill the tab.

## Member photos

`member-photo.js` supplies one ordered image list. Sleeper is the default:
current league team avatar, Sleeper owner avatar, DFL upload, then initials.
Choosing DFL moves the upload first while retaining the Sleeper fallbacks.
Shared member-directory hydration supplies current Sleeper URLs even when a
page only receives a member identity rather than an analyzer roster.

Profile → Edit offers native Sleeper / DFL upload radio choices with previews.
Uploading selects DFL automatically; choosing Sleeper preserves the upload.
Removing an upload returns to Sleeper. Source changes update the portrait and
selection in place, preserving keyboard focus and other unfinished identity
fields. The small border/wash transition respects app motion-off and system
reduced motion.

The preference reaches the header and member picker, shared Home/ranking,
GameDay/Clubhouse, sportsbook, analyzer, trade and receipt portraits, profile,
Wall authors and Arena member portraits. Explicit broadcast/lookalike artwork
and customized Arena runner art remain separate presentation choices. Chaos
images never enter an automatic fallback chain.

The additive `20261021184503_member_photo_preference.sql` migration is deployed.
It leaves existing uploads intact: production verification found all twelve
active uploads preserved. `dfl_save_profile` invokes a private function that
checks the selected active member and the existing profile-PIN mechanism.
Source and upload save together; callers cannot supply another target member.
Client checks surround the asynchronous import/request boundary. Saving refreshes
the member directory/header and invalidates the shared analyzer snapshot.

## Verification

- `pnpm check`: release, themes, TypeScript, unresolved names, full Vitest suite,
  generated CSS, worker and application bundles pass. Startup remains three
  modules and Home four. The retained 1.458.0 bundle is unchanged.
- Discovery regression uses a fixed, anonymized evidence/value snapshot and
  checks that a formerly lost compact package reaches the actual evaluator.
  Every returned Steal still clears its evidence band, roster usefulness and
  QB restrictions. Shared valuation/position/confidence tests also pass. The
  generated production worker also returned the rescued compact offer in a
  real browser check: [worker-check.json](trade-search/worker-check.json).
- Production Trade controller review at 320/390/768px passes, including counts,
  larger requested packages, clean defaults, restricted empty states/reset,
  closest offers, routing, fresh-injury rechecks and ownership checks.
- Real Profile controller reviewed in Light and Dark at 320/390/768px: source
  preview, source persistence on remount, upload preservation, automatic upload
  selection, removal, disabled unavailable source, keyboard arrows/focus,
  unfinished identity field preservation, 44px targets, no horizontal overflow,
  PIN retry, network retry, selected-member changes and broken-image fallbacks.
  Captures and results: [member-photos](member-photos/).
- Arena also accepts embedded raster profile uploads. Its real commissioner
  picker checks the selected DFL image, selected Sleeper image and fallback to
  the preserved upload at 320/390/844px in both themes.
- Existing secondary-page mobile review passes. Light/Dark 320px empty Steal
  screenshots were inspected in [trade-search](trade-search/).
- PostgreSQL 17 fixture verifies ownership, RLS blocking direct updates, PIN
  rejection/acceptance, source switching, upload preservation/removal, inactive
  and missing identities, and input limits. Production anonymous RPC invocation
  is rejected with SQLSTATE 42501; no real member preference was changed by tests.
- Security advisor counts are unchanged from before deployment. Existing
  search-path/legacy public definer warnings remain existing database debt;
  this migration adds none. See the existing
  [search-path warning guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
  Member-table RLS stays enabled with existing admin
  and commissioner write policies. Anonymous table UPDATE grants alone do not
  bypass those policies.

Physical iPhone/Android installation, screen-reader speech and native-device
frame pacing were not measured. The snapshot comparison does not prove that all
possible trades are searched or that other managers will accept a generated deal.
