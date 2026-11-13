"""Visible-player return deltas against actual row markup; no provider writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_POINTS_REVIEW_DIR','/tmp/dfl-clubhouse-points'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html><head>'+head+'''<style>body{margin:0}#view{padding:24px 16px}.gameday-players{margin:0}#offscreen{margin-top:1200px}#feed{padding-top:24px}.player-return-delta{z-index:5}</style></head><body><main id="view" class="view" data-route="clubhouse"><section class="clubhouse-page" data-motion="on"><div id="feed"></div><div id="offscreen"></div></section></main><dialog id="modal">Player card<button onclick="this.closest('dialog').close()">Close</button></dialog></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  code=html if self.path.startswith('/points-review.html') else 'export const configured=()=>false;export const db=()=>({});' if self.path.startswith('/js/supabase.js') else None
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/html' if self.path.startswith('/points-review') else 'text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}';checks=[]
def check(label,ok):
 checks.append({'check':label,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,label;print('PASS '+label,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
  for mode in ['light','dark']:
   c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes(),headers={'Access-Control-Allow-Origin':'*'}) if r.request.resource_type=='image' else r.abort())
   page.goto(base+'/points-review.html',wait_until='domcontentloaded');page.evaluate('''async mode=>{
    const {pinMode}=await import('./js/theme.js');pinMode(mode);
    const {playerRows}=await import('./js/game-day-player-rows.js');const {mountViewedPlayerPoints}=await import('./js/viewed-player-points.js');
    window.f={scope:'member:2026:8',at:Date.now(),motion:true,root:document.querySelector('#view')};
    f.player=(id,points)=>({id,points,name:id==='1'?'Jaxon Smith-Njigba':'Patrick Mahomes',position:id==='1'?'WR':'QB',nflTeam:id==='1'?'SEA':'KC',roster:1,state:'live',slot:'WR'});
    f.paint=(value,other=4)=>{f.root.dataset.pointsChecked=String(++f.at);document.querySelector('#feed').innerHTML='<ul class="gameday-players">'+playerRows([f.player('1',value)])+'</ul>';document.querySelector('#offscreen').innerHTML='<ul class="gameday-players">'+playerRows([f.player('2',other)])+'</ul>';f.ctrl?.refresh()};
    f.mount=()=>{f.ctrl=mountViewedPlayerPoints(f.root,{getScope:()=>f.scope,getMotion:()=>f.motion});};
    f.saved=()=>JSON.parse(localStorage.getItem('dfl.player-points.v1')||'{}');f.paint(10);f.mount();
    f.capture=new MutationObserver(()=>{if(!f.captureGrow)return;const e=document.querySelector('.player-return-score-copy'),a=e?.getAnimations()[0];if(a){a.pause();a.currentTime=180;f.captureGrow=false}});f.capture.observe(f.root,{childList:true,subtree:true});
   }''',mode)
   tag=f'{width}-{mode} '
   page.wait_for_timeout(850)
   check(tag+'first visit has no delta',page.locator('.player-return-delta').count()==0)
   check(tag+'only genuinely viewed player is remembered',page.evaluate("()=>Object.values(f.saved()).some(v=>v.players['1'])&&!Object.values(f.saved()).some(v=>v.players['2'])"))
   before=page.locator('#feed').bounding_box()
   page.evaluate("f.ctrl.stop();f.captureGrow=true;f.paint(16.4);f.anchor=document.querySelector('#feed .gd-thermal-value').getBoundingClientRect().toJSON();f.mount()");page.wait_for_selector('.player-return-delta');
   check(tag+'return shows accumulated gain',page.locator('.player-return-delta').inner_text()=='+6.4')
   after=page.locator('#feed').bounding_box();check(tag+'delta has no layout shift',before==after)
   check(tag+'change has accessible meaning',page.locator('.player-return-delta').get_attribute('aria-label')=='Up 6.4 fantasy points since you last viewed this player')
   check(tag+'positive return grows a decorative score',page.locator('.player-return-score-copy').count()==1)
   page.locator('.player-return-score-copy').evaluate('e=>{const a=e.getAnimations()[0];a.pause();a.currentTime=180}')
   check(tag+'grow peaks without moving the real digits',page.evaluate("()=>{const e=document.querySelector('.player-return-score-copy'),v=document.querySelector('#feed .gd-thermal-value'),r=v.getBoundingClientRect();return new DOMMatrix(getComputedStyle(e).transform).a>1.15&&JSON.stringify(r.toJSON())===JSON.stringify(f.anchor)&&e.getAttribute('aria-hidden')==='true'}"))
   check(tag+'delta remains separate from growing digits',page.evaluate("()=>!document.querySelector('.player-return-score-copy').contains(document.querySelector('.player-return-delta'))&&getComputedStyle(document.querySelector('.player-return-delta')).webkitTextFillColor!=='rgba(0, 0, 0, 0)'"))
   page.screenshot(path=str(OUT/f'points-{width}-{mode}.png'))
   page.locator('.player-return-score-copy').evaluate('e=>e.getAnimations()[0].play()');page.wait_for_timeout(650)
   check(tag+'grow settles and restores original digits',page.locator('.player-return-score-copy,[data-return-growing]').count()==0 and page.locator('.player-return-delta').count()==1)
   page.wait_for_timeout(3800);check(tag+'badge fully cleans up',page.locator('.player-return-delta').count()==0)
   page.evaluate('f.ctrl.stop();f.paint(15.2);f.mount()');page.wait_for_selector('.player-return-delta');check(tag+'correction uses a minus sign',page.locator('.player-return-delta').inner_text()=='−1.2')
   check(tag+'correction does not celebrate a loss',page.locator('.player-return-score-copy').count()==0)
   page.evaluate("f.ctrl.stop();f.scope='member:2026:9';f.paint(0);f.mount()");page.wait_for_timeout(850);check(tag+'new week starts without a loss',page.locator('.player-return-delta').count()==0)
   page.evaluate("f.ctrl.stop();f.scope='different-member:2026:9';f.paint(5);f.mount()");page.wait_for_timeout(850);check(tag+'profiles have independent history',page.locator('.player-return-delta').count()==0)
   page.evaluate("f.ctrl.stop();document.querySelector('#modal').showModal();f.paint(7);f.mount()");page.wait_for_timeout(850);check(tag+'covered players are not acknowledged',page.evaluate("()=>Object.values(f.saved()).some(v=>v.players['1']?.points===5)&&!Object.values(f.saved()).some(v=>v.players['1']?.points===7)"))
   page.locator('#modal button').click();page.wait_for_selector('.player-return-delta');check(tag+'closing overlay reveals unseen points',page.locator('.player-return-delta').inner_text()=='+2')
   page.evaluate('f.ctrl.stop();f.paint(7.5);f.mount()');page.wait_for_selector('.player-return-score-copy');page.evaluate("f.motion=false;window.dispatchEvent(new Event('dfl:ui-motion-change'))")
   check(tag+'turning motion off mid-grow restores digits',page.locator('.player-return-score-copy,[data-return-growing]').count()==0 and page.locator('.player-return-delta').count()==1)
   page.evaluate('f.ctrl.stop();f.motion=false;f.paint(8);f.mount()');page.wait_for_selector('.player-return-delta');check(tag+'motion off keeps a static readable change',page.locator('.player-return-delta').evaluate('e=>e.getAnimations().length===0') and page.locator('.player-return-score-copy').count()==0)
   page.emulate_media(reduced_motion='reduce');page.evaluate('f.ctrl.stop();f.motion=true;f.paint(9);f.mount()');page.wait_for_selector('.player-return-delta');check(tag+'reduced motion does not animate',page.locator('.player-return-delta').evaluate('e=>e.getAnimations().length===0'))
   page.evaluate("f.ctrl.stop();f.paint(2);f.root.dataset.pointsChecked=String(f.at-10000);f.mount()");page.wait_for_timeout(850);check(tag+'older cached score does not create a correction',page.locator('.player-return-delta').count()==0)
   page.evaluate("document.querySelector('#feed [data-viewed-player]').dataset.viewedPoints='11';f.root.dataset.pointsChecked=String(++f.at);f.ctrl.refresh()");page.wait_for_selector('.player-return-delta');check(tag+'fresh score after stale arrival still shows the return gain',page.locator('.player-return-delta').inner_text()=='+2')
   page.evaluate('f.ctrl.stop();f.paint(13);f.mount();f.ctrl.stop()');page.wait_for_timeout(850);check(tag+'unmount cancels pending views and effects',page.locator('.player-return-delta').count()==0 and page.evaluate("()=>!Object.values(f.saved()).some(v=>v.players['1']?.points===13)"))
   check(tag+'no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.emulate_media(reduced_motion='no-preference');page.evaluate("f.ctrl.stop();f.motion=true;f.root.dataset.pointsChecked=String(++f.at);document.querySelector('#feed').innerHTML='<div class=\"nfl-score-totals\" data-viewed-player=\"1\" data-viewed-points=\"15\"><b>15.00</b><small>18.5</small></div>';f.mount()")
   page.wait_for_selector('.player-return-score-copy')
   check(tag+'plain NFL fantasy score also grows',page.locator('.player-return-score-copy').inner_text()=='15.00')
   page.evaluate("document.querySelector('#feed [data-viewed-player]').dataset.viewedPoints='16';document.querySelector('#feed b').firstChild.textContent='16.00';f.root.dataset.pointsChecked=String(++f.at);f.ctrl.refresh()")
   check(tag+'fresh score cancels an obsolete grow copy',page.locator('.player-return-score-copy,[data-return-growing]').count()==0 and page.locator('#feed b').inner_text().startswith('16.00'))
   page.evaluate('f.ctrl.stop();f.paint(18);f.mount()');page.wait_for_selector('.player-return-score-copy');page.evaluate('f.ctrl.stop()')
   check(tag+'leaving mid-grow removes every temporary digit',page.locator('.player-return-score-copy,[data-return-growing],.player-return-delta').count()==0)
   check(tag+'no script errors',not errors);c.close()
 b.close()
server.shutdown();print(json.dumps({'checks':len(checks),'passed':True}))
