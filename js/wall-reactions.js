import {db} from './supabase.js';
import {currentMember,loadMemberDirectory} from './members.js';
import {esc} from './ui.js';
export const WALL_REACTIONS=[['😂','Laugh'],['🔥','Fire'],['💀','Dead'],['🧂','Salty']];
export function reactionHtml(postId){return `<div class="wall-reactions" data-wall-reactions="${esc(postId)}"><div class="wall-reaction-buttons" role="group" aria-label="Post reactions">${WALL_REACTIONS.map(([emoji,label])=>`<button type="button" class="btn ghost small" data-wall-reaction="${emoji}" aria-label="${label} reaction" aria-pressed="false" disabled><span aria-hidden="true">${emoji}</span> <span data-reaction-count>0</span></button>`).join('')}</div><details data-reaction-people hidden><summary>Who reacted</summary><div data-reaction-names></div></details><p class="muted tiny" role="status" data-reaction-status>Loading reactions…</p></div>`;}
export async function wireReactions(root){
 const groups=[...root.querySelectorAll('[data-wall-reactions]')];if(!groups.length)return;
 let members=[];try{members=await loadMemberDirectory()}catch{}
 if(!root.isConnected)return;
 const names=new Map(members.map(member=>[String(member.id),member.display_name]));
 let rows=[];
 const paint=group=>{
   const own=currentMember()?.id,postRows=rows.filter(row=>String(row.post_id)===group.dataset.wallReactions);
   for(const button of group.querySelectorAll('[data-wall-reaction]')){
     const matching=postRows.filter(row=>row.emoji===button.dataset.wallReaction),active=matching.some(row=>String(row.member_id)===String(own)),label=WALL_REACTIONS.find(([emoji])=>emoji===button.dataset.wallReaction)[1];
     button.disabled=false;button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',`${label}: ${matching.length} reaction${matching.length===1?'':'s'}. ${active?'Remove':'Add'} your reaction.`);button.querySelector('[data-reaction-count]').textContent=String(matching.length);
   }
   group.querySelector('[data-reaction-people]').hidden=!postRows.length;
   group.querySelector('[data-reaction-names]').innerHTML=WALL_REACTIONS.map(([emoji,label])=>{const matching=postRows.filter(row=>row.emoji===emoji);return matching.length?`<p><span aria-hidden="true">${emoji}</span> ${esc(label)}: ${matching.map(row=>`<a href="#/profile?id=${esc(row.member_id)}">${esc(names.get(String(row.member_id))||'Member')}</a>`).join(', ')}</p>`:''}).join('');
 };
 const load=async()=>{
   const loaded=[];
   for(let from=0;;from+=1000){const {data,error}=await db().from('member_wall_reactions').select('post_id,member_id,emoji').in('post_id',groups.map(group=>Number(group.dataset.wallReactions))).order('post_id').order('member_id').order('emoji').range(from,from+999);if(error)throw error;loaded.push(...(data||[]));if((data||[]).length<1000)break}
   rows=loaded;if(!root.isConnected)return;groups.forEach(group=>{paint(group);group.querySelector('[data-reaction-status]').textContent=''});
 };
 try{await load()}catch{groups.forEach(group=>{const status=group.querySelector('[data-reaction-status]');status.textContent='Reactions could not load. ';const retry=document.createElement('button');retry.className='btn ghost small';retry.type='button';retry.textContent='Retry';status.append(retry);retry.addEventListener('click',()=>void wireReactions(root),{once:true})});return}
 groups.forEach(group=>{
   let busy=false;
   group.addEventListener('click',async event=>{
     const button=event.target.closest('[data-wall-reaction]');if(!button||busy)return;
     const member=currentMember(),status=group.querySelector('[data-reaction-status]');if(!member){status.textContent='Choose your profile to react.';return}
     const row={post_id:Number(group.dataset.wallReactions),member_id:member.id,emoji:button.dataset.wallReaction},active=button.getAttribute('aria-pressed')==='true';busy=true;button.disabled=true;
     try{const {error}=active?await db().from('member_wall_reactions').delete().match(row):await db().from('member_wall_reactions').insert(row);if(error&&error.code!=='23505')throw error;await load()}
     catch{status.textContent='Could not save that reaction. Try again.'}
     finally{busy=false;button.disabled=false}
   });
 });
}
