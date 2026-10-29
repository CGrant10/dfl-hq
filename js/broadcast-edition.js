/** Keep the Home broadcast short: current league activity, one daily archive feature. */
export function broadcastEdition(stories=[],date='',{now=Date.parse(date+'T12:00:00Z')}={}){
 const staticKinds=new Set(['champion','chip','past','record','fact','lore','season','identity']);
 const archive=[],current=[],seen=new Set(),groups=new Map();
 for(const story of stories){
  const id=story.id||story.key||JSON.stringify([story.kind,story.headline,story.href]);
  if(seen.has(id))continue;seen.add(id);
  const authored=story.source==='manual'||story.source!=='auto'&&(story.pinned||story.featured);
  const stamp=story.publishedAt??story.occurredAt;
  const at=typeof stamp==='number'?stamp:Date.parse(stamp);
  if(!authored&&['news','trade'].includes(story.kind)&&Number.isFinite(at)&&Number(now)-at>3*86400000)continue;
  if(!authored&&(staticKinds.has(story.kind)||story.temporal==='historical')){if(story.kind!=='identity')archive.push(story);continue}
  const group=authored?null:story.generator||story.kind;
  if(group&&groups.has(group)){
   const index=groups.get(group),previous=current[index],oldStamp=previous.publishedAt??previous.occurredAt,oldAt=typeof oldStamp==='number'?oldStamp:Date.parse(oldStamp);
   // Preserve the ranked position, but use the newest confirmed transaction
   // or announcement if a sync supplied several from the same source.
   if(['news','trade'].includes(story.kind)&&Number.isFinite(at)&&Number.isFinite(oldAt)&&at>oldAt)current[index]=story;
   continue;
  }
  if(group)groups.set(group,current.length);
  current.push(story);
 }
 const pinned=current.filter(s=>s.pinned||s.featured),rest=current.filter(s=>!pinned.includes(s));
 const day=Math.floor(Date.parse(date+'T12:00:00Z')/86400000)||0;
 const feature=archive.length?archive[((day%archive.length)+archive.length)%archive.length]:null;
 return [...pinned,...rest.slice(0,Math.max(0,4-pinned.length)),...(feature?[feature]:[])];
}

/** Reading state follows visible story changes, not background fetch timestamps. */
export function broadcastEditionKey(stories=[]){
 return JSON.stringify(stories.map(s=>[s.id||s.key,s.headline,s.subtitle,s.body,s.kicker,s.temporal,s.figure,s.sides,s.href,s.image,s.tradeStory,s.scoutPlayer?.id,s.players?.map(p=>[p.sleeperId||p.name,p.tag,p.availability])]));
}
