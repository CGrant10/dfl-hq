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
