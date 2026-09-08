// Keep the preview's integer rounding aligned with sportsbook_place_bet.
export function parseStake(value, balance) {
  const text = String(value).trim();
  if (!/^[1-9]\d*$/.test(text)) return null;
  const stake = Number(text);
  return Number.isSafeInteger(stake) && stake <= balance ? stake : null;
}

export function estimatedReturn(stake, odds) {
  if (!Number.isSafeInteger(stake) || stake < 1 || !Number.isInteger(odds) || Math.abs(odds) < 100) return null;
  const payout = stake + Math.floor(odds > 0 ? stake * odds / 100 : stake * 100 / Math.abs(odds));
  return Number.isSafeInteger(payout) ? payout : null;
}
