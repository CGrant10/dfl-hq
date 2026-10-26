// Production result controller, ticket renderer and canvas, isolated from league writes.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root=new URL('../',import.meta.url),out=process.env.DFL_BOOK_RESULTS_DIR||'/workspace/dfl-book-results-review';mkdirSync(out,{recursive:true});
const source=readFileSync(new URL('js/pages/sportsbook.js',root),'utf8');
const helperStart=source.indexOf('function entryLegs('),helperEnd=source.indexOf('\n/*',source.indexOf('function ticketCard(',helperStart));
const outcomeStart=source.indexOf('function outcomeButtons('),outcomeEnd=source.indexOf('\nfunction houseControls',outcomeStart);
const controllerStart=source.indexOf('  let fantasyTask=null'),controllerEnd=source.indexOf('  if(view.isConnected)stopLive=mountSportsbookLive',controllerStart);
if([helperStart,helperEnd,outcomeStart,outcomeEnd,controllerStart,controllerEnd].some(n=>n<0))throw Error('Production result source missing');
const index=readFileSync(new URL('index.html',root),'utf8'),head=index.slice(index.indexOf('<head>')+6,index.indexOf('</head>'));
const code=`
import {fantasyMarketKey,fantasyOutcomeResult,withFantasyLegResult,bookLegResult,bookEntryResult,pendingBookReturn} from '/js/sportsbook-fantasy-results.js';
import {ticketData,ticketCanvas} from '/js/sportsbook-ticket.js';
import {ticketShareSpec} from '/js/share-export-model.js';
import {shareImageDescription} from '/js/share-layout-model.js';
import {editorialShareCanvas} from '/js/share-editorial.js';
import {shareSealReady} from '/js/share.js';
import {mountSportsbookLive} from '/js/sportsbook-live.js';
import {esc} from '/js/ui.js';
import {teamPortrait} from '/js/team-presentation.js';
import {pinMode} from '/js/theme.js';
const fmtOdds=n=>Number(n)>0?'+'+n:String(n),num=n=>Number(n||0).toLocaleString(),isOpen=m=>m?.status==='open'&&(!m.closes_at||Date.parse(m.closes_at)>Date.now()),isGolf=()=>false,isBookCategory=()=>true,ACTIVE_BOOK_CATEGORIES=new Set(['Fantasy','Player Props','Team Totals','Game Totals']);
const identityKey=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
window.reviewPlayers={};window.reviewRows=[];window.mondayFinal=false;window.feedFails=false;window.resultReads=0;
const markets=[],outcomes=[];
for(let game=1;game<=7;game++){
 markets.push({id:game,auto_key:'matchup:2026:7:'+game,category:'Fantasy',status:'locked',closes_at:'2026-10-22T00:20:00Z',title:'Team '+game+'A vs Team '+game+'B'});
 for(let side=0;side<2;side++){
  const roster=game*2+side,starters=Array.from({length:9},(_,i)=>'p'+roster+'-'+i);
  for(const id of starters)reviewPlayers[id]={n:id,p:'WR',t:game===2?'DAL':'BUF'};
  reviewRows.push({roster_id:roster,matchup_id:game,points:side===0&&game!==7?120.5:100,starters});
  outcomes.push({id:game*2+side,market_id:game,sleeper_roster_id:roster,label:'Team '+game+(side?'B':'A'),odds_american:120});
 }
}
const marketMap=new Map(markets.map(m=>[String(m.id),m])),outcomeMap=new Map(outcomes.map(o=>[String(o.id),o]));
const leg=(game,side=0)=>({market_id:game,outcome_id:game*2+side,label:'Team '+game+(side?'B':'A'),market:marketMap.get(String(game)).title,odds_american:120,status:'open',market_status:'locked',category:'Fantasy'});
const entry=(id,legs)=>({id,status:'open',stake:50,potential_payout:legs.length===1?110:350,odds_american:legs.length===1?120:600,legs});
const bets=[entry(1,[leg(1)]),entry(2,[leg(1,1)]),entry(3,[leg(1),leg(2)]),entry(4,[leg(7)]),entry(5,[1,2,3,4,5,6].map(g=>leg(g,g===6?1:0)))],wallet={balance:420},ledger=[];
window.reviewDb={from:table=>{const q={select:()=>q,in:()=>q,eq:()=>q,order:()=>q,range:()=>q,limit:()=>q,abortSignal:()=>q,then:resolve=>resolve({data:table==='sleeper_leagues'?[{season:2026,sleeper_league_id:'fixture'}]:table==='sportsbook_markets'?markets:table==='sportsbook_outcomes'?outcomes:[],error:null})};return q},rpc:async name=>{if(name!=='sportsbook_my_live_account')throw Error('Unexpected write RPC '+name);return{data:{member_id:1,balance:420,bets,ledger},error:null}}};
const db=()=>reviewDb,view=document.querySelector('#view'),active=()=>view.isConnected;
${source.slice(helperStart,helperEnd)}
${source.slice(outcomeStart,outcomeEnd)}
view.innerHTML='<div id="sportsbook-wrap"><header class="page-head"><h1>Sportsbook</h1><strong data-review-wallet>420 SIN</strong></header><section data-review-board>'+markets.slice(0,2).map(m=>'<article class="card sb-market"><header><h2 class="card-heading">'+m.title+'</h2><span class="sb-market-state">LOCKED</span></header>'+outcomeButtons(m,outcomes.filter(o=>o.market_id===m.id),new Set(),new Set())+'</article>').join('')+'</section><section id="sb-tickets"><h2>My bets</h2><div data-review-tickets></div></section></div>';
const updateAccount=()=>{view.querySelector('[data-review-tickets]').innerHTML=bets.map(b=>ticketCard(b,marketMap,outcomeMap)).join('')};updateAccount();
${source.slice(controllerStart,controllerEnd).replace("import('../sportsbook-fantasy-data.js')","import('/js/sportsbook-fantasy-data.js')")}
window.reviewStop=mountSportsbookLive(view,{client:db(),memberId:1,outcomeMap,active,onUpdate:()=>{},onError:e=>{window.reviewRefreshError=e.stack},onRefresh:force=>refreshFantasy({force}),interval:30000});
window.reviewRefresh=()=>refreshFantasy({force:true});window.reviewTheme=pinMode;
window.reviewShare=async(id,style='clean')=>{await shareSealReady;const t=ticketData({bet:bets.find(b=>b.id===id),legs:entryLegs(bets.find(b=>b.id===id),marketMap,outcomeMap),member:{display_name:'DFL Member'},season:2026}),spec=ticketShareSpec(t);return {data:editorialShareCanvas(spec,{style}).toDataURL('image/png'),text:shareImageDescription(spec),ticket:t}};
window.reviewReady=true;
`;
writeFileSync(out+'/fixture.js',code);
writeFileSync(out+'/index.html',`<!doctype html><html lang="en"><head><base href="/">${head}<link rel="stylesheet" href="css/sportsbook.css"></head><body><main id="view" class="view" data-route="sportsbook" data-page-system style="padding:16px;max-width:600px;margin:auto"></main><script type="module" src="/results-review/fixture.js"></script></body></html>`);
console.log('Sportsbook result fixture rendered');
