import {describe, it, expect} from 'vitest';
import {buildPlayerPool, evaluateTrade, evaluateMultiTeamTrade, tradeLineupPreviews, optimalLineup, isPlausibleTradeSuggestion} from './team-analyzer.js';
import {recommendationFor, verdictFor, tradeReasons} from './trade-desk.js';
import {tradeModelHealth} from './trade-model-health.js';

const player = (id, expectedPoints, tradePerGame) => ({id, name:id, position:'RB', expectedPoints, tradePerGame, tradeValue:50, modelSource:'projection'});
const a={id:'a',playerIds:['hot-start']}, b={id:'b',playerIds:['better-future']};
const pool=new Map([['hot-start',player('hot-start',340,8)],['better-future',player('better-future',170,16)]]);

describe('forward trade decisions',()=>{
  it('credits the new owner with future production and keeps earned season points in the league report',()=>{
    const result=evaluateTrade({teamA:a,teamB:b,sendA:a.playerIds,sendB:b.playerIds,pool});
    expect(result.weeklyDeltaA).toBe(8);
    expect(result.weeklyDeltaB).toBe(-8);
    expect(optimalLineup(a.playerIds,pool).weeklyPoints).toBe(20);
    const previews=tradeLineupPreviews({teams:[a,b],sends:[a.playerIds,b.playerIds],receives:[b.playerIds,a.playerIds],pool});
    expect(previews[0].beforePoints).toBe(8);
    expect(previews[0].afterPoints).toBe(16);
    expect(previews[0].afterPoints-previews[0].beforePoints).toBe(result.weeklyDeltaA);
    expect(pool.get('hot-start').expectedPoints).toBe(340);
  });
  it('uses the same future model for individually routed multi-member deals',()=>{
    const c={id:'c',playerIds:['third']},p=new Map([...pool,['third',player('third',255,12)]]);
    const result=evaluateMultiTeamTrade({teams:[a,b,c],sends:[a.playerIds,b.playerIds,c.playerIds],destinations:{'hot-start':'c','better-future':'a',third:'b'},pool:p});
    expect(result.weeklyDeltas).toEqual([8,-4,-4]);
  });
  it('makes availability cost more when there is less season left',()=>{
    const args={rosters:[{players:['x']}],players:{x:{n:'X',p:'RB',i:'IR'}},projections:[{player_id:'x',stats:{rec:170}}],scoringSettings:{rec:1}};
    const early=buildPlayerPool({...args,currentWeek:5}).get('x');
    const late=buildPlayerPool({...args,currentWeek:15}).get('x');
    expect(early.tradePerGame).toBeGreaterThan(late.tradePerGame);
    expect(early.forwardPerGame).toBe(10);
    expect(early.expectedPoints).toBe(late.expectedPoints);
  });
  it('does not give unprojected, unproven players complete coverage or a decisive verdict',()=>{
    const p=buildPlayerPool({rosters:[{players:['unknown','known']}],players:{unknown:{n:'Unknown player',p:'RB'},known:{n:'Known player',p:'RB'}},projections:[{player_id:'known',stats:{rec:170}}],scoringSettings:{rec:1}});
    expect(tradeModelHealth(p).projectionCoverage).toBe(50);
    const result=evaluateTrade({teamA:{id:'a',playerIds:['unknown']},teamB:{id:'b',playerIds:['known']},sendA:['unknown'],sendB:['known'],pool:p});
    expect(result.projectionEvidence.missing).toEqual(['Unknown player']);
    expect(recommendationFor(result).action).toBe('REVIEW');
    expect(verdictFor(result).who).toBeNull();
    expect(tradeReasons(result,a,b,p,[],[])[0].tone).toBe('warn');
    expect(isPlausibleTradeSuggestion(result)).toBe(false);
  });
});
