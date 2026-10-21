// Real player-card and bet-slip controllers, isolated from league writes.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const out=process.env.DFL_SHEET_REVIEW_DIR||fileURLToPath(new URL('../../dfl-sheets-review',import.meta.url));mkdirSync(out,{recursive:true});
const source=readFileSync(new URL('../js/pages/sportsbook.js',import.meta.url),'utf8');
const start=source.indexOf('function openSlip('),end=source.indexOf('\n}\n',start)+3;
if(start<0||end<=start)throw Error('Bet slip controller not found');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const head=index.slice(index.indexOf('<head>')+6,index.indexOf('</head>')).replace('</title>','</title><link rel="stylesheet" href="css/sportsbook.css">');
const fixture=`import {mountSheetDrag,enterSheet,exitSheet} from './js/sheet-drag.js';
import {animateUi,cancelUiMotion,cancelUiExit,exitUi,startUiMotion} from './js/ui-motion.js';
import {fitDialogToViewport} from './js/dialog-viewport.js';
import {esc} from './js/ui.js';
import {patchGameDay} from './js/game-day-dom.js';
import {parseStake,entryReturn,combineOdds} from './js/sportsbook-slip.js';
import {openPlayerCard} from './js/player-card.js';
import {saveMode} from './js/theme.js';
import {savePageChoice} from './js/page-disclosure.js';
let slip=['1','2'],slipStake=null,slipStakeMember=null,stopSlipDrag=null;
window.memberId='sheet-fixture';const currentMember=()=>({id:window.memberId});
const fmtOdds=n=>n>0?'+'+n:String(n),num=n=>Number(n||0).toLocaleString();
const toast=()=>{},needsMigration=()=>false,isOpen=()=>true;
window.rpcCalls=0;const db=()=>{window.rpcCalls++;throw Error('Review cannot place bets')};
const MAX_PICKS=6;
const outcomes=new Map([['1',{id:1,market_id:1,label:'Ja’Marr Chase over 89.5 receiving yards',odds_american:-110}],['2',{id:2,market_id:2,label:'Joe Burrow over 1.5 passing touchdowns',odds_american:120}]]);
const markets=new Map([['1',{title:'Bengals receiving',status:'open'}],['2',{title:'Bengals passing',status:'open'}]]);
${source.slice(start,end)}
${source.slice(source.indexOf('function slipBar('),source.indexOf('\n}\n',source.indexOf('function slipBar('))+3)}
${source.slice(source.indexOf('function wireSlipAndPicks('),source.indexOf('\n}\n',source.indexOf('function wireSlipAndPicks('))+3)}
window.showReviewBoard=()=>{
 for(let i=3;i<=6;i++){outcomes.set(String(i),{id:i,market_id:i,label:'Long player name '+i+' over 89.5 receiving yards',odds_american:120});markets.set(String(i),{title:'Player props '+i,status:'open'})}
 slip=[];document.querySelector('#view').dataset.pageSystem='';
 document.querySelector('#view').innerHTML='<div id="sportsbook-wrap"><h1>The Book</h1><section class="sb-market"><h2>Player props</h2>'+[...outcomes.values()].map(o=>'<button type="button" class="sb-outcome" data-bet-outcome="'+o.id+'"><span class="sb-team-mark">DFL</span><span class="sb-outcome-label">'+o.label+'</span><span class="sb-price">+120</span></button>').join('')+'</section><div style="height:1200px"></div><p id="board-last">Last market</p></div><nav id="fixture-nav" style="position:fixed;bottom:0;left:0;width:100%;height:60px;background:var(--bg-2)">DFL · Sportsbook</nav>';
 wireSlipAndPicks(document.querySelector('#view'),outcomes,markets,{balance:500});
};
startUiMotion();saveMode('medicine');
window.reviewTheme=mode=>saveMode(mode);
window.reviewMotion=value=>{savePageChoice('gameday-motion',value);dispatchEvent(new Event('dfl:route-performance'))};
window.openReviewSlip=()=>openSlip(document.querySelector('#view'),outcomes,markets,{balance:500},()=>window.refreshes=(window.refreshes||0)+1);
window.openReviewPlayer=()=>openPlayerCard({id:'7564',name:'Ja’Marr Chase'},{context:{id:'7564',name:'Ja’Marr Chase',season:2026,week:6,points:29,state:'final'},source:document.querySelector('[data-review-player]')});
window.reviewReady=true;`;
writeFileSync(`${out}/index.html`,`<!doctype html><html lang="en"><head><base href="http://127.0.0.1:8765/">${head}</head><body><main id="view" class="view" data-route="sportsbook" style="padding:16px"><button class="btn" data-review-player><span class="dfl-player-portrait"><img src="https://sleepercdn.com/content/nfl/players/7564.jpg" alt=""></span>Ja’Marr Chase</button><button class="btn" data-slip-open>Review bet</button><p>Isolated sheet review. No league writes.</p></main><script type="module">${fixture}</script></body></html>`);
console.log('Sheet review fixture: '+out+'/index.html');
