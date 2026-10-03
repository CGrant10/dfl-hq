# Home broadcast and GameDay — v1.278.0

Removed the personal projected matchup slide from Home's broadcast. Home also disables the personal live/final matchup generator, so the duplicate does not return when scores arrive or preview data fails. GameDay retains the personal team faceoff, lineup, player spotlight, and effects. The league-wide slate and editorial broadcast slides remain available, with normal editorial ordering. The loading label now says “Loading league broadcast.”

Shared Sleeper fixtures still feed the league slate, playoff stakes, and weekly model. Broadcast generators used outside Home and commissioner-authored content are unchanged.

Validation: all 1,013 tests across 112 files, typecheck, identifier checks, and build passed. Read-only mobile browser checks visited all eight broadcast slides, confirmed the personal preview was absent, verified GameDay and power rankings remained visible, and passed accessibility and overflow checks. Production writes were blocked during browser checks.
