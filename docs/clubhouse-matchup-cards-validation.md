# Clubhouse matchup cards — v1.266.0

Matchups now use the Trade Board's shared team identities and player portraits, with side-by-side teams, clear scores, two key starter photos per team, remaining-starter counts, game status and a compact conversation preview. Clubhouse defaults to the latest synced week, while archive selectors and explicit week links remain supported. The selected member's matchup stays first; other games remain available in their existing disclosure.

Scores and submitted starters come from Sleeper's weekly league rosters. ESPN's selected regular-season NFL slate supplies team game states; season/week are validated. Live and upcoming starters count as remaining; missing status stays unknown, and a fantasy matchup is marked final only when the league's week is completed. A zero-point player is not assumed to have finished. The two featured offensive starters prioritize a quarterback, then recorded points; these are selected starters, not projection recommendations.

A one-minute refresh runs while the Matchups panel and document are visible; manual refresh fetches rosters immediately. Navigation/generation guards prevent old responses from painting another week. A failed refresh retains displayed scores with a retry notice; a failed NFL schedule read removes guessed counts. Large player metadata uses the existing shared cache. Historical weeks retain final labels and existing recap/award enrichment.

Conversation previews read the latest reply and existing reply-count view through normal public-client permissions. No schema, grants or auth changes are needed. Preview text is escaped and limited to 160 characters; opening or starting the shared thread uses the existing Wall workflow. Supabase changelog/docs were reviewed and the actual reply/count selects verified. New JS dependencies are included in the offline shell.

Validation:
- Typecheck, identifier scan, 987 tests across 108 files and production build pass.
- Pure tests cover zero-score final players, live/upcoming counts, missing status/lineups, authoritative finality, NFL season/week mismatch and team abbreviation normalization.
- Real browser reads verify current week selection, starter photos loading, remaining counts, all six games, archived final scores, 320/390/1280px widths, Dark/Medicine/Fairway and enlarged text. No page errors, horizontal overflow or automated WCAG A/AA violations on tested views.
- Local intercepted fixtures verify reply preview/count/navigation, escaped HTML, failed NFL status and roster refreshes, retained scores and successful retry. Real existing Supabase read queries pass. Browser production writes are blocked.

Physical screen-reader/phone sessions were not performed. Scores and statuses depend on their providers; this is periodic polling rather than a real-time push feed. A starter whose NFL status is missing makes that team's remaining count unavailable.
