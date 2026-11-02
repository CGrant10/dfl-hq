# League Wire visual QA — 1.529.0

Selected target: option 3, `/workspace/generated_images/exec-bc774bf5-73c0-48bd-a4d6-a867f66e883c.png`.
This is the exact displayed selection, not a different ideation direction.

The 852 × 1846 reference was normalized to the rendered 390 × 844 phone
viewport. Both views show Home at scroll zero in Dark, the same teams and
scores, with no dialog open and the first broadcast story visible. Compiled
capture: `/tmp/dfl-1529-real/home-dark-390.png`. The reference and implementation
were inspected together in `/tmp/dfl-1529-qa/comparison.png`; the focused header,
score and media comparison is `/tmp/dfl-1529-qa/detail-comparison.png`. Both
comparison inputs were opened after the final CSS build and capture.

## Findings and corrections

| Priority | Finding | Resolution |
| --- | --- | --- |
| P1 | An empty media slot could suppress its visibility-gated loader. | Reserve the three-tile loading geometry; remove the empty-slot hiding rule. The real compiled app loads three previews. |
| P1 | The previous score threshold began the flight before the compact source scrolled. | Cache the source-dependent inset for native and fallback paths; moving copies and dock remain invisible at scroll zero. |
| P2 | Full-size traveling names crossed their moving avatars and totals. | Cache avatar edges and score paths; constrain names during the same flight. Phone captures and reversing-scroll assertions pass. |
| P2 | Long broadcast result names could push the footer into carousel controls. | Measure exceptional intrinsic flow once per edition/width/text scale and reserve stable height. Normal and enlarged-text layouts pass. |
| P2 | Legacy rank padding left extra space below the broadcast. | Remove the nested vertical padding while retaining the shared section gap. Recaptured compiled Home. |
| P2 | Book status and lock time ran together. | Apply the shared compact metadata role with an explicit wrapping gap. Recaptured both themes. |

## Final comparison

- **Composition:** compact shared header, anniversary/date, matchup, asymmetric
  three-image grid, wide daily art, flat ranking surface and five destinations
  follow the selected direction. Clubhouse, Trades and Book use the same type
  and spacing roles. Occasional tools fold away without removing features.
- **Typography:** Inter supplies compact identities, sections and metadata;
  Rajdhani supplies sports figures and the daily art headline. Long real names
  wrap. Enlarged text reflows; native form inputs retain their mobile size.
- **Color/surfaces:** both Medicine Wheel defaults use shared tokens for text,
  canvas, selection, borders and metadata. Owned art, team identity and semantic
  results retain their existing colors. The round logo is used in the header.
- **Images/copy:** the supplied DFL art and mark are reused. Real newest clip
  thumbnails/headlines replace the reference's illustrative football stills.
  Existing rotating daily banter replaces its fixed sample headline. No fake
  clip, score, team or ranking data was introduced to match the illustration.
- **Spacing:** 16px phone gutters and compact rows are consistent. Real captions
  can use two lines. The live broadcast keeps accessible 44px controls and its
  stable deck height, so rankings start lower than in the static illustration.
  Ranking edition/report controls and full results are retained.
- **Interactions:** preview tiles open the actual selected clip, Browse exposes
  the complete reel, score motion reverses, tools expand, Trade retains all
  controls, Book opens the slip, and More keeps the active route underneath it.

## Coverage and limits

Inspected compiled Home, Clubhouse and Trades in Light/Dark at
320/390/430px, plus the full Book renderer with isolated data at those widths.
Focused production-component suites cover text enlargement, contrast, touch
targets, search/editing, playback, score fallback and motion preferences.
`pnpm check` passes 2,420 tests; final CSS was rebuilt and `pnpm themes` passes.
Screens containing actual member data stay local; committed release evidence
uses isolated fixtures. Actual live Book account writes were blocked during
read-only review. Physical iPhone Safari remains unmeasured.

No unresolved P0/P1/P2 findings remain. P3 follow-up: evaluate the retained
broadcast control strip's density on a physical phone before changing its
existing gesture and accessibility behavior.

final result: passed
