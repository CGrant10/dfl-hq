import { describe, it, expect } from 'vitest';
import { playerCardView, resolvePlayerId } from './player-card-model.js';
import { rivalryStory, rivalryShareFact, rivalryLedgerFact } from './rivalry-story-model.js';
import { tradeDraft, restoreTradeDraft } from './trade-draft.js';
import { readViewMemory, writeViewMemory } from './view-memory.js';
import { canWarmRoutes } from './performance-policy.js';
const storage = () => { const map = new Map(); return { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) }; };
describe('Shared player card facts', () => {
  const players = { '1': { n:'Josh Allen', p:'QB', t:'BUF' }, '2':{ n:'Josh Allen', p:'DE', t:'JAX' } };
  it('requires a unique identity and respects actual IDs', () => { expect(resolvePlayerId(players,{name:'Josh Allen'})).toBeNull(); expect(resolvePlayerId(players,{name:'Josh Allen',team:'BUF'})).toBe('1'); expect(resolvePlayerId(players,{id:'2',name:'Josh Allen',team:'BUF'})).toBe('2'); });
  const base = { id:'1', players, season:2026, week:4, scoring:{pass_yd:0.04}, rosters:[{season:2025,roster_id:2,players:['1']},{season:2026,roster_id:3,sleeper_user_id:'a',players:['1'],team_name:'The Bros'}], members:[{id:7,sleeper_user_id:'a'}] };
  it('uses this season ownership and the league scoring rules', () => { const v = playerCardView({...base,weeks:[{week:4,data:[{player_id:'1',season:2026,week:4,season_type:'regular',stats:{pass_yd:300}}]}]}); expect(v.owner).toMatchObject({id:'3',name:'The Bros',memberId:7}); expect(v.points).toBe(12); expect(v.stats.items[0]).toMatchObject({value:300}); });
  it('preserves real zero, missing scores and authoritative GameDay context', () => { const weeks=[{week:4,data:[{player_id:'1',season:2026,week:4,season_type:'regular',stats:{pass_yd:0}}]}]; expect(playerCardView({...base,weeks}).points).toBe(0); expect(playerCardView({...base,weeks:[]}).points).toBeNull(); expect(playerCardView({...base,weeks,context:{points:18,state:'live',afterHalftime:false}})).toMatchObject({points:18,state:'live',afterHalftime:false}); });
  it('does not score projections or another week/season as actual stats', () => { const v=playerCardView({...base,weeks:[{week:4,data:[{player_id:'1',season:2026,week:5,season_type:'regular',stats:{pass_yd:500}}]}]}); expect(v.points).toBeNull(); });
  it('distinguishes failed roster reads from free agents', () => { expect(playerCardView({...base,rosters:[],rostersKnown:false}).ownerLabel).toBe('Roster status unavailable'); expect(playerCardView({...base,rosters:[]}).ownerLabel).toBe('Free agent in DFL'); });
  it('uses the matched injury report without predicting availability', () => { expect(playerCardView({...base,injuries:{items:[{sleeperId:'1',tag:'Q',availability:'Game-time decision',body:'Ankle'}]}}).injury).toEqual({tag:'Q',availability:'Game-time decision',body:'Ankle'}); });
});
describe('Rivalry season chapters', () => {
  const base={left:{uid:'a',name:'A',roster:1,score:110},right:{uid:'b',name:'B',roster:2,score:100},season:2026,week:4};
  const history=[{season:2025,week:2,user1:'b',user2:'a',score1:100,score2:90},{season:2026,week:1,user1:'a',user2:'b',score1:120,score2:110},{season:2026,week:4,user1:'a',user2:'b',score1:110,score2:100},{season:2026,week:5,user1:'a',user2:'b',score1:140,score2:100}];
  it('normalizes sides and excludes the current and future week before kickoff', () => { const s=rivalryStory({...base,history}); expect(s.meetings).toBe(2); expect(s.record).toBe('Series tied 1–1'); expect(s.previous[1].mine).toBe(90); expect(s.final).toBe(false); });
  it('counts this final exactly once and carries the streak into banter', () => { const s=rivalryStory({...base,history,completed:true}); expect(s.meetings).toBe(3); expect(s.record).toBe('A leads 2–1'); expect(s.outcome).toContain('10.00'); expect(s.banter).toContain('2 straight'); });
  it('shares the same series as the open story, with normalized totals and only recorded finals', () => {
    const final=rivalryShareFact({...base,history,completed:true});
    expect(final.headline).toBe('A leads 2–1');expect(final.detail).toContain('3 recorded meetings');expect(final.detail).toContain('A 320.00–310.00 B');expect(final.detail).toContain('Last final: 110.00–100.00, 2026 Week 4');
    const live=rivalryShareFact({...base,history});expect(live.headline).toBe('Series tied 1–1');expect(live.detail).toContain('A 210.00–210.00 B');expect(live.detail).not.toContain('140.00');
    expect(rivalryShareFact({...base,history:[]})).toBeNull();expect(rivalryShareFact({...base,history:[],completed:true}).detail).toContain('1 recorded meeting');
  });
  it('shares any profile opponent using exactly the displayed ledger',()=>{
    const series={meetings:8,wins:3,losses:4,ties:1,pf:800,pa:812,averageMargin:-1.5,last:{mine:100,theirs:100,season:2025,week:7}};
    const fact=rivalryLedgerFact({left:'A',right:'B',series});expect(fact.headline).toBe('B leads 4–3 · 1 tie');expect(fact.detail).toContain('A 800.00–812.00 B');expect(fact.detail).toContain('-1.50 per game');expect(fact.detail).toContain('100.00–100.00, 2025 Week 7');expect(rivalryLedgerFact({left:'A',right:'B',series:null})).toBeNull();
  });
  it('never calls live totals final and does not turn missing or 0–0 history into a win', () => { const s=rivalryStory({...base,history:[{season:2025,week:1,user1:'a',user2:'b',score1:0,score2:0}]}); expect(s.meetings).toBe(0); expect(s.current).toBeNull(); expect(rivalryStory({...base,completed:true,left:{...base.left,score:null}}).final).toBe(false); });
  it('grades actual calls only after final and handles ties', () => { const calls=[{member_id:7,roster_id:1,kind:'winner'},{member_id:8,roster_id:2,kind:'winner'}]; const args={...base,calls,members:[{id:7,display_name:'Grant'}]}; expect(rivalryStory(args).receipts[0].grade).toBe('Called'); expect(rivalryStory({...args,completed:true}).receipts.map(r=>r.grade)).toEqual(['Called it','Missed it']); expect(rivalryStory({...args,completed:true,right:{...base.right,score:110}}).receipts[0].grade).toBe('Tie'); });
});
describe('Returning to a draft', () => {
  const teams=[{id:'1',playerIds:['a','b']},{id:'2',playerIds:['c','d']},{id:'3',playerIds:['e']}];
  const original={selectedId:'1',trade:{memberIds:['2'],sends:[new Set(['a']),new Set(['c'])],editing:true},shop:{partnerId:'2',memberIds:[],sendAnchors:['a'],receiveAnchors:['c'],maxPlayers:4,intent:'fair',openTiers:new Set(['fair']),customOpen:true}};
  it('round-trips the actual manual package and offer filters', () => { const restored=restoreTradeDraft(JSON.parse(JSON.stringify(tradeDraft(original))),teams); expect([...restored.trade.sends[0]]).toEqual(['a']); expect([...restored.trade.sends[1]]).toEqual(['c']); expect(restored.shop).toMatchObject({intent:'fair',customOpen:true,receiveAnchors:['c']}); });
  it('removes traded-away players, invalid parties and incorrect ownership', () => { const saved=tradeDraft(original); saved.trade.memberIds=['2','2','9']; saved.trade.sends=[['a','c','missing'],['d','a']]; const r=restoreTradeDraft(saved,teams); expect(r.trade.memberIds).toEqual(['2']); expect(r.trade.sends.map(s=>[...s])).toEqual([['a'],['d']]); });
  it('an explicit trading team reconciles saved packages to its own roster', () => { const r=restoreTradeDraft(tradeDraft(original),teams,'3'); expect(r.selectedId).toBe('3'); expect([...r.trade.sends[0]]).toEqual([]); });
  it('isolates members, expires old sessions and tolerates blocked storage', () => { const s=storage(); writeViewMemory(1,'trade:2026',{x:3},s,100); expect(readViewMemory(1,'trade:2026',s,101)).toEqual({x:3}); expect(readViewMemory(2,'trade:2026',s,101)).toBeNull(); expect(readViewMemory(1,'trade:2026',s,100+13*3600000)).toBeNull(); expect(()=>writeViewMemory(1,'x',{}, {setItem:()=>{throw Error()}})).not.toThrow(); });
});
describe('Mobile warming policy', () => {
  it('avoids speculative work for hidden, data-saving or slow connections', () => { expect(canWarmRoutes({hidden:true})).toBe(false); expect(canWarmRoutes({connection:{saveData:true}})).toBe(false); expect(canWarmRoutes({connection:{effectiveType:'3g'}})).toBe(false); expect(canWarmRoutes({connection:{effectiveType:'4g'}})).toBe(true); });
});
