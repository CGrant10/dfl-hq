// Discovery excludes outcome/score payloads. Range every request so the
// PostgREST row cap never silently drops games or prices.
export async function loadPropIndex(client){
 const rows=[];
 for(let from=0;;from+=1000){
  const request=client.rpc('sportsbook_prop_index');
  const {data,error}=await(typeof request.range==='function'?request.range(from,from+999):request);
  if(error)throw error;
  rows.push(...(data||[]).map(row=>({...row,_lazy:true})));
  if((data||[]).length<1000)return rows;
 }
}
export async function loadMarketOutcomes(client,marketIds){
 const rows=[];
 for(let chunk=0;chunk<marketIds.length;chunk+=200){
  for(let from=0;;from+=1000){
   const {data,error}=await client.from('sportsbook_outcomes').select('*').in('market_id',marketIds.slice(chunk,chunk+200)).order('id').range(from,from+999);
   if(error)throw error;
   rows.push(...(data||[]));if((data||[]).length<1000)break;
  }
 }
 return rows;
}
export async function loadPropGame(client,ids){
 const markets=[];
 for(let from=0;from<ids.length;from+=200){
  const {data,error}=await client.from('sportsbook_markets').select('*').in('id',ids.slice(from,from+200));
  if(error)throw error;markets.push(...(data||[]));
 }
 const outcomes=await loadMarketOutcomes(client,ids);
 return{markets,outcomes};
}
