import {esc} from './ui.js';

// Owner identities survive team renames. Artwork is decorative; the member's
// chosen DFL/Sleeper photo and current name remain the identity controls.
const owners=['474419104527151104','983971190597353472','472993319362752512','474392683817725952','474395935292518400','474396077227765760','474396964402753536','474414892816789504','474418636375715840','474421180325949440','474423111463202816','474424604178247680'];
export function teamArtIndex(team){
 const uid=String(team?.identity?.sleeper_user_id||team?.sleeper_user_id||team?.uid||'');
 const index=owners.indexOf(uid);return index<0?null:index;
}
export function teamIllustration(team,{className=''}={}){
 const index=teamArtIndex(team);if(index===null)return '';
 // 1448×1086 source; 362×326 paint windows skip the transparent row gutters.
 const rows=[28/760*100,374/760*100,700/760*100];
 return `<span class="dfl-team-art ${esc(className)}" data-team-art="${index}" aria-hidden="true" style="--team-art-x:${index%4/3*100}%;--team-art-y:${rows[Math.floor(index/4)]}%"></span>`;
}
