// Stable lane order makes a number easy to find even while positions change.
import {drawCharacterRunner} from './racer-character-art.js';
export function mountStadiumRacerRoster(host,{onHighlight=(_id)=>{}}={}){
 const buttons=new Map(),portraits=new WeakMap();let stopped=false,selected=null;
 const click=event=>{const button=event.target.closest('[data-watch-racer]');if(button&&host.contains(button))onHighlight(button.dataset.watchRacer);};
 host.addEventListener('click',click);
 return {update(racers,highlight){
  if(stopped)return;const ids=new Set(racers.map(r=>String(r.id))),firstNames=new Map();
  for(const r of racers){const first=String(r.name||'').trim().split(/\s+/)[0].toLocaleLowerCase();firstNames.set(first,(firstNames.get(first)||0)+1);}
  for(const [id,button] of buttons)if(!ids.has(id)){button.remove();buttons.delete(id);}
  racers.forEach((r,index)=>{
   const id=String(r.id);let button=buttons.get(id);
   if(!button){button=document.createElement('button');button.type='button';button.className='sr-watch-racer';button.dataset.watchRacer=id;const number=document.createElement('b'),name=document.createElement('span'),full=document.createElement('span'),short=document.createElement('span'),art=document.createElement('canvas');number.className='sr-watch-racer-number';name.className='sr-watch-racer-name';full.className='sr-watch-racer-full';short.className='sr-watch-racer-short';short.setAttribute('aria-hidden','true');name.append(full,short);art.className='sr-watch-racer-art';art.width=84;art.height=96;art.setAttribute('aria-hidden','true');button.append(number,art,name);buttons.set(id,button);}
   if(host.children[index]!==button)host.insertBefore(button,host.children[index]||null);
   const name=r.name||`Racer ${index+1}`,number=r.raceNumber??index+1,numberEl=button.querySelector('b'),nameEl=button.querySelector('.sr-watch-racer-full'),shortEl=button.querySelector('.sr-watch-racer-short'),words=name.trim().split(/\s+/),shortName=words.length>1&&firstNames.get(words[0].toLocaleLowerCase())>1?`${words[0]} ${Array.from(words.at(-1))[0]}.`:words[0];
   if(numberEl.textContent!==String(number))numberEl.textContent=String(number);if(nameEl.textContent!==name)nameEl.textContent=name;if(shortEl.textContent!==shortName)shortEl.textContent=shortName;
   const signature=JSON.stringify([id,r.kit]);if(portraits.get(button)!==signature){const canvas=button.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,84,96);drawCharacterRunner(ctx,r.kit,{x:-2,y:0,width:88,height:96,identity:id,moving:false});portraits.set(button,signature);}
   button.setAttribute('aria-label',`Highlight ${name}, racer ${number}`);button.setAttribute('aria-pressed',String(id===String(highlight)));
  });selected=String(highlight);
 },select(id){if(stopped||selected===String(id))return;selected=String(id);for(const [key,button] of buttons)button.setAttribute('aria-pressed',String(key===selected));},stop(){stopped=true;host.removeEventListener('click',click);buttons.clear();}};
}
