import { db } from './supabase.js';
import { esc, toast } from './ui.js';

export async function broadcastInboxHtml(){
  const {data,error}=await db().from('broadcast_submissions').select('id,member_id,image,caption,status,created_at,members(display_name)').eq('status','pending').order('created_at',{ascending:true});
  if(error){if(/broadcast_submissions|schema cache|does not exist/i.test(error.message||''))return '';return `<div class="muted">${esc(error.message)}</div>`}
  const rows=data||[];return `<section class="block" data-broadcast-inbox><h2 class="section-title">Broadcast Inbox <span class="muted tiny">${rows.length} pending</span></h2><div class="broadcast-inbox">${rows.length?rows.map(r=>`<article class="card bx-submit"><img src="${esc(r.image)}" alt=""><div class="card-body"><strong>${esc(r.members?.display_name||'Member')}</strong>${r.caption?`<p>${esc(r.caption)}</p>`:''}<div class="row-between"><label class="tiny">On screen <select data-dwell>${[3,5,8,10,12,15].map(n=>`<option value="${n}"${n===8?' selected':''}>${n}s</option>`).join('')}</select></label><span><button class="btn ghost small" data-reject="${r.id}">Reject</button> <button class="btn small" data-approve="${r.id}">Approve</button></span></div></div></article>`).join(''):`<div class="card"><div class="card-body muted">Inbox clear.</div></div>`}</div></section>`
}
export function wireBroadcastInbox(root,onChanged){
  root.querySelectorAll('[data-approve]').forEach(b=>b.addEventListener('click',async()=>{const card=b.closest('.bx-submit');const dwell=Number(card.querySelector('[data-dwell]')?.value)||8;b.disabled=true;const {error}=await db().rpc('approve_broadcast_submission',{p_id:Number(b.dataset.approve),p_dwell_seconds:dwell});if(error){b.disabled=false;return toast(error.message,true)}toast('Approved for Broadcast');onChanged?.()}));
  root.querySelectorAll('[data-reject]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;const {error}=await db().from('broadcast_submissions').update({status:'rejected',reviewed_at:new Date().toISOString()}).eq('id',Number(b.dataset.reject));if(error){b.disabled=false;return toast(error.message,true)}toast('Rejected');onChanged?.()}));
}
