# Soft Halo loading — 1.597.0

final result: passed

Selected target: the FIRST displayed image in the latest three-option set,
`/workspace/generated_images/exec-65b8342a-0dbf-4df4-b7f2-8a27be89f72c.png`.
It specifies the original round mark, visible neutral halo, black surface, DFL HQ
wordmark and theme-colored activity bar. The user explicitly retained a bar
matching the selected theme and rejected stadium lighting. That calmer background
also replaces stadium lighting on updates; the shield/Update action stay there.

Evidence: `/workspace/dfl-halo-1597/`. `selected-final-comparison.png` shows the
source and revised browser rendering together at 390×844 CSS/pixels, density 1.
The 852×1846 source is downsampled/cropped by about one pixel for normalization.
Full views clearly expose logo, halo, wordmark and bar; no additional focused crop
is needed. `halo/` contains 320/390/768px Dark/Light and a Seattle palette capture.
`final/` covers update idle, focus, pending and motion settings. `actual/` checks
real current-member startup/Home/navigation with provider writes blocked.

Required fidelity surfaces:
- Typography/copy: existing self-hosted Rajdhani/Inter; original round mark and
  readable DFL HQ wordmark. Season/tagline omitted from ordinary HQ opening as in
  the selected target. The update keeps its headline, anniversary and clear
  Update action. Busy copy is the functional UPDATING status, without new prose.
- Layout: logo ~224px at 390px, compact 184px×3px activity line, centered grouping
  and existing fast ready fade. Source/implementation optical type spacing differs
  by a few pixels (P3); both remain crisp, balanced and unclipped. Compact and
  landscape update actions remain accessible and no horizontal overflow occurs.
- Color: truly black brand plate under both Medicine Wheel defaults, neutral
  soft light, original monochrome logo. The bar uses --accent-sweep rather than
  fixed theme colors. A validated mode-specific accent cache restores first-paint
  colors; normal theme initialization stays authoritative. Pinned route palettes
  cannot overwrite that cache. Invalid/stale cache data safely falls back.
- Assets: supplied logo/shield remain unmodified. A generated neutral halo asset
  is shared by both screens: `assets/loading-soft-halo.webp`, 512×512, 2,798 bytes,
  pure-black edges. It replaces the 124,598-byte opening stadium download/cache.
  The original generated halo is retained outside the repository. No custom crest,
  rasterized UI, new font or extra startup module. Stadium DOM, masks, timing and
  preload are removed from these screens. Other page artwork is untouched.
- Motion: brief opacity entrance and theme-line movement; motion preferences and
  tab visibility are honored. No bank sequence or animated blur/filter. A slow
  halo download never holds readiness. Existing 120/260ms minimums, 1.2s fallback,
  1.5s hard safety and quick fade remain. Update markers stay backward-compatible;
  readiness is still announced only after first-route paint.

QA iteration:
- P2: placing the opaque-black halo inside individual logo stacking contexts
  obscured the following wordmark/update headline. Moved it behind each complete
  foreground group: the normal lockup's background and the update root background.
  Revised captures show every word and anniversary intact.
- P2: the first halo crop was weaker than the selected mock. Expanded the opening
  image footprint while keeping the logo geometry and black edges. The final
  combined comparison shows a visible, smoothly feathered neutral light.
- Existing source-contract and worker tests were updated to enforce removal of
  retired stadium requests and cache the small halo once. Theme tests verify
  cached accents, mode validation and route-pin isolation.

Validation: 2,628 tests / 313 files pass. Release coherence, theme guard,
TypeScript, identifier checks and production build/bundle verification pass
(89 modules; startup 3, Home 4). Eleven opening browser cases pass: 320/390/768
Light/Dark, selected NFL colors, motion off, Reduced Motion, short launch and a
2.5s-delayed image. Update contrast, focus, motion and compact/landscape checks
and preview-to-Home navigation pass. Real startup confirms one round mark, no
shield/stadium banks and a plain black surface. No account, league, roster,
notification or wager was mutated. Public verification follows merge.

No unresolved P0/P1/P2 findings. P3: static source and live activity-line position
vary by animation phase; small optical typography differences retain existing
app fonts. Physical iOS pacing, screen-reader speech and native offline install
are not measured. Cache behavior is unit tested. Implementation checklist:
selected target, asset placement, first-paint theme matching, fast lifecycle,
preferences, responsive/contrast/browser review and checks complete.
