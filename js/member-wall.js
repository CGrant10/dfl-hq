import { db } from './supabase.js';
import { currentMember } from './members.js';
import { esc, toast } from './ui.js';
import { shrinkToDataUri } from './image-field.js';

export async function loadWall(limit=12){
  const {data,error}=await db().from('member_wall_posts').select('id,member_id,body,image,created_at,members(display_name,profile_image)').order('created_at',{ascending:false}).limit(limit);
  if(error){ if(/member_wall_posts|schema cache|does not exist/i.test(error.message||'')) return null; throw error; }
  return data||[];
}
export function wallCard(rows){
  if(rows==null)return '';
  const me=currentMember();
  return `<section class="block wall"><h2 class="section-title">The Wall</h2><div class="card"><div class="card-body">
    ${me?`<form data-wall-form><textarea name="body" maxlength="500" rows="2" placeholder="Talk your shit…"></textarea><div class="row-between"><label class="btn ghost small"><input data-wall-image type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden>📷 Picture</label><span class="muted tiny" data-wall-file></span><button class="btn small" type="submit">Post</button></div><img data-wall-preview class="wall-preview hidden" alt=""></form>`:''}
    <div class="wall-posts">${rows.length?rows.map(postHtml).join(''):`<span class="muted">Nothing yet. Be the first idiot.</span>`}</div>
  </div></div></section>`;
}
function postHtml(r){const m=r.members||{};return `<article class="wall-post"><div class="wall-head"><strong>${esc(m.display_name||'Member')}</strong><span class="muted tiny">${esc(new Date(r.created_at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))}</span></div>${r.body?`<p>${esc(r.body)}</p>`:''}${r.image?`<img class="wall-photo" src="${esc(r.image)}" alt="Posted by ${esc(m.display_name||'member')}">`:''}${r.image?`<button class="linkbtn" type="button" data-submit-broadcast="${r.id}">📺 Submit to Broadcast</button>`:''}</article>`}
export function wireWall(root,onChanged){
  let image=''; const form=root.querySelector('[data-wall-form]');
  root.querySelector('[data-wall-image]')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const note=root.querySelector('[data-wall-file]');try{note.textContent='Shrinking…';image=await shrinkToDataUri(f,'backdrop');note.textContent='Ready';const p=root.querySelector('[data-wall-preview]');p.src=image;p.classList.remove('hidden')}catch(err){note.textContent=err.message||'Could not read picture'}});
  form?.addEventListener('submit',async e=>{e.preventDefault();const me=currentMember();if(!me)return;const body=String(new FormData(form).get('body')||'').trim();if(!body&&!image)return toast('Write something or add a picture',true);const {error}=await db().from('member_wall_posts').insert({member_id:me.id,body,image:image||null});if(error)return toast(error.message,true);toast('Posted');onChanged?.()});
  root.querySelectorAll('[data-submit-broadcast]').forEach(btn=>btn.addEventListener('click',async()=>{const me=currentMember();if(!me)return;const id=Number(btn.dataset.submitBroadcast);const {data,error}=await db().from('member_wall_posts').select('image,body').eq('id',id).single();if(error||!data?.image)return toast('Could not load that picture',true);const {error:err}=await db().from('broadcast_submissions').insert({member_id:me.id,image:data.image,caption:String(data.body||'').slice(0,180)});if(err)return toast(err.message,true);btn.disabled=true;btn.textContent='Submitted ✓';toast('Sent to Broadcast Inbox')}));
}
