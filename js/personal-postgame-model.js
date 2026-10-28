import {matchupFinish} from './matchup-finish-model.js';
import {activeHighlightClips} from './home-highlight-model.js';
const known=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const offensive=p=>!p.empty&&['QB','RB','WR','TE'].includes(p.position)&&known(p.points)&&p.name;
const fits=(bench,starter)=>starter.slotType==='FLEX'||['Flex','FLEX'].includes(starter.slot)?['RB','WR','TE'].includes(bench.position):bench.position===starter.position;
export function personalPostgame(model,memberId,{moments=[],clips=[],now=Date.now()}={}){
 if(memberId==null||model?.completed!==true)return null;
 const game=model.games?.find(g=>g.sides.some(s=>String(s.memberId)===String(memberId))),finish=matchupFinish(model,game);if(!finish)return null;
 const mine=game.sides.find(s=>String(s.memberId)===String(memberId)),opponent=game.sides.find(s=>s!==mine);
 const starters=(mine.lineup||[]).filter(offensive),mvp=[...starters].sort((a,b)=>Number(b.points)-Number(a.points)||String(a.id).localeCompare(String(b.id)))[0]||null;
 const regret=(mine.bench||[]).filter(offensive).flatMap(bench=>{
  const starter=starters.filter(p=>fits(bench,p)).sort((a,b)=>Number(a.points)-Number(b.points))[0];
  const gain=starter?Math.round((Number(bench.points)-Number(starter.points))*100)/100:0;
  return gain>0?[{bench,starter,gain}]:[];
 }).sort((a,b)=>b.gain-a.gain||String(a.bench.id).localeCompare(String(b.bench.id)))[0]||null;
 const plays=moments.filter(m=>m.matchupId===String(game.id)&&m.roster===String(mine.roster)&&['touchdown','big-play'].includes(m.kind)&&m.recap?.play&&Number.isFinite(m.at)).sort((a,b)=>b.at-a.at);
 const play=plays[0]||null,video=play?activeHighlightClips(clips,now).find(c=>c.game_id===String(play.recap.play.gameId)&&c.play_id===String(play.recap.play.id)&&c.video_url):null;
 const root=`#/clubhouse?season=${model.season}&week=${model.week}&matchup=${encodeURIComponent(game.id)}`;
 const winner=finish.winner===null?null:game.sides[finish.winner];
 const lead=moments.filter(m=>m.matchupId===String(game.id)&&m.kind==='lead'&&m.recap?.sides?.length===2&&Number.isFinite(m.at)).sort((a,b)=>b.at-a.at)[0];
 const swing=winner&&lead?.roster===String(winner.roster)?lead:null;
 return {mine,opponent,finish,mvp,regret,play,swing,result:finish.winner===null?'Tied it up':winner===mine?'You got the win':'Took the loss',
  href:root+'&tab=matchups',playHref:play?root+(video?'&tab=highlights&clip='+encodeURIComponent(video.id):'&tab=nfl&nflGame='+encodeURIComponent(play.recap.play.gameId))+'&moment='+encodeURIComponent(play.eventKey||''):null,
  video:!!video,roast:finish.roast};
}
