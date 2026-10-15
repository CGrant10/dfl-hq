import {describe,it,expect,vi} from 'vitest';
vi.mock('./supabase.js',()=>({db:vi.fn(),edge:vi.fn(),privilegedFunctionHeaders:vi.fn()}));
import {buildTradeAlertSnapshot,classifyCompletedTrade,effectiveTradeReceipt,TRADE_ALERT_MODEL_VERSION,scheduledTradeNotification} from './trade-receipt-model.js';
import {tradeAlertViewModel,tradeOutcomeSummary} from './trade-alerts.js';
import {evaluateMultiTeamTrade} from './team-analyzer.js';
import {completedTradeMarkup} from './trade-receipt-ui.js';
const player=(id,value)=>[id,{id,name:id,position:'WR',nflTeam:'DET',tradeValue:value,expectedPoints:value*3,modelSource:'projection'}];
const pool=new Map([player('a1',90),player('a2',30),player('b',60),player('c',20)]);
const teams=[{id:'1',team_name:'Alpha',playerIds:['a1','a2']},{id:'2',team_name:'Bravo',playerIds:['b']},{id:'12',team_name:'Charlie',playerIds:['c']}];
const transaction={transaction_id:'big-sleeper-id',type:'trade',status:'complete',roster_ids:[1,2,12],drops:{a1:1,a2:1,b:2,c:12},adds:{a1:2,a2:12,b:1,c:1},draft_picks:[],waiver_budget:[],created:Date.parse('2026-10-15T00:00:00Z')};
const build=(over={})=>buildTradeAlertSnapshot({transaction,season:2026,week:6,rosterState:new Map(teams.map(t=>[t.id,new Set(t.playerIds)])),teams,pool,...over});
describe('Sleeper routed receipts',()=>{
 it('grades the actual three-team routing, including split sends and combined incoming packages',()=>{
  const alert=build(),expected=evaluateMultiTeamTrade({teams,sends:[['a1','a2'],['b'],['c']],destinations:{a1:'2',a2:'12',b:'1',c:'1'},pool});
  expect(alert.analysis_status).toBe('graded');expect(alert.result).toEqual(expected);
  expect(alert.packages[0].receives.map(p=>[p.id,p.from_roster_id])).toEqual([['b',2],['c',12]]);
  expect(alert.packages[0].sends.map(p=>[p.id,p.to_roster_id])).toEqual([['a1',2],['a2',12]]);
  const view=tradeAlertViewModel(alert);expect(view.receivedPackages.map(p=>p.players.map(p=>p.id))).toEqual([['b','c'],['a1'],['a2']]);
  expect(view.lineupDeltas).toHaveLength(3);expect(view.lineupDeltas.every(p=>Number.isFinite(p.weekly))).toBe(true);
  expect(view.teamValues.reduce((n,t)=>n+t.net,0)).toBeCloseTo(0);expect(view.teamValues.map(t=>t.received)).toEqual(expected.values);
 });
 it('uses all teams when identifying the largest supported gain instead of treating team B as the counterparty',()=>{
  const alert=build();expect(alert.verdict).toMatchObject({group:true,winner_roster_id:2,winner_team_name:'Bravo'});
  expect(tradeOutcomeSummary(alert)).toMatchObject({grade:'Value edge',winner:'Bravo'});
  expect(scheduledTradeNotification(alert).body).toContain('Bravo: largest value gain');
 });
 it('does not depend on the order of Sleeper roster IDs',()=>{
  const a=tradeAlertViewModel(build()),b=tradeAlertViewModel(build({transaction:{...transaction,roster_ids:[12,1,2]}}));
  const totals=v=>Object.fromEntries(v.teamValues.map(t=>[t.rosterId,[t.sent,t.received,t.net]]));
  expect(totals(b)).toEqual(totals(a));expect(b.winner).toBe(a.winner);
 });
 it.each([{adds:{...transaction.adds,c:99}},{drops:{a1:1,a2:1,b:2}},{roster_ids:[1,1,2]}])('withholds a verdict on invalid ownership maps (%j)',over=>{
  const alert=build({transaction:{...transaction,...over}});expect(alert.analysis_status).toBe('review');expect(alert.result).toBeNull();expect(alert.verdict).toBeNull();
 });
 it('keeps picks and FAAB outside the complete grade while still pricing the routed players',()=>{
  const alert=build({transaction:{...transaction,draft_picks:[{season:2027,round:1}],waiver_budget:[{sender:1,receiver:2,amount:10}]}});
  expect(alert.analysis_status).toBe('partial');expect(alert.result.values).toHaveLength(3);expect(alert.verdict).toBeNull();
  expect(tradeAlertViewModel(alert)).toMatchObject({balanceLabel:'Player balance',winner:null,caution:{label:'Player-only estimate'}});
 });
 it('reads an appended review without mutating the original frozen receipt or notification linkage',()=>{
  const original={id:18,sleeper_transaction_id:transaction.transaction_id,analysis_status:'review',result:null,model_version:'dflyzer-trade-v7-price-fit-risk',notification_message_id:75,breaking_active:false};
  const alert={...original,routing_review:{...build(),reviewed_at:'2026-10-15T01:00:00Z'}};
  expect(effectiveTradeReceipt(alert)).toMatchObject({id:18,analysis_status:'graded',model_version:TRADE_ALERT_MODEL_VERSION,notification_message_id:75,breaking_active:false,reviewedAt:'2026-10-15T01:00:00Z'});
  expect(alert.result).toBeNull();expect(tradeAlertViewModel(alert).receivedPackages).toHaveLength(3);
 });
 it('ignores a review belonging to another transaction',()=>{
  const alert={...build(),routing_review:{...build(),sleeper_transaction_id:'other'}};expect(effectiveTradeReceipt(alert)).toBe(alert);
 });
 it('renders every routed team, its received players, value changes and an exact focus target',()=>{
  const html=completedTradeMarkup([build()],transaction.transaction_id,{standalone:true});
  expect(html).toContain('data-route-focus');expect(html.match(/data-receipt-team=/g)).toHaveLength(3);expect(html.match(/Net value/g)).toHaveLength(3);
  expect(html).toContain('From Bravo');expect(html).toContain('To Charlie');expect(html).toContain('Lowest team balance');expect(html).not.toContain('Trade Board');
  expect(html.match(/data-balance-team=/g)).toHaveLength(3);
 });
 it('shows each team’s own ratio, with the group score matching its least balanced exchange',()=>{
  const view=tradeAlertViewModel(build());
  expect(view.teamValues.map(t=>t.balance)).toEqual([67,67,67]);
  const alert=build();alert.result={...alert.result,values:[70,96,90],outgoingValues:[75,111,70],partyBalances:[93,86,78],fairness:78};
  const actual=tradeAlertViewModel(alert);expect(actual.teamValues.map(t=>[t.sent,t.received,t.net,t.balance])).toEqual([[75,70,-5,93],[111,96,-15,86],[70,90,20,78]]);
  expect(Math.min(...actual.teamValues.map(t=>t.balance))).toBe(actual.fairness);
 });
 it('names the uncertainty in the public grade without inventing a winner',()=>{
  const alert=build();alert.result.projectionEvidence={...alert.result.projectionEvidence,injuries:['a1']};
  const view=tradeAlertViewModel(alert);expect(view.outcome).toMatchObject({grade:'Review',displayGrade:'Injury flags',winner:null});
  const html=completedTradeMarkup([alert],alert.sleeper_transaction_id);expect(html).not.toContain('Review needed');expect(html).toContain('Injury flags');
 });
});
