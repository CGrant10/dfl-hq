# DFL characters — compositor foundation

Status: **Phase 1 complete.** The shared compositor exists, both renderers
consume it, and the duplicated cosmetic interpretation is gone. No new
customization catalogue, no creator UI, no schema change yet.

---

## What changed, and why

A DFL character is a 24×15 grid of letters plus a palette, where `L` is
replaced by the racer's lane colour at draw time. Until now **two renderers
read that grid independently**:

| | file | how |
|---|---|---|
| SVG | `js/arena/dfl-sprites.js` | run-length merged into `<path>` elements; hats and faces as hand-authored SVG path data |
| Pixi | `src/arena/pixi-stage.ts` | the same grid as `Graphics` rectangles; hats and faces as a second set of row loops |

**They agreed.** Every accessory and expression was traced cell by cell
before either was deleted, and both produced identical output. This refactor
therefore changes nothing on screen. What it removes is the standing
invitation to drift — two notations for one drawing, nothing checking them
against each other — immediately before a pass that adds skin, hair, shirts,
trousers, shoes and hats to both.

---

## Files changed

| file | change |
|---|---|
| `src/arena/character.ts` | **new.** The compositor. |
| `src/arena/character.spec.ts` | **new.** 22 tests, incl. legacy cell-parity fixtures. |
| `src/arena/pixi-stage.ts` | `#drawPet` + `#drawCosmetics` deleted; `#petFrames` now composes via `composeCharacter()` and draws runs in `#drawComposition()`. |
| `src/arena/runtime.ts` | exports the compositor from the built bundle. |
| `js/arena/dfl-sprites.js` | now **data only** — roster, palettes, grids, legacy id resolution. `pixelPaths`, `cosmeticPaths`, `strideFrame`, `dflSpriteMarkup` deleted. Added `characterFor(id)`. |
| `js/arena/sprites.js` | `spriteMarkup()` calls `characterSvg()` from the bundle. |
| `js/pages/profile-dfl.js` | preview + roster picker call `characterSvg()`. |

---

## Compositor API

```ts
interface PixelRun { x: number; y: number; w: number; color: string }

interface CharacterComposition {
  width: number; height: number; pose: PixelPose;
  runs: PixelRun[];        // BACK TO FRONT — this ordering is the layer stack
}

interface CharacterConfig {
  kind?: "dfl" | "human" | "animal";   // reserved for Phase 2/3; absent ⇒ "dfl"
  species?, color?, accent?, accessory?, expression?, trail?: string | null;
}

normalizeCharacter(pet: unknown, laneColor?): CharacterConfig
composeCharacter(config, pose: 0|1|2|3 = 0): CharacterComposition
characterSvg(config, laneColor?): string
silhouetteRuns(rows, palette, laneColor): PixelRun[]
runsToPaths(runs): string
characterIds(): string[]
ACCESSORY_KEYS, EXPRESSION_KEYS, GRID_W, GRID_H, FACE_INK, DEFAULT_COLOR, DEFAULT_ACCENT
```

A **run** is one horizontal span of one colour. SVG turns runs into path
data; Pixi turns them into filled rects. `runs` order *is* the layer order —
that is the hook Phase 2 hangs body → trousers → shirt → shoes → hair → hat
on, without either renderer learning anything new.

---

## Legacy `pet` handling

`normalizeCharacter()` accepts **anything**: `null`, `undefined`, `""`, a
number, an array, an object with null fields. Tested. Rules:

- absent `kind` ⇒ `"dfl"` — every pet in the database today
- absent `color` ⇒ lane colour ⇒ `#2fbf5f`
- absent/unknown `species` ⇒ the roster's stable hash fallback, so a racer
  always has a body (`"trex"` composes the same character every time)
- unknown `accessory`/`expression` are ignored, not thrown

**No database change was made and none is needed yet.** The pet is jsonb on
the member row, written through the `dfl_update_profile` RPC.

---

## How each renderer consumes it

**SVG** — `characterSvg(config, laneColor)` composes poses 0 and 2, groups
runs into one `<path>` per colour, and emits the same markup the CSS already
styles: `.racer-art.racer-px.has-frames`, `viewBox="0 0 24 15"`,
`shape-rendering="crispEdges"`, `.px-frame-a` / `.px-frame-b`.

**Pixi** — `#petFrames()` composes poses 0–3 **once, in `setRacers()`**, and
`#drawComposition()` turns each run into one filled rect centred on the
actor. `render()` only toggles which of the four `Graphics` is visible; no
character is rebuilt per frame.

---

## Tests

`src/arena/character.spec.ts`, 22 tests:

- **cell-parity fixtures** for all 5 accessories and all 4 expressions,
  transcribed from the originals before deletion — a hat moving one pixel
  fails the suite
- lane-colour substitution for `L` only
- run merging actually merges
- legacy pet shape; null/undefined/string/number/array/junk
- unknown species is stable; unknown cosmetics ignored
- four distinct poses; determinism
- one `<path>` per colour; SVG contract; colour-attribute escaping
- every roster character and catalogued cosmetic composes

**Results:** `pnpm typecheck` clean · **87 tests pass** (13 files, up from 65)
· `pnpm build` clean. Verified in the browser: SVG renders (16 paths, 2
frames, correct viewBox), Pixi composes lane colour + accent + face ink, and
a 12-racer race with 12 different cosmetic combinations runs without error.

---

## Known limitations / intentionally left alone

- **`pose` is a 0–3 enum from `pixel-poses.ts`.** Fine for the DFL roster;
  Phase 2 layers may want per-layer offsets, which will need extending.
- **The SVG path now uses `pixelPoseRows` poses 0 and 2**, where it
  previously used its own `strideFrame`. This *aligns* the preview with the
  race; it is a deliberate, tiny change to the preview's two-frame animation.
- **`js/arena/sprites.js` and `profile-dfl.js` import from
  `js/arena/pixi-runtime.js`** — the built bundle. So **editing
  `src/arena/character.ts` requires `pnpm build`** or the SVG side keeps the
  old composition. This is the existing convention (see README).
- **Uploaded PNG racers** (`sprite_image`) still bypass the compositor
  entirely in `spriteMarkup()`. Correct — they are photos, not pixel grids.
- **`trail` is still CSS** (`.trail-dust` etc. on `.runner`), not composed.
  Left as-is: it is a track effect, not part of the character body.
- **`pet-texture.ts` `normalizePet`** still exists alongside
  `normalizeCharacter`. Pixi uses it for `ArenaPet` typing/motion. Merging
  the two is worth doing in Phase 2, not now.
- **Two class namespaces remain** (`.runner*` vs `.bc-*`). Unrelated to
  characters; see `js/arena/racer-view.js`.

---

## Recommended next steps

**PHASE 2 — human layers.** Add a `kind: "human"` branch to
`composeCharacter()`. Define layers as grids in the same letter format and
push their runs in stack order: body/skin → trousers → shirt → shoes → hair
→ hat. Extend `CharacterConfig` with `skin`, `hair`, `shirt{style,color}`,
`pants{style,color}`, `shoes{style,color}`, `hat`. Keep every field
optional. Add cell-parity fixtures per layer as you go.

**PHASE 3 — animals.** `kind: "animal"` with an `animal` id; the same grid
format, so `silhouetteRuns()` needs no change.

**PHASE 4 — creator UI.** Extend `editCard()` in `js/pages/profile-dfl.js`.
The preview already draws through `characterSvg()`, so it is correct by
construction.

**PHASE 5 — persistence.** Extend the pet jsonb; no new columns. Read paths
already tolerate missing fields, so old rows need no migration — write the
new fields only when the user saves.

**PHASE 6 — visual parity.** Profile preview vs live Arena vs shared
`/broadcast`. The shared view needs a real Supabase event; it can be driven
locally by stubbing `fetch` for `supabase.co/rest/v1/*` (see session notes).

Do **not** reintroduce a second interpretation of the grid in either
renderer. That is the whole point of this file.
