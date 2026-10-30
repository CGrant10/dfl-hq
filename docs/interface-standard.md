# DFL interface standard

First adoption: Home and Clubhouse in 1.524.0. Source owners are
`css/tokens.css` and `css/interface-system.css`; the combined stylesheet remains
one request. Existing feature-specific art and motion keep their own ownership.

## Type roles

| Role | Compact size | Face / weight | Use |
| --- | --- | --- | --- |
| Page title | 24px | Inter 700 | The DFL Daily, Clubhouse |
| Story headline | 20px | Inter 650 | Briefing lead, featured archive story |
| Section | 16px | Inter 700 | Week ahead, Power rankings, League scoreboard |
| Identity / row | 13px | Inter 600–650 | Team/player names, row headlines |
| Body | 13px | Inter 400–500 | Supporting copy |
| Metadata | 11px | Inter 400–500 | Records, owners, context |
| Short labels | 10px | Inter 500–600 | Week/status captions |
| Text input / select | 16px | Inter 600 | Native picker text; mobile focus stays usable |
| Scores | Existing stat scale | Rajdhani 700, tabular | Matchup totals, player scores, ratings |
| Broadcast | Existing composition scale | Rajdhani / Anton | Dedicated story art direction |

All sizes are rem-based. Comfortable mode raises row text to 16px, body and
metadata to 14px, labels to 12px, and section headings to 18px. System text scaling
also reflows the layout. Do not squeeze long names into a tiny font to preserve a
single line.

The local variable Inter file already ships and is precached for share graphics.
Its stylesheet declaration and preload now support interface text too. Rajdhani
and Anton remain in their sports/illustration roles. No remote font service.

## Geometry and surfaces

- Use a 4px spacing grid: 4/8/12/16/24. Phone gutter is 16px; row padding is 12px.
- Keep at least 44px interactive height and practical touch widths, with visible
  focus. The type inside a control can stay compact without shrinking its target.
- Use 6px control corners and 8px feature-panel corners. Ordinary list rows are
  transparent with one soft dividing rule; do not put a panel around each field.
- Canvas uses `--bg`; feature panels use `--bg-2`; selection uses a restrained
  accent marker. A full saturated outline is not needed around every selection.
- Names and live values use `--text`; supporting details use `--body-text` or
  `--muted`. NFL/member colors and meaningful status colors retain their meaning.
- Show one clear page context. Avoid a second eyebrow repeating the page's role.
- Preserve exact data and action destinations while changing presentation.

## Shared component families

- `data-ui-tabs`: compact labels, selected text, native keyboard behavior and the
  existing sliding indicator. Home weekly/position views and Clubhouse adopt it.
- `data-ui-picker`: labeled native selectors with the shared text, height,
  surface, border and focus rules. Clubhouse season/week is the first adopter.
- `data-ui-section`: sentence-case section titles using the section token.
- Identity rows share the same UI font/weights and quiet metadata; score columns
  keep tabular sports numerals. Home leader/ranking rows and Clubhouse
  matchup/leader/stat rows establish the examples.

Keep the route adapters in `interface-system.css` while migrating old selectors;
new component declarations should use the shared roles instead of choosing a new
size or weight on each screen. Functional changes belong in the owning component,
not in visual CSS.

## Motion and verification

Reuse the existing press, tab-slide, sheet and score transitions. This migration
adds no animation loop, polling or JavaScript controller. Decorative motion must
respect Motion off and Reduced Motion, and it must leave labels readable.

Before extending this standard, capture the actual production components in both
Medicine Wheel themes at 320px and 390px, then check enlarged/Comfortable text,
keyboard navigation, long names, contrast and selected/pressed states. Check
scores and routes against their source; visual cleanup must not alter either.

See the [1.524 review](interface-foundation-1524.md) for current-run screenshots,
coverage and limits.
