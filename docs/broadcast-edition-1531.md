# Expanded broadcast edition — 1.531.0

Home could initially show only the daily opener and two analysis stories.
The edition filter also allocated a single combined slot to all champions,
last-place awards, records, facts and anniversary content. History enrichment
waited for the full analysis/weekly-fixture bundle even after history was ready.

The broadcast now keeps the current Champion and Chip Eater when available,
prioritizes current league activity and uses the remaining regular slots for
different historical subjects. A normal edition supports up to nine stories
plus the independent daily opener. Quiet-day history covers different kinds
before adding a second record; past champions are limited to one per edition.
Selections rotate deterministically by date and remain stable on refresh.
Explicit commissioner pins remain honored and no filler facts are invented.
Automatic news/trade expiry, personal-score exclusions, generator switches and
the Arena-result exclusion remain in force.

History now enriches the existing stage immediately after its own read resolves.
Automatic story IDs follow the story's identity rather than its position in the
ranked array, so inserting a fresh story ahead of it preserves the selected
slide and its entrance. No additional data request or polling loop was added.

Visual exploration of the next broadcast design is separate from this fix.
This release retains the existing artwork, composition and carousel behavior.

Validation:

- `pnpm check`: 2,422 tests in 293 files, release markers, themes, types,
  identifiers and production build pass.
- Unit coverage includes both awards, quiet-day variety, current-story
  priority, deterministic rotation, idempotent recuration, expiry, manual pins,
  no invented fillers and story identity across insertion/reordering.
- Production-component browser coverage passes 90 normal and 56 enlarged-text
  layouts, both themes, artwork/text separation, long names, 44px controls,
  one-pass autoplay, replay and Reduced Motion.
- Fresh compiled-app capture observed nine slides, including both awards,
  current league stories, Auto Scout and history. The prior capture had three.
  Actual member captures stay local. Physical Safari is unmeasured.

Evidence: [layout checks](broadcast-edition-1531/wide-checks.json),
[enlarged text](broadcast-edition-1531/wide-enlarged-checks.json),
[compiled edition](broadcast-edition-1531/compiled-checks.json).
