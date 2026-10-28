# Activity center and shared mobile sheets — 1.501.0

The notification page now leads with league activity. Device enrollment and
category preferences live in a Settings sheet. Filters cover all/unread/trades/
big plays/Book/league, using the existing animated selection rail. Mark-read,
dismiss, empty/error/retry and clear-inbox flows retain their original member
scope. Clear inbox uses an app confirmation sheet instead of a browser prompt.
The page discards late results after navigation or a member change.

Optional previews use bounded batched reads for targets already present in the
member's inbox. Trades show their persisted routed packages and explicit value
balance, including zero, with the exact receipt link. No analyzer model or NFL
projection fetch is needed. Play notices use trusted active ESPN clip posters;
missing/expired/wrong-game clips fall back to the referenced play and remove the
old video promise. The receiving Clubhouse retains its own availability check.
Posters are images; no video or iframe autoplays in the inbox.

Exact ticket notices can show actual settled stake/payout from the existing
read-only `sportsbook_my_live_account` API. Account member ID must match the
selected member. Potential returns are never substituted for actual payouts;
open bets never become cashed previews. Private read failures leave an ordinary
notice. Legacy generic ticket notices open My Bets without guessing a ticket.
Additional context queries have a 3.5-second abort deadline and never write.

Future settlement messages now link to `#/sportsbook?product=book&ticket=ID`.
The Book selects My Bets, opens the settled group, retains a requested ticket
within the existing fetched history, and focuses/highlights that ticket. An
unavailable old ticket reports that it is outside recent history. Generic page
entries retain their normal position/preferences. The trigger's original
open-to-settled condition, member-only audience, text and payout logic remain.
No historical messages/bets were rewritten and no test notice was sent.

Trade player pickers, the injury report, Settings and confirmations share native
dialog lifecycle, 220ms motion, header-only pull dismissal, backdrop/Escape,
keyboard viewport fitting, reduced-motion behavior and focus return. List/input
scrolling remains native. Busy actions can prevent dismissal. Existing player
portrait-to-card and bet-slip transitions are preserved; picker selection still
uses the existing connected player-to-package animation.

Validation uses real page/controllers/renderers with fixture database and
notification boundaries. Six cases cover 320/390/768 in Medicine Wheel Light/Dark:
filters, routed previews, zero payout, image containment, settings, clear cancel,
read/dismiss, picker selection/search, injury scrolling and focus return. Phone
cases also cover actual CDP header-drag input, keyboard-sized visual viewport,
backdrop dismissal and reduced motion. Existing Trade browser checks pass at
320/390/768 with no overflow/page errors. Screenshots were inspected; fixture
portraits/posters illustrate image bounds rather than asserting player likeness.
Physical iOS/Android frame pacing and lock-screen delivery are unverified.

The settlement migration is installed. Verification confirms its exact ticket
target, active trigger, and no direct anonymous/authenticated EXECUTE access to
the trigger function. The targeted advisor findings are resolved. Existing inbox
visibility, profile access, push preferences, RLS and notification source-key
rules remain in force. No new public data grants or message-sending API were added.

Release checks: 2,325 tests across 282 files passed, along with release versions,
theme colors, TypeScript, identifier checks and the production build. The
application bundle retains its 3 startup / 4 Home module budget. The recorded
migration filename matches the installed Supabase migration version.
