import {readJourneyChoice,writeJourneyChoice} from './journey-memory.js';
import {mountHomeHighlights} from './home-highlights.js';
import {loadHomeHighlights} from './home-highlight-data.js';
import {homeHighlightMarkup} from './home-highlight-ui.js';
import {teamHighlightClips} from './team-highlight-model.js';
import {loadNflGameDay} from './nfl-game-day.js';
import {currentMember} from './members.js';

export function mountClubhouseTeamHighlights(root,{getModel,getGame,active=()=>root.isConnected,load=loadHomeHighlights,loadNfl=loadNflGameDay}={}){
 const slot=root.querySelector('[data-clubhouse-reel-slot]');if(!slot)return {stop(){}};
 const route=new URLSearchParams(location.hash.split('?')[1]||''),journey=readJourneyChoice(root,'reel-scope'),returning=!!root.closest('[data-route-returning="true"]');
 let scope=['mine','matchup','league'].includes(journey?.scope)?journey.scope:route.has('player')?'league':currentMember()?'mine':'matchup',stopped=false,key='',cached=null,pending=null;
 const metadata=()=>{if(cached&&Date.now()-cached.at<30000)return Promise.resolve(cached.rows);if(pending)return pending;pending=load().then(rows=>{cached={at:Date.now(),rows};return rows}).finally(()=>{pending=null});return pending};
 const own=()=>getModel()?.games.find(game=>game.isMine)?.sides.find(side=>String(side.memberId)===String(currentMember()?.id));
 const players=()=>{const sides=scope==='mine'?[own()].filter(Boolean):getGame()?.sides||[];return sides.flatMap(side=>[...(side.lineup||[]),...(side.bench||[])])};
 const contextKey=()=>JSON.stringify([getModel()?.season,getModel()?.week,currentMember()?.id,scope,scope==='matchup'?getGame()?.id:null,scope==='league'?[]:players().map(p=>[p.id,p.name,p.nflTeam]).sort()]);
 const title=()=>scope==='mine'?"Your team’s highlights":scope==='matchup'?'Matchup highlights':'Weekend highlights';
 const empty=()=>scope==='mine'&&!currentMember()?'Choose your profile to see your team’s clips.':'No clips available for this week right now.';
 const reel=mountHomeHighlights(slot,{active:()=>!stopped&&active(),title,getContext:getModel,getPlayers:()=>getModel()?.games.flatMap(game=>game.sides.flatMap(side=>[...side.lineup,...side.bench].map(p=>({...p,owner:side.name,isMine:String(side.memberId)===String(currentMember()?.id)}))))||[],markup:(clips,now,browse)=>homeHighlightMarkup(clips,now,{...browse,layout:'grid',title:title(),eyebrow:scope==='mine'?own()?.name||'YOUR TEAM':scope==='matchup'?'THIS MATCHUP':'AROUND THE LEAGUE',emptyText:empty()}),load:async()=>{
  const model=getModel(),requested=contextKey();if(!model)return [];
  const [rows,nfl]=await Promise.all([metadata(),model.events?.length?null:loadNfl(model.season,model.week)]);
  if(stopped||requested!==contextKey())return [];
  const gameIds=(model.events?.length?model.events:nfl?.payload?.events||[]).map(event=>String(event.id));
  if(scope==='league'){const ids=new Set(gameIds);return rows.filter(row=>ids.has(String(row.game_id)))}
  return teamHighlightClips(rows,players(),{gameIds});
 }});
 const sync=()=>{
  for(const button of root.querySelectorAll('[data-team-reel-scope]'))button.setAttribute('aria-pressed',String(button.dataset.teamReelScope===scope));
  const next=contextKey();if(next!==key){key=next;reel.reset();if(!root.querySelector('#clubhouse-panel-highlights')?.hidden)void reel.refresh()}else reel.updatePlayers();
 };
 const click=event=>{const button=event.target.closest('[data-team-reel-scope]');if(button){scope=button.dataset.teamReelScope;writeJourneyChoice('reel-scope',{scope});sync()}};
 const tab=event=>{if(event.detail?.tab!=='highlights')reel.close();else{sync();void reel.refresh()}};
 root.addEventListener('click',click);root.addEventListener('dfl:clubhouse-context',sync);root.addEventListener('dfl:clubhouse-tab',tab);sync();
 if(route.has('player')&&!returning){writeJourneyChoice('reel-scope',{scope});void reel.refresh().then(()=>{if(!stopped&&scope==='league')reel.filterPlayer(route.get('player'),route.get('query')||'')});}
 return {async openClip(id,options={}){scope='league';sync();await reel.refresh();if(stopped||!active())return false;return reel.openClip(id,options)},stop(){stopped=true;reel.stop();root.removeEventListener('click',click);root.removeEventListener('dfl:clubhouse-context',sync);root.removeEventListener('dfl:clubhouse-tab',tab)}};
}
