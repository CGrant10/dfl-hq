const settled=new Set(['won','lost','void']);

// Baseline existing results; only an observed open -> settled transition is new.
export function createSettlementTracker(initial=[],storage=globalThis.localStorage,memberId='guest'){
  const seen=new Map(initial.map(b=>[String(b.id),b.status]));
  const key=`dfl.sportsbook.settlements.v1.${memberId}`;
  let remembered=[];try{const saved=JSON.parse(storage?.getItem(key)||'[]');if(Array.isArray(saved))remembered=saved.filter(id=>typeof id==='string').slice(-200);}catch{}
  const noticed=new Set(remembered);
  for(const bet of initial)if(settled.has(bet.status))noticed.add(String(bet.id));
  return bets=>{
    const moments=[];
    for(const bet of bets){
      const id=String(bet.id);
      if(seen.get(id)==='open'&&settled.has(bet.status)&&!noticed.has(id)){
        noticed.add(id);remembered.push(id);moments.push(bet);
      }
      seen.set(id,bet.status);
    }
    if(moments.length)try{storage?.setItem(key,JSON.stringify(remembered.slice(-200)));}catch{}
    return moments;
  };
}

export async function loadBookAccount(client,memberId){
  const {data,error}=await client.rpc('sportsbook_my_live_account');
  if(error)throw error;
  if(!data||!Number.isFinite(data.balance)||!Array.isArray(data.bets)||!Array.isArray(data.ledger))throw Error('Book account unavailable');
  if(memberId!=null&&String(data.member_id)!==String(memberId))throw Error('Book profile changed');
  return data;
}

export async function loadBookWallet(client){
 const {data,error}=await client.rpc('sportsbook_touch_wallet');
 if(error)throw error;
 const wallet=data?.[0];
 if(!wallet||!Number.isFinite(wallet.balance)||!Number.isFinite(wallet.claimable)||!Number.isFinite(wallet.claimable_days))throw Error('Your bankroll could not be loaded. Try again.');
 return wallet;
}
