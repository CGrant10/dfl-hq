import {FONT,sealImage,shareCanvasDirect,shareText,saveCanvas} from './share.js';
import {esc} from './ui.js';
const DISPLAY='"DFL Anton",Impact,"Arial Narrow",sans-serif';
const PAPER='#f4f2ee',BLACK='#0b0b0c',RED='#C8102E',YELLOW='#EFC94C';
const images=new Map();
const image=src=>{
 if(images.has(src))return images.get(src);
 const pending=new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';const timer=setTimeout(()=>{img.onload=img.onerror=null;reject(Error('Image unavailable'))},12000);img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);reject(Error('Image unavailable'))};img.src=src}).catch(error=>{images.delete(src);throw error});images.set(src,pending);return pending;
};
let paper=null;
const paperReady=typeof Image==='function'?image(new URL('../images/share/editorial-paper.webp',import.meta.url).href).then(i=>{paper=i}).catch(()=>{}):Promise.resolve();
export const shareFontsReady=typeof FontFace==='function'?new FontFace('DFL Anton',`url(${new URL('../fonts/anton-regular.woff2',import.meta.url).href})`).load().then(f=>{document.fonts.add(f)}).catch(()=>{}):Promise.resolve();
const palette=style=>style==='photo'?{bg:BLACK,ink:PAPER,muted:'#b8b3ab',line:'#38383c',accent:YELLOW}:{bg:PAPER,ink:BLACK,muted:'#55545a',line:'#c7c5c2',accent:BLACK};
function lines(ctx,text,width,size=30,font=FONT,weight=500){
 ctx.font=`${weight} ${size}px ${font}`;const out=[];
 for(const paragraph of String(text||'').split('\n')){let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width<=width){line=next;continue}if(line){out.push(line);line=''}if(ctx.measureText(word).width<=width){line=word;continue}for(const char of word){if(line&&ctx.measureText(line+char).width>width){out.push(line);line=''}line+=char}}if(line)out.push(line)}return out;
}
function text(ctx,value,x,y,width,size=30,{font=FONT,weight=500,color,align='left',leading=size*1.35}={}){
 const wrapped=lines(ctx,value,width,size,font,weight);ctx.fillStyle=color;ctx.textAlign=align;wrapped.forEach((line,i)=>ctx.fillText(line,x,y+i*leading));return wrapped.length*leading;
}
function display(ctx,value,x,y,width,size,{color,align='left'}={}){
 let px=size;ctx.textAlign=align;do{ctx.font=`400 ${px}px ${DISPLAY}`;if(ctx.measureText(String(value)).width<=width||px<=24)break;px-=2}while(px>24);ctx.fillStyle=color;ctx.fillText(String(value),x,y);return px;
}
function rule(ctx,y,color,x=64,width=952){ctx.fillStyle=color;ctx.fillRect(x,y,width,1)}
function rowLayout(ctx,row,width){
 const nameWidth=row.value==null?width:width-220;
 const names=lines(ctx,row.name,nameWidth,32,FONT,600),details=lines(ctx,row.detail,width,25);
 return {row,names,details,height:Math.max(72,names.length*43+details.length*34+24)};
}
function layout(ctx,spec,style){
 const headline=style==='photo'?spec.photoHeadline||spec.headline:spec.headline;
 let headlineSize=style==='photo'?220:236;const headlineWidth=style==='photo'?480:952,headlineFont=DISPLAY,headlineStretch=style==='photo'?.56:1,heroTop=style==='photo'?135:150,headlineLeading=style==='photo'?.94:1;
 // Keep ordinary team names intact; only unusually long unbroken text wraps.
 while(headlineSize>48){ctx.font=`400 ${headlineSize}px ${headlineFont}`;if(String(headline).toUpperCase().split(/\s+/).every(word=>ctx.measureText(word).width*headlineStretch<=headlineWidth))break;headlineSize-=2}
 const titles=lines(ctx,String(headline).toUpperCase(),headlineWidth/headlineStretch,headlineSize,headlineFont,400);
 const heroHeight=Math.max(style==='photo'?730:470,titles.length*headlineSize*headlineLeading+(style==='photo'&&spec.photoCaption?160:64));
 let y=heroTop+heroHeight;
 const results=(spec.results||[]),resultGroups=[];
 for(let i=0;i<results.length;i+=2){const group=results.slice(i,i+2).map(r=>({...r,labels:lines(ctx,r.label,440,31,FONT,600)}));const height=56+Math.max(...group.map(r=>r.labels.length))*42+180;resultGroups.push({y,group,height});y+=height}
 const captioned=style==='photo'&&spec.photoCaption,status=lines(ctx,captioned?'':spec.status,952,26,FONT,600),summary=lines(ctx,captioned?'':spec.summary,952,30);
 const summaryY=y+20;y+=status.length*36+summary.length*42+(captioned?32:44);
 const sections=(spec.sections||[]).map(section=>{const label=lines(ctx,section.label,952,25,FONT,600),rows=(section.rows||[]).map(r=>section.prominent?{row:r,height:style==='photo'?110:156}:rowLayout(ctx,r,952)),copy=lines(ctx,section.copy,952,27);const height=section.prominent&&style==='photo'?128:label.length*34+18+rows.reduce((n,r)=>n+r.height,0)+copy.length*38+34;const top=y;y+=height;return {...section,top,label,rows,copy,height}});
 const footerOffset=Math.max(64,38+(lines(ctx,spec.footer||spec.kind,952,20).length-1)*27);
 return {titles,headlineSize,headlineWidth,headlineFont,headlineStretch,headlineLeading,heroTop,heroHeight,resultGroups,status,summary,summaryY,sections,footerOffset,height:Math.max(1350,y+footerOffset+60)};
}
function photoHero(ctx,img,top,height){
 const w=1080,h=img.height/img.width*w,x=210,y=top+height-h;
 const photo=document.createElement('canvas');photo.width=1080;photo.height=Math.ceil(height);const p=photo.getContext('2d');
 p.filter='grayscale(1) contrast(1.08)';p.shadowColor=RED;p.shadowBlur=10;p.shadowOffsetX=-5;p.drawImage(img,x,y-top,w,h);p.shadowColor=YELLOW;p.shadowOffsetX=5;p.drawImage(img,x,y-top,w,h);p.filter='none';p.shadowBlur=0;p.shadowOffsetX=0;
 p.globalCompositeOperation='destination-out';const fade=p.createLinearGradient(0,height*.79,0,height);fade.addColorStop(0,'#0000');fade.addColorStop(1,'#000');p.fillStyle=fade;p.fillRect(0,0,1080,height);ctx.drawImage(photo,0,top);
}
export function editorialShareCanvas(spec,{style='clean',photo=null,attachPreview=true}={}){
 if(!spec)return null;
 if(spec.table)return tableCanvas(spec,attachPreview);
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;let ctx=canvas.getContext('2d');const l=layout(ctx,spec,style);canvas.height=l.height;ctx=canvas.getContext('2d');ctx.textBaseline='alphabetic';const p=palette(style);canvas.dataset.shareLayout='3';canvas.dataset.shareKind=spec.kind;canvas.dataset.shareStyle=style;
 ctx.fillStyle=p.bg;ctx.fillRect(0,0,1080,canvas.height);if(style==='clean'&&paper)ctx.drawImage(paper,0,0,1080,canvas.height);
 if(style==='photo'&&photo)photoHero(ctx,photo,96,l.heroTop+l.heroHeight-96);
 const seal=sealImage();if(seal)ctx.drawImage(seal,64,40,82,82);display(ctx,'DFL HQ',seal?164:64,106,310,52,{color:p.ink});
 text(ctx,[style==='photo'?spec.status:null,spec.context||spec.kind].filter(Boolean).join(' / '),1016,91,470,23,{color:p.muted,align:'right',leading:30});
 [RED,YELLOW,style==='clean'?BLACK:PAPER,'#66666e'].forEach((ink,i)=>{ctx.fillStyle=ink;ctx.fillRect(seal?164+i*40:64+i*40,125,31,7)});
 ctx.save();ctx.translate(64,l.heroTop+l.headlineSize);ctx.scale(l.headlineStretch,1);text(ctx,l.titles.join('\n'),0,0,l.headlineWidth/l.headlineStretch,l.headlineSize,{font:l.headlineFont,weight:400,color:p.ink,leading:l.headlineSize*l.headlineLeading});ctx.restore();if(style==='photo'&&spec.photoCaption)text(ctx,spec.photoCaption.toUpperCase(),64,l.heroTop+l.headlineSize+(l.titles.length-1)*l.headlineSize*l.headlineLeading+82,480,70,{font:DISPLAY,weight:400,color:YELLOW});else{ctx.fillStyle=RED;ctx.fillRect(64,l.heroTop+l.heroHeight-34,160,7)}
 for(const g of l.resultGroups){
  if(g.group.length>1){ctx.fillStyle=p.line;ctx.fillRect(540,g.y+12,1,g.height-28)}
  g.group.forEach((r,i)=>{const x=64+i*500;const labelH=text(ctx,r.label,x,g.y+44,440,31,{weight:600,color:p.ink,leading:42});display(ctx,r.value,x,g.y+labelH+205,440,190,{color:i?p.muted:p.ink})});
 }
 let sy=l.summaryY;sy+=text(ctx,l.status.join('\n').toUpperCase(),64,sy+27,952,26,{weight:600,color:style==='clean'?RED:YELLOW,leading:36});text(ctx,l.summary.join('\n'),64,sy+30,952,30,{color:p.ink,leading:42});
 for(const s of l.sections){
  if(s.prominent&&style==='photo'){ctx.fillStyle=RED;ctx.fillRect(64,s.top-16,952,4);const r=s.rows[0]?.row;if(r){text(ctx,s.label.join(' ').toUpperCase(),64,s.top+72,250,22,{color:p.muted});display(ctx,r.name.toUpperCase(),330,s.top+80,410,64,{color:p.ink});display(ctx,r.value,1016,s.top+80,250,58,{color:YELLOW,align:'right'})}continue}
  rule(ctx,s.top-8,p.line);let y=s.top+27;y+=text(ctx,s.label.join('\n').toUpperCase(),64,y,952,25,{weight:600,color:p.muted,leading:34});y+=14;
  for(const item of s.rows){const r=item.row;if(s.prominent){ctx.fillStyle=YELLOW;ctx.fillRect(64,y,7,item.height-16);display(ctx,r.name.toUpperCase(),100,y+79,style==='photo'?620:900,76,{color:p.ink});display(ctx,r.value,style==='photo'?1016:100,style==='photo'?y+78:y+137,style==='photo'?290:900,style==='photo'?58:56,{color:style==='photo'?YELLOW:p.ink,align:style==='photo'?'right':'left'});y+=item.height;continue}const nameH=text(ctx,r.name,64,y+32,r.value==null?952:732,32,{weight:600,color:p.ink,leading:43});if(r.value!=null)display(ctx,r.value,1016,y+35,200,38,{color:p.ink,align:'right'});text(ctx,r.detail,64,y+nameH+32,952,25,{color:p.muted,leading:34});y+=item.height}
  text(ctx,s.copy.join('\n'),64,y+27,952,27,{color:p.ink,leading:38});
 }
 const footerY=canvas.height-l.footerOffset;rule(ctx,footerY-40,p.line);text(ctx,spec.footer||spec.kind,64,footerY,952,20,{color:p.muted});
 if(attachPreview)canvas.openSharePreview=options=>openSharePreview(spec,options);
 return canvas;
}

function tableCanvas(spec,attachPreview){
 const table=spec.table,canvas=document.createElement('canvas');canvas.width=1600;let ctx=canvas.getContext('2d');
 const nameWidth=260,columnWidth=1212/Math.max(1,table.columns.length);
 const contextLines=lines(ctx,spec.context,1472,24),top=272+contextLines.length*33;
 const metaSize=Math.min(17,columnWidth*.22),headerHeight=Math.max(80,47+Math.max(0,...table.columns.map(col=>lines(ctx,col.meta,columnWidth-8,metaSize).length))*20);
 const rows=table.rows.map(row=>({...row,height:Math.max(96,30+lines(ctx,row.name,nameWidth-18,27,FONT,600).length*34+lines(ctx,row.detail,nameWidth-18,20).length*27)}));
 canvas.height=Math.max(900,top+headerHeight+rows.reduce((n,r)=>n+r.height,0)+100);ctx=canvas.getContext('2d');canvas.dataset.shareLayout='3';canvas.dataset.shareKind=spec.kind;canvas.dataset.shareStyle='clean';ctx.fillStyle=PAPER;ctx.fillRect(0,0,canvas.width,canvas.height);if(paper)ctx.drawImage(paper,0,0,canvas.width,canvas.height);ctx.textBaseline='alphabetic';
 const seal=sealImage();if(seal)ctx.drawImage(seal,64,34,72,72);display(ctx,'DFL HQ',seal?154:64,88,350,44,{color:BLACK});display(ctx,spec.headline,64,210,1472,82,{color:BLACK});text(ctx,spec.context,64,256,1472,24,{color:'#55545a',leading:33});
 table.columns.forEach((col,i)=>{const x=64+nameWidth+i*columnWidth;text(ctx,col.label,x+columnWidth/2,top+25,columnWidth-8,Math.min(24,columnWidth*.34),{color:BLACK,weight:600,align:'center'});text(ctx,col.meta,x+columnWidth/2,top+51,columnWidth-8,metaSize,{color:'#55545a',align:'center',leading:20})});
 let y=top+headerHeight;
 rows.forEach(row=>{rule(ctx,y,'#c7c5c2',64,1472);const nameHeight=text(ctx,row.name,64,y+39,nameWidth-18,27,{color:BLACK,weight:600,leading:34});text(ctx,row.detail,64,y+39+nameHeight,nameWidth-18,20,{color:'#55545a',leading:27});row.values.forEach((value,j)=>{
  const x=64+nameWidth+j*columnWidth,mark=row.marks?.[j],cx=x+columnWidth/2,cy=y+40,size=Math.min(44,columnWidth-10);
  const good=mark==='birdie'||mark==='eagle',bad=mark==='bogey'||mark==='double';
  if(good||bad){ctx.fillStyle=good?'#efdf96':'#f3cbd0';ctx.strokeStyle=good?'#867014':RED;ctx.lineWidth=1.5;if(good){ctx.beginPath();ctx.arc(cx,cy,size/2,0,Math.PI*2);ctx.fill();ctx.stroke();if(mark==='eagle'){ctx.beginPath();ctx.arc(cx,cy,size/2-4,0,Math.PI*2);ctx.stroke()}}else{ctx.fillRect(cx-size/2,cy-size/2,size,size);ctx.strokeRect(cx-size/2,cy-size/2,size,size);if(mark==='double')ctx.strokeRect(cx-size/2+4,cy-size/2+4,size-8,size-8)}}
  display(ctx,value,cx,y+52,columnWidth-12,29,{color:BLACK,align:'center'});
 });y+=row.height});
 text(ctx,spec.footer||spec.kind,64,canvas.height-48,1472,20,{color:'#55545a'});if(attachPreview)canvas.openSharePreview=options=>openSharePreview(spec,options);return canvas;
}

export function openSharePreview(spec,{filename,title,text:shareCopy}={}){
 document.querySelector('.dfl-share-preview')?.close();const restore=document.activeElement,dialog=document.createElement('dialog');dialog.className='dfl-share-preview';dialog.setAttribute('aria-labelledby','dfl-share-preview-title');
 const players=spec.players||[];let style='clean',selected=players[0]?.id||'',canvas=null,request=0,stopped=false;
 try{if(players.length&&localStorage.getItem('dfl.share.style')==='photo')style='photo'}catch{}
 dialog.innerHTML=`<header><h2 id="dfl-share-preview-title" tabindex="-1" autofocus>Share image</h2><button type="button" class="linkbtn" data-share-close aria-label="Close share image preview">Close</button></header>${players.length?'<div class="dfl-share-styles" role="group" aria-label="Share image style"><button type="button" data-share-style="clean" aria-pressed="true">Without player</button><button type="button" data-share-style="photo" aria-pressed="false">With player</button></div>':''}<div class="dfl-share-player"${style==='photo'?'':' hidden'}><label for="dfl-share-player">Player</label><select id="dfl-share-player">${players.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div><div class="dfl-share-art" data-share-art></div><p class="dfl-share-status" role="status" data-share-status>Preparing image…</p><footer><button type="button" class="btn ghost small" data-share-save disabled>Save image</button><button type="button" class="btn small" data-share-send disabled>Share image</button><button type="button" class="linkbtn" data-share-text>Share text</button></footer>`;
 document.body.append(dialog);dialog.showModal();dialog.querySelector('h2').focus({preventScroll:true});
 const status=dialog.querySelector('[data-share-status]'),art=dialog.querySelector('[data-share-art]');
 const render=async()=>{
  const token=++request;canvas=null;dialog.querySelectorAll('[data-share-send],[data-share-save]').forEach(b=>b.disabled=true);status.textContent='Preparing image…';
  dialog.querySelectorAll('[data-share-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shareStyle===style)));dialog.querySelector('.dfl-share-player').hidden=style!=='photo';
  try{
   await Promise.all([shareFontsReady,paperReady]);let photo=null;if(style==='photo')photo=await image(`https://sleepercdn.com/content/nfl/players/${encodeURIComponent(selected)}.jpg`);
   if(stopped||token!==request)return;canvas=editorialShareCanvas(spec,{style,photo,attachPreview:false});canvas.setAttribute('role','img');canvas.setAttribute('aria-label',shareCopy||title||`${spec.kind} share image`);art.replaceChildren(canvas);status.textContent='';dialog.querySelectorAll('[data-share-send],[data-share-save]').forEach(b=>b.disabled=false);
  }catch{if(stopped||token!==request)return;status.textContent='Player photo unavailable. Choose Without player or share text.';art.replaceChildren()}
 };
 dialog.addEventListener('click',event=>{
  const target=event.target,box=dialog.getBoundingClientRect(),outside=event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom;if((target===dialog&&outside)||target.closest('[data-share-close]')){dialog.close();return}
  const choice=target.closest('button[data-share-style]');if(choice){style=choice.dataset.shareStyle;try{localStorage.setItem('dfl.share.style',style)}catch{}void render();return}
  if(target.closest('[data-share-send]')&&canvas){try{shareCanvasDirect(canvas,filename,{title,text:shareCopy})}catch{status.textContent='Could not share this image. Try Save image or Share text.'}return}
  if(target.closest('[data-share-save]')&&canvas){try{saveCanvas(canvas,filename);status.textContent='Image saved.'}catch{status.textContent='Could not save this image. Try Share text.'}return}
  if(target.closest('[data-share-text]'))shareText({title,text:shareCopy||spec.summary||spec.headline});
 });
 dialog.querySelector('select').addEventListener('change',event=>{selected=event.target.value;void render()});
 const routeChanged=()=>dialog.close();window.addEventListener('hashchange',routeChanged);
 dialog.addEventListener('close',()=>{stopped=true;request++;window.removeEventListener('hashchange',routeChanged);dialog.remove();if(restore?.isConnected)restore.focus({preventScroll:true})},{once:true});
 void render();return 'preview';
}
