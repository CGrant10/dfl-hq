import {db} from './supabase.js';
import {loadPlayers} from './sleeper.js';
import {loadWeeklyRosters} from './weekly-clubhouse-data.js';
import {nflWeekStatuses,matchupTeamView,matchupPhase} from './clubhouse-matchup-model.js';
import {keyPlayersHtml} from './clubhouse-matchup-cards.js';
import {esc} from './ui.js';
let stopCurrent=null;
async function schedule(season,week){
 const response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${Number(season)}&seasontype=2&week=${Number(week)}`,{signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('NFL status unavailable');return nflWeekStatuses(await response.json(),season,week);
}
async function previews(root,threads,active){
 const ids=[...threads.values()];if(!ids.length)return;
 const counts=await db().from('member_wall_reply_counts').select('post_id,reply_count').in('post_id',ids);
 await Promise.all([...threads].map(async([matchup,post])=>{
  const {data,error}=await db().from('member_wall_replies').select('id,body,created_at,members(display_name)').eq('post_id',post).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1);
  if(!active())return;const slot=root.querySelector(`[data-chat-preview="${matchup}"]`);if(!slot)return;
  const row=data?.[0],count=counts.data?.find(r=>String(r.post_id)===String(post))?.reply_count;
  slot.innerHTML=`<small>MATCHUP TALK${count!=null?` · ${Number(count)} ${Number(count)===1?'REPLY':'REPLIES'}`:''}</small>${error?'<p>Preview unavailable. Open the conversation to catch up.</p>':row?`<p><strong>${esc(row.members?.display_name||'Member')}</strong> ${esc(String(row.body).slice(0,160))}${String(row.body).length>160?'…':''}</p>`:'<p>No replies yet. Set the tone.</p>'}`;
 }));
}
export function mountMatchupLive(root,model,threads,active){
 stopCurrent?.();let stopped=false,busy=false,timer;const current=()=>!stopped&&active();
 const status=root.querySelector('[data-matchup-freshness]'),button=root.querySelector('[data-matchup-refresh]');
 const refresh=async(force=false)=>{
  if(busy||!current())return;busy=true;button.disabled=true;
   void previews(root,threads,current).catch(()=>{if(current())for(const slot of root.querySelectorAll('[data-chat-preview]'))if(slot.textContent.includes('Loading conversation'))slot.innerHTML='<small>MATCHUP TALK</small><p>Preview unavailable. Open the conversation to catch up.</p>'});
  try{
   const results=await Promise.allSettled([loadWeeklyRosters(model.leagueId,model.week,{maxAgeMs:force?0:60000}),loadPlayers(),model.completed?Promise.resolve(null):schedule(model.season,model.week)]);
   if(!current())return;
   const rows=results[0].status==='fulfilled'?results[0].value:[],players=results[1].status==='fulfilled'?results[1].value:{},nfl=results[2].status==='fulfilled'?results[2].value:null;
   if(!rows.length)throw Error('Weekly scores unavailable');
   const rosters=new Map(rows.map(row=>[String(row.roster_id),row]));
   for(const game of model.games){
    const sides=['left','right'].map(side=>matchupTeamView(rosters.get(String(game[side].roster)),players,nfl,{completed:model.completed}));
    for(const [i,side]of ['left','right'].entries()){
     const team=sides[i],score=root.querySelector(`[data-score-${side}="${game.matchup_id}"]`);
     if(team.score!==null)score.textContent=team.score.toFixed(2);
     root.querySelector(`[data-remaining-${side}="${game.matchup_id}"]`).textContent=model.completed?'Final score':team.remaining===null?'Player status unavailable':`${team.remaining} remaining${team.live?` · ${team.live} live`:''}`;
     root.querySelector(`[data-players-${side}="${game.matchup_id}"]`).innerHTML=keyPlayersHtml(team);
    }
    const phase=matchupPhase(sides[0],sides[1],model.completed),badge=root.querySelector(`[data-matchup-phase="${game.matchup_id}"]`);badge.textContent=phase.label;badge.dataset.state=phase.key;
   }
   status.textContent=`Scores checked ${new Date().toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}${!model.completed&&!nfl?' · NFL status unavailable':''}`;

  }catch{if(current()){status.textContent='Refresh unavailable. Showing the last scores; retry when connected.';for(const slot of root.querySelectorAll('[data-players-left],[data-players-right]'))if(slot.textContent.includes('Loading lineup'))slot.innerHTML='<small>KEY STARTERS</small><p>Lineup unavailable. Try refreshing.</p>';for(const slot of root.querySelectorAll('[data-remaining-left],[data-remaining-right]'))if(slot.textContent.includes('Checking'))slot.textContent='Player status unavailable'}}
  finally{busy=false;if(current())button.disabled=false}
 };
 const tick=()=>{if(!current()){stopped=true;clearTimeout(timer);return}if(document.visibilityState==='visible'&&!root.querySelector('#clubhouse-panel-matchups')?.hidden)void refresh();timer=setTimeout(tick,60000)};
 button.addEventListener('click',()=>void refresh(true));stopCurrent=()=>{stopped=true;clearTimeout(timer)};
 void refresh();if(!model.completed)timer=setTimeout(tick,60000);
}
