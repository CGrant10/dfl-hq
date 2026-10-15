# Three-team routing — 1.416.0

Manual multi-team packages require a recipient for every newly selected player. Existing valid routes survive adding or reordering members. Removing or replacing a recipient clears that player's destination, including when only two teams remain; the board offers an explicit replacement choice and keeps evaluation, proposal saving and sharing disabled until the deal is complete. Ordinary bilateral selections retain their sole recipient automatically.

The board distinguishes missing sending teams, unassigned players and teams without an incoming player. Recipient fields expose their incomplete state to assistive technology. Draft restoration matches packages and search filters by owner ID, so removing a member cannot shift another owner's package. Pending choices persist through reopening.

The three-way evaluator accepts explicit destinations. Suggested offers carry their evaluated destination map into the editor; legacy circular suggestions retain their original documented routing. Per-team incoming/outgoing values, lineup changes, saved proposals and share cards all use the same routed deal. Player pricing and league format are unchanged.

Validation covers split outgoing packages, combined incoming packages, missing recipients, removed members, reloads, owner disappearance, legacy bilateral/circular trades and explicit three-way evaluator parity. The production Trade handlers are exercised with isolated roster/provider data at 320, 390 and 768px in Chromium. Focused WebKit checks verify recipient choices, sharing, removal, reopening and explicit repair. Business writes are blocked during verification.
