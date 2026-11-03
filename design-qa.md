# Clubhouse matchup layout QA — 1.535.0

final result: passed

## Source and comparison state

Source visual truth: [ESPN's published App Store matchup screen](docs/clubhouse-matchup-layout-1535/espn-matchup.webp),
downloaded from its current official App Store listing on November 3, 2026.
Source image is 600×1300px with marketing/device chrome. The app content crop
(70,295)–(531,1048), 461×753px, is normalized to 390×637px. No device chrome is
recreated. The published example is live hockey; DFL is a live football fixture.
Team identities, sport-specific stats and theme are intentionally different.
This is a structural adaptation within the production app, not a pixel clone
or an audit of ESPN's signed-in app.

Implementation: [390px Dark](docs/clubhouse-matchup-layout-1535/390-dark-clubhouse-default.png),
390×844 CSS px, deviceScaleFactor 1. The matchup desk's content-only screenshot
is cropped to the same 390×637px comparison region. The app's existing shared
navigation remains outside the content comparison.

[Full comparison](docs/clubhouse-matchup-layout-1535/comparison-full.png) and
[focused header/first-row comparison](docs/clubhouse-matchup-layout-1535/comparison-focus.png)
were opened together and inspected. Browser rendering uses existing local
Chromium/Playwright review tools; Cloud Browser is not exposed in this session.

## Comparison history

1. P2: The main header inherited a five-row subgrid, leaving unused space below
   the remaining-starter line. Reset parent rows and each side's row placement.
   Final captures show content-driven header height with no reserved empty rows.
2. P2: An earlier [combined comparison](docs/clubhouse-matchup-layout-1535/comparison-before-row-fix.png)
   exposed lingering position-specific minimum stat-line heights. Override those
   within Clubhouse. Final captures show the stat line and PPR average together
   beneath the relevant player, without the old blank gap.
3. Post-fix full and focused comparisons show no remaining actionable P0/P1/P2
   issue within the requested ESPN-inspired DFL adaptation.

## Required fidelity surfaces

- Typography: Inter provides clean UI/player labels and heavy score totals.
  Existing DFL score effects retain their sport typography. ESPN's proprietary
  brand font is not copied. Full current team names wrap; chip accessibility
  labels retain names and exact totals even when only logos are shown visually.
- Layout: slim outlined chips, outside logos / inside score totals, team context
  below, opposing player rows and a narrow center position column follow the
  source structure. Repeated headings and persistent utility controls are removed
  from the default matchup stack. Existing DFL touch targets, player portraits,
  PPR averages and supporting matchup sections require more height than ESPN's
  hockey sample; that is intentional. Adaptive cell stacking preserves large text.
- Color: DFL Light/Dark Medicine Wheel tokens intentionally replace ESPN's palette.
  Existing semantic live/final/lead colors and hot/cold effects remain. Both themes
  were visually inspected; automated interface checks cover contrast and focus.
- Image quality: existing shared team/member photo sources and preference ordering
  are unchanged. Images have explicit sizes and retain established fallback.
  No generated substitutes, ESPN team art or new image downloads are introduced.
- Copy/content: actual DFL names, two-decimal points, week, player state, stat lines
  and PPR averages are retained. No invented win probability, record or live
  projection is added. Refresh/motion controls remain inside Week & tools.

## Interaction and implementation checklist

- Tap and swipe across all six games; reverse, edge, interrupted and cancelled
  gestures; native vertical scrolling; keyboard navigation; exact route identity.
- Existing finite logo shake and Reduced Motion; no permanent transition layers.
- Full selected names/totals in the compact scrolling reference; player-card entry.
- Light/Dark, 320/390px compiled captures; five-width enlarged-text containment.
- Console/page errors checked: none in fixture and compiled app captures.
- Build, theme scan and 2,425 tests pass. Detailed evidence is in
  [the release note](docs/clubhouse-matchup-layout-1535.md).

## Follow-up limits

Physical Safari and VoiceOver remain unmeasured. ESPN's native logo animation and
signed-in interactions cannot be validated here. No further visual exploration or
new product features are needed for this scoped layout change.
