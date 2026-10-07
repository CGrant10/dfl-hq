import {reconcileTradeDestinations} from './trade-routing.js';
// A draft is scoped to the member and season, then reconciled with real rosters.
export function tradeDraft({ selectedId, trade, shop }) {
  return { selectedId, trade: { memberIds: trade.memberIds, sends: trade.sends.map(ids => [...ids]), destinations:trade.destinations||{}, editing: trade.editing, filters: trade.filters || {} }, shop: { mode:shop.mode||'offers', refineOpen:!!shop.refineOpen, partnerId: shop.partnerId, memberIds: shop.memberIds, anchorPartnerId: shop.anchorPartnerId, sendAnchors: shop.sendAnchors, receiveAnchors: shop.receiveAnchors, maxPlayers: shop.maxPlayers, sendCount: shop.sendCount, receiveCount: shop.receiveCount, intent: shop.intent, openTiers: [...shop.openTiers], customOpen: shop.customOpen, visibleCount: shop.visibleCount } };
}
export function restoreTradeDraft(saved, teams, selectedId) {
  if (!saved?.trade || !saved.shop) return null;
  const team = teams.find(t => String(t.id) === String(selectedId || saved.selectedId));
  if (!team) return null;
  const validMembers = ids => [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(id => id !== String(team.id) && teams.some(t => String(t.id) === id)).slice(0, 7);
  const memberIds = validMembers(saved.trade.memberIds), parties = [team, ...memberIds.map(id => teams.find(t => String(t.id) === id))];
  let count = 0;
  const sends = parties.map((t, i) => new Set((Array.isArray(saved.trade.sends?.[i]) ? saved.trade.sends[i] : []).map(String).filter((id, index, all) => all.indexOf(id) === index && t.playerIds.map(String).includes(id) && count++ < 8)));
  while (sends.length < 2) sends.push(new Set());
  const s = saved.shop, partnerId = s.partnerId === 'all' ? 'all' : teams.some(t => String(t.id) === String(s.partnerId) && String(t.id) !== String(team.id)) ? String(s.partnerId) : '';
  const owned = (ids, players) => [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(id => players.includes(id)).slice(0, 8);
  const partner = teams.find(t => String(t.id) === partnerId);
  return { selectedId: team.id, trade: { memberIds, sends, destinations:reconcileTradeDestinations(parties,sends,saved.trade.destinations), editing: saved.trade.editing !== false, filters: Object.fromEntries(Object.entries(saved.trade.filters || {}).filter(([key,value])=>/^[0-7]$/.test(key)&&typeof value==='string').map(([key,value])=>[key,value.slice(0,80)])) }, shop: { mode:s.mode==='manual'?'manual':'offers', refineOpen:!!s.refineOpen, partnerId, memberIds: validMembers(s.memberIds).filter(id => id !== partnerId), anchorPartnerId: s.anchorPartnerId, sendAnchors: owned(s.sendAnchors, team.playerIds.map(String)), receiveAnchors: owned(s.receiveAnchors, (partner?.playerIds || []).map(String)), maxPlayers: Math.max(2, Math.min(8, Number(s.maxPlayers) || 4)), sendCount: ['any','1','2','3','4','5','6','7'].includes(String(s.sendCount)) ? String(s.sendCount) : 'any', receiveCount: ['any','1','2','3','4','5','6','7'].includes(String(s.receiveCount)) ? String(s.receiveCount) : 'any', intent: ['fair','aggressive','steal'].includes(s.intent) ? s.intent : 'aggressive', openTiers: new Set((Array.isArray(s.openTiers) ? s.openTiers : []).filter(t => ['fair','aggressive','steal'].includes(t))), customOpen: !!s.customOpen, visibleCount: Math.min(60, Math.max(6, Number(s.visibleCount) || 6)) } };
}
