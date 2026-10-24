"""Real GPU score effects: nested scrollports, document scrolling and clipping."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
import json,os,threading
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_SCORE_SCROLL_REVIEW_DIR',ROOT.parent/'dfl-score-scroll-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
source=(ROOT/'index.html').read_text();head=source.split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+head+'''</head><body><main id="view" class="view" data-route="clubhouse"><div id="mount"></div><div id="unrelated" style="height:30px;overflow:auto"><div style="height:300px">Unrelated scroll</div></div></main><script type="module">
import {mountScoreVfx} from './js/score-vfx.js';import {thermalScore} from './js/score-temperature.js';import {saveMode} from './js/theme.js';
import {mountWatchScoreCollapse} from './js/watch-score-collapse.js';
window.setTheme=saveMode;window.fixture={};
const glp=WebGLRenderingContext.prototype,draw=glp.drawArrays,upload=glp.texImage2D,clear=glp.clear;
glp.texImage2D=function(...a){fixture.uploads=(fixture.uploads||0)+1;return upload.apply(this,a)};
glp.clear=function(...a){fixture.clears=(fixture.clears||0)+1;fixture.clearClipped=this.isEnabled(this.SCISSOR_TEST);return clear.apply(this,a)};
glp.drawArrays=function(...a){draw.apply(this,a);fixture.draws=(fixture.draws||0)+1;fixture.scissor=[...this.getParameter(this.SCISSOR_BOX)];fixture.viewport=[...this.getParameter(this.VIEWPORT)];fixture.glyph=[...this.getUniform(this.getParameter(this.CURRENT_PROGRAM),this.getUniformLocation(this.getParameter(this.CURRENT_PROGRAM),'u_glyph'))];fixture.size=[...this.getUniform(this.getParameter(this.CURRENT_PROGRAM),this.getUniformLocation(this.getParameter(this.CURRENT_PROGRAM),'u_size'))];fixture.opacity=this.getUniform(this.getParameter(this.CURRENT_PROGRAM),this.getUniformLocation(this.getParameter(this.CURRENT_PROGRAM),'u_opacity'));if(fixture.probe){const p=new Uint8Array(this.drawingBufferWidth*this.drawingBufferHeight*4);this.readPixels(0,0,this.drawingBufferWidth,this.drawingBufferHeight,this.RGBA,this.UNSIGNED_BYTE,p);fixture.painted=0;fixture.outside=0;const [x,y,w,h]=fixture.scissor;for(let j=0;j<this.drawingBufferHeight;j++)for(let i=0;i<this.drawingBufferWidth;i++)if(p[(j*this.drawingBufferWidth+i)*4+3]>0){fixture.painted++;if(i<x||i>=x+w||j<y||j>=y+h)fixture.outside++}fixture.probe=false}};
window.setupScore=(kind='hot',nested=true)=>{
 fixture.collapse?.stop();fixture.fx?.stop();fixture.root?.remove();window.scrollTo({top:0,behavior:'instant'});
 const root=document.createElement(nested?'dialog':'section');root.className=nested?'gameday-spotlight dfl-player-card':'score-scroll-page';root.style.cssText=nested?'height:500px':'position:relative;min-height:1400px;padding:24px';
 root.innerHTML=(nested?'<header><h2>Player card</h2><button>Close</button></header><div data-player-card-body>':'<div>')+'<div style="height:120px"></div><div id="score-host" style="padding:10px 0;font:700 32px/1.15 var(--font-display)">'+thermalScore(kind==='hot'?29:6,kind)+'</div><div style="height:1200px"></div></div>';
 document.querySelector('#mount').append(root);if(nested)root.showModal();fixture.root=root;fixture.nested=nested;fixture.port=nested?root.querySelector('[data-player-card-body]'):document.scrollingElement;fixture.fx=mountScoreVfx(root);
};
window.setupWatch=()=>{
 fixture.collapse?.stop();fixture.fx?.stop();fixture.root?.remove();window.scrollTo({top:0,behavior:'instant'});
 const root=document.createElement('dialog');root.className='gameday-watch';root.innerHTML='<header class="gd-watch-header"><h2>GameDay</h2><button>Close</button></header><div data-watch-content><div style="height:70px"></div><div data-watch-score-anchor></div><div class="gd-watch-dashboard"><div class="gd-watch-dashboard-inner"><section class="gd-watch-scoreboard">'+['hot','cold'].map((kind,i)=>'<div class="gd-watch-score-team"><h3>'+['Bayou Bombers','Bastards of the Realm'][i]+'</h3>'+thermalScore(i?6:29,kind,{tag:'strong'})+'</div>').join('<span>vs</span>')+'</section></div></div><div style="height:1600px"></div></div>';
 document.querySelector('#mount').append(root);root.showModal();fixture.root=root;fixture.collapse=mountWatchScoreCollapse(root);fixture.collapse.refresh();fixture.fx=mountScoreVfx(root);
};window.ready=true;
</script></body></html>'''
checks=[]
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS '+name,flush=True);(OUT/'checks.json').write_text(json.dumps(checks,indent=2))
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']}
 if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
 browser=p.chromium.launch(**launch);context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True,service_workers='block')
 context.route('**/score-scroll-review.html',lambda r:r.fulfill(content_type='text/html',body=html))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'score-scroll-review.html');page.wait_for_function('window.ready');page.evaluate('document.fonts.ready')
 for theme in ['light','dark']:
  page.evaluate('setTheme',theme)
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844})
   for kind in ['hot','cold']:
    page.evaluate('setupScore',kind);page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"');page.wait_for_timeout(100)
    name=f'{theme}/{width}/{kind}'
    page.evaluate('fixture.probe=true');page.wait_for_function('fixture.probe===false')
    check(name+' actually paints nonempty GPU effects',page.evaluate('fixture.painted>0&&fixture.outside===0'))
    page.evaluate('fixture.beforeUploads=fixture.uploads;fixture.port.scrollTop=100');page.wait_for_timeout(60)
    check(name+' nested scrolling keeps effects visible',page.evaluate('fixture.root.querySelector("canvas").dataset.running==="true"&&getComputedStyle(fixture.root.querySelector("canvas")).visibility!=="hidden"&&!fixture.clearClipped'))
    page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"')
    check(name+' settling reuses glyph masks',page.evaluate('fixture.uploads===fixture.beforeUploads'))
    check(name+' repeated scroll frames keep painted effects attached',page.evaluate('''async()=>{const f=fixture;let good=true;for(let i=0;i<14;i++){f.port.scrollTop=50+i%7*7;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const c=f.root.querySelector('canvas'),v=f.root.querySelector('.gd-thermal-value').getBoundingClientRect(),b=c.getBoundingClientRect(),s=c.width/f.root.clientWidth,[x,y,w,h]=f.viewport,g=f.glyph,z=f.size;good&&=c.dataset.running==='true'&&getComputedStyle(c).visibility!=='hidden'&&Math.abs(b.left+(x+g[0]/z[0]*w)/s-v.left)<1.5&&Math.abs(b.top+(c.height-y-h+g[1]/z[1]*h)/s-v.top)<1.5;}return good&&f.uploads===f.beforeUploads}'''))

    # Leave the score partly clipped by the inner port. The GPU must not draw it
    # on the stationary header or outside the body's actual clipping rectangle.
    page.evaluate('fixture.port.scrollTop+=document.querySelector(".gd-thermal-value").getBoundingClientRect().top-fixture.port.getBoundingClientRect().top+12');page.wait_for_timeout(320)
    page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"');page.evaluate('fixture.probe=true');page.wait_for_function('fixture.probe===false')
    check(name+' clipped fire or ice cannot paint over the header',page.evaluate('fixture.outside===0&&fixture.painted>0&&fixture.scissor[3]<fixture.viewport[3]'))
    page.locator('.dfl-player-card').screenshot(path=str(OUT/f'{theme}-{width}-{kind}-clipped.png'))
    page.evaluate('fixture.port.scrollTop=fixture.port.scrollHeight');page.wait_for_timeout(350)
    check(name+' a fully clipped score leaves no ghost',page.evaluate('fixture.root.querySelector("canvas").dataset.running==="false"&&getComputedStyle(fixture.root.querySelector("canvas")).visibility==="hidden"'))
    page.evaluate('fixture.port.scrollTop=0');page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"')
    page.locator('.dfl-player-card').screenshot(path=str(OUT/f'{theme}-{width}-{kind}-rest.png'))
 # Use the production sticky scoreboard controller and its actual font-size
 # transition. Both directions must settle onto the visible digits again.
 for theme in ['light','dark']:
  page.evaluate('setTheme',theme)
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('setupWatch()');page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"')
   for top in [420,0]:
    page.evaluate('top=>fixture.root.scrollTo({top,behavior:"instant"})',top);page.wait_for_timeout(60)
    check(f'{theme}/{width} Watch {top} keeps effects during sticky movement',page.evaluate('fixture.root.querySelector("canvas").dataset.running==="true"'))
    check(f'{theme}/{width} Watch {top} stays aligned throughout the size transition',page.evaluate('''async()=>{let good=true;for(let i=0;i<10;i++){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const c=fixture.root.querySelector('canvas'),b=c.getBoundingClientRect(),v=[...fixture.root.querySelectorAll('.gd-thermal-value')].at(-1).getBoundingClientRect(),s=c.width/fixture.root.clientWidth,[x,y,w,h]=fixture.viewport,g=fixture.glyph,z=fixture.size;good&&=c.dataset.running==='true'&&Math.abs(b.left+(x+g[0]/z[0]*w)/s-v.left)<2&&Math.abs(b.top+(c.height-y-h+g[1]/z[1]*h)/s-v.top)<2;}return good}'''))
    page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"')
    check(f'{theme}/{width} Watch {top} redraws on the actual compact or expanded score',page.evaluate('''()=>{const c=fixture.root.querySelector('canvas'),b=c.getBoundingClientRect(),v=[...fixture.root.querySelectorAll('.gd-thermal-value')].at(-1).getBoundingClientRect(),s=c.width/fixture.root.clientWidth,[x,y,w,h]=fixture.viewport;return Math.abs(b.left+x/s+10-v.left)<1.5&&Math.abs(b.top+(c.height-y-h)/s+Math.min(26,v.height)-v.top)<1.5}'''))
   page.locator('.gameday-watch').screenshot(path=str(OUT/f'{theme}-{width}-watch-expanded.png'))
 # Page scrolls, ancestor fades and unrelated scrollers use the same controller.
 page.evaluate('setupScore("hot",false)');page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"')
 page.evaluate('document.querySelector("#unrelated").scrollTop=20');page.wait_for_timeout(60)
 check('unrelated scrollports do not interrupt the score',page.evaluate('fixture.root.querySelector("canvas").dataset.running==="true"'))
 page.evaluate('window.scrollTo({top:80,behavior:"instant"})');page.wait_for_timeout(60)
 check('document scrolling keeps the shared effects visible',page.evaluate('fixture.root.querySelector("canvas").dataset.running==="true"'))
 page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"')
 page.evaluate('document.querySelector("#score-host").style.opacity="0";fixture.fx.refresh()');page.wait_for_timeout(100)
 check('a faded Home handoff source leaves no duplicate silhouette',page.evaluate('fixture.root.querySelector("canvas").dataset.running==="false"'))
 page.evaluate('document.querySelector("#score-host").style.opacity=".4";fixture.fx.refresh()');page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"')
 check('a partially faded source also fades its effects',page.evaluate('Math.abs(fixture.opacity-.4)<.001'))
 page.evaluate('fixture.root.dataset.motion="off"');page.wait_for_timeout(100)
 check('motion-off cancels and hides the effects',page.evaluate('fixture.root.querySelector("canvas").dataset.running==="false"'))
 page.evaluate('fixture.root.dataset.motion="on"');page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"');page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(100)
 check('reduced motion keeps real static digits without a canvas ghost',page.evaluate('fixture.root.querySelector("canvas").dataset.running==="false"&&document.querySelector(".gd-thermal-value").textContent==="29.00"'))
 page.emulate_media(reduced_motion='no-preference');page.wait_for_function('fixture.root.querySelector("canvas").dataset.running==="true"')
 page.evaluate('document.querySelector("#score-host").replaceChildren();fixture.fx.refresh()');page.wait_for_timeout(100)
 check('removing every score immediately clears and stops the shared surface',page.evaluate('fixture.root.querySelector("canvas").dataset.running==="false"&&getComputedStyle(fixture.root.querySelector("canvas")).visibility==="hidden"'))
 page.evaluate('window.scrollTo({top:0,behavior:"instant"});fixture.fx.stop()');page.wait_for_timeout(350)
 check('teardown cancels the pending scroll restart',page.locator('.gd-vfx-canvas').count()==0)
 check('no browser errors',not errors);browser.close();server.shutdown()
