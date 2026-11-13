"""Real thermal renderer and score-update handlers; isolated players, no writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_THERMAL_REVIEW_DIR','/workspace/dfl-thermal-review'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='''<!doctype html><html lang="en"><head><base href="/">'''+head+'''<style>
body{margin:0}#view{padding:16px;max-width:620px;margin:auto}#thermal-fixture{position:relative;padding:16px;background:var(--bg);border-block:1px solid var(--line-soft)}
#thermal-fixture .gameday-player{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;min-height:84px;padding:12px 0;border-bottom:1px solid var(--line-soft)}
#thermal-fixture .dfl-player{display:flex;gap:10px;align-items:center}#thermal-fixture .dfl-player-portrait{position:relative;flex:none;width:40px;height:46px;border-radius:6px;overflow:hidden;background:var(--bg-2)}
#thermal-fixture .dfl-player-portrait img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:center top}#thermal-fixture .dfl-player-copy{display:grid;gap:3px;font:600 .8125rem/1.4 var(--font-ui)}
#thermal-fixture .dfl-player-copy small{font:400 .6875rem/1.4 var(--font-ui);color:var(--body-text)}#thermal-fixture .gameday-player-score{font:700 1.25rem/1.3 var(--font-ui)}
</style></head><body><main id="view" class="view" data-route="clubhouse"><h1>Player leaders</h1><section id="thermal-fixture" data-motion="on"></section></main><script type="module">
import {mountScoreVfx} from '/js/score-vfx.js';import {thermalScore,playerScoreTemperature} from '/js/score-temperature.js';import {playerIdentity} from '/js/player-presentation.js';
import {animateScoreChanges} from '/js/game-day-score-motion.js';import {patchGameDay} from '/js/game-day-dom.js';import {patchPlayerCardScore} from '/js/player-card-score.js';
import {pinMode} from '/js/theme.js';import {startUiMotion} from '/js/ui-motion.js';startUiMotion();
window.f={points:29,root:document.querySelector('#thermal-fixture'),stops:[]};window.setTheme=pinMode;
const gpu=WebGLRenderingContext.prototype,upload=gpu.texImage2D,draw=gpu.drawArrays;f.textures=new WeakMap();
gpu.texImage2D=function(...a){if(a[8] instanceof Uint8Array||a[8] instanceof Uint8ClampedArray)f.textures.set(this.getParameter(this.TEXTURE_BINDING_2D),{w:a[3],h:a[4],pixels:new Uint8Array(a[8])});return upload.apply(this,a)};
gpu.drawArrays=function(...a){draw.apply(this,a);const program=this.getParameter(this.CURRENT_PROGRAM);if(!program||this.isContextLost())return;const stamp=this.getUniform(program,this.getUniformLocation(program,'u_time'));if(f.drawStamp!==stamp){f.drawStamp=stamp;f.pulse=0}f.pulse=Math.max(f.pulse||0,this.getUniform(program,this.getUniformLocation(program,'u_pulse'))||0);f.peak=Math.max(f.peak||0,f.pulse);if(!f.probe)return;
 const mask=f.textures.get(this.getParameter(this.TEXTURE_BINDING_2D));if(!mask)return;const [x,y,w,h]=this.getParameter(this.VIEWPORT),data=new Uint8Array(w*h*4);this.readPixels(x,y,w,h,this.RGBA,this.UNSIGNED_BYTE,data);
 let core=0,paintedCore=0,outer=0;for(let j=0;j<h;j++)for(let i=0;i<w;i++){const mx=Math.min(mask.w-1,Math.floor((i+.5)*mask.w/w)),my=Math.min(mask.h-1,Math.floor((h-j-.5)*mask.h/h)),alpha=mask.pixels[(my*mask.w+mx)*4+3],paint=data[(j*w+i)*4+3];if(alpha>250){core++;if(paint>8)paintedCore++}else if(paint>8)outer++}
 f.pixelResults.push({core,paintedCore,outer});if(f.pixelResults.length>=3)f.probe=false;
};
const players=[{id:'7564',name:'Ja’Marr Chase',position:'WR',nflTeam:'CIN',points:29,state:'live',afterHalftime:true},{id:'6794',name:'Justin Jefferson',position:'WR',nflTeam:'MIN',points:6,state:'final'},{id:'2216',name:'Mike Evans',position:'WR',nflTeam:'TB',points:12,state:'final'}];
f.root.innerHTML=players.map((p,i)=>'<article class="gameday-player" data-ui-player-row><button type="button" class="gameday-player-tap">'+playerIdentity(p)+'</button><span class="gameday-player-score" data-gameday-score-key="1:'+p.id+'">'+thermalScore(p.points,playerScoreTemperature(p))+'<small>Final</small></span></article>').join('');
f.fx=mountScoreVfx(f.root);f.value=f.root.querySelector('.gd-thermal-value');
window.changeScore=(points,{feedback=true,age=1000}={})=>{f.stopChange?.();const previous={points:{'1:7564':f.points},checkedAt:Date.now()-age};const host=f.root.querySelector('.gameday-player-score');
 patchGameDay(host,thermalScore(points,playerScoreTemperature({...players[0],points}))+'<small>Live</small>');f.stopChange=animateScoreChanges(f.root,{previous,model:{games:[],completed:false,snapshot:{points:{'1:7564':points},checkedAt:Date.now()}},motion:true,feedback});f.points=points;f.fx.refresh();};
window.totalScore=()=>{const host=document.createElement('span');host.dataset.gamedayTotalKey='3';host.innerHTML=thermalScore(126,'hot');f.root.append(host);const stop=animateScoreChanges(f.root,{previous:{points:{},totals:{3:125}},model:{games:[],snapshot:{points:{},totals:{3:126}}},motion:true});f.total=host;f.stopTotal=()=>{stop();host.remove()};};
window.probePixels=()=>{f.pixelResults=[];f.probe=true};
window.cardScore=(points,week=7)=>{const host=f.root.querySelector('.gameday-player-score');patchPlayerCardScore(host,{...players[0],points,week},{motion:true,feedback:true});f.fx.refresh()};
window.ready=true;
</script></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  path=self.path.split('?')[0];body=html if path=='/thermal-review.html' else "export const db=()=>{throw Error('Writes blocked')};export const configured=false;" if path=='/js/supabase.js' else None
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/html;charset=utf-8'if path.endswith('.html')else'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/';checks=[]
def check(label,ok):
 checks.append({'check':label,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,label;print('PASS '+label,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
 for mode in ['light','dark']:
  for width in [320,390]:
   c=b.new_context(viewport={'width':width,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,service_workers='block')
   c.route('**/*',lambda r:r.continue_()if r.request.url.startswith(base)else r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())if r.request.resource_type=='image'else r.abort())
   page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'thermal-review.html');page.wait_for_function('window.ready');page.evaluate('setTheme',mode);page.evaluate('document.fonts.ready');page.wait_for_function('f.root.querySelector("canvas").dataset.running==="true"')
   tag=f'{mode}/{width}';page.evaluate('probePixels()');page.wait_for_function('!f.probe')
   check(tag+' fire and frost leave digit cores clear while painting outside',page.evaluate('f.pixelResults.every(r=>r.core>0&&r.paintedCore===0&&r.outer>0)'))
   frames=page.locator('.dfl-player-portrait').evaluate_all('es=>es.map(e=>getComputedStyle(e,"::after").content)');check(tag+' only hot/cold portraits have a rim',frames[0]not in ['none','normal']and frames[1]not in ['none','normal']and frames[2]in ['none','normal'])
   check(tag+' scores and portraits fit the phone',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.screenshot(path=str(OUT/f'{mode}-{width}-ambient.png'))
   page.evaluate('f.keptValue=f.value;f.pulse=0;f.peak=0;changeScore(31)');page.wait_for_timeout(60)
   check(tag+' live update rolls a hidden-from-readers copy and preserves recorded digits',page.evaluate('f.keptValue===f.root.querySelector(".gd-thermal-value")&&f.keptValue.textContent==="31.00"&&f.root.querySelectorAll(".gd-score-roll").length===1&&f.root.querySelector(".gd-score-roll").getAttribute("aria-hidden")==="true"'))
   check(tag+' live delta stays below the recorded score',page.locator('.gd-score-delta').evaluate('e=>e.getBoundingClientRect().top>=e.closest(".gameday-player-score").querySelector(".gd-thermal-number").getBoundingClientRect().bottom-1'))
   check(tag+' the real score anchor does not move during the roll',page.evaluate('''async()=>{const v=f.keptValue,r=v.getBoundingClientRect();for(let i=0;i<5;i++){await new Promise(done=>requestAnimationFrame(done));const n=v.getBoundingClientRect();if(Math.abs(n.x-r.x)>.5||Math.abs(n.y-r.y)>.5||Math.abs(n.width-r.width)>.5)return false}return true}'''))
   page.screenshot(path=str(OUT/f'{mode}-{width}-rolling.png'));page.wait_for_function('!f.root.querySelector(".gd-score-roll,[data-score-rolling]")')
   check(tag+' live change gives a finite renderer flare',page.evaluate('f.peak>0'))
   page.evaluate('f.pulse=0');page.wait_for_timeout(850);check(tag+' flare settles back to ambient',page.evaluate('f.pulse===0'))
   page.evaluate('changeScore(32);changeScore(33)');check(tag+' rapid updates keep one roll',page.locator('.gd-score-roll').count()==1);page.wait_for_function('!f.root.querySelector(".gd-score-roll,[data-score-rolling]")');check(tag+' interrupted roll ends at the latest recorded score',page.locator('.gd-thermal-value').first.inner_text()=='33.00')
   page.evaluate('changeScore(12)');page.wait_for_function('!f.root.querySelector(".gd-score-roll")');check(tag+' neutral removes the portrait accent without changing its geometry',page.locator('.dfl-player-portrait').first.evaluate('e=>["none","normal"].includes(getComputedStyle(e,"::after").content)'))
   page.evaluate('f.root.querySelectorAll(".gameday-player")[1].hidden=true;f.peak=0;changeScore(17)');page.wait_for_function('f.peak>0');check(tag+' the first visible hot score receives its live flare',page.evaluate('f.peak>0'));page.evaluate('f.root.querySelectorAll(".gameday-player")[1].hidden=false')
   page.evaluate('changeScore(18,{age:300000})');page.wait_for_timeout(100);check(tag+' stale catch-up changes digits without replaying a live reaction',page.locator('.gd-score-roll,[data-score-rolling]').count()==0 and page.locator('.gd-thermal-value').first.inner_text()=='18.00' and page.evaluate('f.pulse===0'))
   page.evaluate('cardScore(20,7)');check(tag+' first card score has no invented scoring reaction',page.locator('.gd-score-roll').count()==0)
   page.evaluate('cardScore(20.004,7)');check(tag+' sub-cent precision changes do not replay the same number',page.locator('.gd-score-roll').count()==0)
   page.evaluate('cardScore(22,7)');check(tag+' same-week player-card score uses the shared roll',page.locator('.gd-score-roll').count()==1);page.evaluate('cardScore(24,8)');page.wait_for_timeout(60);check(tag+' changing weeks cancels the old reaction and GPU flare',page.locator('.gd-score-roll,[data-score-rolling]').count()==0 and page.evaluate('f.pulse===0'))
   page.evaluate('f.root.dataset.motion="off";changeScore(35)');page.wait_for_timeout(50);check(tag+' app motion off keeps static scores and no renderer ghost',page.locator('.gd-score-roll,[data-score-rolling]').count()==0 and page.locator('.gd-vfx-canvas').get_attribute('data-running')=='false')
   page.evaluate('f.root.dataset.motion="on"');page.emulate_media(reduced_motion='reduce');page.evaluate('changeScore(36)');page.wait_for_timeout(50);check(tag+' reduced motion suppresses roll and GPU effects',page.locator('.gd-score-roll,[data-score-rolling]').count()==0 and page.locator('.gd-vfx-canvas').get_attribute('data-running')=='false')
   page.emulate_media(reduced_motion='no-preference');page.evaluate('changeScore(36.5)');page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(80);check(tag+' enabling reduced motion interrupts a running roll cleanly',page.locator('.gd-score-roll,[data-score-rolling]').count()==0 and page.locator('.gd-thermal-value').first.inner_text()=='36.50');page.emulate_media(reduced_motion='no-preference');page.evaluate('changeScore(37);f.stopChange()');check(tag+' teardown clears reaction copies and flags',page.locator('.gd-score-roll,[data-score-rolling]').count()==0)
   if mode=='dark' and width==390:
    page.evaluate('f.contextExtension=f.root.querySelector("canvas").getContext("webgl").getExtension("WEBGL_lose_context");f.contextExtension.loseContext()');page.wait_for_function('f.root.querySelector("canvas").dataset.renderer==="lost"')
    check('context loss preserves the recorded score',page.locator('.gd-thermal-value').first.inner_text()=='37.00' and page.locator('.gd-vfx-canvas').get_attribute('data-running')=='false')
    page.evaluate('f.contextExtension.restoreContext()');page.wait_for_function('f.root.querySelector("canvas").dataset.renderer==="webgl"&&f.root.querySelector("canvas").dataset.running==="true"')
    page.evaluate('probePixels()');page.wait_for_function('!f.probe');check('restored context still leaves digit cores clear',page.evaluate('f.pixelResults.every(r=>r.core>0&&r.paintedCore===0&&r.outer>0)'))
   page.evaluate('totalScore()');check(tag+' team totals retain their existing settle without a player roll',page.evaluate('!f.total.querySelector(".gd-score-roll")&&f.total.querySelector(".gd-thermal-value").textContent==="126.00"'));page.evaluate('f.stopTotal()')
   check(tag+' no browser errors '+json.dumps(errors),not errors);page.evaluate('f.fx.stop()');c.close()
 c=b.new_context(viewport={'width':390,'height':844},service_workers='block');c.add_init_script('const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==="webgl"?null:original.call(this,type,...args)}')
 c.route('**/*',lambda r:r.continue_()if r.request.url.startswith(base)else r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())if r.request.resource_type=='image'else r.abort())
 page=c.new_page();page.goto(base+'thermal-review.html');page.wait_for_function('window.ready');page.wait_for_function('f.root.querySelector("canvas").dataset.renderer==="unavailable"');page.evaluate('changeScore(31)');page.wait_for_function('!f.root.querySelector(".gd-score-roll,[data-score-rolling]")');check('unavailable WebGL keeps a readable current score and portrait cue',page.locator('.gd-thermal-value').first.inner_text()=='31.00' and page.locator('.dfl-player-portrait').first.evaluate('e=>!["none","normal"].includes(getComputedStyle(e,"::after").content)'));page.evaluate('f.fx.stop()');c.close()
 b.close()
server.shutdown();print(json.dumps({'checks':len(checks),'passed':True}))
