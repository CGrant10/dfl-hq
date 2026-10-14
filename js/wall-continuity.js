// Preserve conversations and the composer while the surrounding feed changes.
export function patchWall(root, html, { resetComposer = false } = {}) {
  const template=document.createElement('template');template.innerHTML=html;
  const fresh=template.content.querySelector('.wall'),existing=root.querySelector('.wall');
  if(!fresh||!existing){root.replaceChildren(template.content);return;}
  const posts=existing.querySelector('.wall-posts'),desired=fresh.querySelector('.wall-posts');
  const old=new Map([...posts.querySelectorAll('[data-wall-post]')].map(post=>[post.dataset.wallPost,post]));
  // Keep the visible reading position even when a new post arrives above it.
  const anchor=[...posts.children].find(post=>post.getBoundingClientRect().bottom>0);
  const anchorTop=anchor?.getBoundingClientRect().top;
  const ordered=[...desired.children];
  for(const [index,next] of ordered.entries()){
    const previous=old.get(next.dataset.wallPost);
    if(!previous)continue;
    const edit=previous.querySelector('[data-wall-edit-form]');
    if(edit&&!edit.classList.contains('hidden')){ordered[index]=previous;continue;}
    const liveThread=previous.querySelector('[data-wall-thread]'),freshThread=next.querySelector('[data-wall-thread]');
    if(liveThread&&freshThread)liveThread.querySelector('summary').textContent=freshThread.querySelector('summary').textContent;
    // Ordinary content can be patched separately from the live conversation.
    for(const selector of ['.wall-head','[data-wall-body-display]','[data-wall-edit-form]','.wall-photo-open','.wall-post-actions']){
      const live=previous.querySelector(selector),replacement=next.querySelector(selector);
      if(live&&replacement){if(live.outerHTML!==replacement.outerHTML)live.replaceWith(replacement);}
      else if(live)live.remove();
      else if(replacement)previous.insertBefore(replacement,previous.querySelector('[data-wall-reactions]'));
    }
    previous.setAttribute('style',next.getAttribute('style')||'');
    ordered[index]=previous;
  }
  // Moving retained posts avoids detaching a focused textarea on each refresh.
  let cursor=posts.firstElementChild;
  for(const node of ordered){
    if(node!==cursor)posts.insertBefore(node,cursor);
    cursor=node.nextElementSibling;
  }
  while(cursor){const next=cursor.nextElementSibling;cursor.remove();cursor=next;}
  if(resetComposer){const form=existing.querySelector('[data-wall-form]');const replacement=fresh.querySelector('[data-wall-form]');if(form&&replacement)form.replaceWith(replacement);}
  if(anchor?.isConnected){const shift=anchor.getBoundingClientRect().top-anchorTop;if(Math.abs(shift)>1)window.scrollBy(0,shift);}
}
