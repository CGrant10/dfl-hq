# Arena portrait theater — 1.441.0

Portrait now opens the live race inline in a 16:9 field window. Camera buttons,
racer selection, commentary, crowd menu, replay and commissioner actions retain
normal text sizes and 44px targets outside the scaled field. The Crowd button
sits beside commentary; its menu only overlays the scene when deliberately
opened. On phones, Field uses the full window instead of squeezing in a side panel;
yard/goal labels and number badges adapt to the available space. The field retains football yard numbers and the existing shared race,
director, timing, kit artwork and official order.

Expand works in either orientation. Native fullscreen failure or absence falls
back to the app's expanded stage. Portrait expansion centers a widescreen theater;
landscape expansion uses available safe-area space. No orientation lock is
requested. Touch spectators can still rotate an inline portrait view into the
automatic landscape stage, and rotate back inline. An explicitly expanded stage
stays open through rotation; closing it prevents automatic reopening on resize.
A late fullscreen request cannot reopen a view the user already closed. Edit
leaves expanded viewing before opening the commissioner form. Exit/teardown
restore focus and release the page scroll lock.

Presentation adds three progressive stadium start lights, a finite 320ms
countdown entrance, static floodlights and lens shading, and a subtle final
sprint light based on actual progress. A thin footer strip tracks the real
leader's progress rather than elapsed-time estimates. Reduced motion disables
countdown scaling, light transitions and sprint glow, and retains the existing
wide camera. These changes add no independent animation loop, audio autoplay,
network request, package or artwork download. The existing renderer still stops
Canvas work offscreen and on hidden pages.

The production-controller browser fixture uses isolated providers and covers
320/390/768px portrait races with Auto, Field and Follow in Light and Dark;
direct live watch links; actual advancing Canvas/clock; rotation; fullscreen
failure, cancellation, close and safe areas; local replays and photo finishes;
countdown; readiness, reactions and opt-in sound; saved uniforms; commissioner
start/pause/resume/edit/reset; exact official order; and removal/cleanup.
Screenshots and browser results are retained in `/tmp/dfl-1441-arena-final/`.

Physical iOS/Android fullscreen behavior, device haptics, mobile GPU frame rate
and assistive-technology speech output have not been exercised here. Browser
animation checks verify progression and layout, not a physical-device FPS claim.
