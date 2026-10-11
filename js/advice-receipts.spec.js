import {describe,it,expect} from 'vitest';
import {buildAdviceReceipts,gradeAdviceReceipt,adviceReceiptSummary} from './advice-receipts.js';
import {rosterLineupScore} from './waiver-coach.js';
import {DFL_SLOTS,slotEligible} from './lineup-alert-model.js';
const now=Date.parse('2026-10-11T16:00:00Z');
const p=(id,position,points,extra={})=>({id,name:id,team:'CHI',position,points,hasGame:true,isOut:false,...extra});
const starters=DFL_SLOTS.map((s,i)=>p(`s${i}`,s==='FLEX'?'WR':s,10));
function fixture(){
 const pool=new Map([...starters,p('bench','WR',14),p('drop','WR',3),p('pickup','RB',20)].map(p=>[p.id,{...p}]));
 const rosters=Array.from({length:12},(_,i)=>({roster_id:i+1,players:i?[]:starters.map(p=>p.id).concat('bench','drop'),starters:i?[]:starters.map(p=>p.id)}));
 return {league:{league_id:'dfl',season:'2026',total_rosters:12,roster_positions:[...DFL_SLOTS,'BN','BN'],scoring_settings:{rec:1,rec_yd:.1},settings:{waiver_type:1}},
  rosters,rosterId:1,season:2026,week:5,now,weekly:[{week:5,pool}],schedule:new Map([['CHI',{key:'upcoming',kickoff:'2026-10-11T17:00:00Z'}]]),values:new Map([['drop',{tradeValue:8,positionRank:90}]])};
}
const scores=(row,added=22,removed=8)=>[...row.added_players.map(p=>({player_id:p.id,stats:{rec:added}})),...row.removed_players.map(p=>({player_id:p.id,stats:{rec:removed}}))];
describe('pregame advice receipts',()=>{
 it('records a legal start/sit call and a waiver lineup upgrade with frozen projections',()=>{
  const input=fixture(),rows=buildAdviceReceipts(input);
  expect(rows.map(r=>r.kind)).toEqual(['lineup','waiver']);
  expect(rows[0]).toMatchObject({projected_gain:4,added_players:[{id:'bench',projected:14}],scoring_settings:{rec:1},captured_at:new Date(now).toISOString()});
  expect(rows[1]).toMatchObject({projected_gain:10,drop_id:'drop',added_players:[{id:'pickup'}]});
  expect(rows[1].removed_players.map(p=>p.id)).not.toContain('drop');
  input.weekly[0].pool.get('bench').points=99;
  expect(rows[0].added_players[0].projected).toBe(14);
 });
 it('withholds calls when either changed player is locked, unknown or has a missing projection',()=>{
  for(const change of [input=>input.schedule.clear(),input=>input.schedule.get('CHI').key='live',input=>input.now=Date.parse('2026-10-11T17:00:00Z')]){
   const input=fixture();change(input);expect(buildAdviceReceipts(input)).toEqual([]);
  }
  const input=fixture();input.weekly[0].pool.get('bench').points=null;
  expect(buildAdviceReceipts(input).some(r=>r.kind==='lineup')).toBe(false);
 });
 it('never records an illegal or reserve/taxi start/sit swap',()=>{
  const input=fixture();input.rosters[0].reserve=['bench'];
  expect(buildAdviceReceipts(input).some(r=>r.kind==='lineup')).toBe(false);
  const broken=fixture();broken.rosters[0].starters[0]='s1';
  expect(buildAdviceReceipts(broken).some(r=>r.kind==='lineup')).toBe(false);
 });
 it('excludes rostered free agents and protected drop assets',()=>{
  const owned=fixture();owned.rosters[1].taxi=['pickup'];
  expect(buildAdviceReceipts(owned).some(r=>r.kind==='waiver')).toBe(false);
  const protectedInput=fixture();protectedInput.values.get('drop').tradeValue=90;
  expect(buildAdviceReceipts(protectedInput).some(r=>r.kind==='waiver')).toBe(false);
 });
 it('returns reconstructed legal slots, keeping a kicked-off starter fixed',()=>{
  const pool=fixture().weekly[0].pool;
  const result=rosterLineupScore([...pool.keys()],pool,{includeLineup:true,locked:[{id:'s1',slotIndex:1}]});
  expect(result.slots[1]).toBe('s1');expect(new Set(result.slots).size).toBe(9);
  expect(result.slots.every((id,i)=>slotEligible(pool.get(id),DFL_SLOTS[i]))).toBe(true);
  expect(result.slots.reduce((n,id)=>n+pool.get(id).points,0)).toBe(result.total);
 });
 it('waits for finals, grades using the frozen league scoring, and includes misses',()=>{
  const [row]=buildAdviceReceipts(fixture());
  expect(gradeAdviceReceipt(row,{stats:scores(row),completed:false}).actualGain).toBeNull();
  expect(gradeAdviceReceipt(row,{stats:scores(row),completed:true,teamName:'Current name'})).toMatchObject({grade:'hit',actualGain:14,teamName:'Current name'});
  expect(gradeAdviceReceipt(row,{stats:scores(row,2,20),completed:true})).toMatchObject({grade:'miss',actualGain:-18,copy:'DFL HQ talked shit and got this one wrong.'});
  const custom={...row,scoring_settings:{rec:2}};
  expect(gradeAdviceReceipt(custom,{stats:scores(row),completed:true}).actualGain).toBe(28);
 });
 it('does not fabricate zero for missing, empty or malformed final stats',()=>{
  const [row]=buildAdviceReceipts(fixture());
  for(const stats of [[],[{player_id:row.added_players[0].id,stats:{}}],[{player_id:row.added_players[0].id}],[{player_id:row.added_players[0].id,stats:{rec:'bad'}}]])expect(gradeAdviceReceipt(row,{completed:true,stats}).actualGain).toBeNull();
 });
 it('counts a verified bye as zero and accepts a real published zero or negative score',()=>{
  const [row]=buildAdviceReceipts(fixture());
  const bye={...row,removed_players:row.removed_players.map(p=>({...p,noGame:true}))};
  expect(gradeAdviceReceipt(bye,{stats:scores(row,0,4),completed:true})).toMatchObject({grade:'push',actualGain:0});
  expect(gradeAdviceReceipt(row,{stats:scores(row,-1,2),completed:true})).toMatchObject({grade:'miss',actualGain:-3});
 });
 it('keeps near-ties as pushes and refreshes the result after stat corrections',()=>{
  const [row]=buildAdviceReceipts(fixture());
  expect(gradeAdviceReceipt(row,{stats:scores(row,10,10.5),completed:true}).grade).toBe('push');
  expect(gradeAdviceReceipt(row,{stats:scores(row,10,10.6),completed:true}).grade).toBe('miss');
  expect(gradeAdviceReceipt(row,{stats:scores(row,11,10.4),completed:true}).grade).toBe('hit');
 });
 it('rejects backdated/invalid receipt evidence and does not add pending calls to the record',()=>{
  const [row]=buildAdviceReceipts(fixture());
  expect(gradeAdviceReceipt({...row,captured_at:row.locks_at},{completed:true,stats:scores(row)}).grade).toBe('ungraded');
  expect(adviceReceiptSummary([{grade:'hit'},{grade:'miss'},{grade:'push'},{grade:'pending'},{grade:'ungraded'}])).toEqual({hits:1,misses:1,pushes:1,pending:1,ungraded:1});
 });
});
