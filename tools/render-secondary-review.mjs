import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const output=process.env.DFL_SECONDARY_REVIEW_DIR||'/workspace/dfl-secondary-review';mkdirSync(output,{recursive:true});
const history=readFileSync(new URL('../js/pages/history.js',import.meta.url),'utf8');
const fame=history.slice(history.indexOf('function nameCell('),history.indexOf('const ORDER ='));
const icons=history.slice(history.indexOf('const ICON ='),history.indexOf('let tab ='));
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
let head=index.slice(index.indexOf('<head>')+6,index.indexOf('</head>'));
head+=`<link rel="stylesheet" href="/css/team-analyzer.css"><link rel="stylesheet" href="/css/secondary-page-polish.css">`;
const script=`
import {esc,groupBy} from '/js/ui.js';
import {teamPortrait} from '/js/team-presentation.js';
import {editableName} from '/js/name-pick.js';
import {wireDflPage} from '/js/pages/profile-dfl.js';
import {render as renderAnalyzer} from '/js/pages/analyzer.js';
import {secondarySeasonNavMarkup} from '/js/season-nav.js';
const visible=(type,rows)=>rows,canEdit=()=>window.reviewAdmin||false,addControl=()=>'',sortRows=rows=>rows,entry=()=>'';
const member={id:'one',display_name:'League Owner',team_name:'A Very Long Current Team Name & Co',championships:3,joined_year:2017};
const data={members:[member],manual:[],leagues:[{season:2025,champion_user_id:'one',runner_up_user_id:'two',champion_locked:true},{season:2024,champion_user_id:'deleted',champion_roster_id:4},{season:2023,champion_user_id:'one',runner_up_roster_id:8}]};
const namer=()=>uid=>({label:uid==='one'?member.team_name:uid==='two'?'The Other Very Long Team Name':'Unknown roster',sub:uid==='one'?member.display_name:'',memberId:uid==='one'?'one':null});
${icons}
${fame}
const view=document.querySelector('#view');
window.showHistory=(admin=false)=>{window.reviewAdmin=admin;view.dataset.route='history';view.innerHTML='<header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1></header>'+fameView(data)};
window.showAnalyzer=async()=>{view.dataset.route='analyzer';await renderAnalyzer(view)};
window.showProfile=(photo=null)=>{view.dataset.route='profile';view.innerHTML='<div data-dfl-host></div>';wireDflPage(view,{...member,profile_image:photo},true,()=>{}, {currentTeam:member.team_name,currentSeason:2026,actions:''})};
window.showMore=()=>{document.querySelector('#more').classList.remove('hidden');document.querySelector('#more .quicknav').innerHTML=secondarySeasonNavMarkup()};
window.showHistory();window.reviewReady=true;
`;
writeFileSync(`${output}/fixture.js`,script);
writeFileSync(`${output}/index.html`,`<!doctype html><html lang="en"><head><base href="/">${head}</head><body><div class="app"><header class="topbar" style="height:44px">DFL HQ</header><main id="view" class="view" data-page-system data-pulse-system="1"></main><nav class="bottomnav" style="height:54px">Isolated UI review</nav></div><div id="more" class="sheet hidden" role="dialog" aria-modal="true" aria-label="More"><div class="sheet-card"><div class="sheet-head"><strong>Everything else</strong><button id="more-close" class="btn ghost small" onclick="document.querySelector('#more').classList.add('hidden')">Close</button></div><nav class="quicknav"></nav></div></div><div id="toast" class="toast hidden"></div><script type="module" src="/secondary-review/fixture.js"></script></body></html>`);
console.log('Secondary-page fixture rendered');
