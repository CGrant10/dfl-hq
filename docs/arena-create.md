# Mobile race creation — 1.449.0

The new-race form could extend below the phone viewport while its racer list
scrolled internally. With the real fixed navigation, Create could sit behind
the bottom tabs, making the flow appear blocked. Opening setup now aligns the
editor below the app header, and its maximum height reserves room for the
measured navigation and safe area. The header and submit action remain outside
the scrolling body. Desktop alignment also clears its top navigation.

Opening the editor focuses its heading instead of summoning the software
keyboard for the default race name. Cancel returns focus to New race. Submission
shows Creating/Saving and an accessible busy state, ignores duplicate submits,
and restores the action on failure. Valid racer selection clears an outdated
selection warning.

The isolated browser fixture now tests an empty lobby with the actual app
navigation at 320×700, 390×844 and 844×390 in Light and Dark. It taps Create at
its visible position, scrolls the racer list, checks minimum selection errors,
forces a failed request, retries with the same selected racers and verifies the
created starting grid. Reentrant submission during an in-flight request must
not send a duplicate command. Existing full-field, editing, uniform, shared
clock and spectator checks remain part of the same suite. All 271 browser checks
pass with no browser errors; `pnpm check` passes all 1,934 unit tests and the
release build.

Screenshots: [Dark](arena-create/dark.png) · [Light](arena-create/light.png).
These use isolated sample members and blocked external requests. Physical
software keyboards, browser safe-area reporting and screen-reader speech
remain unverified. No production races are created by the test fixture.
