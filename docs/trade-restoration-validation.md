# Trade Board restoration — v1.265.0

Restores `js/pages/trade.js` to the presentation from v1.262.0. The photo-rich Trade Board is again the main view, with team identities, player anchor chips, package-size controls, Fair/Aggressive/Steal selection and generated offer cards. The manual builder remains below the board and opens when an offer is analyzed. The activity tabs and their remembered default no longer hide the original board.

Trade is excluded from the subsequent shared minimal-style overrides, preserving its original card surfaces, typography and button presentation. The small accessibility corrections for empty-selection labels and team fallback initials remain. Home and other pages retain the spacing polish.

Validation:
- Typecheck, identifier check, 981 tests across 107 files and production build pass.
- Browser checks verify the board is the visible default, team identities render, all three offer types respond, actual player-photo images load, and selecting an offer populates the manual analyzer without hiding the board.
- Responsive checks at 320/390/1280px, Dark/Medicine/Fairway palettes and enlarged text; no horizontal overflow or automated WCAG A/AA violations in checked views.
- Browser production writes are blocked. Trade audit writes from selecting an offer are refused by the test guard.

Physical screen-reader and native-phone testing was not performed.
