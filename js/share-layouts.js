import {shareLayoutView} from './share-layout-model.js';

/** Purpose-built compositions. Values come from the already evaluated card. */
export function tailoredShareCanvas(spec,{style='clean',photo=null,photos=new Map(),selected='',format='compact',kit}) {
 const view=shareLayoutView(spec,format);if(!view)return null;
 const {FONT,DISPLAY,lines,text,display,rule,photoHero,palette,paper,sealImage}=kit;
 const p=palette(style),RED='#C8102E',YELLOW='#EFC94C',canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 let ctx=canvas.getContext('2d');const paint=[];
 const wrap=(value,width,size,font=FONT,weight=500)=>lines(ctx,value,width,size,font,weight);
 const block=(value,x,y,width,size=30,{limit=Infinity,color=p.ink,font=FONT,weight=500,leading=size*1.35,align='left'}={})=>{
  const all=wrap(value,width,size,font,weight),shown=all.slice(0,limit);
  if(all.length>limit&&shown.length){let last=shown.at(-1);ctx.font=`${weight} ${size}px ${font}`;while(last&&ctx.measureText(last+'…').width>width)last=last.slice(0,-1);shown[shown.length-1]=last+'…'}
  paint.push(()=>text(ctx,shown.join('\n'),x,y,width,size,{font,weight,color,leading,align}));return shown.length*leading;
 };
 const big=(value,x,y,width,size=90,color=p.ink,align='left')=>paint.push(()=>display(ctx,value,x,y,width,size,{color,align}));
 const divider=(y,color=p.line,x=64,width=952)=>paint.push(()=>rule(ctx,y,color,x,width));
 const tiny=(value,x,y,width=952,options={})=>block(value,x,y,width,22,{weight:600,color:p.muted,...options});
 const row=(value,x,y,width,{size=28,limit=Infinity}={})=>{
  const nameWidth=value.value==null?width:width-160,h=block(value.name,x,y+size,nameWidth,size,{weight:600,limit});
  if(value.value!=null)big(value.value,x+width,y+size+2,150,36,p.ink,'right');
  const detail=block(value.detail,x,y+h+size,width,23,{color:p.muted,limit});return Math.max(68,h+detail+size+14);
 };
 const section=(section,y)=>{
  divider(y);y+=42;y+=tiny(String(section.label||'').toUpperCase(),64,y)+16;
  for(const r of section.rows||[])y+=row(r,64,y,952);
  if(section.copy)y+=block(section.copy,64,y+28,952,27,{leading:38})+28;
  return y+24;
 };
 const featured=()=>{
  if(!photo)return null;
  const player=spec.players?.find(p=>String(p.id)===String(selected))||spec.players?.[0];return player;
 };
 let end;

 if(view.template==='trade') {
  const t=view.trade,heroEnd=style==='photo'?536:336;
  if(photo){paint.push(()=>photoHero(ctx,photo,152,348,{x:560,width:520}));const player=featured();block(player?.name,1016,507,450,23,{color:p.muted,align:'right'})}
  tiny('DFLyzer verdict',64,153,470);
  big(`${t.call||'TRADE'}.`,64,294,style==='photo'?480:650,154,t.callTone==='pass'?RED:style==='photo'?YELLOW:p.ink);
  if(style==='photo'){big(`${t.fairness}%`,64,397,200,76,YELLOW);tiny('TRADE BALANCE',270,391,255)}
  else{tiny('TRADE BALANCE',1016,182,280,{align:'right'});big(`${t.fairness}%`,1016,289,280,108,p.ink,'right')}
  divider(heroEnd-12);let y=heroEnd+24;
  for(let i=0;i<view.columns.length;i+=2){
   const group=view.columns.slice(i,i+2),width=group.length===1?952:456,ends=[];
   group.forEach((c,j)=>{
    const x=64+j*496;let cy=y;
    cy+=block(c.from,x,cy+32,width,32,{weight:600,limit:view.full?Infinity:2});
    cy+=tiny(`TO ${c.to.toUpperCase()}`,x,cy+27,width,{limit:view.full?Infinity:2})+18;
    if(!c.players.length)cy+=block('No players',x,cy+28,width,27,{color:p.muted})+20;
    for(const player of c.players){
     const img=style==='photo'?photos.get(String(player.id)):null,nx=x+(img?82:0),available=width-(img?82:0)-88,start=cy;
     if(img)paint.push(()=>{ctx.save();ctx.filter='grayscale(1)';ctx.drawImage(img,x,start,72,72*img.height/img.width);ctx.restore()});
     const h=block(player.name,nx,cy+32,available,32,{weight:600,limit:view.full?Infinity:2});
     big(player.value,x+width,cy+34,80,38,p.ink,'right');const detail=block(player.meta,nx,cy+h+29,width-(img?82:0),23,{color:p.muted});cy+=Math.max(88,h+detail+34);
    }
    if(c.omitted)cy+=block(`+ ${c.omitted} more player${c.omitted===1?'':'s'}`,x,cy+27,width,24,{color:p.muted})+16;
    ends.push({c,x,cy});
   });const totalY=Math.max(...ends.map(e=>e.cy));ends.forEach(({c,x})=>{divider(totalY+5,p.line,x,width);tiny('PACKAGE VALUE',x,totalY+46,width-104);big(c.total,x+width,totalY+53,100,48,p.ink,'right')});y=totalY+114;
  }
  divider(y);y+=46;y+=tiny('LINEUP IMPACT',64,y)+18;
  const count=Math.max(1,t.deltas.length),dw=952/count;let deltaH=0;
  t.deltas.forEach((d,i)=>{const x=64+i*dw,h=block(d.team,x,y+26,dw-22,25,{weight:600,limit:view.full?Infinity:2});big(`${Number(d.delta)>0?'+':''}${Number(d.delta||0).toFixed(1)}`,x,y+h+67,dw-22,55);tiny('PTS / WEEK',x,y+h+99,dw-22);deltaH=Math.max(deltaH,h+122)});y+=deltaH;
  for(const remark of view.remarks){divider(y);y+=48;y+=block(remark.title,64,y,952,28,{weight:600,limit:view.full?Infinity:2})+12;if(view.full&&remark.copy)y+=block(remark.copy,64,y+27,952,27,{leading:38})+32;y+=26}
  end=y;
 }else if(view.template==='ticket') {
  const t=view.ticket;
  big('SPORTSBOOK',64,265,952,116);
  block(`${t.picks.length===1?'SINGLE':`${t.picks.length}-PICK`} ENTRY`,64,331,450,31,{weight:600});
  big(view.status.toUpperCase(),1016,331,470,58,t.status==='lost'?RED:p.ink,'right');divider(376);
  const stats=[['ODDS',t.odds,''],['STAKE',t.stake,'SIN'],[view.returnLabel.toUpperCase(),view.returnValue,view.returnValue==='—'?'':'SIN']];
  stats.forEach(([label,value,unit],i)=>{const x=64+i*330;tiny(label,x,423,292);big(value,x,530,292,96);tiny(unit,x,564,292);if(i)paint.push(()=>{ctx.fillStyle=p.line;ctx.fillRect(x-24,401,1,163)})});
  divider(593);tiny('YOUR PICKS',64,636);let y=665;
  view.picks.forEach((pick,i)=>{
   const n=block(pick.pick,124,y+32,722,32,{weight:600,limit:view.full?Infinity:2}),m=block(pick.market,124,y+n+31,722,24,{color:p.muted,limit:view.full?Infinity:2});
   big(String(i+1).padStart(2,'0'),64,y+32,44,32,p.muted);tiny(pick.status.toUpperCase(),1016,y+26,145,{align:'right',color:pick.status==='lost'?RED:p.muted});big(pick.odds,1016,y+74,145,42,p.ink,'right');
   const h=Math.max(110,n+m+48);divider(y+h-14);y+=h;
  });
  if(view.omitted)y+=block(`+ ${view.omitted} more pick${view.omitted===1?'':'s'}`,64,y+29,952,26,{color:p.muted})+32;
  if(t.status==='open'){y+=32;const must=t.picks.length===1?'THE PICK MUST LAND':`ALL ${t.picks.length} PICKS MUST LAND`;y+=tiny(must,64,y)+10;y+=block(`${Number(t.profit).toLocaleString('en-US')} SIN potential profit`,64,y+28,952,28,{weight:600})+28}
  end=y;
 }else if(view.template==='recap') {
  const r=view.recap,hero=r.hero||{};
  if(photo)paint.push(()=>photoHero(ctx,photo,154,510,{x:540,width:650}));
  const heroWidth=450;
  block(r.title||spec.headline,64,246,heroWidth,102,{font:DISPLAY,weight:400,leading:112,limit:2});
  tiny(String(hero.label||'Week highlights').toUpperCase(),64,428,heroWidth);
  const nameHeight=block(hero.name,64,478,heroWidth,36,{weight:600,limit:view.full?Infinity:2}),valueY=style==='photo'?Math.max(627,478+nameHeight+120):Math.max(580,478+nameHeight+40);
  if(hero.value!=null)big(hero.value,style==='photo'?64:1016,valueY,heroWidth,124,style==='photo'?YELLOW:p.ink,style==='photo'?'left':'right');
  const detailHeight=hero.detail?block(hero.detail,64,valueY+42,style==='photo'?heroWidth:952,24,{color:p.muted,limit:view.full?Infinity:2}):0;
  if(photo)block(featured()?.name,1016,valueY+66,440,23,{align:'right',color:p.muted});
  let y=Math.max(style==='photo'?710:650,valueY+detailHeight+70);
  if(r.mvp){divider(y);tiny(r.mvp.label||'LEAGUE MVP',64,y+39,250);block(r.mvp.name,330,y+43,470,31,{weight:600,limit:2});big(`${Number(r.mvp.points).toFixed(2)} PTS`,1016,y+47,230,42,style==='photo'?YELLOW:p.ink,'right');y+=92}
  for(const h of view.highlights){divider(y);y+=34;y+=tiny(h.label.toUpperCase(),64,y)+4;const nameHeight=block(h.name,64,y+30,h.value==null?952:700,30,{weight:600,limit:view.full?Infinity:2});if(h.value!=null)big(h.value,1016,y+33,235,42,p.ink,'right');y+=nameHeight;const detailHeight=block(h.detail,64,y+25,952,24,{color:p.muted,limit:view.full?Infinity:2});y+=detailHeight+24}
  if(view.omitted)y+=block(`+ ${view.omitted} more highlight${view.omitted===1?'':'s'}`,64,y+26,952,24,{color:p.muted})+28;
  if(view.full&&r.story){divider(y);y+=44;y+=block(r.story,64,y+28,952,27,{leading:38})+48}
  for(const s of view.sections)y=section(s,y);
  end=y;
 }else if(view.template==='profile') {
  const d=view.profile;tiny('SCOUTING REPORT',64,183);big(d.who.toUpperCase(),64,309,952,116);
  const teamH=block(d.team,64,366,952,34,{color:p.muted,limit:view.full?Infinity:2});let y=Math.max(405,376+teamH);
  divider(y-15);tiny('CAREER RECORD',64,y+34,550);tiny('WIN PERCENTAGE',1016,y+34,330,{align:'right'});
  big(d.record,64,y+153,580,128);big(d.winPct==null?'—':`${Math.round(d.winPct*100)}%`,1016,y+153,330,108,p.ink,'right');y+=190;divider(y);
  [['POINTS',d.points],['AVG FINISH',d.avgFinish],['SEASONS',d.seasons]].forEach(([label,value],i)=>{const x=64+i*330;tiny(label,x,y+40,290);big(value,x,y+116,290,68)});y+=160;
  const columns=[['TROPHY CASE',view.trophies,'No hardware yet'],['CRIME SCENE',view.crimes,'No receipts yet']],ends=[];
  columns.forEach(([label,receipts,empty],i)=>{const x=64+i*496;divider(y,p.line,x,456);let cy=y+36;cy+=tiny(label,x,cy,456)+20;if(!receipts.length)cy+=block(empty,x,cy+26,456,26,{color:p.muted})+24;for(const [name,value]of receipts)cy+=row({name,value},x,cy,456,{size:26,limit:view.full?Infinity:2});ends.push(cy)});y=Math.max(...ends)+30;
  if(view.omitted)y+=block(`+ ${view.omitted} more career receipt${view.omitted===1?'':'s'}`,64,y+25,952,24,{color:p.muted})+16;
  divider(y);y+=34;y+=tiny('DFLyzer VERDICT',64,y)+8;y+=block(d.verdict,64,y+29,952,28,{limit:view.full?Infinity:3,leading:38})+30;end=y;
 }

 const footerLines=wrap(spec.footer||spec.kind,952,20),footerSpace=Math.max(116,60+footerLines.length*27);
 canvas.height=Math.max(1350,Math.ceil(end+footerSpace));ctx=canvas.getContext('2d');ctx.textBaseline='alphabetic';
 canvas.dataset.shareLayout='3';canvas.dataset.shareKind=spec.kind;canvas.dataset.shareStyle=style;canvas.dataset.shareTemplate=view.template;canvas.dataset.shareFormat=format;
 ctx.fillStyle=p.bg;ctx.fillRect(0,0,1080,canvas.height);if(style==='clean'&&paper)ctx.drawImage(paper,0,0,1080,canvas.height);
 const seal=sealImage();if(seal)ctx.drawImage(seal,64,40,72,72);display(ctx,'DFL HQ',seal?154:64,99,300,44,{color:p.ink});
 text(ctx,wrap(spec.context||spec.kind,520,22).slice(0,2).join('\n'),1016,84,520,22,{color:p.muted,align:'right',leading:29});
 [RED,YELLOW,'#fff',style==='photo'?'#777':p.ink].forEach((ink,i)=>{ctx.fillStyle=ink;ctx.fillRect((seal?154:64)+i*34,116,25,5)});
 paint.forEach(draw=>draw());const footerY=canvas.height-38-(footerLines.length-1)*27;rule(ctx,footerY-42,p.line);text(ctx,spec.footer||spec.kind,64,footerY,952,20,{color:p.muted});
 return canvas;
}
