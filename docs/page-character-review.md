# Core page character — v1.355.0

Fresh 390px Chromium captures of the current app exposed a consistent but
repetitive presentation: large form areas, stacked navigation and little team
identity before the first action. Home and Clubhouse supplied the reference:
real teams, useful numbers, restrained league color and a clear next action.

## Five-screen review

1. **Trade — healthier, faster entry.** `01-trade.png` showed a stacked form
   occupying almost the entire first screen. Team selectors now display
   portraits and complete team names side by side while retaining native
   selects. Offer/want controls sit together; selected players have headshots
   and wrapping names. Generated offers appear much earlier. Keyboard focus
   returns to a replaced selector after team or partner selection.
2. **Sportsbook — healthier, visible action.** `02-sportsbook.png` showed three
   control rows followed by closed matchup groups. Slates with open lines now
   lead. One open matchup appears immediately, preferring the current member's
   matchup when its ownership can be identified. Both teams, projections and
   odds appear side by side; the remaining games stay available in a disclosure.
   The duplicate member-name strip is removed. Current/upcoming week captions,
   locked picks and the two-step wager review remain explicit.
3. **Analyzer — healthier, stronger roster context.** `03-analyzer.png` showed
   the selected team only inside a field and repeated optimal-lineup copy.
   A portrait, full current name, grade and league rank now identify the selected
   roster. Its identity changes with a restrained 180ms transition. The weekly
   panel leads with the existing best-lineup projection, clearly labeled, and
   compact status. Motion preferences suppress the transition.
4. **Profile — healthier, career first.** `04-profile.png` placed member browsing
   before the career record and repeated the empty-bio prompt. The identity has
   one quiet team-colored surface; the record, accomplishments and career
   highlights precede member browsing. Empty bio copy is omitted. Edit/cancel,
   photo controls, sign-out and the existing share card remain available.
5. **History — healthier, recognisable winners.** `05-history.png` used uniform
   striped year rows with small names. Champion and runner-up portraits now
   accompany the current names, with the champion receiving stronger emphasis.
   The season remains clear. Existing table roles, profile links, manual result
   editing, deleted-account fallback and Yearbook navigation are retained.

## Evidence and checks

The numbered before captures, final route captures, selected-player and edit
captures, large-text variants and browser logs are saved in the working session
at `/workspace/dfl-premium-1355/`. All evidence was captured during this pass.
The initial Sportsbook grid capture with inherited price-column conflicts was
rejected and corrected before the final layout checks.

- `pnpm check`: TypeScript, identifiers, 145 test files / 1,296 tests and
  production Arena build passed. The final ownership guard also passed the
  Sportsbook renderer tests and TypeScript check.
- The production Trade fixture passed at 320, 390 and 768px: recipient routing,
  wanted-player selection, comparison reload, counteroffers, member removal
  and stale ownership handling.
- Browser checks exercise native team selection and focus, selected headshots,
  multi-team mode, receipt and roster player-card return, featured bets, locked
  picks, props, Pick'em, Profile edit/cancel, Yearbook, motion preferences,
  phone/desktop layouts, enlarged text, dark/light themes and other public pages.
- Wager confirmation and league writes were blocked. No post, vote, reply,
  payment, profile save or wager was submitted. The wallet was a UI fixture.

Team portraits use existing profile artwork, with initials when no artwork is
available. This does not invent team logos or alter broadcast and share-card
images. Keyboard, reflow and motion checks do not establish physical iOS/Safari,
screen-reader or full accessibility conformance. Trade valuation and scoring
are unchanged.
