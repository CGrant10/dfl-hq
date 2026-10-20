// Read-only broadcast geometry. The shared frame is the sole race authority.
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
export function stadiumShowdown(shot,frame,{camera='auto',motion=true,state='running',replay=false,activeKey=null}={}){
 if(!motion||camera!=='auto'||state==='idle'||state==='finished'&&!replay||frame.countdown||frame.finished||!['battle','pass','photo','finish'].includes(shot?.kind))return null;
 const rows=shot.ids.slice(0,2).map(id=>frame.rows.find(row=>row.id===id));
 if(rows.length!==2||rows.some(row=>!row||!Number.isFinite(row.progress)||row.progress<0||row.progress>1)||rows[0].id===rows[1].id)return null;
 if(Math.abs(rows[0].index-rows[1].index)<3)return null;
 // Keep panel identities stable when the actual lead changes.
 rows.sort((a,b)=>a.index-b.index);
 const key=rows.map(row=>row.id).join(':');
 if(Math.abs(rows[0].progress-rows[1].progress)>(key===activeKey ? .05 : .03))return null;
 const leader=rows[0].progress===rows[1].progress?(rows[0].rank<rows[1].rank?rows[0]:rows[1]):rows[0].progress>rows[1].progress?rows[0]:rows[1];
 return {key,rows,leaderId:leader.id,gapYards:Math.abs(rows[0].progress-rows[1].progress)*100};
}
export function stadiumShowdownLane(index,{top,height,width=800}){
 const columns=width<650,band=columns?height:height/2,scale=clamp((band-(columns?44:28))/66,.3,1.7),laneTop=top+(columns?0:index*band);
 return {left:columns?index*width/2:0,width:columns?width/2:width,ground:laneTop+band-Math.max(9,6*scale+2),scale,top:laneTop,height:band,columns};
}
export function stadiumDepth(panX,{worldWidth=2300,motion=true}={}){
 const travel=motion&&Number.isFinite(panX)?clamp(panX/worldWidth,0,1):0;
 return travel?{far:-18*travel,near:-42*travel,sideline:-74*travel}:{far:0,near:0,sideline:0};
}

// Reserve space for the helmet/badge and feet before zooming into an edge lane.
export function stadiumVerticalCamera({top,height,count,laneHeight,zoom,focus,overview=false}){
 const head=overview?18:Math.min(64,Math.max(32,height*.16)),foot=overview?12:Math.min(16,Math.max(8,height*.04)),usable=Math.max(24,height-head-foot),world=count*laneHeight;
 const scale=usable/world*zoom,half=world/(2*zoom),center=clamp(focus,half,world-half);
 return {scale,center,middle:top+head+usable/2};
}

// Only current ranks are suitable for the on-camera identity strip.
export function stadiumCameraRacers(shot,frame,{camera='auto',state='running',replay=false}={}){
 if(camera==='field'||state==='idle'||frame.countdown||!shot||['field','launch'].includes(shot.kind))return [];
 const rows=shot.ids.map(id=>frame.rows.find(row=>row.id===id)).filter(Boolean);
 return (state==='finished'&&!replay&&camera==='auto'?frame.ranked.slice(0,1):rows.slice(0,2)).map(row=>({id:row.id,index:row.index,rank:row.rank}));
}
