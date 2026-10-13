// Production tab handlers and Home markup, with isolated Clubhouse/Book content.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const out=process.env.DFL_TAB_REVIEW_DIR||fileURLToPath(new URL('../../dfl-tabs-review',import.meta.url));mkdirSync(out,{recursive:true});
const rendered=spawnSync(process.execPath,['tools/render-home-review.mjs'],{env:{...process.env,DFL_REVIEW_DIR:out},encoding:'utf8'});
if(rendered.status!==0)throw Error(rendered.stderr);
let html=readFileSync(`${out}/index.html`,'utf8');
const theme=html.slice(html.indexOf('  const themes ='),html.indexOf('  // Model already loaded reactions'));
const home=html.slice(html.indexOf('function wireHomeWeekHub('),html.indexOf('\n\n  wireHomeRankings(document'));
const book=readFileSync(new URL('../js/pages/sportsbook.js',import.meta.url),'utf8');
const bookHandlers=book.slice(book.indexOf('function wireBookTabs('),book.indexOf('\nlet stopRemembering='));
const club=readFileSync(new URL('../js/weekly-clubhouse-ui.js',import.meta.url),'utf8');
const clubHandler=club.slice(club.indexOf('export function wireClubhouseTabs(')).replace('export ','');
const tabs=(prefix,keys,attribute)=>keys.map((key,index)=>`<button type="button" role="tab" id="${prefix}-tab-${key}" aria-controls="${prefix}-panel-${key}" aria-selected="${index===0}" ${attribute}="${key}">${key}</button>`).join('');
const extras=`<section class="clubhouse-page" id="review-clubhouse"><h1>Clubhouse · isolated fixture</h1><div class="tabs clubhouse-tabs" role="tablist">${tabs('clubhouse',['overview','matchups','recap'],'data-clubhouse-tab')}</div>${['overview','matchups','recap'].map((key,index)=>`<div id="clubhouse-panel-${key}" role="tabpanel" ${index?'hidden':''}><section class="card clubhouse-section"><h2>${key}</h2>${Array.from({length:index===1?8:3},(_,i)=>`<p>DFL matchup ${i+1} · Long team names and league receipts.</p>`).join('')}<label>Local draft<input id="draft-${key}" value="Saved ${key} draft"></label></section></div>`).join('')}</section>
<section id="sportsbook-wrap"><h1>Sportsbook · isolated fixture</h1><div class="sb-product-tabs" role="tablist"><button role="tab" type="button" data-sb-product="book">SIN Sportsbook</button><button role="tab" type="button" data-sb-product="pickem">NFL Pick'em</button></div><div id="sb-book-panel" role="tabpanel"><section class="card review-bankroll"><h2>Available SIN</h2><p>Isolated bankroll fixture</p></section><div class="sb-tabs" role="tablist"><button role="tab" type="button" id="sb-tab-markets" data-sb-tab="markets" aria-controls="sb-markets" aria-selected="true">Matchups & lines</button><button role="tab" type="button" id="sb-tab-tickets" data-sb-tab="tickets" aria-controls="sb-tickets" aria-selected="false">My bets</button></div><div id="sb-markets" role="tabpanel"><section class="card"><h2>Markets fixture</h2>${Array.from({length:6},(_,i)=>`<p>Matchup line ${i+1} · No betting actions connected.</p>`).join('')}</section></div><div id="sb-tickets" role="tabpanel" hidden><section class="card"><h2>Tickets fixture</h2><label>Stake draft<input id="fixture-stake" value="25"></label></section></div></div><div id="sb-pickem-panel" role="tabpanel" hidden><section class="card"><h2>Pick'em fixture</h2><p>Read-only sample. No picks submitted.</p></section></div></section>`;
html=html.replace('</div></main>',`</div>${extras}</main>`).replace('</head>','<link rel="stylesheet" href="css/clubhouse-polish.css"><link rel="stylesheet" href="css/sportsbook.css"></head>');
const script=`import {mountPageMotion,startUiMotion} from './js/ui-motion.js';
${theme}
${home}
${clubHandler}
const bookMemory={};const readBookState=()=>bookMemory;const writeBookState=(_member,next)=>Object.assign(bookMemory,next);
${bookHandlers}
wireHomeWeekHub(document.querySelector('#home-wrap'));wireHomeLeagueFeed(document.querySelector('#home-wrap'));wireClubhouseTabs(document.querySelector('#review-clubhouse'));wireBookTabs(document.querySelector('#sportsbook-wrap'),'fixture');wireProductTabs(document.querySelector('#sportsbook-wrap'),'fixture');
startUiMotion();window.stopTabReview=mountPageMotion(document.querySelector('#view'));window.tabReviewReady=true;`;
html=html.slice(0,html.indexOf('<script type="module">'))+`<script type="module">${script}</script></body></html>`;
writeFileSync(`${out}/index.html`,html);console.log(`Tab review fixture: ${out}/index.html`);
