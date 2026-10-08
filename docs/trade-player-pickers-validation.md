# Trade player pickers — v1.332.0

The Trade Board's player selectors had become difficult to find inside the collapsed package-settings disclosure. Players to offer and players wanted are now primary controls, always visible in offer mode. Package size and exact counts remain optional settings.

All-teams shopping also offers a wanted-player selector grouped by the owning team. Choosing a player selects that owner, requires the player in incoming offers and preserves outgoing player choices and package preferences. Existing two-team/multiple-player picks, multi-member recipient routing, saved drafts and share cards retain their behavior.

The production-handler Trade browser review exercises the pickers without expanding settings at 320, 390 and 768px. It chooses an outgoing player, switches to all-teams shopping, picks a wanted player and checks automatic owner selection, outgoing preservation, keyboard focus and every generated offer's inclusion of both chosen players. It also runs the existing routing, sharing, proposal, reload, counteroffer and stale-roster checks. Review data is isolated; no league transactions are submitted.

The repository check runs TypeScript, identifier validation, all tests and the Arena build. Exact-head Trade CI runs before merge. After deployment, compare changed public assets to the merge commit and verify visible pickers and a chosen-player offer with live read-only league data.
