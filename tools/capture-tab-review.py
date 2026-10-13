"""Continuous native gestures against actual tab handlers; no backend writes."""
import json,os,threading
from pathlib import Path
from urllib.parse import urlparse
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_TAB_REVIEW_DIR',ROOT.parent/'dfl-tabs-review'))
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=urlparse(self.path).path.lstrip('/');file=OUT/'index.html' if path in ['', 'index.html'] else ROOT/path
  if not file.is_file():self.send_error(404);return
  body=file.read_bytes();self.send_response(200);self.send_header('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css'}.get(file.suffix,'application/octet-stream'));self.end_headers();self.wfile.write(body)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
results=[];errors=[]
def check(name,value=True):
 assert value,name
 results.append(name);print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--no-proxy-server'])
 context=browser.new_context(viewport={'width':390,'height':844},has_touch=True)
 context.route('**/js/player-card-data.js',lambda route:route.fulfill(content_type='text/javascript',body='export async function loadPlayerCard(){throw Error("No data in tab fixture")}'))
 context.add_init_script("window.tabAnimations=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){const a=original.call(this,frames,options);tabAnimations.push({className:this.className,frames,options});if(window.pauseTabArrival&&this.classList.contains('home-week-brief')&&!this.classList.contains('dfl-tab-preview')){window.pauseTabArrival=false;a.pause();a.currentTime=100}return a}")
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded');page.wait_for_function('!!window.tabReviewReady')
 page.evaluate('document.fonts.ready')
 touch=context.new_cdp_session(page)
 def align(selector):
  page.locator(selector).first.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-160,behavior:"instant"})');page.wait_for_timeout(80)
 def drag(selector,dx,end=True):
  align(selector);box=page.locator(selector).first.bounding_box();x=box['x']+box['width']*(.8 if dx<0 else .2);y=box['y']+24
  touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for step in range(1,5):touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*step/4,'y':y}]});page.wait_for_timeout(20)
  if end:touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  return x+dx,y
 def clean():
  page.wait_for_function('!document.querySelector(".dfl-tab-preview,.dfl-tab-grab,[data-ui-swipe-settling]")')
  check('no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 # Home next-page preview and exact release continuity.
 details=page.locator('details[data-page-detail="home-week"]');details.evaluate('e=>e.open=true')
 page.locator('[data-week-tab="brief"]').click();page.wait_for_timeout(350)
 drag('[data-week-panel="brief"]',-90,end=False)
 state=page.evaluate('''()=>{const a=document.querySelector('[data-week-panel="brief"]'),b=document.querySelector('.dfl-tab-preview');return{offset:new DOMMatrixReadOnly(getComputedStyle(a).transform).m41,preview:!!b,previewOffset:b?new DOMMatrixReadOnly(getComputedStyle(b).transform).m41:0,width:a.getBoundingClientRect().width,inert:b?.inert,hidden:b?.getAttribute('aria-hidden'),ids:b?.querySelectorAll('[id]').length,data:b?.querySelectorAll('[data-week-tab],[data-position-tab],[data-player-card]').length}}''')
 check('Home tracks finger 1:1',abs(state['offset']+90)<2)
 check('adjacent preview sits at shared edge',state['preview'] and abs(state['previewOffset']-(state['width']-90))<2)
 check('preview is inert without duplicate IDs or action hooks',state['inert'] and state['hidden']=='true' and state['ids']==0 and state['data']==0)
 page.screenshot(path=str(OUT/'home-mid-drag-390.png'))
 touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 frames=page.evaluate("tabAnimations.filter(a=>String(a.className).includes('home-outlook-games')&&!String(a.className).includes('dfl-tab-preview')&&a.options.duration===280).map(a=>a.frames)")
 starts=[f[0].get('transform','') for f in frames]
 check('release continues from visible neighbor',any(t.startswith('translateX(') and abs(float(t.split('(')[1].split('px')[0])-(state['width']-90))<2 for t in starts))
 check('panel height transitions with glide',any('height' in f[0] for f in frames))
 clean();check('Home selects destination',page.locator('[data-week-tab="picks"]').get_attribute('aria-selected')=='true')

 # Grabbing an unfinished arrival retains both position and visible height.
 page.evaluate('window.pauseTabArrival=true')
 drag('[data-week-panel="picks"]',90)
 moving=page.locator('[data-week-panel="brief"]')
 before=moving.evaluate("e=>{const a=e.getAnimations().find(a=>a.effect.getKeyframes().some(f=>f.transform));a.pause();a.currentTime=100;return{x:new DOMMatrixReadOnly(getComputedStyle(e).transform).m41,height:e.getBoundingClientRect().height}}")
 box=moving.bounding_box();parent=moving.locator('..').bounding_box();x=parent['x']+parent['width']-8;y=box['y']+24
 check('reversal starts on the visible outgoing side',page.evaluate('([x,y])=>document.elementFromPoint(x,y).classList.contains("dfl-tab-grab")',[x,y]))
 touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});page.wait_for_timeout(40)
 grabbed=moving.evaluate('e=>({x:new DOMMatrixReadOnly(getComputedStyle(e).transform).m41,height:e.getBoundingClientRect().height})')
 check('unfinished arrival keeps finger position',abs(grabbed['x']-before['x'])<2)
 check('unfinished arrival keeps visible height',abs(grabbed['height']-before['height'])<2)
 for step in range(1,5):touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-90*step/4,'y':y}]});page.wait_for_timeout(20)
 touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});clean()
 check('reversing an unfinished arrival returns to preceding section',page.locator('[data-week-tab="picks"]').get_attribute('aria-selected')=='true')
 drag('[data-week-panel="picks"]',-24);clean()
 check('short pull returns without selecting another tab',page.locator('[data-week-tab="picks"]').get_attribute('aria-selected')=='true')
 for name,selector,tab in [('Home reverse','[data-week-panel="picks"]','[data-week-tab="brief"]'),('Clubhouse','[id="clubhouse-panel-overview"]','[data-clubhouse-tab="matchups"]'),('Book view','#sb-markets','[data-sb-tab="tickets"]'),('Book product','#sb-book-panel .review-bankroll','[data-sb-product="pickem"]')]:
  drag(selector,90 if name=='Home reverse' else -90);clean();check(name+' selects destination',page.locator(tab).get_attribute('aria-selected')=='true')
  if name=='Book view':page.locator('#fixture-stake').fill('83');page.evaluate('window.savedStakeNode=document.querySelector("#fixture-stake")')
 # A resize or preference change clears a held gesture immediately.
 drag('#sb-pickem-panel',90,end=False)
 page.set_viewport_size({'width':320,'height':844})
 touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});clean()
 check('resize cancels held gesture without changing selection',page.locator('[data-sb-product="pickem"]').get_attribute('aria-selected')=='true')
 page.screenshot(path=str(OUT/'book-320.png'))
 page.set_viewport_size({'width':390,'height':844})
 drag('#sb-pickem-panel',90,end=False)
 page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(100)
 touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});clean()
 check('reduced motion clears held preview',page.locator('[data-sb-product="pickem"]').get_attribute('aria-selected')=='true')
 page.emulate_media(reduced_motion='no-preference')
 check('drafts retain original nodes and values' ,page.locator('#fixture-stake').input_value()=='83' and page.evaluate('savedStakeNode===document.querySelector("#fixture-stake")') and page.locator('#draft-overview').input_value()=='Saved overview draft')
 page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(100)
 drag('#sb-pickem-panel',90);clean();check('reduced motion keeps native tab navigation',page.locator('[data-sb-product="book"]').get_attribute('aria-selected')=='true')
 page.emulate_media(reduced_motion='no-preference')
 page.evaluate('window.stopTabReview()');check('teardown removes previews and flags',page.locator('.dfl-tab-preview,.dfl-tab-grab,[data-ui-swipe-settling]').count()==0)
 check('no browser errors',not errors)
 (OUT/'browser-checks.json').write_text(json.dumps({'checks':results,'errors':errors},indent=2));browser.close()
