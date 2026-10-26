import {describe,it,expect} from 'vitest';
import {fantasyMatchupResults,fantasyOutcomeResult,withFantasyLegResult,bookLegResult,bookEntryResult,pendingBookReturn} from './sportsbook-fantasy-results.js';
import {ticketData,ticketText} from './sportsbook-ticket.js';
import {shareLayoutView,shareImageDescription} from './share-layout-model.js';
import {ticketShareSpec} from './share-export-model.js';
const fixture=()=>{
 const now=Date.now(),market={id:1,auto_key:'matchup:2026:7:2',status:'locked'},players=Object.fromEntries(Array.from({length:18},(_,i)=>[String(i+1),{n:'Player '+i,p:i%9===8?'DEF':i%9===7?'K':'WR',t:'BUF'}]));
 const rows=[{roster_id:1,matchup_id:2,points:120.5,starters:Array.from({length:9},(_,i)=>String(i+1)),players:['bench']},{roster_id:2,matchup_id:2,points:100,starters:Array.from({length:9},(_,i)=>String(i+10))}];
 players.bench={n:'Monday bench',t:'DAL',p:'QB'};
 return {market,markets:[market],rows,players,schedule:new Map([['BUF',{key:'final'}],['DAL',{key:'upcoming'}]]),season:2026,week:7,checkedAt:now,now};
};
describe('live fantasy Sportsbook results',()=>{
 it('marks a Sunday finish even with unrelated Monday games and benched Monday players',()=>{
  const f=fixture(),result=fantasyMatchupResults(f).get('1');expect(result).toMatchObject({final:true,winner:'1',scores:{1:120.5,2:100}});
  f.market._fantasyResult=result;
  expect(fantasyOutcomeResult(f.market,{sleeper_roster_id:1,label:'Renamed team'})).toMatchObject({status:'won',score:120.5});
  expect(fantasyOutcomeResult(f.market,{sleeper_roster_id:2})).toMatchObject({status:'lost',score:100});
  expect(fantasyOutcomeResult(f.market,{sleeper_roster_id:3})).toBeNull();
 });
 it.each(['upcoming','live','unknown'])('keeps a %s starter open, including an inactive Monday player',state=>{
  const f=fixture();f.players['18']={p:'WR',t:'DAL',i:'Out'};f.schedule.set('DAL',{key:state});expect(fantasyMatchupResults(f).get('1').final).toBe(false);
  f.market._fantasyResult=fantasyMatchupResults(f).get('1');expect(fantasyOutcomeResult(f.market,{sleeper_roster_id:1})).toBeNull();
 });
 it('handles real zero scores, empty starter slots and ties without claiming a loss',()=>{
  const f=fixture();f.rows[0].points=f.rows[1].points=0;f.rows[0].starters[8]='0';f.market._fantasyResult=fantasyMatchupResults(f).get('1');expect(fantasyOutcomeResult(f.market,{sleeper_roster_id:1}).status).toBe('void');
  f.rows[0].starters=Array(9).fill('0');expect(fantasyMatchupResults(f).get('1').final).toBe(false);
 });
 it('rejects missing, truncated, mismatched and stale evidence',()=>{
  for(const change of [f=>f.rows[0].starters.pop(),f=>f.rows.pop(),f=>f.rows[1].roster_id=1,f=>f.rows[0].points=null,f=>f.rows[0].points=NaN,f=>f.week=8,f=>f.checkedAt-=90001,f=>f.checkedAt+=1,f=>f.schedule=null]){const f=fixture();change(f);expect(fantasyMatchupResults(f).size).toBe(0);}
  const f=fixture();delete f.players['18'];expect(fantasyMatchupResults(f).get('1').final).toBe(false);
 });
 it('uses stable roster identities and never mutates a bet or overrides official settlement',()=>{
  const f=fixture();f.market._fantasyResult=fantasyMatchupResults(f).get('1');const leg={outcome_id:7,status:'open',label:'A'},outcome={sleeper_roster_id:1};
  const marked=withFantasyLegResult(leg,f.market,outcome);expect(leg).toEqual({outcome_id:7,status:'open',label:'A'});expect(marked.status).toBe('open');expect(bookLegResult(marked)).toEqual({status:'won',pending:true});
  expect(bookLegResult({...marked,status:'lost'})).toEqual({status:'lost',pending:false});
  expect(bookLegResult(marked,f.now+90001)).toEqual({status:'open',pending:false});
  expect(withFantasyLegResult(marked,{},outcome).live_result).toBeUndefined();
 });
 it('retains official board results when provisional evidence expires or fails',()=>{
  const f=fixture();f.market.status='settled';
  expect(fantasyOutcomeResult(f.market,{is_winner:true})).toMatchObject({status:'won',official:true});
  expect(fantasyOutcomeResult(f.market,{is_winner:false})).toMatchObject({status:'lost',official:true});
  expect(bookLegResult(withFantasyLegResult({status:'open'},f.market,{is_winner:true}))).toEqual({status:'won',pending:false});
  expect(bookLegResult(withFantasyLegResult({status:'open'},f.market,{is_winner:true}),f.now+3600000)).toEqual({status:'won',pending:false});
  f.market.status='void';expect(fantasyOutcomeResult(f.market,{})).toMatchObject({status:'void',official:true});
 });
 it('shows mixed parlays per pick while keeping the payout and wallet states official',()=>{
  const f=fixture();f.market._fantasyResult=fantasyMatchupResults(f).get('1');
  const winner=withFantasyLegResult({status:'open',label:'A',market:'A vs B',odds_american:120},f.market,{sleeper_roster_id:1});
  const loser=withFantasyLegResult({status:'open',label:'B'},f.market,{sleeper_roster_id:2});
  expect(bookEntryResult([winner,{status:'open'}])).toBe('open');expect(bookEntryResult([winner,loser])).toBe('lost');expect(bookEntryResult([winner,{status:'void'}])).toBe('void');
  const bet={status:'open',stake:50,potential_payout:110,odds_american:120},t=ticketData({bet,legs:[winner]});
  expect(t).toMatchObject({status:'open',liveResult:'won',gradingPending:true,stake:50,ret:110,picks:[{status:'won',pending:true}]});
  expect(shareLayoutView(ticketShareSpec(t))).toMatchObject({status:'Hit',returnLabel:'To return',returnValue:110});
  expect(ticketText(t)).toContain('grading pending');expect(shareImageDescription(ticketShareSpec(t))).toContain('official grading and payout pending');expect(bet.status).toBe('open');
  const miss=ticketData({bet,legs:[winner,loser]});expect(shareLayoutView(ticketShareSpec(miss))).toMatchObject({status:'Missed',returnLabel:'Est. return',returnValue:0});expect(ticketText(miss)).not.toContain('to return 110');expect(pendingBookReturn(bet,[winner,{status:'void'}])).toEqual({label:'Pending refund',value:50});
 });
});
