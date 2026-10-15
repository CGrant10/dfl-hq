"""Actual router, scroll memory and motion with isolated page/data modules."""
import json, os, threading
from pathlib import Path
from urllib.parse import urlparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('DFL_ROUTE_REVIEW_DIR', ROOT.parent / 'dfl-route-review'))
OUT.mkdir(parents=True, exist_ok=True)
ROUTES = ['home', 'clubhouse', 'sportsbook', 'trade', 'analyzer']
HTML = '''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="css/tokens.css"><link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/ui.css"><link rel="stylesheet" href="css/app-shared.css"><style>.topbar{height:44px}.view{padding:70px 14px 90px}.fixture-content{min-height:2000px}#tabbar a{font-size:12px}</style></head><body><header class="topbar">DFL · fixed header</header><main class="view" id="view"></main><nav id="tabbar" class="tabbar">''' + ''.join(f'<a href="#/{r}" data-route="{r}">{r}</a>' for r in ROUTES) + '''</nav><script type="module">import{startRouter}from './js/router.js';import{startUiMotion}from './js/ui-motion.js';window.holds={};window.releases={};window.fail={};window.returnError={};startUiMotion();startRouter();</script></body></html>'''
STUBS = {
 'js/member-lock.js': 'export function startMemberLock(){}',
 'js/sportsbook-nav.js': 'export function ensureSportsbookNav(){}',
 'js/config.js': 'export const dflSeasonCount=n=>n;export async function loadGolfFeatures(){}',
 'js/inline.js': 'export const canEdit=()=>true;',
 'js/supabase.js': 'export const db=()=>{throw Error("No backend in route fixture")};',
 'js/members.js': 'export const getMemberId=()=>"route-fixture";',
 'js/performance-policy.js': 'export const mountRouteWarmup=()=>()=>{};',
 'js/weekly-outlook-panel.js': 'export function mountWeeklyOutlook(){}',
}
importFailures=set()
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=urlparse(self.path).path.lstrip('/')
  if path in importFailures and not urlparse(self.path).query:
   importFailures.remove(path);self.send_error(503);return
  if not path or path=='index.html':body=HTML.encode();kind='text/html'
  elif path in STUBS:body=STUBS[path].encode();kind='text/javascript'
  elif path.startswith('js/pages/'):
   name=Path(path).stem
   body=('export async function render(view){const name='+json.dumps(name)+';if(window.holds[name])await new Promise(resolve=>window.releases[name]=resolve);if(window.fail[name])throw Error("Isolated load failure");if(window.returnError[name]){view.innerHTML=`<div class="state is-error" role="alert"><span class="state-title">Connection interrupted</span><button class="btn" data-retry-page>Retry</button></div>`;return}if(name==="sportsbook")view.dataset.restoreScrollY="900";view.innerHTML=`<section class="fixture-content"><h1>${name}</h1><details data-page-detail="fixture"><summary>Saved section</summary><p>Saved content</p></details><input value="Unsaved local text"></section>`}').encode();kind='text/javascript'
  else:
   file=ROOT/path
   if not file.is_file():self.send_error(404);return
   body=file.read_bytes();kind={'.js':'text/javascript','.css':'text/css'}.get(file.suffix,'application/octet-stream')
  self.send_response(200);self.send_header('Content-Type',kind);self.end_headers();self.wfile.write(body)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[];errors=[]
def check(label,ok=True):
 assert ok,label
 checks.append(label);print('PASS '+label,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--no-proxy-server'])
 context=browser.new_context(viewport={'width':390,'height':844},has_touch=True)
 context.add_init_script('''window.routeAnimations=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){const a=original.call(this,frames,options);if(this.dataset.routeGliding){routeAnimations.push({id:this.id,frames,options});if(window.pauseRouteStart&&this.classList.contains('route-placeholder-inner')){window.pauseRouteStart=false;a.pause();a.currentTime=60}}return a};''')
 page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
 def ready(route):page.wait_for_function('r=>document.querySelector("#view")?.dataset.route===r&&!document.querySelector("#view").classList.contains("is-route-loading")',arg=route)
 def clean():page.wait_for_function('!document.querySelector("#route-placeholder,[data-route-gliding]")')
 def go(route):page.locator(f'#tabbar [data-route="{route}"]').click();ready(route);clean()
 def shell():return page.evaluate('()=>[".topbar","#tabbar"].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height]})')
 page.goto(f'http://127.0.0.1:{server.server_port}/#/home');ready('home');clean()
 check('initial launch has no directional entrance',page.evaluate('routeAnimations.length===0'))
 fixed=shell();page.evaluate('holds.clubhouse=true;pauseRouteStart=true;routeAnimations=[]')
 page.locator('#tabbar [data-route="clubhouse"]').click();page.wait_for_function('!!window.releases.clubhouse')
 offset=page.locator('.route-placeholder-inner').evaluate('e=>new DOMMatrixReadOnly(getComputedStyle(e).transform).m41')
 check('forward navigation slides from the right',0<offset<28)
 check('shared header and navigation stay fixed during loading',shell()==fixed)
 check('loading view stays inert and busy',page.locator('#view').evaluate('e=>e.inert&&e.getAttribute("aria-busy")==="true"'))
 page.evaluate('holds.clubhouse=false;releases.clubhouse()');ready('clubhouse')
 start=page.evaluate('routeAnimations.find(a=>a.id==="view").frames[0].transform')
 check('ready page continues the loading position without restarting',abs(page.evaluate('t=>new DOMMatrixReadOnly(t).m41',start)-offset)<1)
 clean();check('ready page clears loading and motion state',page.locator('#view').evaluate('e=>!e.inert&&!e.hasAttribute("aria-busy")&&!e.classList.contains("page-switching")'))
 check('shared shell remains fixed after arrival',shell()==fixed)
 page.evaluate('routeAnimations=[]');go('home')
 check('backward navigation slides from the left',page.evaluate('routeAnimations.some(a=>a.frames[0].transform==="translateX(-28px)")'))
 page.evaluate('document.querySelector("details").open=true;scrollTo(0,650)');page.wait_for_timeout(100);go('sportsbook')
 check('new destination starts at its own scroll position',page.evaluate('scrollY')==0)
 go('home');check('ordinary revisit starts at the top',page.evaluate('scrollY')==0)
 page.go_back();ready('sportsbook');clean();page.go_back();ready('home');clean();page.wait_for_function('Math.abs(scrollY-650)<2')
 check('Back restores the exact visit scroll and disclosure',page.locator('details').evaluate('e=>e.open'))
 page.go_forward();ready('sportsbook');clean();check('Forward opens at the top',page.evaluate('scrollY')==0)
 page.go_forward();ready('home');clean();check('separate visits to Home keep separate offsets',page.evaluate('scrollY')==0)
 page.evaluate('scrollTo(0,500)');go('home');check('tapping the current page returns to the top',page.evaluate('scrollY')==0)
 go('clubhouse');page.evaluate('scrollTo(0,700);history.replaceState(history.state,"","#/clubhouse?match=second")');go('analyzer');page.go_back();ready('clubhouse');clean();page.wait_for_function('Math.abs(scrollY-700)<2')
 check('Back survives same-page query updates',page.evaluate('location.hash')=='#/clubhouse?match=second')
 go('home');check('Home still starts at the top after a Back visit',page.evaluate('scrollY')==0)
 page.evaluate('holds.clubhouse=true;delete releases.clubhouse;routeAnimations=[]');page.locator('#tabbar [data-route="clubhouse"]').click();page.wait_for_function('!!window.releases.clubhouse')
 go('trade');page.evaluate('holds.clubhouse=false;releases.clubhouse()');page.wait_for_timeout(300)
 check('late page completion cannot replace a newer destination',page.locator('#view').get_attribute('data-route')=='trade' and 'trade' in page.locator('#view h1').inner_text().lower())
 check('late completion cannot change selected navigation',page.locator('#tabbar a.on').get_attribute('data-route')=='trade')
 page.evaluate('routeAnimations=[];holds.sportsbook=true;delete releases.sportsbook');page.locator('#tabbar [data-route="sportsbook"]').click();page.wait_for_function('!!window.releases.sportsbook');page.wait_for_timeout(280)
 page.evaluate('holds.sportsbook=false;releases.sportsbook()');ready('sportsbook');clean()
 check('slow load fades without replaying a slide',page.evaluate('routeAnimations.find(a=>a.id==="view").frames[0].transform==="none"'))
 for route in ['home','sportsbook','trade','clubhouse','home']:
  page.locator(f'#tabbar [data-route="{route}"]').click();page.wait_for_timeout(25)
 ready('home');clean();check('rapid repeated navigation settles on the last tap',page.locator('#tabbar a.on').get_attribute('data-route')=='home')
 page.evaluate('fail.sportsbook=true');go('sportsbook')
 check('failed route retains accessible retry and home actions',page.locator('[role="alert"]').count()==1 and page.locator('[data-route-retry]').count()==1)
 origin=page.evaluate('performance.timeOrigin');page.evaluate('fail.sportsbook=false');page.locator('[data-route-retry]').click();page.wait_for_selector('#view h1:text-is("sportsbook")');ready('sportsbook');clean()
 check('manual retry recovers the same page without restarting the document',page.evaluate('performance.timeOrigin')==origin and page.locator('#view h1').inner_text().lower()=='sportsbook')
 page.evaluate('returnError.trade=true');go('trade')
 check('returned page error exposes current-screen recovery',page.locator('#view').get_attribute('data-route-failed')=='true')
 page.evaluate('returnError.trade=false');page.locator('[data-retry-page]').click();page.wait_for_selector('#view h1:text-is("trade")');ready('trade');clean()
 check('renderer-provided Retry works without app bootstrap',page.locator('#view h1').inner_text().lower()=='trade' and page.evaluate('performance.timeOrigin')==origin)
 page.evaluate('fail.clubhouse=true');go('clubhouse');page.evaluate('fail.clubhouse=false;dispatchEvent(new Event("online"))');page.wait_for_selector('#view h1:text-is("clubhouse")');ready('clubhouse');clean()
 check('reconnect recovers a failed page in place',page.evaluate('performance.timeOrigin')==origin)
 importFailures.add('js/pages/calendar.js');page.evaluate('location.hash="#/calendar"');ready('calendar');clean()
 check('interrupted page-module download offers Retry',page.locator('[data-route-retry]').count()==1)
 page.locator('[data-route-retry]').click();page.wait_for_selector('#view h1:text-is("calendar")');ready('calendar');clean()
 check('failed module import retries through a fresh URL without reloading',page.evaluate('performance.timeOrigin')==origin)
 go('home')
 page.evaluate('routeAnimations=[]');page.emulate_media(reduced_motion='reduce');go('clubhouse')
 check('reduced motion disables page glides',page.evaluate('routeAnimations.length===0'))
 page.emulate_media(reduced_motion='no-preference');page.evaluate('routeAnimations=[];localStorage.setItem("dfl.details.v1.guest.gameday-motion","off");dispatchEvent(new Event("dfl:route-performance"))');go('home')
 check('motion preference disables page glides',page.evaluate('routeAnimations.length===0'))
 page.evaluate('localStorage.removeItem("dfl.details.v1.guest.gameday-motion");dispatchEvent(new Event("dfl:route-performance"));holds.clubhouse=true;delete releases.clubhouse');page.locator('#tabbar [data-route="clubhouse"]').click();page.wait_for_function('!!window.releases.clubhouse');page.set_viewport_size({'width':320,'height':844});page.evaluate('holds.clubhouse=false;releases.clubhouse()');ready('clubhouse');clean()
 check('resize safely cancels an interrupted transition',page.locator('#view').evaluate('e=>getComputedStyle(e).transform==="none"'))
 for width in [320,390,768]:
  page.set_viewport_size({'width':width,'height':844});go('sportsbook');go('home')
  check(f'{width}px navigation has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 page.screenshot(path=str(OUT/'route-home-390.png'))
 check('no uncaught browser errors',not errors)
 browser.close()
(OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
server.shutdown();print(f'{len(checks)} route checks passed')
