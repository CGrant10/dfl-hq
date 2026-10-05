# Anniversary banner QA — 1.296.0

**Findings**

No actionable P0/P1/P2 differences remain. The banner uses the selected Focused Lightning artwork: ivory varsity ten, restrained anime energy, faint DFL seal and the red/yellow/bone/black signature. It has no laurel branches.

**Evidence and normalization**

- Source: `/workspace/generated_images/exec-db33bb50-ca5b-4e1c-bb1b-e1f785112092.png`, 2172 × 724 pixels.
- Local browser captures: `/workspace/dfl-audit/anniversary-1.296.0/390-medicine.png`, `1280-medicine.png`, `320-light.png`; component capture `banner-390-medicine.png`.
- Combined comparison: `/workspace/dfl-audit/anniversary-1.296.0/comparison.png`. Source and implementation appear together at 390 × 130 CSS pixels, deviceScaleFactor 1, in an 810 × 210 frame. The browser normalizes the high-resolution source to the implementation CSS size.
- This full banner comparison also supplies focused evidence: numeral, text, dates, crest and all four segments are visible together. Full Home captures verify placement within app chrome.
- Viewports 320 × 844, 390 × 844 and 1280 × 844. State: Home, existing member fixture, settled banner, reduced motion. Palettes: Medicine Wheel, Medicine Wheel Light, Dark, Light. Local app URL `http://127.0.0.1:8765/`. Production backend writes prevented during browser checks.

**Required fidelity surfaces**

- Typography: preserve the image's approved lettering directly. Alt text supplies the complete milestone and year range to assistive technology.
- Layout: native 3:1 phone ratio, 106.66px high at 320px and 130px at 390px. Desktop height capped at 240px, trimming outer decorative texture while preserving number, headline, dates and signature. No clipped banner edges.
- Colors: retain the selected Medicine Wheel segments and warm gold. The dark illustrated banner remains consistent across app palettes.
- Assets: encode the selected artwork as a 210,148-byte WebP, quality 88, with no resizing or compositional edits. Side-by-side evidence confirms preserved lettering, detail and four-color line. No code-drawn substitutes for the illustration.
- Content: ten-season artwork and 2017–2026 dates match the mock. Later decade milestones retain dynamically generated headings and dates.

**Comparison history**

An earlier layout preflight found inherited negative margins clipping banner edges. Scoped centering and viewport-width limits fixed this before the final selected-artwork comparison. Final captures confirm x=0 and exact phone viewport width. The final visual comparison required no further P0/P1/P2 changes.

**Verification**

- `pnpm check` passed: typecheck, unresolved-name check, 1084 tests in 122 files, production build.
- Browser passed: three widths, four palettes, no document overflow or clipped banner, accessible milestone description, scoped axe scan with no violations, Home → Clubhouse → Home, 200% zoom, no page console errors.
- Artwork included in service worker app shell. Package, document meta/CSS cache keys, config release floor, service worker cache and version endpoint all use 1.296.0.
- Energy is static artwork; no new flashing or motion introduced.

**Open questions and limits**

None blocking. A scoped automated scan does not establish full app accessibility compliance.

**Implementation checklist**

- [x] Preserve the selected art and four-color signature.
- [x] Supply accessible equivalent milestone text.
- [x] Verify placement, palettes, zoom and navigation return.
- [x] Cache the asset and synchronize release versions.
- [x] Pass project checks and visual comparison before publishing.

**Follow-up polish**

None required for this scope.

final result: passed
