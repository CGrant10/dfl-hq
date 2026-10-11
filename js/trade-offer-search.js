const cancelled=()=>new DOMException('Search replaced','AbortError');
export function createTradeOfferSearch(snapshot,{makeWorker=()=>new Worker(new URL('./workers/trade-offers.js',import.meta.url)),timeoutMs=45000}={}) {
  let worker=null,pending=null,sequence=0,stopped=false;
  const reset=()=>{worker?.terminate();worker=null;};
  const settle=(error,offers)=>{
    const request=pending;if(!request)return;
    pending=null;clearTimeout(request.timer);
    if(error)request.reject(error);else request.resolve(offers);
  };
  const cancel=()=>{if(pending){settle(cancelled());reset();}};
  return {
    run(query){
      if(stopped)return Promise.reject(cancelled());
      cancel();
      return new Promise((resolve,reject)=>{
        const id=++sequence;
        pending={id,resolve,reject,timer:setTimeout(()=>{settle(Error('Search timed out. Try again.'));reset();},timeoutMs)};
        try{
          if(!worker){
            const current=worker=makeWorker();
            current.onmessage=({data})=>{
              if(worker!==current||pending?.id!==data.id)return;
              if(data.error||!Array.isArray(data.offers)){settle(Error(data.error||'Offers unavailable'));reset();}
              else settle(null,data.offers);
            };
            const fail=event=>{event?.preventDefault?.();if(worker!==current)return;settle(Error('Couldn’t find offers. Try again.'));reset();};
            current.onerror=fail;current.onmessageerror=fail;
            current.postMessage({type:'init',snapshot});
          }
          worker.postMessage({type:'search',id,query});
        }catch{settle(Error('Couldn’t find offers. Try again.'));reset();}
      });
    },
    cancel,
    stop(){stopped=true;settle(cancelled());reset();}
  };
}
