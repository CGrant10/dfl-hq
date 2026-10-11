export const MAX_OFFER_PLAYERS = 8;
// Every participating team must send at least one player.
export function offerPlayerLimit(value = MAX_OFFER_PLAYERS, send = [], receive = [], members = 2) {
  const minimum = Math.max(1, send.length) + Math.max(1, receive.length) + Math.max(0, members - 2);
  return Math.min(MAX_OFFER_PLAYERS, Math.max(minimum, Number(value) || MAX_OFFER_PLAYERS));
}
