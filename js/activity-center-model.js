import {highlightThumbnail,highlightVideoUrl} from './home-highlight-model.js';
import {footballMomentLabel} from './football-moments.js';
const numeric=v=>v!==null&&v!==''&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
export function activityTarget(value){
 const raw=String(value||'');
 if(raw!==raw.trim()||/[\u0000-\u001f\u007f]/.test(raw))return '#/home';
 if(!/^#\/[a-z][a-z0-9-]*(?:\?[^\s<>"'`\\]*)?$/i.test(raw))return '#/home';
 return raw;
}
export function activityRoute(row){const href=activityTarget(row.target_url),[path,query]=href.split('?');return{href,path,params:new URLSearchParams(query||'')}}
export function activityKind(row){return row.category==='trades'?'trades':row.category==='matchup_moments'?'plays':row.category==='sportsbook'?'book':'league'}
export const ACTIVITY_FILTERS=[['all','All'],['unread','Unread'],['trades','Trades'],['plays','Big plays'],['book','The Book'],['league','League']];
export function filterActivity(rows,filter='all'){return rows.filter(r=>filter==='all'||filter==='unread'&&!r.is_read||activityKind(r)===filter)}
export function pendingActivityClips(rows,context={},now=Date.now()){
 return rows.some(row=>{
  const route=activityRoute(row),age=now-Date.parse(row.created_at);
  return activityKind(row)==='plays'&&route.path==='#/clubhouse'&&/^nfl:\d{1,24}:\d{1,24}:[1-9]\d*$/.test(route.params.get('moment')||'')&&age>=0&&age<20*60000&&activityCard(row,{...context,now}).preview?.type!=='clip';
 });
}

/** Extra context is optional. A notification never invents a result or a missing clip. */
export function activityCard(row,{trades=[],clips=[],games=[],moments=[],bets=[],memberId=null,accountMemberId=null,now=Date.now()}={}){
 const route=activityRoute(row),kind=activityKind(row),card={...row,href:route.href,kind,action:kind==='trades'?'Open receipt':kind==='plays'?'View matchup':kind==='book'?'Open the Book':'Open update',preview:null};
 if(kind==='trades'&&route.path==='#/trade'){
  const tx=route.params.get('tx'),saved=trades.find(t=>String(t.sleeper_transaction_id)===tx);
  const receipt=saved?.routing_review?.result&&saved.routing_review.packages?saved.routing_review:saved;
  if(receipt&&Array.isArray(receipt.packages)&&receipt.packages.length>=2){
   const packages=receipt.packages.filter(Boolean).map(pkg=>({name:(receipt.teams||[]).find(t=>String(t.roster_id)===String(pkg.roster_id))?.team_name||`Team ${pkg.roster_id}`,players:(Array.isArray(pkg.sends)?pkg.sends:[]).filter(Boolean).map(p=>({id:p.id||p.player_id,name:p.name||'Player',position:p.position,nflTeam:p.nflTeam||p.nfl_team}))}));
   const balance=numeric(receipt.result?.fairness);
   card.preview={type:'trade',packages,balance:balance!==null&&balance>=0&&balance<=100?Math.round(balance):null};
   card.title=row.title||'Trade completed';
  }
 }
 if(kind==='plays'&&route.path==='#/clubhouse'){
  const clipId=route.params.get('clip'),game=route.params.get('nflGame'),moment=route.params.get('moment')?.match(/^nfl:(\d+):(\d+):([1-9]\d*)$/);
  const scopeValid=!moment||(!game||game===moment[1]);
  const clip=scopeValid?clips.filter(c=>/^\d{1,24}$/.test(String(c.id))&&String(c.game_id)===(moment?.[1]||game)&&(moment?String(c.play_id)===moment[2]:String(c.id)===clipId)&&Date.parse(c.expires_at)>now&&highlightVideoUrl(c.video_url)).sort((a,b)=>(String(a.id)===clipId?-1:0)-(String(b.id)===clipId?-1:0)||Date.parse(a.published_at)-Date.parse(b.published_at))[0]:null;
  const saved=scopeValid?moments.find(m=>m.event_key===route.params.get('moment')&&String(m.season)===route.params.get('season')&&String(m.week)===route.params.get('week')&&String(m.matchup_id)===route.params.get('matchup')&&String(m.roster_id)===moment?.[3]):null;
  const play=scopeValid?games.find(g=>String(g.game_id)===(game||moment?.[1]))?.plays?.find(p=>String(p.id)===moment?.[2]):null;
  const players=(saved?.data?.players||play?.players||[]).filter(p=>p.id&&p.name).slice(0,2);
  const detail=saved?.data?.play||play;
  if(detail){const passing=players.length&&players.every(p=>p.role==='passer'),action=passing?'pass':players.some(p=>p.role==='receiver')?'reception':players.some(p=>p.role==='rusher')?'run':'play';card.summary=[players.length&&players.every(p=>p.bench)?'Bench':players.some(p=>p.bench)?'Starter + bench':'',Number.isFinite(detail.yards)?`${detail.yards}-yard ${action}`:'',detail.period?detail.period>4?'OT':`Q${detail.period}`:'',detail.clock].filter(Boolean).join(' · ')}
  if(saved&&players.length&&['touchdown','big-play'].includes(detail?.kind))card.title=players.map(p=>p.name).join(' + ')+' · '+footballMomentLabel(detail,players);
  const poster=clip?highlightThumbnail(clip.thumbnail_url):null;
  card.preview=clip?{type:'clip',poster,headline:clip.headline,game:clip.game_label,players}:players.length?{type:'play',players}:null;
  card.action=clip?'Watch clip':moment?'View play':'View matchup';
  if(clip&&(String(clip.id)!==clipId||route.params.get('tab')!=='highlights'||game!==String(clip.game_id))){route.params.set('tab','highlights');route.params.set('nflGame',String(clip.game_id));route.params.set('clip',String(clip.id));card.href=route.path+'?'+route.params}
  else if(clipId&&!clip){route.params.delete('clip');route.params.set('tab','matchups');card.href=route.path+'?'+route.params}
  card.body=String(card.body||'').replace(/^▶\s*Video available\s*·\s*/i,'');
 }
 if(kind==='book'&&route.path==='#/sportsbook'){
  const id=route.params.get('ticket'),bet=String(memberId)===String(accountMemberId)&&memberId!=null?bets.find(b=>String(b.id)===id):null;
  if(id){card.href='#/sportsbook?product=book&ticket='+encodeURIComponent(id);card.action='View ticket'}
  else if(/ticket|my bets/i.test(row.title+' '+row.body)){card.href='#/sportsbook?product=book&view=tickets';card.action='View my bets'}
  if(bet&&['won','lost','void'].includes(bet.status))card.preview={type:'ticket',id:bet.id,status:bet.status,stake:numeric(bet.stake),payout:numeric(bet.payout),picks:Array.isArray(bet.legs)?bet.legs.length:null};
 }
 return card;
}
