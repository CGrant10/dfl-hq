import {matchupChirpHtml,clubhouseChirp} from './matchup-chirp-ui.js';
import {loadNflGameDay} from "./nfl-game-day.js";
import {db} from './supabase.js';
import {loadPlayers} from './sleeper.js';
import {loadWeeklyRosters} from './weekly-clubhouse-data.js';
import {matchupTeamView,matchupPhase,matchupSummary} from './clubhouse-matchup-model.js';
import {animateScoreChanges} from './game-day-score-motion.js';
import {readPageChoice} from './page-disclosure.js';
import {keyPlayersHtml,matchupTalkHtml} from './clubhouse-matchup-cards.js';
let stopCurrent=null;
async function previews(root,threads,active){
 const ids=[...threads.values()];if(!ids.length)return;
 const counts=await db().from('member_wall_reply_counts').select('post_id,reply_count').in('post_id',ids);
 await Promise.all([...threads].map(async([matchup,post])=>{
  const {data,error}=await db().from('member_wall_replies').select('id,body,created_at,members(display_name)').eq('post_id',post).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1);
  if(!active())return;const slot=root.querySelector(`[data-chat-preview="${matchup}"]`);if(!slot)return;
  const row=data?.[0],count=counts.data?.find(r=>String(r.post_id)===String(post))?.reply_count;
  const talk=matchupTalkHtml({reply:row,count,error:!!error});slot.dataset.talkState=talk.state;slot.innerHTML=talk.html;
 }));
}
export function mountMatchupLive(root,model,threads,active){
 stopCurrent?.();let stopped=false,busy=false,timer,previous=null,stopScoreMotion=()=>{};const current=()=>!stopped&&root.isConnected&&active();
 const status=root.querySelector('[data-matchup-freshness]'),button=root.querySelector('[data-matchup-refresh]');
 const refresh=async(force=false)=>{
  if(busy||!current())return;busy=true;button.disabled=true;button.setAttribute('aria-busy','true');if(force){button.textContent='Refreshing…';status.textContent='Checking the latest scores…';}
   void previews(root,threads,current).catch(()=>{if(current())for(const slot of root.querySelectorAll('[data-chat-preview]'))if(slot.dataset.talkState==='loading'){const talk=matchupTalkHtml({error:true});slot.dataset.talkState=talk.state;slot.innerHTML=talk.html;}});
  try{
   const results=await Promise.allSettled([loadWeeklyRosters(model.leagueId,model.week,{maxAgeMs:force?0:60000}),loadPlayers(),model.completed?Promise.resolve(null):loadNflGameDay(model.season,model.week,{force}).then(result=>result.teams)]);
   if(!current())return;
   const rows=results[0].status==='fulfilled'?results[0].value:[],players=results[1].status==='fulfilled'?results[1].value:{},nfl=results[2].status==='fulfilled'?results[2].value:null;
   if(!rows.length)throw Error('Weekly scores unavailable');
   const rosters=new Map(rows.map(row=>[String(row.roster_id),row])),totals={};stopScoreMotion();
   for(const game of model.games){
    const sides=['left','right'].map(side=>matchupTeamView(rosters.get(String(game[side].roster)),players,nfl,{completed:model.completed}));
    for(const [i,side]of ['left','right'].entries()){
     const team=sides[i],score=root.querySelector(`[data-score-${side}="${game.matchup_id}"]`);
     if(team.score!==null){score.querySelector('[data-matchup-score-value]').textContent=team.score.toFixed(2);totals[`${game.matchup_id}:${side}`]=team.score;}
     root.querySelector(`[data-remaining-${side}="${game.matchup_id}"]`).textContent=model.completed?'Final score':team.remaining===null?'Player status unavailable':`${team.remaining} remaining${team.live?` · ${team.live} live`:''}`;
     root.querySelector(`[data-players-${side}="${game.matchup_id}"]`).innerHTML=keyPlayersHtml(team);
    }
    model.chirpScores ||= new Map();
    model.chirpScores.set(String(game.matchup_id),[{...game.left,...sides[0]},{...game.right,...sides[1]}]);
    const chirp=root.querySelector(`[data-matchup-chirp="${game.matchup_id}"]`);
    if(chirp)chirp.innerHTML=matchupChirpHtml(clubhouseChirp(game,model));
    const phase=matchupPhase(sides[0],sides[1],model.completed),badge=root.querySelector(`[data-matchup-phase="${game.matchup_id}"]`);badge.textContent=phase.label;badge.dataset.state=phase.key;
    root.querySelector(`[data-matchup-summary="${game.matchup_id}"]`).textContent=matchupSummary({...game.left,...sides[0]},{...game.right,...sides[1]},{completed:model.completed});
   }
   stopScoreMotion=animateScoreChanges(root,{previous,model:{snapshot:{totals,points:{}},games:[]},motion:readPageChoice('gameday-motion',['on','off'],'on')==='on',feedback:true});previous={totals};
   status.textContent=`Scores checked ${new Date().toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}${!model.completed&&!nfl?' · NFL status unavailable':''}`;

  }catch{if(current()){status.textContent='Refresh unavailable. Showing the last scores; retry when connected.';for(const slot of root.querySelectorAll('[data-players-left],[data-players-right]'))if(slot.textContent.includes('Loading lineup'))slot.innerHTML='<small>KEY STARTERS</small><p>Lineup unavailable. Try refreshing.</p>';for(const slot of root.querySelectorAll('[data-remaining-left],[data-remaining-right]'))if(slot.textContent.includes('Checking'))slot.textContent='Player status unavailable'}}
  finally{busy=false;if(current()){button.disabled=false;button.removeAttribute('aria-busy');button.textContent='Refresh scores';}}
 };
 const tick=()=>{if(!current()){stopped=true;clearTimeout(timer);return}if(document.visibilityState==='visible'&&!root.querySelector('#clubhouse-panel-matchups')?.hidden)void refresh();timer=setTimeout(tick,60000)};
 const click=()=>void refresh(true);button.addEventListener('click',click);stopCurrent=()=>{stopped=true;clearTimeout(timer);stopScoreMotion();button.removeEventListener('click',click)};
 void refresh();if(!model.completed)timer=setTimeout(tick,60000);
 return stopCurrent;
}
