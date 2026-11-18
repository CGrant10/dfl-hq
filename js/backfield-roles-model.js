// Current Sleeper depth-chart facts, not a forecast of injury probability.
export const BACKFIELD_MAX_AGE_MS = 36 * 60 * 60 * 1000;
const club = value => ({JAC:'JAX',WSH:'WAS',LA:'LAR'}[value] || value);
const clubs=new Set('ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LAC LAR LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS'.split(' '));
export function assessBackfieldRoles(data, {now=Date.now()}={}) {
 const empty={status:'Unavailable',usable:false,players:{},fetchedAt:0};
 if(data?.schemaVersion!==1||data.source!=='Sleeper'||!Number.isFinite(data.fetchedAt)||data.fetchedAt>now+300000||!data.players||Array.isArray(data.players))return empty;
 const entries=Object.entries(data.players);
 if(entries.length<32||entries.length>500||entries.some(([id,p])=>!/^\d+$/.test(id)||!p||!clubs.has(club(p.team))||!Number.isInteger(p.order)||p.order<1||p.order>15))return empty;
 const usable=now-data.fetchedAt<=BACKFIELD_MAX_AGE_MS;
 return {status:usable?'Fresh':'Stale',usable,players:data.players,fetchedAt:data.fetchedAt};
}
export function backfieldRoleIndex(feed) {
 const out=new Map();if(!feed?.usable)return out;
 const teams=new Map();
 for(const [id,p] of Object.entries(feed.players)){
  const team=club(p.team);if(!teams.has(team))teams.set(team,[]);
  teams.get(team).push({id,order:p.order});
 }
 for(const [team,players] of teams){
  const starters=players.filter(p=>p.order===1),backups=players.filter(p=>p.order===2);
  // Ambiguous depth charts never establish a specific handcuff relationship.
  const starter=starters.length===1?starters[0]:null,backup=backups.length===1?backups[0]:null;
  for(const p of players)out.set(p.id,{team,depthOrder:p.order,handcuffForId:p.order===2&&starter&&backup?starter.id:null,backfieldBackupId:p.order===1&&starter&&backup?backup.id:null});
 }
 return out;
}
