const id=value=>/^\d{1,24}$/.test(String(value||''))?String(value):null;
const words=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/['’.]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function highlightPlayCandidates(clip,plays=[]){
 const published=Date.parse(clip.published_at),yards=[...String(clip.headline).matchAll(/\b(\d{1,3})[- ]yard\b/gi)].map(m=>Number(m[1]));
 if(!id(clip.game_id)||!Number.isFinite(published)||/sets? up|leads? to|highlights|recap|and then/i.test(clip.headline)||new Set(yards).size>1)return [];
 return plays.filter(play=>{
  const at=Number.isFinite(play.at)?play.at:Date.parse(play.wallclock),td=play.kind==='touchdown'||['67','68'].includes(String(play.type?.id))&&play.scoringPlay===true&&(play.scoreValue==null||Number(play.scoreValue)===6);
  return id(play.id)&&(!play.gameId||String(play.gameId)===String(clip.game_id))&&Number.isFinite(at)&&published>=at-30000&&published-at<=20*60000
   &&!play.isPenalty&&!play.isTurnover&&!/no play|overturned|reversed|nullified|intercepted|fumble/i.test(play.text||'')
   &&(clip.kind==='touchdown'?td:!td&&(play.kind==='big-play'||['5','24'].includes(String(play.type?.id))))&&(!yards.length||Number(play.yards??play.statYardage)===yards[0]);
 });
}
// Only structured offensive participants can associate a video with a play.
// Ambiguous, compound, reversed or late clips remain browsable without a link.
export function highlightPlayMatch(clip,plays=[],names=[]){
 const headline=` ${words(clip.headline)} `,mentioned=[...new Set([...names,...plays.flatMap(p=>(p.players||[]).map(player=>player.name))].map(words).filter(n=>n.split(' ').length>=2&&headline.includes(` ${n} `)))];
 const candidates=highlightPlayCandidates(clip,plays).filter(play=>{if(clip.kind==='touchdown'&&play.kind!=='touchdown'&&Number(play.scoreValue)!==6)return false;const participants=(play.players||[]).filter(p=>['passer','receiver','rusher','scorer'].includes(p.role)).map(p=>words(p.name));return mentioned.length>0&&mentioned.every(n=>participants.includes(n))});
 return candidates.length===1?String(candidates[0].id):null;
}
export function clipForPlay(clips,gameId,playId,now=Date.now()){
 return clips.filter(clip=>id(clip.id)&&String(clip.game_id)===String(gameId)&&String(clip.play_id)===String(playId)&&Date.parse(clip.expires_at)>now&&clip.video_url).sort((a,b)=>Date.parse(a.published_at)-Date.parse(b.published_at))[0]||null;
}
