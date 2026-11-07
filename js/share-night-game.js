import {nightGameContent} from './share-night-model.js';
const INK='#f3efe6',GROUND='#0d0b0c',RED='#C8102E',YELLOW='#EFC94C',MUTED='#c6c0b8',LINE='#514a45',GREEN='#77dda6',LOSS='#ff8d98';
export const NIGHT_FONT='"DFL Share Inter",Inter,Arial,sans-serif';
const readyImage=url=>new Promise(resolve=>{const img=new Image();img.crossOrigin='anonymous';const end=()=>resolve(null),timer=setTimeout(end,10000);img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);end()};img.src=url;});
let artwork=null,prepared=null;
// No new request until a share preview needs the chosen design.
export function prepareNightGame(){
 if(!prepared)prepared=Promise.all([
  readyImage(new URL('../images/share/night-game-stadium-v1.webp',import.meta.url).href).then(image=>{artwork=image}),
  typeof FontFace==='function'?new FontFace('DFL Share Inter',`url(${new URL('../fonts/inter-latin-variable.woff2',import.meta.url).href})`,{weight:'100 900'}).load().then(font=>document.fonts.add(font)).catch(()=>{}):null
 ]).then(()=>artwork);
 return prepared;
}

function playerArt(ctx,img,{x,y,width,height}){
 // Fit the actual supplied cutout; never stretch it or hide it behind text.
 const sourceWidth=img.naturalWidth||img.width,sourceHeight=img.naturalHeight||img.height;
 if(!sourceWidth||!sourceHeight)return;
 const layer=document.createElement('canvas');layer.width=width;layer.height=height;const p=layer.getContext('2d'),scale=Math.min(width/sourceWidth,height/sourceHeight),w=sourceWidth*scale,h=sourceHeight*scale;
 p.drawImage(img,(width-w)/2,0,w,h);
 // Alpha compositing softens the source's shoulder/bottom cut, without a boxed glow.
 p.globalCompositeOperation='destination-out';const fade=p.createLinearGradient(0,h*.74,0,h);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'#000');p.fillStyle=fade;p.fillRect(0,0,width,height);ctx.drawImage(layer,x,y);
}

/** Data-driven exports in the selected Night Game art direction. */
export function nightGameShareCanvas(spec,{photo=null,selected='',format='compact',seal=null,wrap}){
 const canvas=document.createElement('canvas'),wide=!!spec.table,W=wide?1600:1080,L=64,R=W-64,inner=W-128,paint=[],runs=[],imageRects=[];
 canvas.width=W;canvas.height=1350;let ctx=canvas.getContext('2d');
 const font=(size,weight=500)=>`${weight} ${size}px ${NIGHT_FONT}`;
 const text=(value,x,y,width,size=32,{weight=500,color=INK,leading=size*1.3,align='left'}={})=>{
  if(value==null||value==='')return 0;
  const lines=wrap(ctx,String(value),width,size,NIGHT_FONT,weight);
  for(const [i,line]of lines.entries()){
   ctx.font=font(size,weight);const actual=ctx.measureText(line).width,tx=align==='right'?x-actual:align==='center'?x-actual/2:x;
   runs.push({text:line,x:tx,y:y+i*leading,width:actual,height:leading,size});
   paint.push(()=>{ctx.font=font(size,weight);ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(line,x,y+i*leading+size)});
  }
  return lines.length*leading;
 };
 const fit=(value,width,size,weight=900,min=32)=>{let px=size;ctx.font=font(px,weight);while(px>min&&ctx.measureText(String(value)).width>width){px-=2;ctx.font=font(px,weight)}return px};
 const big=(value,x,y,width,size=120,options={})=>text(value,x,y,width,fit(value,width,size,options.weight||900),{weight:900,...options});
 const rule=y=>paint.push(()=>{ctx.fillStyle=LINE;ctx.fillRect(L,y,inner,1)});
 const mark=(status,x,y)=>paint.push(()=>{ctx.save();ctx.strokeStyle=status==='won'?GREEN:LOSS;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();if(status==='won'){ctx.moveTo(x,y+11);ctx.lineTo(x+11,y+22);ctx.lineTo(x+31,y-3)}else{ctx.moveTo(x+3,y);ctx.lineTo(x+27,y+24);ctx.moveTo(x+27,y);ctx.lineTo(x+3,y+24)}ctx.stroke();ctx.restore();});
 const row=(row,y,{ticket=false}={})=>{
  const marked=ticket&&['won','lost'].includes(row.mark),x=marked?L+56:L,available=inner-(x-L),valueWidth=row.value==null?0:250,nameWidth=available-(valueWidth?valueWidth+24:0);
  const nameHeight=text(row.name,x,y,nameWidth,44,{weight:700,leading:56});
  let valueHeight=0;if(row.value!=null)valueHeight=big(row.value,R,y,Math.min(valueWidth,inner),54,{align:'right',color:row.mark==='lost'?LOSS:INK});
  if(marked)mark(row.mark,L,y+14);
  const labelHeight=text(row.status,R,y+valueHeight+3,Math.min(valueWidth+30,inner),24,{weight:700,align:'right',color:row.mark==='won'?GREEN:row.mark==='lost'?LOSS:MUTED});
  const detailHeight=text(row.detail,x,y+nameHeight+4,nameWidth,28,{color:MUTED,leading:37});
  const h=Math.max(86,nameHeight+detailHeight+26,valueHeight+labelHeight+26);rule(y+h-10);return h;
 };
 const content=nightGameContent(spec,format),player=(spec.players||[]).find(p=>String(p.id)===String(selected))||spec.players?.[0];
 const hasPhoto=!!photo&&!wide,heroWidth=hasPhoto?472:inner;
 const metadata=[content.status,content.context].filter(Boolean).join(' / ').toUpperCase();
 const heroTop=Math.max(190,48+wrap(ctx,metadata,440,28,NIGHT_FONT,700).length*37+36);
 let y=heroTop;
 const title=String(content.title||'DFL');
 const titleMax=spec.kind==='Matchup final'?122:108;
 const titleSize=Math.min(titleMax,...title.split(/\s+/).filter(Boolean).map(word=>fit(word,heroWidth,titleMax,900,54)));
 const titleLines=wrap(ctx,title,heroWidth,titleSize,NIGHT_FONT,900);
 for(const [i,line]of titleLines.entries()){
  const finalWord=spec.kind==='Matchup final'&&i===titleLines.length-1,size=finalWord?fit(line,heroWidth,148):titleSize,leading=Math.ceil(size*1.04);
  text(line,L,y,heroWidth,size,{weight:900,color:finalWord?RED:INK,leading});y+=leading;
 }
 const titleEnd=y;y+=24;
 if(spec.kind==='Matchup final')paint.push(()=>{ctx.fillStyle=YELLOW;ctx.fillRect(L,titleEnd+8,80,5)});
 const label=content.primary?.label||content.label;
 y+=text(label,L,y,heroWidth,30,{weight:700,leading:40})+14;
 if(content.primary?.value!==''&&content.primary?.value!=null)y+=big(content.primary.value,L,y,heroWidth,138,{leading:150});
 const heroBottom=wide?Math.max(y+32,350):Math.max(y+40,hasPhoto?750:470);
 let credit='';
 if(hasPhoto){
  const rect={x:560,y:heroTop+4,width:456,height:Math.min(490,heroBottom-heroTop-100)};
  imageRects.push(rect);paint.push(()=>playerArt(ctx,photo,rect));
  credit=[player?.name,player?.points==null?null:`${Number(player.points).toFixed(2)} PTS`].filter(Boolean).join(' · ');
  text(credit,R,heroBottom-60,440,27,{weight:600,align:'right',color:MUTED,leading:34});
 }
 y=heroBottom;rule(y);y+=30;
 if(spec.table){
  const table=spec.table,nameWidth=280,colWidth=(inner-nameWidth)/Math.max(1,table.columns.length),labelSize=Math.min(26,colWidth*.32);
  let head=0;table.columns.forEach((col,i)=>{const x=L+nameWidth+i*colWidth,h=text(col.label,x,y,colWidth-8,labelSize,{weight:700});head=Math.max(head,h+text(col.meta,x,y+h+8,colWidth-8,Math.min(22,labelSize),{color:MUTED}));});y+=head+40;
  for(const r of table.rows){
   const nameH=text(r.name,L,y,nameWidth-22,30,{weight:700});let height=nameH+text(r.detail,L,y+nameH+8,nameWidth-22,24,{color:MUTED});
   const rowY=y;r.values.forEach((value,i)=>{const x=L+nameWidth+i*colWidth,kind=r.marks?.[i],good=['birdie','eagle'].includes(kind),bad=['bogey','double'].includes(kind);if(good||bad)paint.push(()=>{const cx=x+colWidth/2-4,cy=rowY+24,size=48;ctx.fillStyle=good?'#473c1c':'#48242b';ctx.strokeStyle=good?YELLOW:LOSS;ctx.lineWidth=1.5;if(good){ctx.beginPath();ctx.arc(cx,cy,size/2,0,Math.PI*2);ctx.fill();ctx.stroke();if(kind==='eagle'){ctx.beginPath();ctx.arc(cx,cy,size/2-4,0,Math.PI*2);ctx.stroke()}}else{ctx.fillRect(cx-size/2,cy-size/2,size,size);ctx.strokeRect(cx-size/2,cy-size/2,size,size);if(kind==='double')ctx.strokeRect(cx-size/2+4,cy-size/2+4,size-8,size-8)}});height=Math.max(height,text(value,x+(colWidth-8)/2,y,colWidth-8,32,{weight:700,align:'center',color:good?YELLOW:bad?LOSS:INK}))});y+=Math.max(90,height+30);rule(y);y+=20;
  }
 }else{
  for(const section of content.sections){
   // The selected MVP's real name/points already appear in the photo credit.
   if(hasPhoto&&player?.points!=null&&section.prominent&&section.rows?.length===1&&section.rows[0].name===player.name)continue;
   if(section.label&&section.label!=='Final scores')y+=text(section.label.toUpperCase(),L,y,inner,27,{color:MUTED,weight:600})+20;
   for(const r of section.rows||[])y+=row(r,y,{ticket:section.label==='Your picks'});
   if(section.copy)y+=text(section.copy,L,y,inner,30,{leading:42})+24;
   y+=20;
  }
 }
 if(content.margin){y+=text(content.margin.toUpperCase(),L,y,inner,34,{color:YELLOW,weight:800})+46;}
 for(const note of content.notes||[])y+=text(note,L,y,inner,30,{leading:42})+18;
 const footerText=content.footer||spec.kind,footerHeight=Math.max(106,wrap(ctx,footerText,content.banter?330:inner,25,NIGHT_FONT,500).length*34+55);
 const banterHeight=content.banter?Math.max(110,wrap(ctx,content.banter,580,80,NIGHT_FONT,900).length*94+22):0;
 canvas.height=Math.max(1350,Math.ceil(y+Math.max(footerHeight,banterHeight)+40));ctx=canvas.getContext('2d');ctx.textBaseline='alphabetic';ctx.fillStyle=GROUND;ctx.fillRect(0,0,W,canvas.height);
 if(artwork){const layer=document.createElement('canvas');layer.width=W;layer.height=heroBottom;const bg=layer.getContext('2d');bg.drawImage(artwork,0,0,W,heroBottom);bg.globalCompositeOperation='destination-out';const fade=bg.createLinearGradient(0,heroBottom*.7,0,heroBottom);fade.addColorStop(0,'#0000');fade.addColorStop(1,'#000');bg.fillStyle=fade;bg.fillRect(0,0,W,heroBottom);ctx.drawImage(layer,0,0);}
 if(seal)ctx.drawImage(seal,L,36,104,104);
 ctx.font=font(60,900);ctx.fillStyle=INK;ctx.fillText('DFL HQ',seal?194:L,105);
 [RED,YELLOW,INK,'#77716a'].forEach((ink,i)=>{ctx.fillStyle=ink;ctx.fillRect((seal?194:L)+i*35,124,26,5)});
 text(metadata,R,48,440,28,{weight:700,align:'right',leading:37});
 const footerY=canvas.height-Math.max(footerHeight,banterHeight)-10;rule(footerY-24);
 if(content.banter){text(content.banter,L,footerY,580,80,{weight:900,color:RED,leading:94});text(footerText,R,footerY+10,330,25,{align:'right',color:MUTED,leading:34});}
 else text(footerText,L,footerY+14,inner,25,{color:MUTED,leading:34});
 paint.forEach(draw=>draw());
 canvas.dataset.shareLayout='4';canvas.dataset.shareKind=spec.kind;canvas.dataset.shareStyle='photo';canvas.dataset.shareFormat=format;canvas.dataset.shareTemplate=spec.template||'';
 canvas.shareLayoutFacts={heroBottom,text:runs,images:imageRects,credit,width:W,height:canvas.height,footerY,artwork:!!artwork};
 return canvas;
}
