import {describe,it,expect} from 'vitest';
import {teamQuarterbackContext,currentInjurySetback,workloadChange} from './player-value-context.js';
import {injuryAvailabilityIndex} from './player-availability.js';
import {buildPlayerPool,analyzeLeague,evaluateTrade,suggestTrades} from './team-analyzer.js';
import {tradeAssessment} from './trade-assessment.js';
import {playerSensitivity} from './trade-player-evidence.js';
import {uncompensatedContextRisk,tradeSuggestionQuality} from './trade-suggestion-quality.js';
import captured from '../tools/fixtures/player-context-2026-11-18.json';

const now=Date.parse('2026-11-18T12:00:00Z'),season=2026;
const players={q:{n:'Starter QB',p:'QB',t:'NE'},b:{n:'Backup QB',p:'QB',t:'NE'},w:{n:'Receiver',p:'WR',t:'NE'},r:{n:'Riser',p:'RB',t:'DEN'}};
const report=(name='Starter QB',pos='QB',over={})=>({status:'Doubtful',date:'2026-11-16T17:16:00Z',athlete:{displayName:name,position:{abbreviation:pos},team:{abbreviation:'NE'}},...over});
const index=(reports)=>injuryAvailabilityIndex({injuries:[{injuries:reports}]},{season,now});
const game=(id,week,attempts,over={})=>({player_id:id,season,season_type:'regular',week,team:'NE',date:`2026-11-${String(1+(week-8)*7).padStart(2,'0')}`,stats:{gp:1,pass_att:attempts,pass_yd:attempts*7},...over});
const weeks=[[game('q',8,20)],[game('q',9,38)],[game('q',10,4),game('b',10,24)]];
const qb=(reports=[report()],over={})=>teamQuarterbackContext({players,weeks,injuryIndex:index(reports),season,now,...over});

describe('current NFL quarterback environment',()=>{
 it('finds the established passer and flags his receivers without diagnosing a feared fracture',()=>{
  const context=qb([report('Starter QB','QB',{shortComment:'Team fears a fractured ankle; diagnosis is not confirmed.'})]).get('NE');
  expect(context).toMatchObject({quarterbackId:'q',quarterbackName:'Starter QB',status:'Doubtful',factor:.92,source:'ESPN'});
  expect(JSON.stringify(context)).not.toMatch(/fracture|season.ending/i);
 });
 it.each(['Questionable','Active','Healthy'])('does not downgrade a receiving corps for a %s passer',status=>expect(qb([report('Starter QB','QB',{status})]).size).toBe(0));
 it('ignores a backup injury, ambiguous starts, one-game samples, old and future news',()=>{
  expect(qb([report('Backup QB')]).size).toBe(0);
  expect(qb([report()],{weeks:weeks.slice(-1)}).size).toBe(0);
  expect(qb([report('Starter QB','QB',{date:'2026-10-01'})]).size).toBe(0);
  expect(qb([report('Starter QB','QB',{date:'2026-12-01'})]).size).toBe(0);
 });
 it('does not transfer an injury across a team change or from last season',()=>{
  expect(qb([report()],{players:{...players,q:{...players.q,t:'PHI'}}}).size).toBe(0);
  expect(qb([report()],{weeks:weeks.map(w=>w.map(r=>({...r,season:2025})))}).size).toBe(0);
  expect(qb([report('Starter QB','QB',{athlete:{displayName:'Starter QB',position:{abbreviation:'QB'},team:{abbreviation:'PHI'}}})]).size).toBe(0);
 });
 it('stops after two replacement-led games, a healthy clearance, or a later full starter workload',()=>{
  expect(qb([report()],{weeks:[...weeks,[game('b',11,30,{date:'2026-11-17'})]]}).size).toBe(0);
  expect(qb([report(),report('Starter QB','QB',{status:'Active',date:'2026-11-17'})]).size).toBe(0);
  expect(qb([report()],{weeks:[...weeks,[game('q',11,30,{date:'2026-11-17'})]]}).size).toBe(0);
 });
});

describe('sustained workload and fresh injury setbacks',()=>{
 const usage={position:'RB',currentGames:5,recentUsage:8,priorUsage:3.25,carryWeight:.35,depthOrder:1,usageRows:[{targets:2,carries:9},{targets:5,carries:11},{targets:4,carries:17}]};
 it('rebases a verified lead back after three games of increased opportunity',()=>expect(workloadChange(usage)).toBe('expanded'));
 it('does not treat a one-game boom, stale/unverified depth or missing usage as a new RB role',()=>{
  expect(workloadChange({...usage,recentUsage:8,usageRows:[{targets:2,carries:3},{targets:2,carries:3},{targets:12,carries:30}]})).toBeNull();
  expect(workloadChange({...usage,depthOrder:undefined})).toBeNull();
  expect(workloadChange({...usage,usageRows:usage.usageRows.slice(1)})).toBeNull();
  expect(workloadChange({...usage,usageRows:[...usage.usageRows.slice(1),{targets:null,carries:20}]})).toBeNull();
 });
 it('recognizes a sustained loss of targets separately from a single scoreless week',()=>{
  expect(workloadChange({position:'WR',currentGames:8,recentUsage:4,priorUsage:9,usageRows:[{targets:3},{targets:4},{targets:5}]})).toBe('reduced');
 });
 const setback=(over={})=>currentInjurySetback({name:'Receiver',nflTeam:'NE',position:'WR'},{injuryIndex:index([report('Receiver','WR',{status:'Questionable',shortComment:'He returned from a two-game absence and sustained a new hamstring injury.',...over})]),now});
 it('records a new setback after an absence without inventing a medical timeline',()=>{
  expect(setback()).toMatchObject({label:'Injury setback',source:'ESPN'});expect(setback()).not.toHaveProperty('missedGames');
 });
 it.each(['He returned after an absence but avoided a new hamstring injury.','He returned after an absence and could have a new hamstring injury.','He returned after an absence; the hamstring injury was last year.'])('rejects speculative, cleared or historical setbacks: %s',shortComment=>expect(setback({shortComment})).toBeNull());
 it('clears healed or old setbacks',()=>{expect(setback({status:'Active'})).toBeNull();expect(setback({date:'2026-10-01'})).toBeNull()});
});

describe('context-aware trade values and recommendations',()=>{
 const input=()=>({players,rosters:[{roster_id:1,players:['r']},{roster_id:2,players:['w','q','b']}],season,currentWeek:11,now,
  scoringSettings:{rec:1,rec_yd:.1,rush_yd:.1,pass_yd:.04},
  currentStats:{r:{gp:5,rec:10,rec_tgt:14,rush_att:47,rush_yd:529},w:{gp:4,rec:12,rec_yd:118,rec_tgt:24}},
  projections:[{player_id:'r',stats:{rec:10,rush_yd:539}},{player_id:'w',stats:{rec:60,rec_yd:1070}},{player_id:'q',stats:{pass_yd:4000}}],
  recentStats:[{points:8.9,rec:2,tgt:2,att:9},{points:20.4,rec:4,tgt:5,att:11},{points:18.8,rec:4,tgt:4,att:17}].map((x,i)=>[{player_id:'r',stats:{gp:1,rec:x.rec,rec_yd:(x.points-x.rec)*10,rec_tgt:x.tgt,rush_att:x.att}},{player_id:'w',stats:{gp:1,rec:3,rec_yd:30,rec_tgt:6}}]),
  seasonWeeklyStats:weeks,backfieldRoles:{usable:true,status:'Fresh',players:{r:{team:'DEN',order:1}}},
  injuryReport:{injuries:[{injuries:[report(),report('Receiver','WR',{status:'Questionable',shortComment:'He returned from a two-game absence and sustained a new hamstring injury.'})]}]}});
 it('raises an established rising RB over his obsolete role projection, without a second usage bonus',()=>{
  const args=input(),plain=buildPlayerPool({...args,backfieldRoles:null}).get('r'),riser=buildPlayerPool(args).get('r');
  expect(riser.valueContext.roleChange).toBe('expanded');expect(riser.usageFactor).toBe(1);
  expect(riser.forwardPerGame).toBeGreaterThan(plain.forwardPerGame+2);expect(riser.forwardPerGame).toBeLessThan(riser.recentAverage);
 });
 it('prices a setback and new QB absence into future output, never points already earned',()=>{
  const args=input(),healthy=buildPlayerPool({...args,injuryReport:null}).get('w'),pool=buildPlayerPool(args),receiver=pool.get('w');
  expect(receiver.contextRisks).toEqual(['Injury setback','QB change']);expect(receiver.quarterbackFactor).toBe(.92);
  expect(receiver.currentPoints).toBe(healthy.currentPoints);expect(receiver.tradePerGame).toBeLessThan(healthy.tradePerGame);
  expect(pool.get('r').quarterbackFactor).toBe(1);expect(pool.get('q').quarterbackFactor).toBe(1);
  expect(playerSensitivity(receiver)).toBeGreaterThan(playerSensitivity({...receiver,contextRisks:[]}));
 });
 it('never raises a productive player’s forecast just because he suffered a setback',()=>{
  const args=input();args.currentStats.w={gp:5,rec:150};args.projections[1].stats={rec:100};args.recentStats=args.recentStats.map(rows=>rows.map(row=>row.player_id==='w'?{...row,stats:{gp:1,rec:30}}:row));
  args.injuryReport.injuries[0].injuries=args.injuryReport.injuries[0].injuries.filter(r=>r.athlete.position.abbreviation==='WR');
  const healthy=buildPlayerPool({...args,injuryReport:null}).get('w'),injured=buildPlayerPool(args).get('w');expect(injured.forwardPerGame).toBeLessThanOrEqual(healthy.forwardPerGame);
 });
 it('carries compact context into a manual trade assessment, including QB risk on a healthy WR',()=>{
  const args=input();args.injuryReport.injuries[0].injuries=[report()];const pool=buildPlayerPool(args),teams=analyzeLeague({...args,pool});
  const result=evaluateTrade({teamA:teams.find(t=>t.id==='1'),teamB:teams.find(t=>t.id==='2'),sendA:['r'],sendB:['w'],pool});
  expect(result.projectionEvidence.contextRisks).toEqual(['Receiver: QB change']);
  expect(tradeAssessment(result).flags).toContain('QB change');expect(tradeAssessment(result).tier).not.toBe('steal');
 });
 it('puts a riskier lateral swap below actual help and removes it from a default league search',()=>{
  const args=input(),pool=buildPlayerPool(args),teams=analyzeLeague({...args,pool});
  const result=evaluateTrade({teamA:teams.find(t=>t.id==='1'),teamB:teams.find(t=>t.id==='2'),sendA:['r'],sendB:['w'],pool});
  const flat={...result,weeklyDeltaA:0};expect(uncompensatedContextRisk(flat)).toBe(true);expect(tradeSuggestionQuality(flat).group).toBe(0);
  expect(uncompensatedContextRisk({...flat,weeklyDeltaA:2})).toBe(false);
  const offers=suggestTrades({teams,teamId:'1',pool,goal:'best',maxPlayers:2,limit:20});expect(offers.every(o=>!uncompensatedContextRisk(o))).toBe(true);
 });
 it('regresses the reported Coleman/Brown situation using captured public NFL facts',()=>{
  const {weeks,...facts}=captured;
  const args={...facts,season,currentWeek:11,now,rosters:Array.from({length:12},(_,i)=>({roster_id:i+1,players:i===0?['13345']:i===1?['5859','11564','11292']:[]})),
   scoringSettings:{rec:1,rec_yd:.1,rush_yd:.1,rush_td:6,rec_td:6,pass_yd:.04,pass_td:4,pass_int:-2,fum_lost:-2},recentStats:weeks,seasonWeeklyStats:weeks,
   backfieldRoles:{usable:true,status:'Fresh',players:{13345:{team:'DEN',order:1}}}};
  const pool=buildPlayerPool(args),coleman=pool.get('13345'),brown=pool.get('5859');
  expect(coleman.valueContext.roleChange).toBe('expanded');expect(coleman.forwardPerGame).toBeGreaterThan(13);
  expect(brown.contextRisks).toEqual(['Injury setback','QB change']);expect(brown.valueContext.quarterback.quarterbackName).toBe('Drake Maye');expect(brown.forwardPerGame).toBeLessThan(7);
  expect(coleman.tradeValue).toBeGreaterThan(brown.tradeValue);
  const teams=analyzeLeague({...args,pool}),result=evaluateTrade({teamA:teams.find(t=>t.id==='1'),teamB:teams.find(t=>t.id==='2'),sendA:['13345'],sendB:['5859'],pool});
  expect(tradeAssessment(result).tier).not.toBe('steal');expect(tradeAssessment(result).flags).toEqual(expect.arrayContaining(['Injury setback','QB change']));
 });
});
