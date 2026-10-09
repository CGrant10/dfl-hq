# Trade receipts and dismissal polish — v1.353.0

## Review scope

Fresh Chromium screenshots of the completed DFLyzer receipt archive, using eight existing saved trades and read-only league requests. Captures at 320, 390, 768, and 1280px; receipt checks also cover medicine dark/light and 200% text sizing. No league records or wagers were changed.

## Flow review

1. **Find a saved deal.** The previous archive expanded every receipt together. Verdicts and full current team names were useful, but selecting another deal required scrolling through all its predecessors' player packages. Each receipt now has a keyboard-operable disclosure with its week, verdict, and teams visible. The first deal opens by default; a transaction link opens and moves its selected receipt first.
2. **Read the exchange and impact.** Player portraits provided useful identity, but repeated VALUE labels and sentence-shaped lineup/depth statistics slowed comparison. Compact player rows retain photos, show one value column label per package, and expose the player card through a full row action. The impact table aligns team, lineup, and depth figures; narrow cards and larger text give the team its own full-width row. A screenshot at enlarged text exposed inherited name ellipsis; scoped wrapping fixes it.
3. **Inspect a player and return.** The archive now opens the shared player card. A brief dismissal fade and 8px travel finish before the modal closes and focus returns to the player action. Repeated Escape, reopening, route changes, Motion off, and reduced motion were exercised in the browser.

The photos, verdicts, current team names, saved values, and existing banter remain. The review is about presentation; it does not regrade completed trades or alter the share-card artwork.

## Evidence and accessibility limits

Before/after captures and read-only browser reports are in `/workspace/dfl-receipts-1353/`:

- `02-receipt-390.png`: previous open receipt.
- `after-archive-390.png`: scan of individual collapsed deals.
- `after-receipt-390.png`, `after-receipt-320.png`: compact open receipt.
- `after-receipt-medicine.png`, `after-receipt-medicine-light.png`: theme variants.
- `after-receipt-large-text.png`: enlarged-text wrapping.
- `receipt-motion-verification.json`, `receipt-text-verification.json`: browser checks.

Keyboard Enter/Space, visible disclosure focus, modal focus return, 44px player actions, text wrapping, horizontal overflow, and motion preferences were checked. Impact columns have table captions and row/column headers; hidden value labels provide reading context. These checks are not a full WCAG audit or physical-device/screen-reader certification. Screenshots taken with ordinary viewport height can include the fixed navigation; tall captures are used to inspect complete receipt contents.

## Shared motion

Player cards, bet slips, and More dismiss over 160ms, starting from their current visual state. More fades its overlay and moves its sheet. Reopening cancels the previous completion; route changes release the surface immediately; preference/visibility cancellation settles an in-progress dismissal once. Five lifecycle tests cover completion, repeated dismissal, reopening, interruptions, and motion preferences. Buttons use a restrained 1.5% press scale and respect Motion off/reduced motion.

Bet-slip dismissal preserves the existing busy guard and two-step review/confirm process. Browser checks use a wallet fixture, block writes, and do not confirm a wager.
