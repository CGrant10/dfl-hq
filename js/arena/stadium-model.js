export const STADIUM_ENGINE='stadium-v1';
export const STADIUM_PRESENTATION=2;
export const FINISH_START=.975;
export const MIN_RACE_MS=15000,MAX_RACE_MS=600000;
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const ordinal=p=>`${p}${p%100>=11&&p%100<=13?'TH':p%10===1?'ST':p%10===2?'ND':p%10===3?'RD':'TH'}`;
const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
export function stadiumRandom(seed){let n=Number(seed)>>>0;return()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,n|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function stadiumFinishFraction(place,count){return FINISH_START+(1-FINISH_START)*(place-1)/Math.max(1,count-1);}
export function stadiumDuration(value){const n=Number(value);if(!Number.isInteger(n)||n<MIN_RACE_MS||n>MAX_RACE_MS)throw Error('Race duration must be 15–600 seconds.');return n;}

// Monotone cubic paths preserve continuous velocity through every beat.
function curve(nodes){
 const secants=nodes.slice(1).map((p,i)=>(p.p-nodes[i].p)/(p.t-nodes[i].t));
 const slopes=nodes.map((_,i)=>i===0?0:i===nodes.length-1?secants.at(-1):2*secants[i-1]*secants[i]/(secants[i-1]+secants[i]));
 return t=>{
  if(t<=0)return {progress:0,speed:0};if(t>=nodes.at(-1).t)return {progress:1,speed:0};
  let lo=0,hi=nodes.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(nodes[mid].t<=t)lo=mid;else hi=mid;}
  const a=nodes[lo],b=nodes[hi],dt=b.t-a.t,u=(t-a.t)/dt,u2=u*u,u3=u2*u;
  const progress=(2*u3-3*u2+1)*a.p+(u3-2*u2+u)*dt*slopes[lo]+(-2*u3+3*u2)*b.p+(u3-u2)*dt*slopes[hi];
  const speed=((6*u2-6*u)*a.p+(3*u2-4*u+1)*dt*slopes[lo]+(-6*u2+6*u)*b.p+(3*u2-2*u)*dt*slopes[hi])/dt;
  return {progress:clamp(progress,0,1),speed:Math.max(0,speed)};
 };
}

export function buildStadiumRace(racers,manifest,durationMs){
 const duration=stadiumDuration(durationMs),ids=racers.map(r=>String(r.id)),order=manifest?.order?.map(String);
 if(manifest&&Object.hasOwn(manifest,'presentation_version')&&![1,STADIUM_PRESENTATION].includes(manifest.presentation_version))throw Error('Update DFL to watch this race presentation.');
 if(ids.length<2||ids.length>32||new Set(ids).size!==ids.length||manifest?.engine!==STADIUM_ENGINE||!order||order.length!==ids.length||new Set(order).size!==ids.length||order.some(id=>!ids.includes(id))||!Number.isInteger(Number(manifest.seed))||Number(manifest.seed)<=0)throw Error('The shared race could not be verified.');
 const storyDuration=stadiumDuration(Number(manifest.story_duration_ms)||duration),dramatic=manifest.presentation_version===STADIUM_PRESENTATION;
 const rand=stadiumRandom(manifest.seed),beats=clamp(Math.round(storyDuration/4800),10,125);
 const candidates=[...ids];for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 const leaders=Array.from({length:beats},(_,i)=>candidates[(i+Math.floor(i/ids.length)*3)%ids.length]);
 const paths=racers.map(racer=>{
  const id=String(racer.id),place=order.indexOf(id)+1,random=stadiumRandom(hash(`${manifest.seed}:${id}`));
  const nodes=[{t:0,p:0},{t:.035,p:.019}];
  if(dramatic){
   // Positive-velocity waves stretch the field and create sustained surges.
   // Their derivative perturbation is bounded below the baseline velocity;
   // monotone interpolation also preserves smooth forward motion at every beat.
   const phase=random(),frequency=.35+random()*.3,secondPhase=random(),secondFrequency=1.2+random()*.5;
   const steps=clamp(Math.round(storyDuration/2500),16,96);
   for(let i=0;i<steps;i++){
    const t=.08+i*.84/(steps-1),u=t/.95;
    const offset=Math.sin(Math.PI*u)*(.105*Math.sin(2*Math.PI*(frequency*u+phase))+.01*Math.sin(2*Math.PI*(secondFrequency*u+secondPhase)));
    nodes.push({t,p:.944*u+offset});
   }
  }else for(let beat=0;beat<beats;beat++){
   const t=.09+beat*.83/(beats-1),lead=leaders[beat]===id;
   const offset=(random()-.5)*.012+(lead?.023:0),previous=nodes.at(-1).p;
   nodes.push({t,p:clamp(t-.02+offset,previous+.001,t+.025)});
  }
  nodes.push({t:.95,p:.944+(random()-.5)*.008},{t:stadiumFinishFraction(place,ids.length),p:1});
  return {id,place,finishMs:Math.round(duration*stadiumFinishFraction(place,ids.length)),at:curve(nodes)};
 });
 return {racers,paths,order,duration,seed:Number(manifest.seed),leaders,beats,presentationVersion:dramatic?STADIUM_PRESENTATION:1};
}

export function stadiumFrame(race,elapsedMs){
 const elapsed=Number.isFinite(Number(elapsedMs))?Number(elapsedMs):0,u=clamp(elapsed/race.duration,0,1);
 const rows=race.paths.map((path,index)=>({id:path.id,index,...path.at(u),place:path.place,finished:elapsed>=path.finishMs,finishMs:path.finishMs}));
 const ranked=[...rows].sort((a,b)=>a.finished&&b.finished?a.place-b.place:b.progress-a.progress||a.index-b.index);
 ranked.forEach((row,index)=>row.rank=index+1);
 return {elapsed,duration:race.duration,u,rows,ranked,finished:elapsed>=race.duration,countdown:elapsed<0?Math.ceil(-elapsed/1000):0,phase:u<.04?'launch':u>=.90?'final':u>=.65?'closing':'racing'};
}

export function stadiumElapsed(event,serverNow){
 if(event.bc_state==='idle')return -3000;
 if(event.bc_state==='paused')return Number(event.bc_offset_ms)||0;
 if(event.bc_state==='finished')return Number(event.race_duration_ms)||0;
 const started=Date.parse(event.bc_started_at);if(!Number.isFinite(started))return -3000;
 return serverNow-started+(Number(event.bc_offset_ms)||0);
}

export function stadiumMoment(race,frame){
 if(frame.countdown)return {key:'countdown',title:'GET SET',name:String(frame.countdown)};
 const first=frame.ranked[0],second=frame.ranked[1],name=id=>{const r=race.racers.find(r=>String(r.id)===id);return r?.team||r?.name||'DFL';};
 if(frame.finished)return {key:'finished',title:'ORDER LOCKED',name:name(race.order[0])};
 if(first.finished)return {key:'winner',title:'FIRST ACROSS',name:name(first.id)};
 if(frame.u<.06)return {key:'launch',title:'LET’S FUCKING GO',name:'THE DFL DASH'};
 if(frame.u>.90)return {key:`final-${first.id}`,title:'FINAL SPRINT',name:name(first.id)};
 // Sample a shared three-second window, so late joins and different refresh
 // rates show the same factual call without inventing a pass or using place.
 const bucket=Math.floor(frame.elapsed/3000),at=Math.max(0,bucket*3000),current=stadiumFrame(race,at),before=stadiumFrame(race,Math.max(0,at-3000));
 const prior=new Map(before.ranked.map(r=>[r.id,r]));
 if(at>=6000){
  const top=current.ranked[0],oldLeader=before.ranked[0];
  if(top.id!==oldLeader.id)return {key:`lead-${bucket}-${top.id}`,title:'TAKES THE LEAD',name:name(top.id),cue:'overtake'};
  const surge=current.ranked.map(row=>({row,was:prior.get(row.id)?.rank??row.rank})).filter(v=>v.was-v.row.rank>=2).sort((a,b)=>(b.was-b.row.rank)-(a.was-a.row.rank)||a.row.rank-b.row.rank)[0];
  if(surge)return {key:`surge-${bucket}-${surge.row.id}`,title:`${ordinal(surge.was)} → ${ordinal(surge.row.rank)}`,name:name(surge.row.id),cue:'overtake'};
 }
 const gap=second?(first.progress-second.progress)*100:0;
 return {key:`race-${bucket}-${first.id}`,title:gap>=2?'OPENING A GAP':gap<.5?'SIDE BY SIDE':'OUT IN FRONT',name:name(first.id)};
}
