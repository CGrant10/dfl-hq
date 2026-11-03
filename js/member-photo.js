// One member photo preference across team cards, profiles, feeds and race rosters.
// Compact presentation identity, not an authorization key. Avoid repeating large
// uploaded data URLs in every avatar's DOM; unchanged sources are memoized.
const sourceKeys=new Map();let sourceChars=0;
function imageSourceKey(value){
 const source=String(value||'');if(sourceKeys.has(source))return sourceKeys.get(source);
 let a=2166136261,b=2654435769;
 for(let i=0;i<source.length;i++){const code=source.charCodeAt(i);a=Math.imul(a^code,16777619);b=Math.imul(b^code,2246822507)}
 const key=[source.length.toString(36),(a>>>0).toString(36),(b>>>0).toString(36)].join('-');
 if(source.length<=256000){sourceKeys.set(source,key);sourceChars+=source.length;while(sourceKeys.size>64||sourceChars>512000){const first=sourceKeys.keys().next().value;sourceChars-=first.length;sourceKeys.delete(first)}}
 return key;
}
export const photoSourceKey=sources=>sources.map(imageSourceKey).join(':');
export function sleeperAvatarUrl(value) {
  const raw=String(value||'').trim();
  if(!raw)return null;
  if(/^[a-z0-9_-]{8,128}$/i.test(raw))return `https://sleepercdn.com/avatars/thumbs/${encodeURIComponent(raw)}`;
  try{const url=new URL(raw);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function memberPhotoCandidates(team) {
  const member=team?.identity||team||{};
  const sleeper=[team?.sleeper_team_image||member.sleeper_team_image,team?.sleeper_profile_image||member.sleeper_profile_image].filter(Boolean);
  const dfl=member.profile_image;
  return [...new Set((member.profile_photo_source==='dfl'?[dfl,...sleeper]:[...sleeper,dfl]).filter(Boolean))];
}
export const memberPhoto=member=>memberPhotoCandidates(member)[0]||null;
