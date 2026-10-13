# Directional page navigation

Primary Home, Clubhouse, Sportsbook, Trade and Analyzer routes enter in the direction of the bottom navigation indicator. The indicator's current position determines direction when another tap interrupts it. The shared header and navigation are outside the animated view.

The loading skeleton travels 28px over 220ms. A page ready during that movement continues from its current transform and opacity; a page ready afterward fades in over 100ms. Navigation never waits for an animation. Initial launch and dedicated event views retain their existing entrance behavior.

The router retains its render epoch and replaced-view protection, member-scoped scroll/disclosure memory, loading accessibility, and retry behavior. Resizing, hiding the document, changing motion preferences, or starting another route cancels the current animation. No outgoing page copies or persistent animation loops are created.

Run `DFL_ROUTE_REVIEW_DIR=/tmp/dfl-route-review python tools/capture-route-review.py` after building shared CSS. This browser fixture runs the actual router, motion controller, navigation indicator and view memory against isolated page modules, with no backend access. It checks loading-to-content continuity, fixed shell geometry, rapid taps, late renders, failed loads, scroll restoration, motion preferences, and 320/390/768px overflow. Home design review runs it in CI and retains its report and screenshot.
