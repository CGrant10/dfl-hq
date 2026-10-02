import { db, isAdmin } from './supabase.js';
import { currentMember, loadMemberDirectory } from './members.js';
import { esc, toast } from './ui.js';

// Braces keep display names with spaces or punctuation unambiguous.
export function mentionToken(name){return `@{${name}}`;}
export function mentionHtml(body,members){
  const byName=new Map(members.map(member=>[member.display_name.toLowerCase(),member]));
  return String(body||'').split(/(@\{[^{}]+\})/g).map(part=>{
    const member=part.startsWith('@{')?byName.get(part.slice(2,-1).toLowerCase()):null;
    return member?`<a href="#/profile?id=${esc(member.id)}">@${esc(member.display_name)}</a>`:esc(part);
  }).join('');
}
export function threadHtml(post){
  return `<details class="wall-thread" data-wall-thread="${esc(post.id)}"><summary>Replies (${Number(post.reply_count)||0})</summary><div data-thread-content><p class="muted" role="status">Open to load replies.</p></div></details>`;
}
export async function wireConversations(root){
  let members=[];
  try{members=await loadMemberDirectory()}catch{/* Replies still work when the directory cannot load. */}
  if(!root.isConnected)return;
  const mentions=area=>{
    if(!area||area.parentElement.querySelector('[data-mention-picker]')||!members.length)return;
    const wrapper=document.createElement('div');wrapper.className='wall-mention-control';
    wrapper.innerHTML=`<label>Mention a member <select data-mention-picker><option value="">Choose a name…</option>${members.map(member=>`<option value="${esc(member.display_name)}">${esc(member.display_name)}</option>`).join('')}</select></label>`;
    area.after(wrapper);
    wrapper.querySelector('select').addEventListener('change',event=>{const name=event.target.value;if(!name)return;const start=area.selectionStart,end=area.selectionEnd;area.setRangeText(`${start&&area.value[start-1]!==' '?' ':''}${mentionToken(name)} `,start,end,'end');event.target.value='';area.focus();area.dispatchEvent(new Event('input',{bubbles:true}))});
  };
  root.querySelectorAll('[data-wall-body],[data-wall-edit-body]').forEach(mentions);
  root.querySelectorAll('[data-wall-body-display]').forEach(node=>{node.innerHTML=mentionHtml(node.textContent,members)});
  root.querySelectorAll('[data-wall-thread]').forEach(thread=>{
    const slot=thread.querySelector('[data-thread-content]'),postId=Number(thread.dataset.wallThread);
    let loading=false,loaded=false,shown=50;
    const redraw=async()=>{
      if(loading)return;loading=true;
      slot.innerHTML='<p role="status">Loading replies…</p>';
      try{
        const {data,error}=await db().from('member_wall_replies').select('id,member_id,body,created_at,members(display_name)').eq('post_id',postId).order('created_at',{ascending:true}).order('id',{ascending:true}).limit(shown+1);
        if(error)throw error;
        const rows=data||[],more=rows.length>shown,me=currentMember();
        slot.innerHTML=`<div>${rows.slice(0,shown).map(reply=>`<article class="wall-reply"><a href="#/profile?id=${esc(reply.member_id)}"><strong>${esc(reply.members?.display_name||'Member')}</strong></a> <time class="muted tiny" datetime="${esc(reply.created_at)}">${esc(new Date(reply.created_at).toLocaleString())}</time><p>${mentionHtml(reply.body,members)}</p>${me&&(String(me.id)===String(reply.member_id)||isAdmin())?`<button class="btn ghost small danger" type="button" data-reply-delete="${esc(reply.id)}">Delete reply</button>`:''}</article>`).join('')||'<p class="muted">Start the conversation.</p>'}</div>${more?'<button type="button" class="btn ghost small" data-replies-more>Load more replies</button>':''}${me?`<form class="wall-reply-form"><label for="wall-reply-${postId}">Reply to this post</label><textarea id="wall-reply-${postId}" name="body" rows="2" maxlength="500" required></textarea><p class="muted tiny">Replies and mentions send an in-app alert. Use the name picker to @mention.</p><button class="btn small" type="submit">Reply</button><p class="wall-thread-status" role="status" data-reply-status></p></form>`:'<p class="muted">Pick your name in the top bar to reply.</p>'}`;
        loaded=true;
        mentions(slot.querySelector('textarea'));
        slot.querySelector('[data-replies-more]')?.addEventListener('click',()=>{shown+=50;redraw()});
        slot.querySelectorAll('[data-reply-delete]').forEach(button=>button.addEventListener('click',async()=>{if(!confirm('Delete this reply?'))return;button.disabled=true;const {error}=await db().from('member_wall_replies').delete().eq('id',Number(button.dataset.replyDelete));if(error){button.disabled=false;toast('Could not delete reply. Try again.',true)}else{const summary=thread.querySelector('summary'),count=Number(summary.textContent.match(/\d+/)?.[0]||0);summary.textContent=`Replies (${Math.max(0,count-1)})`;redraw()}}));
        slot.querySelector('form')?.addEventListener('submit',async event=>{
          event.preventDefault();const form=event.target,body=form.elements.body.value.trim(),status=form.querySelector('[data-reply-status]'),button=form.querySelector('[type="submit"]'),actor=currentMember();
          if(!body||!actor){status.textContent='Write a reply and choose your profile first.';return}
          button.disabled=true;status.textContent='Posting reply…';
          try{const {error}=await db().from('member_wall_replies').insert({post_id:postId,member_id:actor.id,body});if(error)throw error;const summary=thread.querySelector('summary'),count=Number(summary.textContent.match(/\d+/)?.[0]||0);summary.textContent=`Replies (${count+1})`;await redraw();slot.querySelector('textarea')?.focus();toast('Reply posted')}
          catch{button.disabled=false;status.textContent='Could not post your reply. Your text is saved here; try again.'}
        });
      }catch{slot.innerHTML='<p role="status">Replies could not load.</p><button type="button" class="btn ghost small" data-thread-retry>Retry</button>';slot.querySelector('button').addEventListener('click',redraw)}
      finally{loading=false}
    };
    thread.addEventListener('toggle',()=>{if(thread.open&&!loaded)redraw()});
    if(thread.open)redraw();
  });
}
