"""Isolated production scroll controllers; no backend reads or writes."""
import json, os, subprocess, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_SCROLL_REVIEW_DIR',ROOT.parent/'dfl-scroll-review'));OUT.mkdir(parents=True,exist_ok=True)
THEMES=json.loads(subprocess.check_output(['node','--input-type=module','--eval',r"""
import{readFileSync}from 'node:fs';import{MEDICINE_GROUND}from './js/team-theme.js';
const source=readFileSync('js/theme.js','utf8'),modes=Function('MEDICINE_GROUND',`return (${source.match(/const MODES = (\{[\s\S]*?\n\});/)[1]})`)(MEDICINE_GROUND),fields=[...source.matchAll(/s\.setProperty\("([^"]+)", m\.([a-zA-Z0-9]+)\);/g)];
console.log(JSON.stringify(Object.fromEntries(['dark','light'].map(key=>[key,{...Object.fromEntries(fields.map(([,css,field])=>[css,modes[key][field]])),'--accent-fill':modes[key].fill,'--accent-2-fill':modes[key].fill2}]))));
"""],cwd=ROOT,text=True))
HTML='''<!doctype html><html data-ui-motion="on"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="css/tokens.css"><link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/ui.css"><link rel="stylesheet" href="css/app-shared.css"><style>
body{margin:0}.topbar{position:fixed;top:0;height:44px;width:100%;background:var(--bg);z-index:120}#view{padding:60px 16px 100px;min-height:3600px}.home-broadcast,.tb-head-row{height:280px}.gameday-matchup{height:240px;border:1px solid var(--line);padding:16px;display:flex;justify-content:space-around;align-items:center}.gameday-faceoff-team{display:grid;justify-items:center;gap:12px;min-width:0}.gameday-faceoff-mark{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:var(--accent-ink);font-weight:700}.home-projected-total{font:700 36px/1 var(--font-body)}.home-team-name{font-size:12px}section.story{height:350px;padding-top:20px}h2{font-size:20px}
</style></head><body><header class="topbar">DFL · scroll review</header><main id="view" class="view"></main><script type="module">
import{mountPageScrollMotion}from './js/page-scroll-motion.js';import{animateUi,cancelUiMotion}from './js/ui-motion.js';
const themes=__THEMES__;window.setTheme=theme=>{document.documentElement.dataset.mode=theme;document.documentElement.dataset.palette=theme;document.documentElement.style.colorScheme=theme;for(const[k,v]of Object.entries(themes[theme]))document.documentElement.style.setProperty(k,v)};setTheme('dark');let stop;const root=document.querySelector('#view');
window.fixture=route=>{stop?.();scrollTo(0,0);root.dataset.route=route;root.innerHTML=`<div class="${route==='home'?'home-broadcast':'tb-head-row'}"><h1>${route==='home'?'Home':'Trade board'}</h1></div>${route==='home'?'<div data-home-gameday-slot><span data-gameday-week>Week 6</span><div class="gameday-matchup" tabindex="-1">'+['Bayou Bombers','Klutch Sports Group'].map((name,i)=>'<div class="gameday-faceoff-team"><span class="gameday-faceoff-mark">'+(i?'KS':'BB')+'</span><span class="home-team-name"><strong>'+name+'</strong></span><span class="home-team-total"><small>Live</small><b class="home-projected-total">'+(i?'104.25':'98.50')+'</b></span></div>').join('')+'</div></div>':''}${Array.from({length:8},(_,i)=>'<section class="story"><h2>Section '+(i+1)+'</h2><p>Sample league content</p></section>').join('')}`;stop=mountPageScrollMotion(root,{animate:animateUi,cancel:cancelUiMotion})};
window.stopFixture=()=>stop?.();const original=Element.prototype.getBoundingClientRect;window.headingReads=0;Element.prototype.getBoundingClientRect=function(){if(this.tagName==='H2')headingReads++;return original.call(this)};fixture('home');window.ready=true;
</script></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_GET(self):
  if self.path=='/':
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(HTML.replace('__THEMES__',json.dumps(THEMES)).encode())
  else:super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[];errors=[]
def check(label,condition=True):
 assert condition,label
 checks.append(label);print('PASS '+label,flush=True)
with sync_playwright() as p:
 engine=os.environ.get('DFL_SCROLL_ENGINE','chromium')
 kwargs={'executable_path':os.environ.get('DFL_REVIEW_CHROMIUM'),'args':['--no-sandbox','--no-proxy-server']} if engine=='chromium' else {'executable_path':os.environ.get('DFL_REVIEW_WEBKIT')}
 browser=getattr(p,engine).launch(headless=True,**kwargs);page=browser.new_page(viewport={'width':390,'height':844},has_touch=True);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.ready');page.evaluate('document.fonts.ready');page.wait_for_timeout(150)
 for theme in ['dark','light']:
  for width in [320,390,430]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('(theme)=>{setTheme(theme);fixture("home")}',theme);page.wait_for_timeout(100)
   limits=page.evaluate('()=>{const r=document.querySelector(".gameday-matchup").getBoundingClientRect();return {start:r.top+scrollY-148,end:r.top+scrollY-148+Math.max(96,r.height-24)}}')
   middle=(limits['start']+limits['end'])/2
   page.evaluate('y=>scrollTo(0,y)',middle);page.wait_for_selector('.home-score-moving');page.wait_for_timeout(400)
   before=page.evaluate('()=>({height:document.documentElement.scrollHeight,row:document.querySelector(".story").getBoundingClientRect().top+scrollY,sizes:[...document.querySelectorAll(".home-score-moving")].map(e=>[e.style.width,e.style.height,e.style.fontSize]),nodes:[...document.querySelectorAll(".home-score-moving")]})')
   result=page.evaluate('''async({start,end})=>{const nodes=[...document.querySelectorAll('.home-score-moving')],sizes=nodes.map(e=>[e.style.width,e.style.height,e.style.fontSize].join('|'));let stable=true,failures=[];for(const n of [...Array.from({length:18},(_,i)=>.25+i*.025),...Array.from({length:18},(_,i)=>.7-i*.025)]){scrollTo(0,start+(end-start)*n);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const ok=nodes.every((e,i)=>e.isConnected&&[e.style.width,e.style.height,e.style.fontSize].join('|')===sizes[i]&&e.style.transform.includes('translate3d'));if(!ok)failures.push({n,connected:nodes.map(e=>e.isConnected),sizes:nodes.map(e=>[e.style.width,e.style.height,e.style.fontSize]),count:document.querySelectorAll('.home-score-moving').length});stable&&=ok}return {stable,failures}}''',limits)
   check(f'{theme} {width}: transforms retain flight nodes and dimensions on reversal '+json.dumps(result['failures'][:1]),result['stable'])
   steady=page.evaluate("""async()=>{const nodes=[...document.querySelectorAll('.home-score-moving')],broadcast=document.querySelector('.home-broadcast');broadcast.replaceChildren(document.createTextNode('A fresh broadcast story'));broadcast.dispatchEvent(new Event('animationend',{bubbles:true}));const story=document.querySelector('.story');story.style.height='400px';await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const stable=nodes.length===6&&nodes.every(n=>n.isConnected);story.style.height='';await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return stable&&nodes.every(n=>n.isConnected)}""")
   check(f'{theme} {width}: broadcast updates and unrelated layout do not restart score flights',steady)
   page.evaluate('y=>scrollTo(0,y)',middle);page.wait_for_timeout(50);page.screenshot(path=str(OUT/f'{theme}-{width}-flight.png'))
   check(f'{theme} {width}: no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   check(f'{theme} {width}: both current team names travel with the scores',page.evaluate("[...document.querySelectorAll('.home-score-moving-name')].map(e=>e.textContent).join('|')==='Bayou Bombers|Klutch Sports Group'"))
   page.evaluate('()=>{const r=document.querySelector(".gameday-matchup").getBoundingClientRect();scrollTo(0,r.top+scrollY-148+Math.max(96,r.height-24)*.98)}');page.wait_for_timeout(100)
   check(f'{theme} {width}: score glyphs match the dock without stretching',page.locator('.home-score-moving').count()==6 and page.evaluate('''()=>[...document.querySelectorAll('.home-score-moving')].filter(e=>e.dataset.motionKind==='score').every((e,i)=>{const m=new DOMMatrixReadOnly(getComputedStyle(e).transform),font=parseFloat(getComputedStyle(e).fontSize),target=parseFloat(getComputedStyle(document.querySelectorAll('[data-dock-score]')[i]).fontSize);return Math.abs(m.a-m.d)<.001&&Math.abs(font*m.a-target)<.1})'''))
   page.evaluate('y=>scrollTo(0,y+30)',limits['end']);page.wait_for_timeout(80)
   check(f'{theme} {width}: exact dock endpoint and source restored',page.evaluate('document.querySelector(".home-score-dock").style.opacity==="1"&&!document.querySelector(".home-score-dock").inert&&!document.querySelector(".home-score-moving")&&[...document.querySelectorAll(".gameday-faceoff-mark,.home-projected-total")].every(e=>e.style.visibility!=="hidden")'))
   check(f'{theme} {width}: content position preserved',page.evaluate('b=>Math.abs(document.querySelector(".story").getBoundingClientRect().top+scrollY-b.row)<1&&document.documentElement.scrollHeight===b.height',before))
   check(f'{theme} {width}: compact names are complete and visible',page.evaluate("[...document.querySelectorAll('[data-dock-name]')].every(e=>e.textContent&&e.scrollWidth<=e.clientWidth+1&&getComputedStyle(e).visibility==='visible')"))
   check(f'{theme} {width}: scores stay aligned across wrapped names',page.evaluate("(()=>{const s=[...document.querySelectorAll('[data-dock-score]')].map(e=>e.getBoundingClientRect().top);return Math.abs(s[0]-s[1])<1})()"))
   page.screenshot(path=str(OUT/f'{theme}-{width}-named-dock.png'))
 # Home's compact scoreboard must not bypass the section entrance observer.
 page.evaluate('fixture("home")');page.wait_for_timeout(150)
 intro=page.evaluate("()=>{const h=document.querySelectorAll('.story h2')[1];return {y:h.getBoundingClientRect().top+scrollY-400,height:document.documentElement.scrollHeight}}")
 page.evaluate('y=>scrollTo(0,y)',intro['y'])
 page.wait_for_function("document.querySelectorAll('.story h2')[1].getAnimations().length>0")
 check('Home reveals section headings while keeping the compact scoreboard',page.evaluate("document.querySelector('#view').classList.contains('has-home-score-dock')&&document.querySelector('.dfl-scroll-context').hidden"))
 page.wait_for_timeout(500)
 check('Section reveal settles without shifting the document',page.evaluate('height=>document.documentElement.scrollHeight===height&&getComputedStyle(document.querySelectorAll(".story h2")[1]).opacity==="1"',intro['height']))
 page.evaluate('scrollTo(0,0)');page.wait_for_timeout(80);page.evaluate('y=>scrollTo(0,y)',intro['y']);page.wait_for_timeout(80)
 check('A read section does not replay when scrolling back',page.evaluate("document.querySelectorAll('.story h2')[1].getAnimations().length===0"))
 page.evaluate('fixture("home")');page.wait_for_timeout(80);page.evaluate('scrollTo(0,310)');page.wait_for_selector('.home-score-moving')
 page.evaluate('document.querySelector(".home-projected-total").textContent="120.75"');page.wait_for_function('[...document.querySelectorAll(".home-score-moving")].some(e=>e.textContent==="120.75")');check('Live score changes refresh the moving copy')
 page.evaluate("document.querySelector('.home-team-name strong').textContent='Bayou Bombers Reloaded'");page.wait_for_function("[...document.querySelectorAll('[data-dock-name]')].some(e=>e.textContent==='Bayou Bombers Reloaded')")
 check('Current team-name changes refresh the dock and moving copy',page.evaluate("[...document.querySelectorAll('.home-score-moving-name')].some(e=>e.textContent==='Bayou Bombers Reloaded')"))
 page.set_viewport_size({'width':320,'height':844});page.wait_for_timeout(100);check('Resize remeasures endpoints',page.evaluate('[...document.querySelectorAll(".home-score-moving")].every(e=>e.getBoundingClientRect().right<=innerWidth+1)'))
 page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(80);check('Reduced motion restores sources without flight copies',page.locator('.home-score-moving').count()==0 and page.evaluate('[...document.querySelectorAll(".gameday-faceoff-team")].every(e=>e.style.opacity==="")'))
 page.emulate_media(reduced_motion='no-preference');page.evaluate('document.documentElement.dataset.uiMotion="off";dispatchEvent(new Event("dfl:ui-motion-change"))');page.wait_for_timeout(80);check('In-app motion off removes moving copies',page.locator('.home-score-moving').count()==0)
 page.evaluate('document.documentElement.dataset.uiMotion="on";dispatchEvent(new Event("dfl:ui-motion-change"));fixture("trade")');page.wait_for_timeout(120)
 result=page.evaluate('''async()=>{scrollTo(0,600);await new Promise(r=>setTimeout(r,400));headingReads=0;for(let y=610;y<850;y+=8){scrollTo(0,y);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)}return headingReads}''');check('Scroll frames reuse section offsets',result==0)
 page.evaluate('document.querySelector(".story").style.height="600px"');page.wait_for_function('headingReads>0');check('Layout changes refresh section offsets')
 page.evaluate('stopFixture()');check('Cleanup removes docks and restores heading',page.locator('.home-score-dock,.home-score-flight,.dfl-scroll-context,[data-scroll-title]').count()==0)
 # Decorative easing uses CSS between scroll frames; it never delays the
 # actual page, photos in the scoreboard or a finger-driven broadcast swipe.
 page.evaluate('''async()=>{scrollTo(0,0);document.querySelector('#view').innerHTML='<div id="home-wrap"><div id="depth-stage" class="bx-stage" data-presentation="editorial" style="position:relative;height:320px;margin-top:180px"><div class="bx-slide bx-home-feature" style="position:absolute;inset:0"><span class="bx-home-art" style="position:absolute;inset:0"></span></div></div></div>';const {mountBroadcastDepth}=await import('./js/broadcast-depth.js');window.depthFixture=mountBroadcastDepth(document.querySelector('#depth-stage'))}''')
 page.wait_for_selector('#depth-stage[data-depth-active]');page.wait_for_timeout(200)
 depth=page.evaluate('''async()=>{const root=document.querySelector('#depth-stage'),art=root.querySelector('.bx-home-art'),before=new DOMMatrixReadOnly(getComputedStyle(art).transform).m42,height=document.documentElement.scrollHeight;scrollTo(0,100);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return {before,height,target:parseFloat(root.style.getPropertyValue('--bx-depth-y')),during:new DOMMatrixReadOnly(getComputedStyle(art).transform).m42,duration:getComputedStyle(art).transitionDuration}}''')
 check('Decorative depth eases between scroll positions',abs(depth['target']-depth['before'])>.5 and abs(depth['target']-depth['during'])>.01 and depth['duration']=='0.14s')
 page.wait_for_timeout(200)
 check('Decorative depth settles without moving content',page.evaluate('''d=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.bx-home-art')).transform).m42-d.target)<.03&&document.documentElement.scrollHeight===d.height''',depth))
 page.evaluate("document.querySelector('.bx-slide').classList.add('bx-dragging')")
 check('Finger-driven broadcast artwork has no scroll easing',page.evaluate("getComputedStyle(document.querySelector('.bx-home-art')).transitionDuration==='0s'"))
 page.evaluate("document.documentElement.dataset.uiMotion='off';dispatchEvent(new Event('dfl:ui-motion-change'))")
 check('Motion off clears decorative offsets and transitions',page.evaluate("!document.querySelector('#depth-stage').style.getPropertyValue('--bx-depth-y')&&getComputedStyle(document.querySelector('.bx-home-art')).transitionDuration==='0s'"))
 page.evaluate('depthFixture.stop()');check('Decorative lifecycle removes its overlay',page.locator('.bx-editorial-sheen').count()==0)
 check('No browser errors',not errors);browser.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
