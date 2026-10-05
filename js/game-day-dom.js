// Keep live rows, focused controls and open disclosures in place while text changes.
const key=node=>!node||node.nodeType!==1?null:node.id?`id:${node.id}`:node.matches('.gameday-player')?node.dataset.gamedayRow?`player:${node.dataset.gamedayRow}`:`player:${node.querySelector('[data-player-roster]')?.dataset.playerRoster}:${node.querySelector('[data-gameday-player]')?.dataset.gamedayPlayer||node.querySelector('.gameday-slot')?.textContent}`:node.matches('[data-moment-key]')?`moment:${node.dataset.momentKey}`:null;
const compatible=(a,b)=>a?.nodeType===b.nodeType&&(a.nodeType!==1||a.tagName===b.tagName);
function update(node,fresh){
 if(node.nodeType!==1){if(node.nodeValue!==fresh.nodeValue)node.nodeValue=fresh.nodeValue;return}
 const disclosure=node.tagName==='DETAILS',opened=node.open,photo=node.matches('.dfl-player-portrait.has-photo,.dfl-team-mark.has-photo')&&node.querySelector('img')?.getAttribute('src')===fresh.querySelector('img')?.getAttribute('src');
 if(photo)fresh.classList.add('has-photo');
 for(const attr of [...node.attributes])if(!fresh.hasAttribute(attr.name)&&!(disclosure&&attr.name==='open')&&attr.name!=='data-page-detail-wired')node.removeAttribute(attr.name);
 for(const attr of fresh.attributes)if(!(disclosure&&attr.name==='open')&&node.getAttribute(attr.name)!==attr.value)node.setAttribute(attr.name,attr.value);
 reconcile(node,fresh);
 if(disclosure)node.open=opened;
 if(node.tagName==='INPUT'&&['checkbox','radio'].includes(node.type))node.checked=fresh.checked;
 if(node.tagName==='SELECT')node.value=fresh.value;
}
function reconcile(root,fresh){
 const keyed=new Map([...root.childNodes].map(n=>[key(n),n]).filter(([k])=>k));let cursor=root.firstChild;
 for(const desired of [...fresh.childNodes]){
  const k=key(desired);let node=k?keyed.get(k):!key(cursor)&&compatible(cursor,desired)?cursor:null;
  if(!compatible(node,desired))node=desired.cloneNode(true);else update(node,desired);
  if(node!==cursor)root.insertBefore(node,cursor);cursor=node.nextSibling;
 }
 while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next}
}
export function patchGameDay(root,html){const template=document.createElement('template');template.innerHTML=html;reconcile(root,template.content)}
