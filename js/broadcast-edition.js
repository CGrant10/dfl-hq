/** A full Home edition: fresh stories, both league awards, varied archive picks. */
export const BROADCAST_STORY_LIMIT=9; // The independent daily opener is the tenth slot.
const storyId=story=>story.id||story.key||JSON.stringify([story.kind,story.headline,story.href]);
const dailyRank=(date,story)=>{let hash=2166136261;for(const char of date+'|'+storyId(story))hash=Math.imul(hash^char.charCodeAt(0),16777619);return hash>>>0};
function archivePicks(stories,date,limit){
 const ranked=[...stories].sort((a,b)=>dailyRank(date,a)-dailyRank(date,b)||String(storyId(a)).localeCompare(String(storyId(b))));
 const picked=[],counts=new Map();
 const take=(story,cap)=>{const kind=story.kind||story.generator||'archive';if(picked.length>=limit||picked.includes(story)||(counts.get(kind)||0)>=cap)return;picked.push(story);counts.set(kind,(counts.get(kind)||0)+1)};
 // Cover different subjects before adding a second record or league story.
 for(const story of ranked)take(story,1);
 for(const story of ranked)take(story,['record','lore'].includes(story.kind)?2:1);
 return picked;
}
export function broadcastEdition(stories=[],date='',{now=Date.parse(date+'T12:00:00Z')}={}){
 const staticKinds=new Set(['champion','chip','past','record','fact','lore','season','identity']);
 const archive=[],awards=new Map(),current=[],seen=new Set(),groups=new Map();
 for(const story of stories){
  const id=storyId(story);if(seen.has(id))continue;seen.add(id);
  const authored=story.source==='manual'||story.source!=='auto'&&(story.pinned||story.featured);
  const stamp=story.publishedAt??story.occurredAt,at=typeof stamp==='number'?stamp:Date.parse(stamp);
  if(!authored&&['news','trade'].includes(story.kind)&&Number.isFinite(at)&&Number(now)-at>3*86400000)continue;
  if(!authored&&(staticKinds.has(story.kind)||story.temporal==='historical')){
   if(['champion','chip'].includes(story.kind)){if(!awards.has(story.kind))awards.set(story.kind,story)}
   else if(story.kind!=='identity')archive.push(story);
   continue;
  }
  const group=authored?null:story.generator||story.kind;
  if(group&&groups.has(group)){
   const index=groups.get(group),previous=current[index],oldStamp=previous.publishedAt??previous.occurredAt,oldAt=typeof oldStamp==='number'?oldStamp:Date.parse(oldStamp);
   if(['news','trade'].includes(story.kind)&&Number.isFinite(at)&&Number.isFinite(oldAt)&&at>oldAt)current[index]=story;
   continue;
  }
  if(group)groups.set(group,current.length);current.push(story);
 }
 const pinned=current.filter(story=>story.pinned||story.featured),rest=current.filter(story=>!pinned.includes(story));
 const live=[...pinned,...rest.slice(0,Math.max(0,6-pinned.length))];
 const picks=archivePicks(archive,date,Math.max(0,BROADCAST_STORY_LIMIT-live.length-awards.size));
 // Separate the two awards with another subject when one is available.
 return [...live,...(awards.has('champion')?[awards.get('champion')]:[]),...picks.slice(0,1),...(awards.has('chip')?[awards.get('chip')]:[]),...picks.slice(1)];
}

/** Reading state follows visible story changes, not background fetch timestamps. */
export function broadcastEditionKey(stories=[]){
 return JSON.stringify(stories.map(s=>[s.id||s.key,s.headline,s.subtitle,s.body,s.kicker,s.temporal,s.figure,s.sides,s.href,s.image,s.tradeStory,s.scoutPlayer?.id,s.players?.map(p=>[p.sleeperId||p.name,p.tag,p.availability])]));
}
