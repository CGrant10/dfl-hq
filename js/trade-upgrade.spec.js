import {describe,it,expect} from 'vitest';
import {tradeAssessment} from './trade-assessment.js';
import {buildPlayerPool,evaluateTrade,evaluateMultiTeamTrade,suggestTrades,tradeSuggestionTier} from './team-analyzer.js';
import {verdictFor,recommendationFor} from './trade-desk.js';
import {targetedTradePackages} from './trade-target-search.js';
import {evaluateTradeDeal,findTradeCounteroffers,lineupPreviewsFor} from './trade-workspace.js';
import {tradeWeekSchedule,loadTradeWeekSchedules,tradeWeeklyOutlook} from './trade-weekly-outlook.js';
import {tradeDecisionMarkup} from './trade-decision-ui.js';
import {recordTradeRecommendation,recommendationOutcomes} from './trade-model-health.js';
const player=(id,position,pace,value)=>({id,name:id,position,nflTeam:'ATL',expectedPoints:pace*17,expectedPerGame:pace,tradePerGame:pace,forwardPerGame:pace,tradeValue:value,modelSource:'projection'});
const base=()=>({decisionVersion:2,fairness:99,valueToA:99,valueToB:100,weeklyDeltaA:0,weeklyDeltaB:0,projectionEvidence:{missing:[],fallback:[],stale:[],injuries:['Receiver'],players:[{name:'Receiver',injuryStatus:'Questionable'}],expert:{required:true,status:'Fresh',missing:[],split:[],disagreements:[]}}});
describe('one price verdict, independent roster and risk judgments',()=>{
 it('keeps a balanced questionable estimate consistent between offers and the desk',()=>{
  const r=base();expect(tradeSuggestionTier(r)).toBe('fair');expect(verdictFor(r).headline).toBe('Balanced');expect(tradeAssessment(r)).toMatchObject({needsReview:true,flags:['Injury risk']});expect(recommendationFor(r).action).toBe('REVIEW');
  const markup=tradeDecisionMarkup(r,new Map());expect(markup).toContain('99%');expect(markup).toContain('Injury risk');expect(markup).not.toContain('win probability');
 });
 it('uses one boundary for new price grades without rewriting legacy receipts',()=>{
  const r={...base(),fairness:89,projectionEvidence:{missing:[],injuries:[],stale:[],fallback:[]}};
  expect(verdictFor(r).headline).toBe('Slight edge');expect(tradeSuggestionTier(r)).toBe('aggressive');expect(verdictFor({...r,decisionVersion:undefined}).headline).toBe('Balanced');
 });
 it('does not confuse a balanced price with a useful starting lineup',()=>{
  const r={...base(),weeklyDeltaA:-3,rosterImpactA:-3};expect(verdictFor(r).headline).toBe('Balanced');expect(tradeSuggestionTier(r)).not.toBe('fair');
 });
 it('withholds decisive price winners and Steal when evidence is incomplete',()=>{
  const r={...base(),fairness:40,valueToA:100,valueToB:40};expect(verdictFor(r).who).toBeNull();expect(tradeSuggestionTier(r)).not.toBe('steal');
 });
 it('deducts forced cuts from a potential Steal while preserving asset balance',()=>{
  const r={fairness:60,valueToA:100,valueToB:60,rosterCostA:45,incomingEvidence:{low:90},outgoingEvidence:{high:66},incomingPositionsA:['WR'],weeklyDeltaA:1};
  expect(tradeSuggestionTier({...r,rosterCostA:0})).toBe('steal');expect(tradeSuggestionTier(r)).not.toBe('steal');expect(recommendationFor(r).action).not.toBe('ACCEPT');
 });
});
describe('targeted packages and goals',()=>{
 it('finds a value neighborhood while retaining all five locked pieces in a larger package',()=>{
  const players=Array.from({length:24},(_,i)=>player(String(i),'WR',15,100-i*3)),pool=new Map(players.map(p=>[p.id,p]));
  const required=players.slice(18,23).map(p=>p.id),target=required.reduce((n,id)=>n+pool.get(id).tradeValue,0)+pool.get('11').tradeValue;
  const rows=targetedTradePackages(players,6,required,pool,[target],20);expect(rows.length).toBeLessThanOrEqual(20);expect(rows.some(ids=>ids.includes('11'))).toBe(true);
  for(const ids of rows){expect(ids).toHaveLength(6);expect(ids).toEqual(expect.arrayContaining(required));expect(new Set(ids).size).toBe(6);}
 });
 it('does not invent a package when the required size is impossible',()=>{
  expect(targetedTradePackages([player('a','WR',10,20)],2,[],new Map(),[40])).toEqual([]);
 });
 it('searches the requested position rather than simply renaming other offers',()=>{
  const pool=new Map([player('a','TE',10,40),player('b','TE',11,40),player('wr','WR',10,40)].map(p=>[p.id,p]));
  const teams=[{id:'a',playerIds:['a']},{id:'b',playerIds:['b','wr']}];
  const offers=suggestTrades({teams,pool,teamId:'a',partnerId:'b',goal:'TE',shapes:['1-1'],intent:'fair'});
  expect(offers.length).toBeGreaterThan(0);expect(offers.every(o=>o.sendB.includes('b'))).toBe(true);
 });
 it('returns genuine positive lineup upgrades for the starter goal',()=>{
  const pool=new Map([player('a','WR',10,40),player('b','WR',11,40),player('c','WR',9,40)].map(p=>[p.id,p]));
  const teams=[{id:'a',playerIds:['a']},{id:'b',playerIds:['b','c']}];
  const offers=suggestTrades({teams,pool,teamId:'a',partnerId:'b',goal:'starter',shapes:['1-1'],intent:'aggressive'});
  expect(offers.length).toBeGreaterThan(0);expect(offers.every(o=>o.weeklyDeltaA>0)).toBe(true);
 });
});
describe('roster slots and available replacement',()=>{
 it('fills only newly open roster spots using genuinely unrostered options',()=>{
  const waiver={...player('free','TE',8,0),waiverCandidate:true},pool=new Map([player('a1','WR',10,30),player('a2','RB',9,20),player('b','WR',11,50)].map(p=>[p.id,{...p,waiverOptions:[waiver]}]));
  const parties=[{id:'a',playerIds:['a1','a2']},{id:'b',playerIds:['b']}],deal=evaluateTradeDeal(parties,[['a1','a2'],['b']],pool);
  expect(deal.result.waiverAddsA).toEqual(['free']);expect(deal.result.requiredDropsB).toHaveLength(1);expect(deal.result.valueToA).toBe(50);
  const preview=lineupPreviewsFor(deal,pool)[0];expect(preview.waiverAdds[0].name).toBe('free');expect(preview.afterPoints-preview.beforePoints).toBeCloseTo(deal.result.weeklyDeltaA,1);
 });
 it('reports an unfilled slot instead of assuming an available free agent',()=>{
  const pool=new Map([player('a1','WR',10,30),player('a2','RB',9,20),player('b','WR',11,50)].map(p=>[p.id,p]));
  const r=evaluateTrade({teamA:{playerIds:['a1','a2']},teamB:{playerIds:['b']},sendA:['a1','a2'],sendB:['b'],pool});expect(r.waiverAddsA).toEqual([]);expect(r.openSlotsA).toBe(1);
 });
 it('does not treat owned reserve or taxi players as free waiver replacements',()=>{
  const pool=buildPlayerPool({rosters:[{players:['a'],reserve:['reserve'],taxi:['taxi']}],players:Object.fromEntries(['a','reserve','taxi','free'].map(id=>[id,{n:id,p:'WR',t:'ATL'}])),projections:['a','reserve','taxi','free'].map(id=>({player_id:id,stats:{rec:170}})),scoringSettings:{rec:1}});
  expect(pool.get('a').waiverOptions.map(p=>p.id)).toEqual(['free']);
 });
 it('excludes retired, unattached and zero-forecast players from waiver options',()=>{
  const ids=['a','active','retired','unattached','zero'],pool=buildPlayerPool({rosters:[{players:['a']}],players:Object.fromEntries(ids.map(id=>[id,{n:id,p:'WR',t:id==='unattached'?'FA':'ATL',s:id==='retired'?'Inactive':'Active'}])),projections:ids.map(id=>({player_id:id,stats:{rec:id==='zero'?0:170}})),scoringSettings:{rec:1}});
  expect(pool.get('a').waiverOptions.map(p=>p.id)).toEqual(['active']);
 });
 it('does not promise the same waiver replacement to two members of one routed trade',()=>{
  const waiver={...player('free','TE',8,0),waiverCandidate:true},pool=new Map(['a1','a2','b1','b2','c'].map(id=>[id,{...player(id,'WR',10,30),waiverOptions:[waiver]}]));
  const teams=[{id:'a',playerIds:['a1','a2']},{id:'b',playerIds:['b1','b2']},{id:'c',playerIds:['c']}],sends=[['a1','a2'],['b1','b2'],['c']],destinations={a1:'b',a2:'c',b1:'c',b2:'c',c:'a'};
  const r=evaluateMultiTeamTrade({teams,sends,destinations,pool});expect(r.waiverAdds.flat()).toEqual(['free']);expect(r.openSlots).toEqual([0,1,0]);
  const previews=lineupPreviewsFor({parties:teams,sends,receives:r.receives},pool);previews.forEach((p,i)=>expect(p.afterPoints-p.beforePoints).toBeCloseTo(r.weeklyDeltas[i],1));
 });
 it('reduces the influence of a thin expert consensus and excludes stale ranks',()=>{
  const args={rosters:[{players:['x']}],players:{x:{n:'X',p:'WR',t:'ATL'}},projections:[{player_id:'x',stats:{rec:170}}],scoringSettings:{rec:1}};
  const rankings={usable:true,status:'Fresh',players:[{name:'X',position:'WR',team:'ATL',rank:1,positionRank:1,minRank:1,maxRank:1,stdDev:0}]};
  const thin=buildPlayerPool({...args,expertRankings:{...rankings,experts:2}}).get('x'),broad=buildPlayerPool({...args,expertRankings:{...rankings,experts:8}}).get('x');
  expect(thin.expertWeight).toBeLessThan(broad.expertWeight);expect(buildPlayerPool({...args,expertRankings:{...rankings,usable:false,status:'Stale'}}).get('x').expertWeight).toBe(0);
 });
 it('uses sustained receiving opportunity changes modestly and ignores missing usage',()=>{
  const args={rosters:[{players:['x']}],players:{x:{n:'X',p:'WR',t:'ATL'}},projections:[{player_id:'x',stats:{rec:170}}],currentStats:{x:{gp:6,rec:60,rec_tgt:42}},currentWeek:7,scoringSettings:{rec:1}};
  const recentStats=Array.from({length:3},(_,i)=>[{player_id:'x',week:i+4,stats:{gp:1,rec:10,rec_tgt:10}}]);
  const role=buildPlayerPool({...args,recentStats}).get('x'),plain=buildPlayerPool({...args,recentStats:recentStats.map(rows=>rows.map(r=>({...r,stats:{gp:1,rec:10}})))}).get('x');
  expect(role.usageFactor).toBe(1.05);expect(role.forwardPerGame).toBeCloseTo(plain.forwardPerGame*1.05);expect(plain.usageFactor).toBe(1);
  const short=buildPlayerPool({...args,currentStats:{x:{gp:3,rec:30,rec_tgt:30}},recentStats}).get('x');expect(short.usageFactor).toBe(1);
 });
 it('explores two edits while preserving the locked main pieces and legal ownership',()=>{
  const pool=new Map([player('a','WR',12,80),player('a-depth','TE',8,10),player('b','WR',12,50),player('b-depth1','TE',8,15),player('b-depth2','RB',8,15)].map(p=>[p.id,p]));
  const parties=[{id:'a',playerIds:['a','a-depth']},{id:'b',playerIds:['b','b-depth1','b-depth2']}],deal=evaluateTradeDeal(parties,[['a'],['b']],pool),rows=findTradeCounteroffers(deal,pool);
  expect(rows.some(c=>c.changes.length===2)).toBe(true);
  for(const c of rows){expect(c.sends[0]).toContain('a');expect(c.sends[1]).toContain('b');expect(c.result).toEqual(evaluateTradeDeal(parties,c.sends,pool,c.destinations).result);}
 });
});
describe('future weeks use schedule facts',()=>{
 const event=(a,b)=>({competitions:[{competitors:[{team:{abbreviation:a}},{team:{abbreviation:b}}]}]});
 const payload={season:{year:2026,type:2},week:{number:7},events:Array.from({length:8},(_,i)=>event(`A${i}`,`B${i}`))};
 it('rejects a different week and an incomplete schedule rather than inventing byes',()=>{
  expect(tradeWeekSchedule(payload,2026,6)).toBeNull();expect(tradeWeekSchedule({...payload,events:[event('ATL','KC')]},2026,7)).toBeNull();expect(tradeWeekSchedule(payload,2026,7).get('A0').opponent).toBe('B0');
 });
 it('keeps failed weeks explicitly unavailable and bounds late-season requests',async()=>{
  const calls=[],rows=await loadTradeWeekSchedules(2026,15,async(s,w)=>{calls.push(w);throw Error('offline');});expect(calls).toEqual([16,17]);expect(rows.every(r=>r.schedule===null)).toBe(true);
 });
 it('accounts for a bye through the legal lineup without crediting earned points',()=>{
  const pool=new Map([['a',{...player('a','WR',10,40),nflTeam:'ATL'}],['b',{...player('b','WR',15,40),nflTeam:'KC'}]]),deal=evaluateTradeDeal([{id:'a',playerIds:['a']},{id:'b',playerIds:['b']}],[['a'],['b']],pool);
  const rows=tradeWeeklyOutlook(deal,pool,[{week:7,schedule:new Map([['ATL',{opponent:'TB',available:true}]])}]);expect(rows[0].teams[0].delta).toBe(-10);expect(rows[0].teams[0].incoming[0].opponent).toBe('Bye');expect(rows[0].teams[1].delta).toBe(10);
 });
});
describe('equal-window starting-lineup accountability',()=>{
 const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
 it('does not count raw package totals from legacy snapshots as lineup accuracy',()=>{
  const pool=new Map([['a',{currentPoints:10,currentGames:1}],['b',{currentPoints:10,currentGames:1}]]),st=storage();recordTradeRecommendation({season:2026,week:5,teamId:'a',partnerId:'b',sendA:['a'],sendB:['b'],weeklyDelta:1},pool,st);pool.get('b').currentPoints=50;expect(recommendationOutcomes(pool,st)).toEqual({tracked:1,graded:0,hitRate:null});
 });
 it('does not let extra unused WR points turn a losing starter upgrade into a win',()=>{
  const history=points=>[{season:2026,week:7,points}],pool=new Map([player('a','WR',10,50),player('b1','WR',10,25),player('b2','WR',10,25),player('keep1','WR',20,70),player('keep2','WR',20,70)].map(p=>[p.id,{...p,scoreHistory:history(p.id==='a'?18:p.id.startsWith('keep')?25:10)}])),st=storage();
  recordTradeRecommendation({season:2026,week:6,teamId:'a',partnerId:'b',sendA:['a'],sendB:['b1','b2'],weeklyDelta:2,lineupAudit:{version:2,before:['a','keep1','keep2'],after:['b1','b2','keep1','keep2'],positions:Object.fromEntries([...pool].map(([id,p])=>[id,p.position]))}},pool,st);
  expect(recommendationOutcomes(pool,st)).toEqual({tracked:1,graded:1,hitRate:0});
 });
});
