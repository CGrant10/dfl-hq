import {it,expect} from 'vitest';
import {loadPropIndex,loadPropGame,loadMarketOutcomes} from './sportsbook-loading.js';
it('discovers every prop beyond the server row cap without outcome queries',async()=>{
 const rows=Array.from({length:2630},(_,id)=>({id,title:`Player ${id}`})),ranges=[];
 const client={rpc:name=>{expect(name).toBe('sportsbook_prop_index');return{range:(from,to)=>{ranges.push([from,to]);return Promise.resolve({data:rows.slice(from,to+1)})}}}};
 const result=await loadPropIndex(client);expect(result).toHaveLength(2630);expect(result.at(-1)).toMatchObject({id:2629,_lazy:true});expect(ranges).toEqual([[0,999],[1000,1999],[2000,2999]]);
});
it('loads only the requested game, including more than 1000 outcomes',async()=>{
 const marketIds=[10,20],queries=[],outcomes=Array.from({length:1005},(_,id)=>({id,market_id:10}));
 const client={from:table=>{let ids;const q={select:()=>q,in:(key,value)=>{ids=value;queries.push({table,key,ids});return q},order:()=>q,range:(from,to)=>Promise.resolve({data:outcomes.filter(row=>ids.includes(row.market_id)).slice(from,to+1)}),then:resolve=>resolve({data:ids.map(id=>({id,status:'open'}))})};return q}};
 const result=await loadPropGame(client,marketIds);expect(result.markets.map(row=>row.id)).toEqual(marketIds);expect(result.outcomes).toHaveLength(1005);expect(queries.every(row=>row.ids.every(id=>marketIds.includes(id)))).toBe(true);
});
it('does not turn a server failure into an empty game',async()=>{
 const error={message:'Unavailable'};const client={from:()=>{const q={select:()=>q,in:()=>q,order:()=>q,range:async()=>({error})};return q}};
 await expect(loadMarketOutcomes(client,[1])).rejects.toBe(error);expect(await loadMarketOutcomes(client,[])).toEqual([]);
});
