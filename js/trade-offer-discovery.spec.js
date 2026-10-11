import { describe, expect, it } from 'vitest';
import { evaluateTrade, suggestTrades, tradeSuggestionTier } from './team-analyzer.js';
import { tradeConfidence } from './trade-confidence.js';
import { tradeOfferEmptyCopy, closestTradeOffers } from './trade-workspace-ui.js';

function balancedAvailability(status = 'Questionable', isOut = false) {
  return { fairness: 94, valueToA: 94, valueToB: 100, weeklyDeltaA: 1, weeklyDeltaB: 0, rosterImpactA: 1, rosterImpactB: 0,
    projectionEvidence: { missing: [], fallback: [], stale: [], injuries: ['Receiver'], players: [{ name: 'Receiver', injuryStatus: status, isOut }],
      expert: { required: true, status: 'Fresh', missing: [], disagreements: [], split: [] } } };
}
describe('supported offer discovery', () => {
  it.each(['Stale','Unavailable','Season mismatch','Scoring mismatch'])('keeps balanced prices Fair during a %s expert feed while requiring review', status => {
    const result=balancedAvailability();
    result.projectionEvidence.injuries=[];
    result.projectionEvidence.expert.status=status;
    expect(tradeSuggestionTier(result)).toBe('fair');
    expect(tradeConfidence(result)).toMatchObject({level:'limited',needsReview:true});
    expect(tradeSuggestionTier({...result,fairness:70,valueToA:100,valueToB:70,incomingPositionsA:['WR'],incomingEvidence:{low:90},outgoingEvidence:{high:80}})).toBe('aggressive');
  });
  it.each(['missing','fallback','stale'])('still withholds Fair for %s core model inputs when the expert feed is unavailable', field => {
    const result=balancedAvailability();
    result.projectionEvidence.expert.status='Unavailable';
    result.projectionEvidence[field]=['Receiver'];
    expect(tradeSuggestionTier(result)).toBe('aggressive');
  });
  it('finds a balanced anchored receiver exchange despite a stale expert feed',()=>{
    const pool=new Map(['a','b'].map(id=>[id,{id,name:id==='b'?'Chris Olave':'Receiver',position:'WR',expectedPoints:272,tradePerGame:16,tradeValue:id==='b'?37:36,modelSource:'projection',expertFeedStatus:'Stale',expert:{rank:12}}]));
    const teams=['a','b'].map(id=>({id,playerIds:[id]}));
    const offers=suggestTrades({teams,pool,teamId:'a',partnerId:'b',receiveAnchorIds:['b'],shapes:['1-1'],intent:'fair'});
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({tier:'fair',sendB:['b']});
    expect(tradeConfidence(offers[0])).toMatchObject({level:'limited',needsReview:true});
  });
  it('offers honest, bounded alternatives only when the selected tier is empty',()=>{
    const offers=[{tier:'fair'},...Array.from({length:8},(_,i)=>({tier:'aggressive',id:i})),{tier:'steal'}];
    expect(closestTradeOffers(offers,'steal')).toEqual([]);
    const withoutSteals=offers.filter(o=>o.tier!=='steal');
    expect(closestTradeOffers(withoutSteals,'steal')).toEqual(withoutSteals.slice(1,4));
    expect(closestTradeOffers([{tier:'fair'}],'steal')).toEqual([{tier:'fair'}]);
    expect(closestTradeOffers([],'fair')).toEqual([]);
    expect(withoutSteals.some(o=>o.tier==='steal')).toBe(false);
  });
  it('explains unavailable expert support separately from roster restrictions',()=>{
    const offers=[{tier:'aggressive',projectionEvidence:{expert:{required:true,status:'Stale'}}}];
    expect(tradeOfferEmptyCopy('steal',['WR'],offers)).toContain('fresh expert rankings');
    expect(tradeOfferEmptyCopy('steal',['QB'],offers)).toContain('1-QB league');
    expect(tradeOfferEmptyCopy('steal',['WR'],[{tier:'aggressive'}])).toContain('No clear Steal');
  });
  it('explains an impossible incoming-QB Steal without claiming other trades are unavailable', () => {
    expect(tradeOfferEmptyCopy('steal', ['QB'])).toContain('1-QB league');
    expect(tradeOfferEmptyCopy('steal', ['WR'])).toContain('No clear Steal');
    expect(tradeOfferEmptyCopy('fair', ['QB'])).not.toContain('excluded');
  });
  it('shows a balanced questionable-player estimate as Fair while retaining mandatory review', () => {
    const result = balancedAvailability();
    expect(tradeSuggestionTier(result)).toBe('fair');
    expect(tradeConfidence(result)).toMatchObject({ level: 'mixed', needsReview: true });
  });
  it.each(['Out', 'IR', 'PUP', 'Doubtful', '', 'Healthy'])('keeps %s availability out of Fair when flagged as uncertain', status => {
    expect(tradeSuggestionTier(balancedAvailability(status))).toBe('aggressive');
  });
  it('withholds Fair for reserve players, stale evidence, and unverified injury flags', () => {
    expect(tradeSuggestionTier(balancedAvailability('Questionable', true))).toBe('aggressive');
    const result = balancedAvailability();
    expect(tradeSuggestionTier({ ...result, projectionEvidence: { ...result.projectionEvidence, stale: ['Receiver'] } })).toBe('aggressive');
    expect(tradeSuggestionTier({ ...result, projectionEvidence: { ...result.projectionEvidence, players: [] } })).toBe('aggressive');
  });
  it('does not promote a questionable-player value edge into Steal', () => {
    const result = { ...balancedAvailability(), fairness: 60, valueToA: 100, valueToB: 60,
      incomingPositionsA: ['WR'], incomingEvidence: { low: 90, high: 110 }, outgoingEvidence: { low: 50, high: 70 } };
    expect(tradeSuggestionTier(result)).toBe('aggressive');
  });
  it('discovers a useful, balanced swap involving both rosters’ twelfth-ranked players', () => {
    const pool = new Map();
    const teams = ['a','b'].map(id => {
      const players = Array.from({ length: 11 }, (_, i) => ({ id: `${id}-wr-${i}`, name: `${id} receiver ${i}`, position: 'WR', expectedPoints: 250, tradeValue: 80-i }));
      players.push({ id: `${id}-te`, name: `${id} tight end`, position: 'TE', expectedPoints: 200, tradeValue: 40 });
      players.forEach(p => pool.set(p.id, p));
      return { id, playerIds: players.map(p => p.id) };
    });
    const result = evaluateTrade({ teamA: teams[0], teamB: teams[1], sendA: ['a-te'], sendB: ['b-te'], pool });
    expect(tradeSuggestionTier(result)).toBe('fair');
    const offers = suggestTrades({ teams, teamId: 'a', partnerId: 'b', pool, intent: 'fair', shapes: ['1-1'], limit: 200 });
    expect(offers.some(o => o.sendA.includes('a-te') && o.sendB.includes('b-te') && o.tier === 'fair')).toBe(true);
  });
  it('keeps larger full-roster searches bounded, unique, and within the requested shape', () => {
    const pool = new Map();
    const teams = ['a','b'].map(id => {
      const playerIds = Array.from({ length: 18 }, (_, i) => {
        const pid = `${id}-${i}`; pool.set(pid, { id: pid, name: pid, position: ['RB','WR','TE'][i%3], expectedPoints: 200, tradeValue: 30 }); return pid;
      });
      return { id, playerIds, need: 'RB' };
    });
    const offers = suggestTrades({ teams, teamId: 'a', partnerId: 'b', pool, intent: 'fair', shapes: ['4-4'], limit: 12 });
    expect(offers.length).toBeGreaterThan(0); expect(offers.length).toBeLessThanOrEqual(12);
    for (const offer of offers) {
      expect(new Set(offer.sendA).size).toBe(4); expect(new Set(offer.sendB).size).toBe(4);
      expect(offer.sendA.every(id => teams[0].playerIds.includes(id))).toBe(true);
      expect(offer.sendB.every(id => teams[1].playerIds.includes(id))).toBe(true);
    }
  });
  it('retains all five required players in an eight-player search', () => {
    const pool=new Map();
    const teams=['a','b'].map(id=>({id,playerIds:Array.from({length:18},(_,i)=>{
      const pid=`${id}-${i}`;pool.set(pid,{id:pid,name:pid,position:['RB','WR','TE'][i%3],expectedPoints:id==='b'?(i<3?205:170):200,tradeValue:id==='b'?(i<3?50:10):30});return pid;
    })}));
    const anchors=teams[0].playerIds.slice(8,13);
    const offers=suggestTrades({teams,teamId:'a',partnerId:'b',playerIds:anchors,pool,shapes:['5-3'],limit:12});
    expect(offers.length).toBeGreaterThan(0);
    for(const offer of offers){expect(offer.sendA).toEqual(expect.arrayContaining(anchors));expect(offer.sendA).toHaveLength(5);expect(offer.sendB).toHaveLength(3);}
  });

});
