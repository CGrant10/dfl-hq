// One member photo preference across team cards, profiles, feeds and race rosters.
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
