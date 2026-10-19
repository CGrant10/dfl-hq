# Trade Deal Room — 1.443.0

The Trade page now has a Deal room beside Find offers, Check a trade, and the existing three-deal local comparison. Build or analyze a package, then use Save / send offer to review its full routing in a compact dialog. Drafts sync across devices and remain visible only to their author under the app's member identity model. Sent offers appear in every participating manager's room. The original share-ticket cards remain available.

Recipients can agree, pass, or load the exact package into the existing builder and send a counter. Every revision retains its author, time and full package; counter history also shows added, removed and rerouted players. Team labels resolve from current analyzer teams. Counters preserve the managers, support three-way destinations, and reset all previous agreements. The latest sender agrees implicitly; every other participant must agree before the room becomes Agreed in DFL. That state opens the Sleeper league; this app does not execute a Sleeper transaction or mark it completed.

## Consistency, identity and access

- Profile identity uses the existing request-member header and server-side optional profile PIN verifier. Locked profiles require a verified PIN for reads and writes, including trusted-device sessions without a remembered PIN. This does not introduce or claim a new OAuth identity system.
- Both tables enable RLS and revoke direct anon/authenticated access. REST wrappers are invokers with fixed empty search paths. Definer implementations live in the unexposed `dfl_trade_private` schema, validate membership/PIN, and expose only the deliberate list/read/command entry points.
- Draft reads are author-only. Uninvolved managers cannot read/respond to a room. Direct table/event writes and client-supplied sender identities are unavailable.
- Row locks and expected revision checks reject stale replies; only the pending sender may withdraw, and only recipients may counter/pass. Terminal rooms cannot be revised.
- Current season, participants, synced roster ownership, duplicate players, self-routes, missing recipients, and the eight-player limit are checked on the server. Manager changes require a new offer. Canonical term comparison rejects fake counters that merely reorder the display.
- The normal Save / send action refreshes current analyzer data and uses the existing ownership/injury/value recheck before opening review. Value/status changes require another review. Server checks use the current synced roster, rather than trusting the client.
- New-offer retry keys are stable per action within review. Retrying a lost response cannot create a second offer with the same key. Existing room commands use revision checks.
- All open offers stay in the inbox; only closed history is capped at the latest 30. Refreshes use the member-array index. Per-author active rooms and per-room revision limits bound accidental repeated creation/history growth.
- Room data stays in memory and is cleared on leave. Quiet polling runs every 30 seconds only while the room is mounted, visible, unfocused and without a dialog; unchanged data does not repaint. Existing analyzer refresh remains unchanged. No new Home/startup requests are introduced; the room API module is lazy.
- This release uses an in-app inbox. No push delivery or Sleeper trade submission is claimed.

## Verification

- `pnpm check`: 1,930 tests across 233 files passed, plus release consistency, theme scan, typecheck, unresolved-name scan and build. Four focused negotiation model tests also passed after final model edits.
- Production build: 78 modules; startup stays three modules and Home four. Prior 1.442.0 bundles are unchanged.
- Isolated PostgreSQL 17: 41 assertions cover permissions/PIN, private drafts, three-way agreement/routing, same-terms counters, manager replacement, stale revisions, ownership changes, duplicate retries, draft removal, revoked table access, invoker wrappers, and open offers surviving 55 newer closed offers.
- Browser: 162 checks across 320/390/768px in Light and Dark. Production page/controller with isolated roster and command services covers inbox, counter editing/review, history, three-way agreement, stale responses, Sleeper link, save failure/retry, draft send/remove, PIN recovery, overflow, 44px targets and reduced motion. Actual screenshots reviewed for both themes, including inbox, counter, history and agreement.
- Existing Trade browser regression passed at 320/390/768px: full routing, saved comparisons, offer counts, counters, roster changes, fresh-injury review, sharing, receipts, current names and overflow. No browser exceptions.
- New schema deployed to DFL HQ using migrations `20261019173555` and `20261019173815`. Production query confirms RLS, revoked table access, invoker RPC wrappers and fixed search paths. A real REST request without a member was refused with SQLSTATE 42501. Production still has zero rooms/events: no real offers or messages were sent during testing.
- Supabase advisors: no new warning-level findings for these objects. Informational no-policy findings are intentional for the two RPC-only tables with direct privileges revoked; new indexes are initially unused on empty tables. Existing unrelated warnings were not changed. See [RLS policy advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Physical iOS/Android keyboard/fullscreen behavior and assistive-technology speech remain unverified. Browser services isolate real league data; sample screenshots are not real manager negotiations.
