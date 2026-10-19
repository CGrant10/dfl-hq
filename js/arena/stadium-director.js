// Presentation only. A shot never changes a path, clock or official place.
const active=frame=>frame.ranked.filter(row=>!row.finished);
const pairKey=rows=>rows.map(row=>row.id).sort().join(':');
export function closestStadiumBattle(frame){
 const rows=active(frame);let best=null;
 for(let i=0;i<rows.length-1;i++){
  const pair=rows.slice(i,i+2),gap=Math.abs(pair[0].progress-pair[1].progress);
  // Close races anywhere in the field earn attention; an equally close lead
  // battle wins. Exclude widely separated runners from a 'battle' shot.
  const score=gap+i*.00012;
  if(gap<=.018&&(!best||score<best.score))best={rows:pair,score};
 }
 return best?.rows||rows.slice(0,2);
}
export function createStadiumDirector(){
 let last=null,shot=null,run='',mode='',chosenAt=0;
 const make=(kind,rows,at)=>({kind,ids:rows.map(row=>row.id),at,key:`${kind}:${pairKey(rows)}`});
 return {update(frame,{runId='',state='running',camera='auto',racerId=null,motion=true,photo=false}={}){
  const rewind=last&&frame.elapsed<last.elapsed;
  if(run!==runId||rewind){last=null;shot=null;chosenAt=frame.elapsed;run=runId}
  if(camera!==mode){shot=null;mode=camera}
  if(camera==='field'||!motion){shot=make('field',frame.rows,frame.elapsed);last=frame;return shot}
  if(camera==='follow'){
   const row=frame.rows.find(row=>row.id===String(racerId));shot=make('follow',row?[row]:[],frame.elapsed);last=frame;return shot;
  }
  if(state==='paused'&&shot&&!photo){last=frame;return shot}
  if(photo||frame.u>=.90){
   const rows=frame.ranked.slice(0,photo?2:3);shot=make(photo?'photo':'finish',rows,frame.elapsed);last=frame;return shot;
  }
  if(frame.countdown||frame.u<.06||state==='idle'){
   shot=make('launch',frame.rows,frame.elapsed);last=frame;return shot;
  }
  const held=frame.elapsed-chosenAt;
  let pass=null;
  if(last&&frame.elapsed-last.elapsed<1000){
   const previous=new Map(last.ranked.map(row=>[row.id,row.rank]));
   const mover=active(frame).find(row=>previous.has(row.id)&&row.rank<previous.get(row.id));
   const rival=mover&&frame.ranked.find(row=>row.rank===mover.rank+1&&!row.finished);
   if(mover&&rival)pass=[mover,rival];
  }
  const remaining=shot?.ids.filter(id=>frame.rows.some(row=>row.id===id&&!row.finished)).length||0;
  if(!shot||shot.kind==='launch'||remaining<2||held>=6000||pass&&held>=2600){
   shot=make(pass?'pass':'battle',pass||closestStadiumBattle(frame),frame.elapsed);chosenAt=frame.elapsed;
  }
  last=frame;return shot;
 },reset(){last=null;shot=null;run='';mode=''}};
}

export function stadiumShotWindow(rows,{finish=false,worldWidth=2300}={}){
 const low=Math.min(...rows.map(row=>row.progress)),high=Math.max(...rows.map(row=>row.progress));
 if(!rows.length||!Number.isFinite(low))return {span:worldWidth*1.2,start:-worldWidth*.1};
 const span=Math.max(finish?240:320,(high-low)*worldWidth+220,finish?(1-low)*worldWidth+150:0);
 return {span,start:Math.max(0,(low+high)*worldWidth/2-span*.42)};
}

export function stadiumCelebration(age,index,motion=true){
 if(!motion||!Number.isFinite(age)||age<0||age>1500)return {lift:0,lean:0,turn:1};
 const t=age/1500,envelope=Math.sin(t*Math.PI);
 return index%3===0?{lift:Math.abs(Math.sin(t*Math.PI*2))*7*(1-t),lean:-.1*envelope,turn:1}
  :index%3===1?{lift:envelope*3,lean:-.2*envelope,turn:1}
  :{lift:envelope*4,lean:.07*envelope,turn:1-.32*envelope};
}
