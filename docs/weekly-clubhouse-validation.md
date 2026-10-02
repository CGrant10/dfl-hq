# Weekly clubhouse — 1.259.0

Home and More link to the weekly clubhouse. The six main tabs remain, Sportsbook stays in the main navigation, and the Wall remains the last Home activity section.

## Weekly rituals

- Final boss, biggest blowout, closest escape and bench regret awards derive from the archived matchups and actual Sleeper weekly rosters. Weekly points refresh synced scores; historical starters determine bench eligibility. Bench regret means the highest-scoring benched player, not an invented optimal lineup or a claim that every bench point could have been started. Missing lineup data omits the bench award with an explanation. Tied awards are shared; drawn matchups never produce a winning-margin award.
- Clown of the Week has one public, changeable vote per selected member. Members can withdraw before the deadline. Server RLS enforces ownership, nominee participation, uniqueness and the voting window. Closed ballots preserve the winner or co-winners; no votes means no winner. This uses the existing selected-member model, not a new authenticated identity system.
- Ballots open after the completed slate, normally Tuesday at 6 a.m. Eastern, and close the following Tuesday at 6 a.m. Eastern. The calendar derives from the NFL kickoff Thursday after Labor Day. Recorded non-final NFL games delay final awards and voting; historical weeks without stored NFL slate data use the calendar and synced history. Date boundaries account for daylight-saving changes. The UI displays the deadline in the viewer's local time.
- Each matchup can open one shared Wall thread. Creation is member-owned and serialized on the server; repeated opens reuse the post. Threads inherit Wall replies, mentions, reactions, moderation, notifications and text drafts. Deleting the post removes its thread mapping. Merely browsing creates no posts.
- The recap combines final fantasy awards/results, graded Pick’em winners, the existing public Sportsbook recap and up to three Wall receipts from the week. It shares a branded PNG through the existing phone share sheet, saves the image on browsers without sharing, and has a text fallback. It never automatically sends anything to a group chat.
- Profiles contain a weekly award cabinet with a season selector and links back to each week. Award history stays derived so scoring corrections remain consistent. Stored votes preserve the league's picks. Historical lineup reads start only when the cabinet opens, use a shared cache, and run at most three at a time.
- Home's previous recap now uses the actual historical weekly roster and remains available throughout the week. Its recap action opens the unified clubhouse instead of the old fantasy-only share flow.

## Verification

`pnpm check` passes type checking, identifier checks, 963 tests across 103 files, and the production build. Model tests cover historical roster selection, fresh scores, missing data, shared ties, draws, unfinished weeks, open/closed ballots and recap text. The offline shell dependency test includes the new route and all new modules.

Database checks run with the public `anon` role and selected-member header inside rolled-back transactions. They verify index/week/archive reads, own vote changes/withdrawals, rejection of foreign and closed-week writes, and reuse of a matchup thread. No test votes, posts or notifications remain in the league. The public recap reads only graded Pick’em receipt columns; ungraded cards, picks and private tiebreakers remain inaccessible through the Data API. New functions use security invoker and an empty search path. New tables have RLS, explicit minimal grants and foreign-key indexes.

Chromium checks use production reads with production writes blocked. Browser fixtures verify vote failure/retry, changing and withdrawing a vote, current-week finality, historical week selection, thread deep links, profile cabinet awards, Home placement and More navigation. The PNG was downloaded and inspected. Axe checks for WCAG 2 A/AA, 2.1 A/AA and 2.2 AA show no violations in sampled phone/desktop layouts, reduced motion and enlarged text. No horizontal document overflow was found. This does not establish complete WCAG conformance; physical VoiceOver/TalkBack and native phone sharing still need device verification.

Supabase advisors report no security findings for the additions. Fresh voter/nominee indexes are reported unused before production votes exist and retained for foreign-key operations ([advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)).
