import {describe,it,expect} from 'vitest';
import {backgroundSyncPolicy} from './background-sync-policy.js';
const now=Date.parse('2026-10-11T17:00:00Z'),state={season:'2026',season_type:'regular',week:5},league={season:'2026',status:'in_season'};
const policy=games=>backgroundSyncPolicy({state,league,now,schedule:new Map(games.map((g,i)=>[i,g]))});
describe('background football cadence',()=>{
 it('uses five minutes only for confirmed live games',()=>{expect(policy([{key:'live'}])).toMatchObject({mode:'live',intervalMs:300000});expect(policy([{key:'unknown'}]).intervalMs).toBe(3600000)});
 it('steps up before kickoff and for initial final-score corrections',()=>{expect(policy([{key:'upcoming',kickoff:'2026-10-11T17:30:00Z'}]).mode).toBe('kickoff');expect(policy([{key:'final',kickoff:'2026-10-11T13:00:00Z'}]).mode).toBe('results')});
 it('keeps an hourly roster and prior-week reconciliation between games',()=>{expect(policy([{key:'final',kickoff:'2026-10-10T17:00:00Z'}]).mode).toBe('rosters');expect(policy([{key:'upcoming',kickoff:'2026-10-12T00:00:00Z'}]).intervalMs).toBe(3600000)});
 it('never runs for an old league or offseason',()=>{expect(backgroundSyncPolicy({state:{...state,season_type:'off'},league})).toMatchObject({enabled:false});expect(backgroundSyncPolicy({state,league:{...league,season:'2025'}}).enabled).toBe(false)});
});
