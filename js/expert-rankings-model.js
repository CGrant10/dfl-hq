// Expert ranks are an opinion input, not DFL point projections or trade prices.
export const EXPERT_SOURCE_URL='https://www.fantasypros.com/nfl/rankings/ros-ppr-overall.php';
export const EXPERT_MAX_AGE_MS=72*60*60*1000;
const positions=new Set(['QB','RB','WR','TE']);
const nameKey=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+(?:jr\.?|sr\.?|ii|iii|iv|v)$/,'').replace(/[^a-z0-9]/g,'');
const aliases={hollywoodbrown:'marquisebrown',bamknight:'zonovanknight'};
const teamKey=value=>({JAC:'JAX',WSH:'WAS'}[value]||value||'FA');
const positive=value=>Number.isFinite(value)&&value>0;
export function assessExpertRankings(data,{season,scoring='ppr',now=Date.now()}={}){
 const base={source:'FantasyPros',url:EXPERT_SOURCE_URL,status:'Unavailable',usable:false,players:[],experts:0,updatedAt:0};
 if(!data||data.schemaVersion!==1||data.source!=='FantasyPros'||data.kind!=='rest-of-season'||data.scoring!=='ppr'||!Number.isInteger(data.season)||!Array.isArray(data.players)||data.players.length<100||!Number.isInteger(data.experts)||data.experts<2||!positive(data.updatedAt)||!positive(data.fetchedAt)||data.updatedAt>data.fetchedAt+300000||data.fetchedAt>now+300000)return base;
 const rows=data.players.filter(p=>p&&typeof p.name==='string'&&p.name.trim()&&positions.has(p.position)&&Number.isInteger(p.rank)&&positive(p.rank)&&Number.isInteger(p.positionRank)&&positive(p.positionRank)&&positive(p.minRank)&&positive(p.maxRank)&&p.minRank<=p.maxRank&&Number.isFinite(p.stdDev)&&p.stdDev>=0);
 if(rows.length<100)return base;
 const status=Number(season)!==data.season?'Season mismatch':scoring!=='ppr'?'Scoring mismatch':now-data.updatedAt>EXPERT_MAX_AGE_MS?'Stale':'Fresh';
 return {...base,status,usable:status==='Fresh',players:rows,experts:data.experts,updatedAt:data.updatedAt,fetchedAt:data.fetchedAt,season:data.season};
}
export function matchExpertRankings(players=[],feed={}){
 const key=p=>`${aliases[nameKey(p.name)]||nameKey(p.name)}:${p.position}:${teamKey(p.nflTeam??p.team)}`;
 const byKey=new Map();
 for(const row of feed.players||[]){const k=key(row);byKey.set(k,byKey.has(k)?null:row);}
 const counts=new Map();for(const p of players){const k=key(p);counts.set(k,(counts.get(k)||0)+1);}
 return new Map(players.flatMap(p=>{
  const row=byKey.get(key(p));return row&&counts.get(key(p))===1?[[String(p.id),{...row,source:feed.source,updatedAt:feed.updatedAt,experts:feed.experts,status:feed.status}]]:[];
 }));
}
export function expertValueIndex(rank){return Math.max(1,Math.min(100,100/(1+(rank-1)/30)));}
export function expertSourceMarkup(feed,esc=value=>String(value)){
 const fresh=feed?.status==='Fresh',date=feed?.updatedAt?new Date(feed.updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):null;
 const status=feed?.status==='Not connected'?'not connected':feed?.status||'not connected';
 return `<p>Expert consensus: ${fresh?'FantasyPros PPR rest-of-season':esc(status)}${date?` · updated ${esc(date)}`:''}${feed?.experts?` · ${Number(feed.experts)} experts`:''}. ${fresh?'Fresh, matched rankings contribute up to 15% of player value; DFL projections and production lead.':'Excluded from player values until a fresh PPR feed for this season is available.'} <a href="${EXPERT_SOURCE_URL}" target="_blank" rel="noopener">View source rankings</a>. Expert ranks are opinions, not injury return dates or trade prices.</p>`;
}
