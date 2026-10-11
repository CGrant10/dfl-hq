export function wallPushEligibility(message,subscription,now=Date.now()) {
  if(!message||message.category!=='wall'||!/^wall:(post|reply):[0-9]+$/.test(message.source_key||'')||message.audience!=='members')return 'disabled';
  const created=Date.parse(message.created_at);
  if(!Number.isFinite(created)||now-created>24*3600000)return 'expired';
  if(!subscription?.enabled||!Array.isArray(subscription.categories)||!subscription.categories.includes('wall')||!message.target_member_ids?.map(String).includes(String(subscription.member_id)))return 'disabled';
  return 'ready';
}
export function wallPushFailure(status,attempts) {
  if(status===404||status===410)return {terminal:true,result:'disabled',disable:true};
  if((status>=400&&status<500&&status!==429)||attempts>=5)return {terminal:true,result:'failed',disable:false};
  return {terminal:false,result:null,disable:false,delayMs:Math.min(15,2**attempts)*60000};
}
