import {reconcileTradeDestinations} from './trade-routing.js';
// New visits and the empty-state reset share one truly unrestricted search.
// The manual trade draft is deliberately separate from these filters.
export function resetTradeSearch(shop,{intent='fair'}={}) {
  Object.assign(shop,{setupOpen:false,refineOpen:false,partnerId:'all',memberIds:[],anchorPartnerId:'all',
    sendAnchors:[],receiveAnchors:[],sendCount:'any',receiveCount:'any',maxPlayers:8,goal:'best',horizon:'season',
    mode:'offers',customOpen:false,intent,openTiers:new Set([intent]),visibleCount:6});
}
export function tradeSearchRestricted(shop) {
  return shop.partnerId!=='all'||!!shop.memberIds?.length||!!shop.sendAnchors?.length||!!shop.receiveAnchors?.length
    ||shop.sendCount!=='any'||shop.receiveCount!=='any'||shop.maxPlayers<8||shop.goal!=='best'||shop.horizon!=='season';
}
// A draft is scoped to the member and season, then reconciled with real rosters.
export function tradeDraft({ selectedId, trade, shop }) {
  return { selectedId, trade: { memberIds: trade.memberIds, sends: trade.sends.map(ids => [...ids]), destinations:trade.destinations||{}, editing: trade.editing, filters: trade.filters || {} }, shop: { mode:shop.mode||'offers',setupOpen:!!shop.setupOpen,goal:shop.goal||'best',horizon:shop.horizon==='next4'?'next4':'season', refineOpen:!!shop.refineOpen, partnerId: shop.partnerId, memberIds: shop.memberIds, anchorPartnerId: shop.anchorPartnerId, sendAnchors: shop.sendAnchors, receiveAnchors: shop.receiveAnchors, maxPlayers: shop.maxPlayers, packageLimitVersion: 2, sendCount: shop.sendCount, receiveCount: shop.receiveCount, intent: shop.intent, openTiers: [...shop.openTiers], customOpen: shop.customOpen, visibleCount: shop.visibleCount } };
}
export function restoreTradeDraft(saved, teams, selectedId) {
  if (!saved?.trade || !saved.shop) return null;
  const team = teams.find(t => String(t.id) === String(selectedId || saved.selectedId));
  if (!team) return null;
  const validMembers = ids => [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(id => id !== String(team.id) && teams.some(t => String(t.id) === id)).slice(0, 7);
  const memberIds = validMembers(saved.trade.memberIds), parties = [team, ...memberIds.map(id => teams.find(t => String(t.id) === id))];
  const savedPartyIds=[String(saved.selectedId||team.id),...(Array.isArray(saved.trade.memberIds)?saved.trade.memberIds:[]).map(String)];
  let count = 0;
  const sends = parties.map(t => {
    const source=saved.trade.sends?.[savedPartyIds.indexOf(String(t.id))];
    return new Set((Array.isArray(source)?source:[]).map(String).filter((id,index,all)=>all.indexOf(id)===index&&t.playerIds.map(String).includes(id)&&count++<8));
  });
  while (sends.length < 2) sends.push(new Set());
  const filters=Object.fromEntries(parties.map((t,i)=>[String(i),saved.trade.filters?.[savedPartyIds.indexOf(String(t.id))]]).filter(([,value])=>typeof value==='string').map(([key,value])=>[key,value.slice(0,80)]));
  const s = saved.shop, partnerId = s.partnerId === 'all' ? 'all' : teams.some(t => String(t.id) === String(s.partnerId) && String(t.id) !== String(team.id)) ? String(s.partnerId) : '';
  const owned = (ids, players) => [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(id => players.includes(id)).slice(0, 8);
  const partner = teams.find(t => String(t.id) === partnerId);
  return { selectedId: team.id, trade: { memberIds, sends, destinations:reconcileTradeDestinations(parties,sends,saved.trade.destinations), editing: saved.trade.editing !== false, filters: filters }, shop: { mode:s.mode==='manual'?'manual':'offers',setupOpen:!!s.setupOpen,horizon:s.horizon==='next4'?'next4':'season',goal:['best','starter','consolidate','RB','WR','TE','QB'].includes(s.goal)?s.goal:'best', refineOpen:!!s.refineOpen, partnerId, memberIds: validMembers(s.memberIds).filter(id => id !== partnerId), anchorPartnerId: s.anchorPartnerId, sendAnchors: owned(s.sendAnchors, team.playerIds.map(String)), receiveAnchors: owned(s.receiveAnchors, (partner?.playerIds || []).map(String)), maxPlayers: Math.max(2, Math.min(8, s.packageLimitVersion === 2 ? Number(s.maxPlayers) || 8 : 8)), sendCount: ['any','1','2','3','4','5','6','7'].includes(String(s.sendCount)) ? String(s.sendCount) : 'any', receiveCount: ['any','1','2','3','4','5','6','7'].includes(String(s.receiveCount)) ? String(s.receiveCount) : 'any', intent: ['fair','aggressive','steal'].includes(s.intent) ? s.intent : 'aggressive', openTiers: new Set((Array.isArray(s.openTiers) ? s.openTiers : []).filter(t => ['fair','aggressive','steal'].includes(t))), customOpen: !!s.customOpen, visibleCount: Math.min(60, Math.max(6, Number(s.visibleCount) || 6)) } };
}
