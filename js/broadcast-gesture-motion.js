export const broadcastArtworkOffset=offset=>Math.max(-12,Math.min(12,-offset*.12));
export function broadcastSettleDuration(distance,velocity=0){
 return Math.round(Math.max(170,Math.min(340,140+Math.abs(distance)/(.65+Math.min(3,Math.abs(velocity))))));
}
