"""Inspect real Canvas characters, pose bounds, identity and warm rendering.
Local static assets only; no app credentials or league writes.
"""
import json,os,tempfile,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
out=Path(os.environ.get('DFL_CHARACTER_REVIEW_DIR',tempfile.mkdtemp(prefix='dfl-character-review-')))
out.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server'])
 page=browser.new_page(viewport={'width':1040,'height':780},service_workers='block')
 page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else r.abort())
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(origin+'/version.txt')
 report=page.evaluate('''async()=>{
 const {drawCharacterRunner:draw,clearCharacterArt}=await import('/js/arena/racer-character-art.js');
 const {defaultRacerKit,racerCharacter}=await import('/js/arena/racer-character.js');
 const {KIT_PRESETS,applyKitPreset,normalizeKit}=await import('/js/arena/racer-kit-model.js');
 const font=new FontFace('Rajdhani','url(/fonts/rajdhani-700.woff2)');await font.load();document.fonts.add(font);
 document.body.innerHTML='<canvas width="1040" height="780"></canvas>';document.body.style.margin='0';
 const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
 ctx.fillStyle='#111923';ctx.fillRect(0,0,1040,780);ctx.textAlign='center';
 for(let i=0;i<12;i++){
  const id=String(i+1),x=i%4*260,y=Math.floor(i/4)*250;
  let kit=defaultRacerKit(id,{number:i+1,jersey:['#b8273c','#e3c172','#388878','#4274aa'][i%4]});
  if(i===4)kit=applyKitPreset(kit,'pokemon:pikachu');if(i===5)kit=applyKitPreset(kit,'pokemon:charizard');if(i===6)kit=applyKitPreset(kit,'anime:naruto');if(i===7)kit=applyKitPreset(kit,'nfl:PHI');
  draw(ctx,kit,{x:x+40,y:y+14,width:180,height:196,identity:id,cycle:i/8});
  ctx.fillStyle='#eee7d7';ctx.font='700 20px Rajdhani,sans-serif';ctx.fillText(id+' · '+racerCharacter(id).name,x+130,y+231);
 }
 window.qaCharacterLineup=canvas.toDataURL();
 const scratch=document.createElement('canvas');scratch.width=112;scratch.height=122;
 const sc=scratch.getContext('2d',{willReadFrequently:true}),checks=[],clipped=[],heights=[];
 const check=(name,pass)=>checks.push({name,pass});
 const inspect=(kit,id,frame,celebrate=false)=>{
  const character=racerCharacter(id),cycle=celebrate?frame/8:(frame/24-character.phase)/character.tempo;
  sc.clearRect(0,0,112,122);draw(sc,kit,{width:112,height:122,identity:id,cycle,celebrate});
  const data=sc.getImageData(0,0,112,122).data;let l=112,t=122,r=0,b=0;
  for(let i=0;i<data.length;i+=4)if(data[i+3]>32){const x=(i/4)%112,y=Math.floor(i/4/112);l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);b=Math.max(b,y+1);}
  if(l<=0||t<=0||r>=112||b>=122)clipped.push({preset:kit.preset,id,frame,celebrate,l,t,r,b});
  heights.push(b-t);return scratch.toDataURL();
 };
 for(let id=1;id<=12;id++){
  const kit=defaultRacerKit(String(id)),poses=new Set();
  for(let frame=0;frame<24;frame++)poses.add(inspect(kit,String(id),frame));
  check('member '+id+' has 24 different complete running poses',poses.size===24);
  const celebrations=new Set();for(let frame=0;frame<8;frame++)celebrations.add(inspect(kit,String(id),frame,true));
  check('member '+id+' has an animated touchdown pose',celebrations.size>=4);
 }
 for(const preset of KIT_PRESETS)for(const id of ['1','2','3','4'])for(let frame=0;frame<24;frame++)inspect(applyKitPreset(defaultRacerKit(id),preset.id),id,frame);
 check('every build, preset, helmet, limb and celebration stays inside its texture',clipped.length===0);
 const sameKit=normalizeKit({number:17}),silhouettes=new Set(['1','2','3','4'].map(id=>inspect(sameKit,id,0)));
 check('identical uniforms still produce four distinct character silhouettes',silhouettes.size===4);
 for(const id of ['1','2','3','4']){
  const kit=defaultRacerKit(id),still=new Set();for(const cycle of [0,.4,20]){sc.clearRect(0,0,112,122);draw(sc,kit,{width:112,height:122,identity:id,cycle,moving:false});still.add(scratch.toDataURL());}
  check('member '+id+' remains still with motion off',still.size===1);
 }
 // Exercise the actual renderer after texture warmup, including shadows/turf.
 clearCharacterArt();const raceCanvas=document.createElement('canvas');raceCanvas.style.cssText='width:390px;height:736px';document.body.append(raceCanvas);
 const {createStadiumRenderer}=await import('/js/arena/stadium-renderer.js'),{buildStadiumRace,stadiumFrame}=await import('/js/arena/stadium-model.js');
 const racers=Array.from({length:12},(_,i)=>({id:String(i+1),number:i+1,kit:defaultRacerKit(String(i+1),{number:i+1})}));
 const model=buildStadiumRace(racers,{engine:'stadium-v1',seed:2407,presentation_version:2,story_duration_ms:60000,order:racers.map(r=>r.id).reverse()},60000);
 const renderer=createStadiumRenderer(raceCanvas,{racers});for(let i=0;i<144;i++){await new Promise(requestAnimationFrame);renderer.draw(stadiumFrame(model,12000+i*16));}
 const samples=[];for(let i=0;i<180;i++){await new Promise(requestAnimationFrame);const frame=stadiumFrame(model,15000+i*16),at=performance.now();renderer.draw(frame);samples.push(performance.now()-at);}
 samples.sort((a,b)=>a-b);const performanceReport={frames:samples.length,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95Ms:samples[Math.floor(samples.length*.95)],maxMs:samples.at(-1)};
 renderer.stop();raceCanvas.remove();
 // 32 racers must reuse their atlas rather than churn a too-small LRU cache.
 const original=sc.drawImage,sources=new Set();sc.drawImage=function(source,...args){sources.add(source);return original.call(this,source,...args)};
 for(let id=1;id<=32;id++)draw(sc,defaultRacerKit(String(id)),{identity:String(id),cycle:0});const firstPass=sources.size;
 for(let round=1;round<3;round++)for(let id=1;id<=32;id++)draw(sc,defaultRacerKit(String(id)),{identity:String(id),cycle:round*.1});
 check('32 racers reuse their textures across animation frames',sources.size===firstPass&&firstPass<=32&&firstPass>0);sc.drawImage=original;
 window.qaDrawMotionStrip=()=>{canvas.height=780;ctx.fillStyle='#111923';ctx.fillRect(0,0,1040,780);for(let row=0;row<4;row++){const id=String(row+1),kit=normalizeKit({number:17,jersey:'#b8273c'});for(let col=0;col<8;col++)draw(ctx,kit,{x:col*130+10,y:row*190+25,width:110,height:120,identity:id,cycle:col*.12});ctx.fillStyle='#eee7d7';ctx.textAlign='left';ctx.font='700 18px Rajdhani,sans-serif';ctx.fillText(racerCharacter(id).name,14,row*190+175);}};
 return {checks,clipped,poseCount:heights.length,minimumInkHeight:Math.min(...heights),performance:performanceReport};
 }''')
 page.locator('canvas').screenshot(path=str(out/'character-lineup.png'))
 page.evaluate('qaDrawMotionStrip()');page.locator('canvas').screenshot(path=str(out/'motion-strip.png'))
 (out/'browser-checks.json').write_text(json.dumps({**report,'errors':errors},indent=2))
 assert not errors,errors
 assert all(check['pass'] for check in report['checks']),[check for check in report['checks'] if not check['pass']]
 print(json.dumps({'checks':len(report['checks']),'poses':report['poseCount'],'clipped':len(report['clipped']),'performance':report['performance'],'errors':errors}),flush=True)
 browser.close()
server.shutdown()
