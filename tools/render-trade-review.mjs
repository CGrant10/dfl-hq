// Exercise the production page and event handlers with isolated roster data.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const output=process.env.DFL_TRADE_REVIEW_DIR||'/workspace/dfl-trade-review';mkdirSync(output,{recursive:true});
const source=readFileSync(new URL('../js/pages/trade.js',import.meta.url),'utf8');
const production=source.slice(source.indexOf('const teamName'),source.indexOf('export async function render('));
const imports=`
import {esc,errorBox,toast} from '/js/ui.js';
import {mountTradeDesk,recommendationFor,tradeDeskMarkup,tradeReasons,verdictFor} from '/js/trade-desk.js';
import {tradeConfidence} from '/js/trade-confidence.js';
import {suggestMultiTeamTrades,suggestTrades} from '/js/team-analyzer.js';
import {playerIdentity,playerPortrait} from '/js/player-presentation.js';
import {teamIdentity,teamPortrait} from '/js/team-presentation.js';
import {recommendationOutcomes,tradeModelHealth,tradeModelHealthMarkup} from '/js/trade-model-health.js';
import {readViewMemory,writeViewMemory} from '/js/view-memory.js';
import {tradeDraft,restoreTradeDraft} from '/js/trade-draft.js';
import {tradePerspective,reconcileTradeDestinations} from '/js/trade-routing.js';
import {evaluateTradeDeal,readTradeProposals,writeTradeProposals,savedTradeProposal,restoreTradeProposal,applyTradeDeal} from '/js/trade-workspace.js';
import {proposalsMarkup,tradeDataContext} from '/js/trade-workspace-ui.js';
import {mountTradePlayerPickers,focusTradePicker} from '/js/trade-player-picker.js';
import {tradeReviewFixture} from '/tools/trade-review-fixture.mjs';
const currentMember=()=>({id:'trade-review'}),loadSharedTradeRecommendations=async()=>[],saveTradeRecommendation=async()=>{},tradeAlertViewModel=()=>null;
const shareDeal=async deal=>{window.reviewSharedDeal=deal;return 'review'};
`;
writeFileSync(`${output}/fixture.js`,imports+production+`
window.reviewData=tradeReviewFixture();
window.renderReview=()=>{const view=document.getElementById('view'),result=page(window.reviewData);view.innerHTML=result.markup;result.wire(view);};
window.renderReview();window.reviewReady=true;
`);
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
let head=index.slice(index.indexOf('<head>')+6,index.indexOf('</head>'));
head=head.replace('<link rel="stylesheet" href="css/trade-workspace.css', '<link rel="stylesheet" href="css/team-analyzer.css"><link rel="stylesheet" href="css/trade-workspace.css');
writeFileSync(`${output}/index.html`,`<!doctype html><html lang="en" data-theme="dark"><head><base href="/">${head}</head><body><div class="app"><header class="topbar" style="height:44px"><b>DFL HQ</b></header><main id="view" class="view" data-route="trade" data-pulse-system="1" data-page-system></main><nav class="bottomnav" style="height:54px">Trade review · isolated sample rosters</nav></div><script type="module" src="/trade-review/fixture.js"></script></body></html>`);
console.log(`Trade review rendered to ${output}`);
