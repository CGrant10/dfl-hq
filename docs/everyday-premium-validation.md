# Everyday app finish — v1.361.0

The daily desks previously mixed diagonal-gradient buttons, outlined ghost actions, inset Trade control plates and different detail-sheet treatments. Shared controls now use one hierarchy: solid theme-colored primary actions, quiet tonal secondary actions, compact fields and visible keyboard focus. Light and Fairway action fills use deeper versions of their existing hues so primary labels clear 4.5:1 contrast. Danger controls retain their semantic treatment.

Wall and Home reactions now share one compact row with full 44px controls, stable-width counts and an explicit selected state. Existing accessible labels, reactions, replies and storage behavior are unchanged. The old Trade button inset plate is removed where the shared button already supplies its visible surface.

On phones, player details open at the bottom of the screen, like the trade picker and bet slip. Their surfaces, header typography, dismissal controls and corners align. Existing viewport fitting, independently scrolling content, Escape handling, focus return, entrance/exit animation and motion preferences remain in use. Toasts receive compact, wrapping typography and a consistent shape.

The shared stylesheet is versioned and cached in the offline shell. Home's layout and broadcast artwork, Clubhouse matchups, scores, player valuations, trades and bets keep their existing logic. Keepers and Polls are not the focus of this release.

## Verification

- Production Wall review checks actual composer button contrast in five fixed palettes and all 32 NFL team themes, at 320, 390 and 768px. Every primary ratio is at least 4.5:1. Reaction targets remain at least 44px; unselected controls use one shared surface rather than separate button boxes. Existing drafts, mentions, Home replies, full-image viewing, zoom, focus return and motion preferences remain covered.
- Production Trade and secondary-page browser reviews cover team switching, multi-party routing, saved comparisons, picker search, counteroffers, profile controls, long names, broken images, themes and enlarged text.
- Read-only real-app checks cover Home, Clubhouse, Sportsbook, Trade and Wall at 320, 390 and 768px. Player-sheet checks cover seven palettes, phone-bottom alignment, content bounds, enlarged text and focus return. Bet-slip checks cover content bounds and focus return; no bet is submitted.
- Home review covers broadcast readability, imagery and phone gutters, tab/nav motion, swipe selection, themed surfaces and live score effects. Its swipe-rail check now waits for the measured final geometry instead of assuming the animation always settles within a fixed delay.

Screenshots, runtime league data and authenticated browser state remain outside the repository. Browser verification blocks league writes.
