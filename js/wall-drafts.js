// Text drafts are private to this browser and selected member; images stay out
// of localStorage so a large photo cannot exhaust the browser's storage quota.
const PREFIX='dfl.wall.draft.v1.';
const MAX_AGE=30*24*60*60*1000;
const draftKey=(memberId,thread)=>PREFIX+memberId+'.'+thread;
export function readWallDraft(memberId,thread,storage,now=Date.now()){
  if(memberId==null)return '';
  try{storage??=globalThis.localStorage;const value=JSON.parse(storage.getItem(draftKey(memberId,thread)));return typeof value?.body==='string'&&Number.isFinite(value?.savedAt)&&now-value.savedAt<MAX_AGE?value.body.slice(0,500):''}catch{return ''}
}
export function saveWallDraft(memberId,thread,body,storage,now=Date.now()){
  if(memberId==null)return false;
  try{storage??=globalThis.localStorage;const key=draftKey(memberId,thread),text=String(body||'').slice(0,500);if(!text.trim())storage.removeItem(key);else storage.setItem(key,JSON.stringify({body:text,savedAt:now}));return true}catch{return false}
}
export function clearWallDraft(memberId,thread,storage){
  try{storage??=globalThis.localStorage;storage?.removeItem(draftKey(memberId,thread))}catch{/* Private storage may be disabled. */}
}
export function wireWallDraft(form,memberId,thread){
  const area=form?.querySelector('textarea');if(!area)return;
  const restored=readWallDraft(memberId,thread);if(restored&&!area.value)area.value=restored;
  const note=document.createElement('p');note.className='muted tiny wall-draft-note';note.setAttribute('role','status');
  const discard=document.createElement('button');discard.type='button';discard.className='btn ghost small';discard.textContent='Discard draft';
  note.append(document.createTextNode(restored?'Draft restored on this device. ':'Text drafts stay on this device. '),discard);area.after(note);
  const update=()=>{const ok=saveWallDraft(memberId,thread,area.value);const text=area.value.trim()?(ok?'Draft saved on this device. ':'Draft storage unavailable on this device. '):'Text drafts stay on this device. ';if(note.firstChild.textContent!==text)note.firstChild.textContent=text;discard.hidden=!area.value.trim()};
  area.addEventListener('input',update);discard.hidden=!area.value.trim();
  discard.addEventListener('click',()=>{if(area.value.trim()&&!confirm('Discard this text draft?'))return;area.value='';clearWallDraft(memberId,thread);update();area.focus()});
}
