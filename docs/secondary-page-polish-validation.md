# Secondary-page polish — v1.360.0

History, Analyzer, Profile and More now carry the app's established type, spacing and team identity into the secondary screens.

- History presents every recorded champion as a season banner. The latest completed title leads with a larger team portrait and gold edge; earlier titles keep a compact treatment. Runner-up links, current team names, manual corrections, source provenance, historical owner fallbacks and all archive tabs remain available. An empty stories list no longer claims the league has no history when champions are present.
- Analyzer adds a five-position scouting summary using the existing report grades, league ranks and percentiles. Team switching redraws it alongside the report, and Full report opens the actual position section. Weekly lineup recommendations stay first.
- Profile uses the shared team portrait and current-name initials. The camera control has a real 44px target. Account switching sits inside Settings & privacy below the identity and career sections; edit, cancel, uploaded photos and identity controls retain their behavior.
- More uses grouped rows with quiet dividers and chevrons, retaining all 15 destinations, the existing navigation controller and a sticky Close control. Shared fallback team marks gain an inset crest treatment; loaded photos retain their existing treatment.

This release changes presentation. Trade valuation, offer selection, league scoring, historical results and storage operations are unchanged. The new stylesheet and module are included in the versioned offline shell.

## Verification

Production-renderer browser fixtures cover 320, 390 and 768px layouts; dark, light, medicine-wheel and team themes; normal and 200% text; long names; unknown archived owners; missing runners-up; admin correction controls; broken photo fallback; profile edit/cancel; More's last destination and sticky Close; and equality between scouting grades and the full report after team switching. External requests and league writes are unavailable in the fixture.

Read-only real-app checks cover those three screens, archive tab access, team switching, profile settings and More, with a 44px header and no horizontal document overflow. Home, Clubhouse and Sportsbook were checked for shared-mark regressions. Browser exceptions were checked, and mutations to league storage were blocked.

Existing Trade and Wall browser reviews passed at 320, 390 and 768px, including multi-team routing, saved comparisons, photo viewing, Home replies, drafts, themes, enlarged text and motion settings. The secondary review is included in the existing browser CI workflow.

Type checking, identifier checks, all 150 test files / 1,325 tests, the production build and whitespace checks passed.

Screenshots and runtime league snapshots remain outside the repository.
