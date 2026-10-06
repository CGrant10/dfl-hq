# Compact Home scale — v1.313.0

Home's hierarchy is retained at a smaller scale: section titles are 22px on phones and 24px on wider screens, story/subsection headings 18/20px, body copy 14px, supporting details 12/13px, and metadata 11px. Home player scores use a shared 20px size in the preview and detailed rows. Team totals remain larger than player scores, with reduced phone/tablet/desktop sizes.

The masthead, illustrated headline, archive thumbnails, and carousel illustrations now have width caps. Tablet names and supporting text no longer jump to oversized display sizes. The broadcast reserves at least 246px on phones and 320px on wider screens, and still measures the tallest slide so rotation does not move the sections below it. Illustrations are capped to fit the shorter stage. Major sections use 2px rules and 28/32px gaps, while internal headers and padding are smaller. Navigation, carousel, and section actions retain their 44px touch targets.

Before/after fixtures and captures are retained under `/workspace/dfl-compact/before/` and `/workspace/dfl-compact/after/`. In the Dark fixture the phone archive decreased from 417.7px to 319.4px high; at 1280px the capped thumbnails reduced it from 632.4px to 293.5px. Focused Light/Dark captures cover 320/390/768/1280px without horizontal overflow.

Validation: `pnpm check` passed typechecking, name checks, 1,102 tests across 124 files, and build. The existing Home browser review checks carousel content bounds, contrast, sticky controls, section links, expanded panels, score alignment, and texture reuse. Its player-score assertion now expects the intentional 20px Home size. The PR's Home design review workflow retains full browser captures as an Actions artifact.

These captures use production components with representative fixture data; they do not authenticate a protected member or exercise live writes. Release and cache markers advance to v1.313.0.

---

# Clearer Home reading hierarchy — v1.312.0

Final result: passed

Home now separates section titles, story headings, body copy, supporting details, and metadata. Major titles use 28px on phones and 32px on wider screens; story/subsection headings use 22/24px, body copy 16px, supporting details 14px, and scoped metadata 12px. Score numerals retain the shared 24px scale.

Major regions use stronger 3px rules and 24/32px spacing, while item rows retain thinner separators. The archive heading is visible and matches the Archive jump control. The summary counters now have a semantic “League at a glance” heading. GameDay, the archive, More from the league, and Letters have clearer boundaries in both themes.

Before/after phone captures, wider-screen and Light captures, measured type sizes, and complete browser output are retained under `/workspace/dfl-readability/before/` and `/workspace/dfl-readability/after/`. The CI Home design review retains rendered captures as an Actions artifact.

Validation: `pnpm check` passed typechecking, name checks, 1,102 tests across 124 files, and build. Typechecking and name checks also passed after the release/cache version update. The production-component Chromium review passed 60 broadcast layouts, 48 navigation states, 24 expanded-section states, and 18 palette/viewport states. All 7,365 measured theme text observations passed, with minimum contrast 5.57:1. The review also passed sticky bars, section jumps, reduced motion, score consistency across ten states, and unchanged-texture reuse during expansion; no page errors were observed. The capture waits for the selected navigation label to match its marker before measuring its settled color. Score-effect pixels are sampled immediately after a draw, before the browser discards its framebuffer; the existing visibility and palette assertions remain intact.

An additional before/after capture reviewed archive, rankings, forecasts and Letters at 320/390/768/1280px in Light and Dark. No horizontal overflow was found. Screenshots confirm visible archive headings, larger primary titles, smaller metadata, and stronger boundaries.

These are production-component fixtures with representative league data, including illustrative rankings. They do not authenticate a PIN-protected member view, exercise live writes, or establish physical-phone frame rates. The previously observed live Wall reaction error is outside this typography change.

---

# Official records, consistent player scores, and disclosure performance — v1.311.0

Final result: passed

Sleeper's public Week 4 results and official rosters confirm Grant at 3–1 and Jack-HAMMER as the sole 4–0 team. Stored standings were still one week behind, and several stored Week 4 totals were provisional. Home and GameDay now share a cached public read of the most recently completed week, validated against the full roster set and season. Complete official records replace stale records; incomplete or unavailable public results retain the stored fallback. Power rankings use record first and total points to break ties, so Jack-HAMMER is #1. Live weeks remain excluded. Historical weekly boards remain available.

Player leaders now use a right-aligned score column with the phase underneath. All final players, including hot players and actual zeros, show Final; live players retain Live. Leader and detailed player scores share 24px type and the same hot/cold theme colors. Team totals keep their larger hierarchy.

The performance audit reproduced a half-second disclosure height tween, with score glyph rasterization and GPU uploads repeated as the card resized. Disclosures now change height immediately. The renderer caches each score's mask until its text, font metrics or render scale changes; scrolling and disclosure changes reuse textures, hidden scores retain their masks, and removed scores/context loss release or clear resources.

Evidence: `/workspace/dfl-consistency-before/collapse-profile.json`, `/workspace/dfl-consistency-review/collapse-profile.json`, theme screenshots and `browser-checks.json`, `score-consistency.json`, `leaders-final-dark.png`, and `live-rankings.json`. The production reconciliation/ranking functions were also run against public results for all 12 actual teams: Jack-HAMMER #1, 4–0; Grant #2, 3–1. No league data was edited.

On the 390px, density-3, 4× CPU-throttled Chromium fixture, the original GameDay toggles sampled 3–4 intermediate heights and uploaded 24–32 textures per toggle. After the change, all toggles sampled one final height and uploaded zero unchanged masks. More from the league similarly went from 5–6 sampled heights to one. These are layout/resource measurements under software WebGL, not physical-device frame-rate claims; background effect rendering still produces long tasks in that environment.

Verification: `pnpm check` passed typechecking, name checks, 1,102 tests across 124 files, and build. The complete production-component browser review passed 60 broadcast layouts, 48 navigation states, 18 palette/viewport states, 7,695 visible text checks (minimum contrast 5.25:1), sticky bar/grouping, density, reduced motion, and deck refresh checks. Score effects retained 36,037 visible pixels with zero off-palette blue pixels. The focused score review checks ten light/dark viewport states for identical 24px size/colors, aligned number and phase edges, all Final labels, actual ranking markup, stable disclosure heights, no uploads for warmed toggles, and exactly one new upload after changing one score. These assertions are included in CI. No page errors were observed in the full review.

Fixtures render production presentation and wiring; authenticated Watch, player actions, and database writes were not exercised. Public reads and read-only database inspection verified the stale-source diagnosis. Version/cache release is 1.311.0.

---

# Grouped score desk and darker Medicine edition — v1.310.0

Final result: passed

The requested refinement keeps DFL Daily left-aligned, with the existing distressed gold 10 reduced to a small mark beside Anniversary Edition on the line below. The top utility bar remains fixed, with the established masthead clearance. Dark and Medicine now share near-black warm surfaces (#191817 page, #22201d cards, #2b2822 controls); Home adds quiet, static Medicine crimson and yellow background glows. The cream broadcast insert and readable ivory/gold dark ink remain.

At 1000px and wider, the broadcast and GameDay share a two-column front page. The GameDay column groups each head-to-head score beside its team portrait/name, with player leaders directly beneath the scores. Phones and tablets retain a stacked reading order. Existing data slots, score refresh, player actions, navigation, disclosures, and Wall placement remain functional.

## Findings and fixes

- The large standalone 10 displaced the wordmark. It now sits on the anniversary line, aligned to the wordmark's left edge.
- Broad charcoal surfaces felt too light. Shared dark theme surfaces and navigation now use a deeper warm ground, with subtle red/yellow glows behind Home.
- Desktop scoring and broadcast felt disconnected. A responsive front-page grid places GameDay alongside the artwork, with compact typography appropriate to its column.
- At the 1000px breakpoint, the rotated crest overlapped its copy column by approximately 2px. Dedicated wide-layout illustration/copy widths restore clearance; all slides were rechecked at 1000, 1024 and 1280px.

## Evidence and verification

Before: `/workspace/dfl-medicine-review/final-dark-390.png`. After: `/workspace/dfl-night-review/final-dark-390.png`, `final-light-390.png`, and corresponding 1280px captures. Screenshots were opened and compared, including the final desktop matchup rows and light/dark masthead. The user's written refinements govern the intentional layout changes.

`pnpm check` passed typechecking, name checks, 1,095 tests across 123 files, and build. The Chromium production-component review passed 48 broadcast layouts, 48 navigation states, 18 palette/viewport combinations, 7,578 visible text checks (minimum 5.25:1), six sticky-bar checks, and six masthead/score hierarchy checks, plus expanded Home controls, density, reduced motion and deck refresh. A focused desktop review passed 36 slide layouts across 1000/1024/1280px with stable sizing and clear illustration bounds. An additional 48 role/name/viewport states passed utility-bar bounds and touch targets. Standard dark, Medicine and team-theme samples confirmed the new shared page/card colors. Score effects retained 49,711 visible pixels with zero off-palette blue pixels. No page errors were observed.

CI browser coverage now includes the new 1000px breakpoint and assertions for the anniversary baseline, left alignment, score-desk grouping and non-overlapping matchup portraits/names/scores. Fixtures use representative records and production presentation/wiring; authenticated league-data operations are unchanged and were not exercised by this UI review. CSS text contrast is measured; background texture and glows are inspected visually.

---

# Medicine newspaper palette and separated masthead — v1.309.0

Final result: passed

The user chose Medicine colors over the blue/green/brown mock palettes and requested space beneath the fixed top bar, better control spacing, and removal of its duplicate DFL Daily mark. The accepted direction uses warm charcoal, ivory, Medicine yellow/gold highlights, and crimson actions/print accents. The gold anniversary 10 stays beside the dated newspaper masthead.

Dark Home now uses a distressed ivory/yellow DFL Daily wordmark, replacing the inverted pink/red lettering. Gold ink carries headings, score highlights, section markers, and navigation; action fills use Medicine crimson `#C8102E`. Light Home keeps legible black/crimson lettering on cream paper. Standard dark/OS dark and Medicine share the Medicine foundation, while generated team palettes keep their accents on the warmer shared ground. No stored theme preferences are overwritten.

The duplicate top-bar wordmark was removed from the markup. Home's brand lockup remains hidden, with the role toggle grouped left and notifications/profile grouped right. The compact sticky bar retains its 44/56px height and safe-area offsets. Profile names truncate inside available width, the notification target is 44px, and the commissioner switch has a crimson track with an ivory knob. Masthead top padding is 16px on phones and 24px from 600px up, clear of the desktop nav row. Section links retain their scroll offsets.

Home score ink and optional GPU effects follow the palette: hot scores/fire use crimson/yellow/ivory; cold scores/frost use neutral ivory. The renderer obtains light/dark state from color-scheme rather than a specific hot-ink hex. Other score-effect palettes retain their existing treatment.

Reference and evidence: the revised Medicine mock `/workspace/generated_images/exec-13fa90e8-0af3-4f48-9157-7c6abd45f318.png` was generated and opened before implementation, based on the existing app capture. Wordmark source `/workspace/generated_images/exec-8ffae448-5cff-47f8-962a-d7f4bec364a0.png` was opened and optimized as `assets/dfl-daily-wordmark-medicine.webp` (1300 × 434, 86,770 bytes, transparency retained). Before: `/workspace/dfl-print-slate-review/theme-dark-390.png`. After: `/workspace/dfl-medicine-review/medicine-comparison.jpg`, `final-dark-390.png`, `final-light-390.png`, desktop equivalents, and focused/status/global palette captures. Before/after comparison uses the same width, opener, archive selection, and 13-slide deck state. The mock, asset, comparison, phone themes, and desktop rendering were opened and inspected.

Verification: `pnpm check` passed typechecking, names, 1,095 tests across 123 files, and build. The Chromium matrix passed 48 broadcast layouts, 48 route/navigation states, 18 palette/width combinations, 7,360 visible text checks (minimum contrast 4.65:1), 18 masthead clearance checks, six sticky-bar checks, section links, expanded Home controls, density, reduced motion, and deck refresh, with zero page errors. A GPU readback measured 58,368 visible effect pixels and zero off-palette blue samples. A focused review passed 48 status states across light/dark, 320/390/832/1280px, short/long names, and commissioner/member/locked modes, including the final crimson/ivory switch. Team palette tests cover all 32 clubs and their real page/card/recessed/hover surfaces. Updated global samples confirm the shared warm Dark/Medicine foundation.

Fixture records are representative, not live league data. Authenticated mutations and preference persistence are not exercised and their handlers are unchanged. CSS text is measured; raster print ink is visually inspected. No actionable P0/P1/P2 findings remain in the reviewed states.

# Printed anniversary mark, fitted status bar, and softer dark palettes — v1.308.0

Final result: passed

The gold 10 now uses a transparent distressed letterpress raster matched to the existing DFL Daily wordmark. The title stays unchanged. The asset uses rough printed edges, thick condensed strokes, and worn ink; mode-specific brightness keeps the gold readable against cream and slate.

Home's persistent utility bar now carries a small DFL Daily wordmark on the left, with compact uppercase role text, a smaller switch, a quiet profile separator, consistent spacing, and flat theme-aware controls. It retains its 44px mobile / 56px desktop height, sticky behavior, safe-area spacing, keyboard focus, and existing handlers. Long profile names truncate within the available space.

Dark Home uses textured slate instead of the nearly black paper. Shared navigation, standard Dark, Medicine Wheel, and generated team palettes also use softer slate surfaces. Body, muted, status, and accent ink were lifted for readability. Team accents are generated against the lightest surface and tested on page, card, recessed, and hover backgrounds; team fills and profile choices retain their existing behavior. Light palettes retain their surfaces.

Reference and evidence: `assets/dfl-daily-wordmark.webp` and the selected newspaper mock `/workspace/generated_images/exec-d6d9a89a-09fe-41f1-805b-2d9e0d456ff5.png`. Generated source: `/workspace/generated_images/exec-0dc50f79-4fb5-4f4d-82d0-e69c2c583c5b.png`; optimized asset: `assets/dfl-daily-ten.webp` (732 × 768, 75,972 bytes, transparency retained). Before: `/workspace/dfl-anniversary-review/theme-dark-390.png`. After: `/workspace/dfl-print-slate-review/dark-comparison.jpg`, `theme-light-1280.png`, phone/desktop theme and sticky captures, and `global-dark-390.png` / `global-medicine-390.png` / `global-team-KC-390.png`. The reference, asset, before/after comparison, and rendered Home/global palette captures were opened and inspected.

Verification: `pnpm check` passed typechecking, identifier checks, 1,095 tests across 123 files, and build. Chromium passed 48 broadcast layouts, 48 route/navigation states, 18 palette/width combinations, 7,324 visible text checks (minimum measured contrast 5.25:1), six sticky-bar scroll checks, section links, expanded Home controls, density, reduced motion, and deck refresh, with zero page errors. A focused review passed 48 status-bar states across light/dark, 320/390/832/1280px, commissioner/member/locked states, and short/long names. Global Dark, Medicine Wheel, and KC samples confirmed the new actual page/card colors. All 32 team palettes clear 6:1 for both accents across all four surfaces, retain visible fills, and select readable ink for filled controls.

Fixture data is representative, not live league data. Global samples use standard app component classes and production theme assignments; authenticated routes and mutations are not exercised. No authentication/database behavior changed. Raster ink is visually inspected; CSS text is measured. No actionable P0/P1/P2 findings remain in the reviewed states.

# Anniversary 10 and persistent top bar — v1.307.0

The user requested a gold 10 in the masthead logo's existing position, keeping DFL Daily unchanged, and a top bar that stays visible on scroll. The numeral uses the newspaper's Anton typography with gold ink tuned for each theme. The original wordmark, masthead columns, date, broadcast illustrations, and footer crest are retained.

Home's utility bar is fixed to the viewport with an opaque paper background, a thin separator, and its existing 44px phone / 56px desktop height. Body spacing and section jump offsets include the top safe area; desktop spacing also accounts for the navigation row.

Reference: the selected newspaper mock `/workspace/generated_images/exec-d6d9a89a-09fe-41f1-805b-2d9e0d456ff5.png`, with this explicit anniversary refinement. Before evidence: `/workspace/dfl-splatter-review/theme-light-390.png`. After evidence: `/workspace/dfl-anniversary-review/masthead-comparison.jpg`, `theme-dark-390.png`, `theme-light-1280.png`, and `sticky-light-390.png` / `sticky-dark-390.png`. These screenshots were opened to verify the unchanged title, gold ink in both themes, readable controls after scrolling, and desktop navigation placement.

Final result: passed. `pnpm check` passed typechecking, name checks, all 1,095 tests across 123 files, and the build. The full Chromium review passed 48 broadcast layouts, 48 navigation route states, 18 palette/width combinations, 7,342 visible text checks (minimum measured contrast 4.04:1, meeting the applicable large-text threshold), section navigation, expanded Home controls, density, reduced motion, and deck refresh, with zero page errors. Six light/dark scroll checks confirmed the bar at viewport y=0 after scrolling 800px, with opaque backgrounds and the expected 44/56px heights. Fixtures exercise production presentation/wiring with representative records; authenticated data mutations are unchanged and outside this UI review.

# Splatter and a consistent Home edition — v1.306.0

Final result: passed

The existing black-and-white heritage crest now sits over a separate transparent red ink splatter, matching the opener's distressed print treatment. The supplied logo pixels are retained. The complete illustration has a reserved right-hand column, with both layers contained clear of copy and carousel controls. Dense scoreboards, injury reports, and authored images retain their own composition; rotation still reserves a fixed deck height.

The cleanup stays within Home. Expanded rankings, lineup focus, Pick’em, weekly forecasts, league figures, trade wire, commissioner news/activity, draft card surfaces, and update notices now share the front page's paper tokens, Anton section headings, Georgia copy, thin rules, and flat controls. Active tabs keep their clear red underline. Expanded player trackers and Letters reaction/photo styling also follow that treatment. Light/dark ink remains paired with its surrounding surface, and the broadcast remains a cream printed insert.

## Findings and fixes

- **P2: The standalone crest lacked the opener's splatter backdrop.** Added an optimized generated raster ink layer behind the unchanged crest. The two layers share a contained illustration column; the copy remains padded and separate.
- **P2: More from the league mixed old rounded cards, colored panels, gradient buttons, and app typography with the newspaper.** Removed those surfaces in Home and aligned headings, prose, metadata, tabs, and separators with the lead edition.
- **P2: The larger splatter column could intrude into copy at tablet widths.** Responsive column widths/insets were adjusted and tested using the entire transformed illustration bounds, including the splatter.

## Reference and captured evidence

The original selected target remains `/workspace/generated_images/exec-d6d9a89a-09fe-41f1-805b-2d9e0d456ff5.png`. The real opener (`assets/dfl-daily-hero.webp`) and crest were opened before editing. The matching abstract ink asset is `/workspace/generated_images/exec-88f36c82-9783-4b8b-9392-6547863b44a4.png`, optimized as `assets/dfl-daily-splatter.webp` (768 × 768, about 276 KiB, transparency retained).

Before evidence uses the expanded production-component fixture in `/workspace/dfl-splatter-before`. After evidence is in `/workspace/dfl-splatter-review`: `more-comparison.jpg` compares the same expanded dark Home state at 390 CSS px; `broadcast-theme-comparison.jpg` compares the logo slide in both themes. Focused `more-light-390.png`, `more-dark-390.png`, 1280px equivalents, and `broadcast-light-1280.png` show fonts, wrapping, ink, controls, and illustration separation. Full Home captures are `home-light-390-full.png`, `home-dark-390-full.png`, and desktop equivalents. Fixed utility/nav overlays are hidden only for focused/full-page screenshots; native navigation is verified separately by the browser matrix. Captures use density 1, no device frame or browser chrome.

Before and after screenshots were opened and compared together. The requested splatter and expanded-section styling are intentional refinements of the selected newspaper mock. Masthead, opener, scores, archive stories, Wall placement, themes, compact navigation, routes, and data handlers retain their behavior.

## Verification and limits

`pnpm check` passed: typecheck, names, 1,095 tests across 123 files, and build. The full Chromium review passed 48 broadcast layouts with stable height, 48 navigation route states, 18 palette/width combinations, 7,106 visible text checks (minimum measured contrast 5.25:1), Letters bounds/targets, expanded score controls, density, reduced motion, deck refresh, and zero page errors.

The focused expanded Home review passed 32 forecast panels, 48 position tabs, 16 feed states, eight rankings toggles, and 48 splatter/copy layouts across light/dark and 320/390/768/1280px. Production Home renderers and wiring are evaluated in the fixture without loading authentication or database modules. The CI browser review now includes forecast, position, rankings, and feed interactions and checks the complete splatter illustration bounds.

Fixture records are representative, not live league data. Authenticated mutations and every conditional season/notice state are outside the browser fixture; their handlers are unchanged. CSS text colors are measured; textured raster art is inspected visually. No actionable P0/P1/P2 findings remain in the reviewed states.

---

# Letters and broadcast cleanup — v1.305.0

Final result: passed

The user-requested refinement keeps the selected DFL Daily newspaper direction. Home Letters now use one readable column below 768px and three editorial columns on wider screens, with the author above the letter, roomier serif text, predictable photo placement, thin separators, and compact reaction controls that retain 44px targets. The Wall remains below More from the league.

Broadcast copy and controls now have 12px horizontal breathing room. Short narrative slides reserve a separate right-hand illustration column for a distressed black-and-white version of the supplied heritage crest. The image uses the opener's halftone/print style; dense copy, scoreboards, matchups, injury reports, and slides with authored images keep their existing content width. Headline fitting measures the actual copy column. Deck measurement still reserves the tallest slide at the current width, so rotating cards cannot move GameDay.

## Findings and fixes

- **P1: Three Letters columns squeezed authors, metadata, reactions, and bodies on phones.** Responsive columns and natural author/body/image ordering replace the old reordered narrow layout. Long bylines wrap, photos retain their existing framing, and reactions remain usable.
- **P2: Broadcast copy and controls hugged the right edge.** A 12px internal gutter keeps them off the edge without reducing the full-width paper surface.
- **P2: Sparse story slides left an unused right-hand area.** The supplied crest is rendered as a dedicated monochrome print illustration with no copy overlap. Dense data stays full width.
- **P1: Team-gradient byline text inherited transparent text fill on paper.** Newspaper metadata uses readable surface tokens and resets gradient text fill; championship titles retain a readable warm ink color.
- **P2: Rotating the crest could extend its bounds beyond a wide slide.** The wider illustration uses a 22px right inset and a slightly smaller width; browser checks verify its transformed bounds.

## Evidence and fidelity

Original reference: `/workspace/generated_images/exec-d6d9a89a-09fe-41f1-805b-2d9e0d456ff5.png` (832 × 1890). The opener and supplied crest were opened and inspected before generating `/workspace/generated_images/exec-8703498e-613b-43c2-b7e7-ba36c814228d.png`; the optimized transparent asset is `assets/dfl-daily-crest.webp` (768 × 768, approximately 185 KiB).

Focused implementation evidence lives in `/workspace/dfl-letters-review`: `letters-comparison.jpg` compares before/after CSS with identical production post markup; `letters-light-390.png`, `letters-dark-390.png`, and their 1280px versions show responsive typography and metadata. `broadcast-light-390-1.png`, `broadcast-light-1280-1.png`, and dark equivalents show padded copy and the new illustration. Focused Letters captures hide fixed utility/nav overlays only while capturing; broadcast captures scroll clear of those overlays. Full Home screenshots preserve the layout and hide navigation only where the existing capture routine documents it.

The copy is representative fixture content, not live league records. The fixture now evaluates the actual production Wall post, byline, and reaction markup with local reader identities, avoiding session and database imports. Both light and dark surrounding surfaces remain readable; the broadcast remains a cream print insert in either theme. Masthead, player illustration, archive/rivalry art, page order, compact nav, routes, and carousel interactions are preserved. User-requested responsive Letters and logo placement are intentional changes from the selected mock.

## Verification and limits

`pnpm check` passed: typecheck, unresolved-name scan, 1,095 tests across 123 files, and production build. The full Chromium review passed 48 broadcast layouts with stable deck height and crest bounds, 48 navigation route states, 18 palette/width combinations, 4,614 visible text checks (minimum contrast 5.25:1), expanded controls, section navigation, safe-area sizing, deck refresh, density, reduced motion, and zero page errors.

The focused Chromium review passed eight Letters theme/width states (light/dark × 320/390/768/1280), 64 story-slide checks, maximum-length and empty posts, author ordering, image/byline containment, crest/copy separation, and 44px reaction targets. The production Home browser workflow now includes Letters layout and crest bounds checks alongside the existing theme, navigation, carousel stability, density, and reduced-motion checks.

Authenticated posting, editing, reactions, and live database writes are outside this presentation review; their production handlers are unchanged. Raster artwork and textured paper are assessed visually; CSS text contrast uses computed composited colors. No actionable P0/P1/P2 findings remain in the focused reviewed states.

---

# Theme readability and navigation — v1.304.0

Final result: passed

Home now follows the app's light/dark selection. Light uses dark ink and deep red on cream paper; dark uses cream ink and a brighter red on charcoal. Body text, muted metadata, scores, section controls, expanded trackers, disclosures, letters, and the footer use the corresponding surface tokens. The illustrated broadcast remains a cream printed insert with its own dark ink, preserving the selected artwork's readability in both themes. Dark masthead lettering reverses to cream with a readable red tint; the actual crest stays unchanged.

The navigation uses a neutral surface for each mode, readable labels and icons, a subtle active background, and one 3px active marker at the top. Its content row remains approximately 49px, including its border, with 44px minimum targets. Desktop now uses a centered horizontal icon/label arrangement. The important rules in splash-loading.css and profile-neutral.css are included in the browser fixture to verify they cannot hide or recolor the marker.

## Findings and fixes

- **P1: Home forced a light surface even when the app selected dark.** Hardcoded paper, ink, muted text, red, and native-control scheme are replaced by mode-aware tokens. Captured dark Home now has a charcoal surface and cream text.
- **P1: Mixed inherited colors could make controls unreadable.** Home binds its existing theme aliases to newspaper tokens; the printed broadcast scopes its own paper/ink pair. Expanded score controls and representative More content are included in the review. Their text clears the contrast checks.
- **P2: Navigation's dark red text had insufficient contrast, and a legacy important rule hid the per-tab marker.** Light uses deep red; dark uses a brighter red. The sole top marker explicitly overrides those legacy rules, and the duplicate shell/bottom indicators are disabled. Post-fix captures show readable active labels and one visible marker.

## Captured evidence and fidelity surfaces

Baseline evidence: `/workspace/dfl-theme-review-before/newspaper-390-full.png`. The original selected mock remains `/workspace/generated_images/exec-d6d9a89a-09fe-41f1-805b-2d9e0d456ff5.png` (832 × 1890).

Latest light and dark evidence: `/workspace/dfl-theme-review/theme-light-390-full.png` and `theme-dark-390-full.png`, both 390 × 2356 pixels at 390 CSS px, deviceScaleFactor 1. Expanded trackers, score tools, and More are shown, with the paused opener and deterministic Week 5 final data. Fixed navigation is hidden only during full-page captures and captured separately. There is no device bezel, density conversion, or browser chrome.

Both implementations were composed and inspected together in `/workspace/dfl-theme-review/home-theme-comparison.jpg`. Focused navigation evidence is `/workspace/dfl-theme-review/nav-theme-comparison.png`, containing light/dark phone and desktop bars. Additional 1280px captures and all palette states are in the same directory.

- **Typography:** Newspaper families, display hierarchy, letter spacing, and story wrapping remain. Nav labels use 12px on ordinary phones, 10px at 320px, and 14px on desktop. Font weights and focus states were inspected.
- **Spacing:** Masthead, broadcast, score, article, disclosure, and Wall ordering remain. Nav preserves a compact row and safe-area sizing; desktop links occupy a centered 900px-wide row. No viewport overflow was observed.
- **Colors:** Each text role follows its surface. The browser checks composited CSS colors for visible text at each scrolled region, using 4.5:1 for ordinary text and 3:1 for large text. All 3,984 text observations across 18 palette/width combinations passed; the lowest measured ratio was 5.25:1. Raster texture and artwork were reviewed visually rather than treated as uniform measured backgrounds.
- **Images:** Existing optimized raster assets are unchanged. Dark wordmark coloring uses a CSS filter; the crest, football illustration, archive, and rivalry art retain their source pixels. Real portrait requests may fall back in the local fixture.
- **Copy:** Dynamic production copy and routes are unchanged. The fixture derives its palettes from the actual production theme definitions without starting session or database requests.

## Verification and limits

`pnpm check` passed: typecheck, unresolved-name scan, 1,095 tests across 123 files, and build. Chromium passed all 48 broadcast layouts, the navigation route-state checks, 18 theme/width combinations (light, dark, Medicine Wheel, Medicine Wheel Light, Fairway, and Chiefs; 320/390/1280px), expanded controls, More sheet contrast, touch targets, single active indicator, safe-area measurement, deck refresh, section navigation, density and reduced-motion behavior, and zero page errors.

Text contrast is evaluated after scrolling deferred content into view; evaluating offscreen transition states would report stale colors. The fixture uses production renderers and palette literals with representative data. It does not write to league data or exercise authenticated posting, every conditional Home module, or all 32 team palettes. The CSS follows the shared light/dark token, so individual team hues do not recolor the newspaper or main nav.

No actionable P0/P1/P2 findings remain in the reviewed states. The new checks run in the Home design review workflow for future changes.

Final result: passed

---

# DFL Daily newspaper — v1.303.0

Final result: passed

Option 2 is the visual target. The Home page uses its distressed black/red masthead and headline, illustrated football opener, cream newsprint, large printed scores, numbered player rows, illustrated archive and rivalry stories, red disclosure, and three-column Letters from the league. Shared navigation retains the compact 49px row from v1.302.0, with a red active state and Book label.

## Evidence and normalization

Source visual truth: `/workspace/generated_images/exec-d6d9a89a-09fe-41f1-805b-2d9e0d456ff5.png` (832 × 1890 pixels).

Implementation: `/workspace/dfl-newspaper-review/newspaper-832-full.png` (832 × 2153 pixels). Chromium, 832 CSS-pixel viewport, deviceScaleFactor 1, Home, cream theme, loaded fonts and assets, paused opener, Week 5 final sample scores, populated Wall, collapsed More. The source has no device frame or browser chrome; neither capture adds one. No density scaling was applied. Full-page length differs because the production controls, footer, live-copy wrapping, and accessible targets are retained. These are expected product constraints, not a claim of pixel equality.

Full-view comparison: `/workspace/dfl-newspaper-review/comparison-832-final.jpg`. Source and implementation were placed together and inspected at equal widths. Focused comparisons: `comparison-masthead-hero-final.jpg` and `comparison-scores-stories-final.jpg` in the same directory, containing both source and implementation crops. Additional browser evidence includes `newspaper-390-full.png`, `newspaper-1280-full.png`, viewport and player-scroll captures, twelve phone broadcast captures, and `nav-home.png`. Full-page composition captures hide the fixed navigation while capturing the page; viewport and navigation captures cover its actual fixed behavior separately.

## Comparison history and resolved findings

- **P1: Utility header overlapped the masthead.** An inherited important fixed-position rule defeated the first override. Home now uses a 44px relative utility strip on phones and the correctly offset fixed header on desktop. Revised masthead/hero comparison shows unobstructed branding and dates.
- **P1: Carousel arrows appeared as blank circles.** Existing icon styling overrode the intended strokes. Explicit white currentColor strokes restore recognizable arrows. Both directions work in Chromium.
- **P2: The seal read as a square stamp.** The actual league raster now has a circular crop and multiply treatment. Its source branding is retained.
- **P2: Typography was too small in the scores and lower stories.** Revised desktop sizes use 68px team totals, 40px team names, 52px player scores, 41px serif story headlines, 22px letters, and 24px rank figures. Focused post-fix score/story comparison verifies the hierarchy.
- **P2: The opener headline crowded the player, and cover cropping cut off the player on phones.** The transparent headline now occupies 65% of the row with a slight two-degree angle. The raster artwork uses contain and bottom-right placement. Revised phone and focused hero captures show the subject and headline clearly.
- **P2: The legacy identity footer would restore a large boxed crest after the Wall.** It now renders as a compact paper colophon. Existing crest administration and update controls remain available.

No actionable P0/P1/P2 differences remain in the reviewed states.

## Required fidelity surfaces

**Fonts and typography.** The two distressed brand headlines are transparent raster assets, rather than smooth text approximations. Loaded Anton supplies condensed section headings and figures; Georgia supplies article and letter text. Display sizes, weight, line height, tracking, wrapping, and numeric stroke were inspected in focused comparisons. Scores use no synthetic stroke. Dynamic names and stories wrap or truncate using the existing data-aware layout.

**Spacing and layout rhythm.** The page follows the source sequence and uses thin newspaper rules, flat rows, and three letter columns. Desktop and phone gutters, full-width masthead, imagery scale, and section spacing were reviewed. The broadcast reserves the tallest actual card once per width/deck, so its height does not change on rotation. The Wall is the final content section before the small app colophon. Phone controls remain at least 44px where tested.

**Colors and tokens.** Home maps to cream `#efebe1`, dark ink `#131717`, and print red `#c51f2a`. The raster paper supplies texture. Existing hot/cold semantics, optional motion, and other routes remain functional. Focus rings are visible in print red, and the score controls remain discoverable through Player trackers & score controls.

**Image quality and assets.** Six optimized WebP assets provide the wordmark, headline, hero, archive, rivalry, and paper texture. They preserve the selected illustration direction, transparency, and legible distress. The crest is an existing actual league raster; player portraits remain real production portraits rather than the mock's generated faces. Ordinary navigation icons use the existing library plus licensed Lucide book-open. No logo or illustration is recreated with CSS drawing or custom SVG.

**Copy and content.** Fixed editorial branding and Bring the receipts match the mock. Date, edition, week, scores, standings, history, rivalry, and Wall content use production data. The fixture intentionally shows the mock's sample scores without writing them to league data. It uses the existing generated rivalry text instead of freezing a fabricated headline. Consequently some story text wraps differently. The compact Wall title changes to Letters from the league; the full Wall destination remains The Wall.

## Functional verification

`pnpm check` passed: typecheck, unresolved-name scan, 1,095 tests across 123 files, and production build.

Chromium passed 48 broadcast layouts across 320/390/768/1280px: every card fits, stage height and the document position of GameDay remain constant, and no horizontal overflow occurs. Keyboard control focus can scroll the viewport, so layout stability compares document coordinates. Player reachability uses the absolute scroll offset, including scrolling caused by focusing Pause.

Browser checks also passed previous/next/pause, loaded fonts, visible keyboard focus, section-button names and touch targets, 24 route-state navigation comparisons, phone safe-area alignment, 3× canvas density, reduced-motion behavior, and zero page errors. Adding a thirteenth card updates the counter while preserving the active opener DOM. Scores and Archive scroll buttons preserve the router hash, and More opens normally. Results are saved in `/workspace/dfl-newspaper-review/browser-checks.json`.

The review renders production components with deterministic data. Wall posts and the colophon are representative fixture markup. Authenticated live requests, posting/reactions, destination-page content, and offline service-worker installation are not exercised by this fixture. Existing unit coverage and release cache versioning remain in place.

## Implementation checklist

- [x] Compare the source and browser implementation together, full view and focused regions.
- [x] Resolve header, icon, imagery, typography, and footer findings and recapture.
- [x] Verify phone/desktop layouts, fixed broadcast height, navigation, keyboard use, and section scrolling.
- [x] Retain production destinations and dynamic league content.
- [x] Include the new stylesheet and assets in release 1.303.0's service-worker cache.

Final result: passed
