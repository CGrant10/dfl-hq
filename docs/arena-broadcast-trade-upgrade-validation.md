# Arena, broadcast and trade upgrade — 1.440.0

Auto camera direction now uses observed passes and adjacent-racer gaps. A shot
holds at least 2.6 seconds before a pass can interrupt it, and is reconsidered
after six seconds. Final sprint framing includes the goal line. Field and Follow
remain manual choices; reduced motion uses the full-field view. Replay rewind
resets camera history. The director reads visible progress and never writes a
path, draw, server clock or official place.

Confirmed finishes with a first/second gap of at most 250ms offer a local 0.25×
goal-line replay. Replay starts 1.6 seconds before the first crossing and ends
after the second, bounded by race duration. Users can leave it directly or use
camera controls in full screen. Finish celebrations vary by racer and stop
after 1.5 seconds. Finished commissioner actions share the replay toolbar rather
than consuming another row of field space.

The existing public room channel carries opt-in racer readiness through
Presence and anonymous, fixed-phrase cheers/heckles through Broadcast. Readiness
expires when the grid revision changes; it is a self-reported social signal,
not an authorization check or a start requirement. Names come from the member
directory, never from a reaction payload. Unknown racers, stale/wrong-draw
messages and unsupported calls are rejected. Duplicate, send and display limits
bound decorative reactions. No league records, RLS policies or schema change.

Sound starts only after the Sound button is pressed. Short synthesized cues
replace external audio assets. Hidden pages silence active voices; leaving the
room closes the context. A successful manual reaction can request a 12ms haptic
where the browser supports it and motion is enabled. Hardware sound quality,
physical-device haptics and mobile GPU frame rates remain unverified.

Production SDK 2.112.3 successfully exchanged acknowledged Presence and
Broadcast between two isolated clients using the project's existing public
channel configuration. The unique review topic was disconnected afterwards;
no race commands, notifications, posts or league records were written.

Home broadcast now has opposing award layouts with contained full silhouettes,
a leading injury feature, a full-width transaction ledger for every trade
participant and a paired rivalry composition. Story entrances are finite and
respect motion preferences. The first daily card and existing share-card
renderer are retained. No new logo or artwork asset is introduced.

The trade benchmark contains anonymized-team packages from recorded receipts 9,
17 and 18. It checks frozen quoted values and ownership/routing, including the
split three-way destinations. It does not measure prediction accuracy or reuse
old prices as current inputs. Existing expert/PPR/1-QB tests continue to cover
Juwan Johnson versus Mike Evans, comparable receiver premiums, streaming QBs,
replacement, injuries and dropped-player costs. The offer chooser now limits
shape/manager variety to comparable utility, price and evidence-risk bands.
Materially stronger deals stay ahead of weaker varied packages. Compact offers
show lineup direction; multi-team players name their actual destination.

Offer/detail transitions use up to six existing portraits. Text and controls
render immediately; source positions are captured before redraw. Destination
scroll settles before motion starts. Back returns to the stable asset/route
identity of the original offer and restores its Analyze button focus. Resize,
motion preferences and teardown remove temporary layers. Shared team artwork
also cancels on scroll/resize/hiding, and its decorative clone is inert.

Review evidence is in `/tmp/dfl-1440-arena-final/`,
`/tmp/dfl-1440-home/` and `/tmp/dfl-1440-trade/`. Browser fixtures exercise the
production controllers with isolated providers. Light/Dark screenshots cover
320/390/768px broadcast layouts, portrait commissioner controls and landscape
viewing. Full Home and trade regressions, unit/type/theme/release checks and
public release verification run before completion. Physical iOS/Android and
assistive-technology output have not been exercised in this environment.
