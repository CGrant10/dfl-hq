// A short, bounded retry for an unaccepted live alert. Keep the same inbox ID
// and push tag; never retry expired plays or permanently rejected endpoints.
export async function sendPushWithRetry(send,{expiresAt=Infinity,retries=1,now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
 for(let attempt=0;;attempt++){
  if(expiresAt<=now())return false;
  try{await send();return true}catch(error){
   const status=Number(error?.statusCode)||0;
   if(attempt>=retries||status&&status!==408&&status!==429&&(status<500||status>=600))throw error;
   const header=error?.headers?.['retry-after'];
   const requested=header==null?250:Number.isFinite(Number(header))?Number(header)*1000:Date.parse(header)-now();
   const delay=Math.max(250,Number.isFinite(requested)?requested:250);
   if(delay>2000)throw error;
   if(now()+delay>=expiresAt)return false;
   await wait(delay);
  }
 }
}
