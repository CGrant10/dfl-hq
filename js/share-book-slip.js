import {bookSlipView} from './share-book-slip-model.js';
import {slipIcons} from './share-slip-icons.js';
const FONT='"DFL Share Inter",Inter,Arial,sans-serif',MONO='"DFL Slip Mono",monospace',INK='#171715',RED='#c8102e',GREEN='#176b35',MUTED='#55524b',BONE='#f4f1eb';
let paper=null,ready=null;const marks=new Map();
const load=src=>new Promise(resolve=>{const img=new Image();let timer=setTimeout(()=>resolve(null),8000);img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);resolve(null)};img.src=src});
export function prepareBookSlip(){
 if(!ready)ready=Promise.all([
  load(new URL('../images/share/book-ticket-paper-v1.webp',import.meta.url).href).then(img=>{paper=img}),
  ...Object.entries(slipIcons).map(([name,svg])=>load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('fill="currentColor"',`fill="${name==='check-lg'?GREEN:name==='x-lg'?RED:MUTED}"`))).then(img=>{if(img)marks.set(name,img)})),
  typeof FontFace==='function'?new FontFace('DFL Slip Mono',`url(${new URL('../fonts/ibm-plex-mono-regular.woff2',import.meta.url).href})`).load().then(f=>document.fonts.add(f)).catch(()=>{}):null,
  typeof FontFace==='function'?new FontFace('DFL Share Inter',`url(${new URL('../fonts/inter-latin-variable.woff2',import.meta.url).href})`,{weight:'100 900'}).load().then(f=>document.fonts.add(f)).catch(()=>{}):null
 ]);
 return ready;
}

/** Printed ticket export. Content height grows instead of shrinking long names. */
export function bookSlipCanvas(spec,{format='compact',seal=null,wrap}) {
 const view=bookSlipView(spec,format);if(!view)return null;
 const t=view.ticket,c=document.createElement('canvas'),W=1080,L=64,R=1016,I=952,paint=[],runs=[];
 c.width=W;c.height=1350;let ctx=c.getContext('2d');
 const text=(value,x,y,width,size=32,{weight=500,color=INK,align='left',leading=size*1.24,family=FONT,italic=false}={})=>{
  if(value==null||value==='')return 0;
  const lines=wrap(ctx,String(value),width,size,family,weight);
  for(const [i,line]of lines.entries()){
   ctx.font=`${italic?"italic ":""}${weight} ${size}px ${family}`;const w=ctx.measureText(line).width,tx=align==='right'?x-w:align==='center'?x-w/2:x;
   runs.push({text:line,x:tx,y:y+i*leading,width:w,height:leading,size});
   paint.push(()=>{ctx.font=`${italic?"italic ":""}${weight} ${size}px ${family}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(line,x,y+i*leading+size)});
  }return lines.length*leading;
 };
 const rule=(y,dashed=false,color=INK)=>paint.push(()=>{ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash(dashed?[8,8]:[]);ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(R,y);ctx.stroke();ctx.restore()});
 const fill=(x,y,w,h,color)=>paint.push(()=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)});
 const stampColor=t.status==='won'?GREEN:t.status==='lost'?RED:MUTED;
 text('DFL BOOK',222,78,520,82,{weight:850});
 if(t.id){text('TICKET',770,72,252,25,{family:MONO});text(String(t.id).slice(-10).toUpperCase(),770,111,252,26,{family:MONO});}
 else text('SPORTSBOOK',R,112,260,25,{weight:600,align:'right'});
 rule(220,false,RED);fill(L,217,I,8,RED);
 text(t.picks.length===1?'SINGLE':`${t.picks.length}-LEG PARLAY`,W/2,249,I,42,{weight:800,align:'center'});
 const statusWidth=250,ownerWidth=I-statusWidth-30;
 const ownerH=text(t.who,L,315,ownerWidth,68,{weight:850,color:RED});
 const statusY=315;paint.push(()=>{ctx.save();ctx.translate(R-statusWidth/2,statusY+36);ctx.rotate(-.055);ctx.strokeStyle=stampColor;ctx.lineWidth=4;ctx.strokeRect(-statusWidth/2,-39,statusWidth,78);ctx.restore()});
 text(view.status,R-statusWidth/2,statusY+7,statusWidth-24,view.status.length>9?24:46,{weight:850,color:stampColor,align:'center'});
 const date=new Date(t.placedAt||'');const metadata=[Number.isFinite(date.getTime())?date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):null,t.season].filter(Boolean).join(' · ');
 let y=315+Math.max(ownerH,90)+10;
 if(metadata)y+=text(metadata,L,y,I,26,{family:MONO})+16;
 text('SELECTION',L,y,I-170,27,{weight:750});text('ODDS',R,y,170,27,{weight:750,align:'right'});y+=48;rule(y);y+=26;
 if(!view.picks.length)y+=text('No selection details available',L,y,I,30,{color:MUTED})+24;
 view.picks.forEach((pick,i)=>{
  const top=y,icon=marks.get(pick.mark),labelColor=pick.status==='won'?GREEN:pick.status==='lost'?RED:MUTED;
  text(String(i+1).padStart(2,'0'),L,top+4,58,31,{family:MONO});
  if(icon)paint.push(()=>ctx.drawImage(icon,L+66,top+3,40,40));
  const x=L+125,width=I-125-158;
  const nameH=text(pick.pick,x,top,width,50,{weight:800});
  text(pick.odds,R,top,145,46,{weight:800,align:'right'});
  const marketH=text(pick.market,x,top+nameH+6,I-125,31,{leading:39});
  const result=[pick.resultLabel,pick.result].filter(Boolean).join(' · ');
  const resultH=text(result,x,top+nameH+marketH+18,I-125,25,{weight:600,color:labelColor,leading:33});
  y=top+nameH+marketH+resultH+50;rule(y,true);y+=24;
 });
 if(view.omitted)y+=text(`+ ${view.omitted} more picks · Full details includes all selections`,L,y,I,26,{color:MUTED})+26;
 const summary=[['Combined odds',t.odds],['Stake',`${Number(t.stake).toLocaleString('en-US')} SIN`],...(view.profit?[[view.profit.label,`${Number(view.profit.value).toLocaleString('en-US')} SIN`]]:[])];
 const naturalSummary=y;let summaryH=0;for(const [label,value]of summary){summaryH+=Math.max(wrap(ctx,label,530,32,FONT,550).length*40,wrap(ctx,value,380,34,FONT,650).length*42)+10;}
 y=Math.max(y,1350-285-summaryH);
 for(const [label,value]of summary){const h=Math.max(text(label,L,y,530,32,{family:MONO}),text(value,R,y,380,34,{family:MONO,align:'right'}));y+=h+10;}
 y+=15;const totalY=y,totalLabel=view.returnLabel.toUpperCase(),totalValue=view.returnValue==='—'?'—':`${Number(view.returnValue).toLocaleString('en-US')} SIN`;
 const totalH=Math.max(82,wrap(ctx,totalLabel,540,35,FONT,850).length*44+32,wrap(ctx,totalValue,365,52,FONT,850).length*64+22);
 fill(L-12,y-6,I+24,totalH,INK);fill(L-12,y-10,I+24,6,RED);
 text(totalLabel,L+8,y+12,540,35,{weight:850,color:BONE});text(totalValue,R-8,y+5,365,52,{weight:850,color:BONE,align:'right'});y+=totalH+26;rule(y,true,MUTED);y+=22;
 y+=text(view.banter,W/2,y,I,52,{weight:850,italic:true,color:RED,align:'center'})+16;
 const footerY=y;y+=text('DFL BOOK / SIN is play money',W/2,y,I,25,{weight:550,align:'center'})+64;
 c.height=Math.max(1350,Math.ceil(y));ctx=c.getContext('2d');ctx.textBaseline='alphabetic';ctx.fillStyle=BONE;ctx.fillRect(0,0,W,c.height);
 if(paper){
  // Preserve the top/bottom raster perforations while longer tickets grow.
  const sw=paper.naturalWidth,sh=paper.naturalHeight,cap=100;
  ctx.drawImage(paper,0,0,sw,cap,0,0,W,cap);
  ctx.drawImage(paper,0,cap,sw,sh-cap*2,0,cap,W,c.height-cap*2);
  ctx.drawImage(paper,0,sh-cap,sw,cap,0,c.height-cap,W,cap);
 }
 if(seal)ctx.drawImage(seal,L,48,142,142);
 paint.forEach(fn=>fn());
 c.dataset.shareLayout='5';c.dataset.shareTemplate='ticket';c.dataset.shareKind=spec.kind;c.dataset.shareStyle='clean';c.dataset.shareFormat=format;
 c.shareLayoutFacts={text:runs,images:[],width:W,height:c.height,heroBottom:220,footerY,artwork:!!paper,template:'printed-ticket',summaryY:naturalSummary,totalY};
 return c;
}
