import {buildWaiverPlan} from './waiver-coach.js';
const club=p=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[p?.team||p?.t]||p?.team||p?.t);
export function watchOwnership(rosters,expected=12){
 if(!Array.isArray(rosters)||rosters.length!==expected||new Set(rosters.map(r=>String(r.roster_id))).size!==expected||rosters.some(r=>!Array.isArray(r.players)))return null;
 const owners=new Map();
 for(const r of rosters)for(const id of new Set([...r.players,...(r.reserve||[]),...(r.taxi||[])].map(String))){if(owners.has(id))return null;owners.set(id,r);}
 return owners;
}
export function watchInjury(player){
 if(!player||!Object.hasOwn(player,'injury_status'))return 'unknown';
 const raw=String(player.injury_status||'').trim().toLowerCase().replace(/[ _-]/g,'');
 return ({'':'Healthy',healthy:'Healthy',active:'Healthy',questionable:'Questionable',q:'Questionable',doubtful:'Doubtful',out:'Out',o:'Out',ir:'IR',injuredreserve:'IR',pup:'PUP',sus:'Suspended',suspended:'Suspended'})[raw]||'unknown';
}
export function buildWatchlistRows(ids,{rosters,rows,players,weekly,nfl,league,users=[],checkedAt}, {rosterId,values=new Map(),now=Date.now()}={}){
 const owners=watchOwnership(rosters,Number(league.total_rosters)||12);
 if(!owners)throw Error('Complete current ownership is unavailable.');
 const submitted=rosters.map(r=>({...r,starters:rows.find(row=>String(row.roster_id)===String(r.roster_id))?.starters||r.starters}));
 const plan=buildWaiverPlan({rosters:submitted,rosterId,weekly,schedule:nfl?.teams,league,values,now,candidateIds:ids});
 return ids.map(String).map(id=>{
  const p=players[id],w=weekly[0]?.pool.get(id),owner=owners.get(id),user=users.find(u=>String(u.user_id)===String(owner?.owner_id));
  const game=nfl?.teams?.get(club(w||p)),offer=plan.offers.find(o=>String(o.player.id)===id);
  return {id,leagueId:String(league.league_id||''),name:p?.n||w?.name||id,position:p?.p||w?.position||'',nflTeam:p?.t||w?.team||'',injuryStatus:p?.i||w?.injuryStatus||'',
   ownerId:owner?.roster_id??null,owner:owner?(user?.metadata?.team_name||user?.display_name||`Team ${owner.roster_id}`):'Available in DFL',
   own:owner&&String(owner.roster_id)===String(rosterId),known:!!p,points:w?.hasGame&&Number.isFinite(w.points)?w.points:null,
   kickoff:game?.kickoff||null,state:game?.key||'unknown',offer,checkedAt,
   fit:owner?'':offer?`${offer.kind} · W${offer.targetWeek}`:plan.state!=='ready'?'Roster fit unavailable':game?.key!=='upcoming'||Date.parse(game?.kickoff)<=now?'Wait for the next unlocked game':'No clear lineup upgrade'};
 });
}
// First observation is a baseline, never a notification about old news.
/** @param {{watched?:Array<any>,previous?:Array<any>,rosters?:Array<any>,players?:Object,season:number,week:number,expected?:number,now?:number,matchupMembers?:Array<number>,schedule?:Map<string,any>}} input */
export function watchlistChanges({watched=[],previous=[],rosters=[],players={},season,week,expected=12,now=Date.now(),matchupMembers=[],schedule=new Map()}={}){
 const owners=watchOwnership(rosters,expected);if(!owners)throw Error('Complete current rosters required');
 const prior=new Map(previous.map(s=>[`${s.member_id}:${s.player_id}`,s]));
 const unique=new Map();
 for(const w of watched){const key=`${w.member_id}:${w.player_id}`,old=unique.get(key);if(!old||Date.parse(w.created_at)<Date.parse(old.created_at))unique.set(key,w);}
 const changes=[],states=[];
 for(const [key,w]of unique){
  const p=players[w.player_id];if(!p||!['QB','RB','WR','TE','K','DEF'].includes(p.position))continue;
  const owner=owners.get(w.player_id),old=prior.get(key),injury=watchInjury(p),ownerId=owner?.roster_id??null;
  const changed=old&&(old.owner_roster!==ownerId||(injury!=='unknown'&&old.injury!==injury));
  const revision=(old?.revision||0)+(changed?1:0);
  states.push({league_id:w.league_id,member_id:Number(w.member_id),player_id:w.player_id,owner_roster:ownerId,injury:injury==='unknown'?(old?.injury||'unknown'):injury,season,week,revision,checked_at:new Date(now).toISOString()});
  const fresh=old&&old.season===season&&old.week===week&&now-Date.parse(old.checked_at)>=0&&now-Date.parse(old.checked_at)<=2*3600000&&Date.parse(w.created_at)<=Date.parse(old.checked_at);
  if(!fresh||!changed)continue;
  const name=p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||w.player_id;
  const ownStarter=owner&&String(owner.owner_id)===String(w.sleeper_user_id)&&(owner.starters||[]).map(String).includes(w.player_id);
  const game=schedule.get(club(p)),pregame=game?.key==='upcoming'&&Date.parse(game.kickoff)>now;
  const injuryChanged=injury!=='unknown'&&old.injury!=='unknown'&&old.injury!==injury&&pregame&&!(ownStarter&&matchupMembers.includes(Number(w.member_id)));
  const dropped=old.owner_roster!=null&&ownerId==null;
  if(dropped||injuryChanged)changes.push({memberId:Number(w.member_id),id:w.player_id,name,revision,copy:[dropped?'Dropped · available in DFL':'',injuryChanged?`${old.injury} → ${injury}`:''].filter(Boolean).join(' · ')});
 }
 return {changes,states};
}
