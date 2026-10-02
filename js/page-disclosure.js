// Presentation preferences only; no picks, wagers or league data are stored.
import {esc} from './ui.js';
function preferenceKey(name){let member='guest';try{member=localStorage.getItem('dfl.memberId')||member}catch{}return `dfl.details.v1.${member}.${name}`}
export function disclosure(name,title,description,body,{open=false}={}){
 return `<details class="page-disclosure" data-page-detail="${esc(name)}"${open?' open':''}><summary><span><strong>${esc(title)}</strong>${description?`<small>${esc(description)}</small>`:''}</span></summary><div class="page-detail-body">${body}</div></details>`;
}
export function wirePageDisclosures(root){
 for(const section of root?.querySelectorAll('[data-page-detail]')||[]){
  if(section.dataset.pageDetailWired)continue;section.dataset.pageDetailWired='1';
  const key=preferenceKey(section.dataset.pageDetail);
  try{const value=localStorage.getItem(key);if(value!==null)section.open=value==='open'}catch{}
  let last=section.open;
  section.addEventListener('toggle',()=>{if(section.open===last)return;last=section.open;try{localStorage.setItem(key,last?'open':'closed')}catch{}});
 }
}
export function revealDetails(target){for(let node=target;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true}
export function readPageChoice(name,allowed,fallback){try{const value=localStorage.getItem(preferenceKey(name));return allowed.includes(value)?value:fallback}catch{return fallback}}
export function savePageChoice(name,value){try{localStorage.setItem(preferenceKey(name),value)}catch{}}
