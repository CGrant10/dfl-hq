import {it,expect} from 'vitest';
import {multigameRows} from './multigame-model.js';
const event={id:'401873011',date:'2026-10-25T17:00:00Z',status:{type:{state:'in',shortDetail:'Q4 2:00'}},competitions:[{competitors:[{team:{abbreviation:'NO'},homeAway:'home',score:'14'},{team:{abbreviation:'PIT'},homeAway:'away',score:'14'}]}]};
const board={season:{year:2026,type:2},week:{number:7},events:[event]};
const context={season:2026,week:7,players:[]};
const summary=()=>({header:{id:event.id,season:{year:2026,type:2},competitions:[{status:{type:{state:'post',shortDetail:'Final'}},competitors:[{team:{abbreviation:'NO'},score:'10'},{team:{abbreviation:'PIT'},score:'16'}]}]}});
const rows=(data,source=board)=>multigameRows(source,context,new Map([[event.id,{summary:data}]]))[0];
it('uses confirmed game scores and final status when the board is still behind',()=>{
 const result=rows(summary());expect(result).toMatchObject({state:'post',status:'Final'});expect(result.sides.map(s=>s.score)).toEqual([16,10]);
});
it('keeps a reported zero instead of retaining an old board score',()=>{
 const s=summary();s.header.competitions[0].competitors[0].score='0';expect(rows(s).sides.map(r=>r.score)).toEqual([16,0]);
});
it('ignores a summary for a different game, season or season type',()=>{
 for(const patch of [{id:'401900001'},{season:{year:2025,type:2}},{season:{year:2026,type:3}}]){
  const s=summary();Object.assign(s.header,patch);expect(rows(s)).toMatchObject({state:'in',status:'Q4 2:00'});expect(rows(s).sides.map(r=>r.score)).toEqual([14,14]);
 }
});
it('does not regress a final board with an earlier live snapshot',()=>{
 const source=structuredClone(board);source.events[0].status.type={state:'post',shortDetail:'Final'};
 const s=summary();s.header.competitions[0].status.type={state:'in',shortDetail:'Q4 1:00'};
 expect(rows(s,source)).toMatchObject({state:'post',status:'Final'});expect(rows(s,source).sides.map(r=>r.score)).toEqual([14,14]);
});
it('leaves unknown or malformed scores at the last known value',()=>{
 const s=summary();s.header.competitions[0].competitors[0].score=null;s.header.competitions[0].competitors[1].score='N/A';expect(rows(s).sides.map(r=>r.score)).toEqual([14,14]);
});
