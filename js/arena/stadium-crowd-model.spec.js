import {it,expect} from 'vitest';
import {stadiumReadyState,stadiumCrowdReaction,stadiumCrowdRun} from './stadium-crowd-model.js';
const racers=[{id:'1'},{id:'2'}],reaction={v:1,id:'test-call-123',run:'run-a',racer:'1',kind:'cheer',at:100000};
it('counts connections separately and deduplicates opt-in readiness only for this grid',()=>{
 expect(stadiumReadyState({a:[{key:'a',racer:'1',readyFor:'4'}],b:[{key:'b',racer:'1',readyFor:'4'}],c:[{key:'c',racer:'2',readyFor:'3'}],d:[{key:'d',racer:'3',readyFor:'4'}]},racers,4)).toEqual({watching:4,ready:['1']});
 expect(stadiumReadyState({a:[null,{},'bad']},racers,4)).toEqual({watching:0,ready:[]});
});
it('accepts only recent allow-listed reactions for actual racers in the current draw',()=>{
 const options={run:'run-a',racers,now:100000};expect(stadiumCrowdReaction(reaction,options)).toMatchObject({racer:'1',call:'FUCKING SEND IT'});
 for(const patch of [{run:'other'},{racer:'missing'},{kind:'<script>'},{kind:'__proto__'},{id:'<html>'},{at:0},{v:2}])expect(stadiumCrowdReaction({...reaction,...patch},options)).toBeNull();
 expect(stadiumCrowdRun({event:{race_revision:4}})).toBe('grid-4');expect(stadiumCrowdRun({event:{race_manifest:{run_id:'abc'}}})).toBe('abc');
});
