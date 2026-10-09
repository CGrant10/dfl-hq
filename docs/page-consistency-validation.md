# Shared league page styling — v1.354.0

Trade, Sportsbook, Team Analyzer, Profile, Wall, History, Lore, Rules, Calendar,
Keepers, League Fees, Polls, Proposals, Notifications and Playoff Race now share
the compact reading rhythm established by Home and Clubhouse. Boxy Rajdhani
headings, smaller supporting labels, quiet dividers, consistent controls and
flat tab strips replace conflicting page-specific chrome. Existing shared
selection rails, page entrances, disclosures and button feedback remain active.

The router applies a scoped attribute before rendering each supported page and
clears it on other destinations. Home, Clubhouse and the dedicated Broadcast,
Golf and Arena presentations retain their own styles. Transactional bet-slip
fields retain their existing sizing. Phone fields use 16px text to avoid focus
zoom; narrow Analyzer selectors use the full available width.

Profile keeps its photo and achievements, the Wall keeps conversations and
authored picture framing, and archives retain their existing sections and
season navigation. Notifications now read as a compact list rather than panels
inside panels. Analyzer roster names open the existing shared player card.
Calendar receives the same title/subtitle header structure as other utilities.
Trade valuation, scoring, wager placement, permissions and share-card artwork
are unchanged.

## Verification

- `pnpm check` passed: identifier checks, TypeScript, 145 test files / 1,296 tests
  and the production Arena build.
- The production Trade fixture passed at 320, 390 and 768px: wanted-player
  selectors, three-team recipient routing, saved comparisons and reload,
  counteroffers, recipient removal and stale ownership rejection.
- Read-only Chromium checks covered all 15 supported routes at 320 and 390px,
  selected desktop layouts at 1280px, and 200% text sizing on all 15 routes.
  No document overflow or browser exceptions appeared; the top bar remained
  44px. Medicine dark/light variants were captured on eight key pages.
- Exercised Profile edit/cancel, Analyzer team selection and roster player-card
  focus return, Wall replies, History/Yearbook selection, Calendar and Rules
  tabs, and the Sportsbook slip's separate review/confirmation and focus return.
  Shared tab motion respected Motion off and OS reduced motion.
- Home and Clubhouse scope checks passed. Clubhouse's side-by-side matchup
  comparison kept its labels below navigation at 320, 390 and 1280px.
- The Trade review workflow now watches this stylesheet, and its isolated
  production fixture opts into the same route marker as the real page.

Before/after PNGs, browser reports and test output are saved in the working
session at `/workspace/dfl-page-system-1354/`. The broad browser report contains
299 checks and 74 captures; subsequent captures verify the final override
resolution, larger-text selector and notification list. League writes were
blocked, and the wallet was a UI fixture. No wager, post, reply, vote, payment,
notification action or profile save was submitted. These browser checks do not
replace physical iOS/Safari or screen-reader testing.
