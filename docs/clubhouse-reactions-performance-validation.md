# Clubhouse reactions and performance — 1.258.0

The Wall remains the last activity section on Home. Sportsbook remains in the main navigation, and the Member/Commish slider keeps its visible label.

## Changes

- Wall posts support Laugh 😂, Fire 🔥, Dead 💀 and Salty 🧂 reactions, accessible pressed states, counts and profile links under **Who reacted**. Loading and failed mutations have retry feedback. One reaction of each type is allowed per selected member and post. Reactions follow the existing selected-member ownership model; they do not send notifications.
- Post and reply text drafts save on the current browser separately for each selected member and thread. Drafts older than 30 days are not restored. Images are not saved. Successful posting clears the draft; failed posting preserves it. Discard asks before removing entered text. Storage failures leave typing available with an explanatory status.
- Sportsbook loads compact discovery metadata for all open provider props, including results beyond the PostgREST row cap. Full markets and outcomes load per opened game, with a loading announcement and retry. Filters search the complete discovery list without opening every matching game. Selected picks are refreshed separately on route changes; closed picks are removed. Game names also recover from game-total metadata when older prop notes omit the matchup.
- League search renders each source when it finishes. Slower player downloads do not delay member, Wall and record links. Newly arriving groups preserve focus on existing links. Query-generation checks discard stale results.
- All three new modules are included in the service-worker app shell.

## Verification

`pnpm check` passes: type checking, identifier checks, 956 tests across 102 files and the production build. New tests cover draft isolation/expiry/storage errors and complete discovery/game loading beyond server row limits.

Browser tests use Chromium, production reads and blocked production writes. Browser-only fixtures verify reaction addition/removal/counts/names and error retention; failed post/reply draft recovery after reload; successful submission clearing; mention preservation; exact-post thread opening; progressive search with a deliberately paused player download and retained keyboard focus; and per-game line retry, multi-game picks and selected-state retention while another game loads. Database tests use rolled-back transactions to verify own inserts/deletes, rejection of foreign inserts/deletes, immutable ownership, and uniqueness. No test posts, replies, reactions, notifications or bets remain in the league.

The schema uses a separate identity primary key and an explicit author embedding to preserve the Wall's existing author relationship. Table privileges are explicitly restricted to select/insert/delete; RLS checks selected-member ownership. The public prop-index function is security invoker with an empty search path. Supabase advisors show no security findings for these additions. The new member foreign-key index is reported as unused before production reactions exist; it is retained for ownership queries and cascades ([advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)).

With the current feed, discovery returns 2,630 open props. The initial market/outcome response bodies total 1,260,280 bytes, versus approximately 2,697,833 bytes for the preceding full-load approach: about 53% less uncompressed JSON. Opening the sampled 184-prop game adds two requests and 176,342 bytes. These are payload measurements, not a claim about elapsed loading time or all future feed sizes. Existing daily wallet behavior is preserved.

Axe checks for WCAG 2 A/AA, 2.1 A/AA and 2.2 AA show zero violations on sampled Wall, search and Sportsbook states, including narrow layouts, desktop, reduced motion and enlarged text. These checks do not establish complete WCAG conformance. Physical VoiceOver/TalkBack and background push checks remain listed in [the clubhouse validation checklist](clubhouse-accessibility-validation.md).
