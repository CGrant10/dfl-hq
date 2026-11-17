import {evaluateTradeDeal} from './trade-workspace.js';

const normalize=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b/g,'').replace(/[^\p{L}\p{N}]/gu,'');
const aliases=player=>{
 const words=String(player.name||'').replace(/\b(jr|sr|ii|iii|iv)\b/gi,'').trim().split(/\s+/);
 return new Set([normalize(player.id),normalize(player.name),normalize((words[0]?.[0]||'')+words.slice(1).join(' '))].filter(Boolean));
};
const tokens=text=>String(text||'').split(/[\n,;+]+|\s+and\s+/i).map(s=>s.trim()).filter(Boolean);

// Pending Sleeper proposals are private. Imported names resolve only against
// actual owned player IDs; a surname/initial ambiguity never chooses a player.
export function parseTradeOffer({team,teams=[],pool=new Map(),sendText='',receiveText='',maxPlayers=8}={}){
 const owners=new Map(),index=new Map(),errors=[];
 for(const owner of teams)for(const id of owner.playerIds||[]){const key=String(id);owners.set(key,[...(owners.get(key)||[]),owner]);}
 for(const [id,rosters] of owners){
  const player=pool.get(id);if(!player||rosters.length!==1)continue;
  const row={id,owner:rosters[0],name:player.name};
  for(const alias of aliases({...player,id}))index.set(alias,[...(index.get(alias)||[]),row]);
 }
 const resolve=(text,own)=>{
  const ids=[];
  for(const token of tokens(text)){
   const key=normalize(token.replace(/^(?:QB|RB|WR|TE|K|DEF|DST)\s+/i,''));
   const matches=(index.get(key)||[]).filter(row=>(String(row.owner.id)===String(team?.id))===own);
   if(matches.length!==1){errors.push(matches.length?`Use the full name for ${token}.`:`${token} is not on ${own?'your':'another team’s'} roster.`);continue;}
   if(ids.some(p=>p.id===matches[0].id)){errors.push(`${matches[0].name} was listed twice.`);continue;}
   ids.push(matches[0]);
  }
  return ids;
 };
 if(!team)return {ok:false,errors:['Choose your team first.']};
 const outgoing=resolve(sendText,true),incoming=resolve(receiveText,false);
 if(!outgoing.length&&!errors.length)errors.push('Add the players you send.');
 if(!incoming.length&&!errors.length)errors.push('Add the players you receive.');
 if(outgoing.length+incoming.length>maxPlayers)errors.push(`Use up to ${maxPlayers} players in one offer.`);
 const partners=[...new Set(incoming.map(p=>String(p.owner.id)))];
 if(partners.length>1)errors.push('Use the builder to route a multi-team offer.');
 if(errors.length)return {ok:false,errors:errors.slice(0,3)};
 const partner=teams.find(t=>String(t.id)===partners[0]);
 const deal=evaluateTradeDeal([team,partner],[outgoing.map(p=>p.id),incoming.map(p=>p.id)],pool);
 return deal?{ok:true,deal}:{ok:false,errors:['Check the players and current roster ownership.']};
}
