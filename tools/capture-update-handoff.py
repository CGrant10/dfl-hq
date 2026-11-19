"""Actual production HTML, updater and service workers; isolated local app stub."""
import json,threading,time,os,re,subprocess
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-update-review'));OUT.mkdir(parents=True,exist_ok=True)
NEW=(ROOT/'version.txt').read_text().strip()
def old_file(ref,name):return subprocess.check_output(['git','show',ref+':'+name],cwd=ROOT)
for ref in subprocess.check_output(['git','rev-list','--max-count=30','HEAD','--','index.html'],cwd=ROOT,text=True).splitlines():
 old_html=old_file(ref,'index.html');OLD=re.search(rb'name="dfl-app-version" content="([^"]+)"',old_html)[1].decode()
 if OLD!=NEW:break
else:raise RuntimeError('No previous release is available for the update review')
for name in ['index.html','sw.js','js/update.js']:
 dest=OUT/'previous'/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(old_file(ref,name))
if not (ROOT/'js/bundle'/OLD/'precache.js').is_file():raise RuntimeError('Build the app first; the previous bundle is required for this review')
state={'new':False,'legacy':False}
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
 def log_message(self,*a):pass
 def send(self,body,kind='application/javascript'):
  self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body if isinstance(body,bytes) else body.encode())
 def do_GET(self):
  path=self.path.split('?')[0]
  if path in ['/','/index.html']:
   return self.send((ROOT/'index.html' if state['new'] else OUT/'previous/index.html').read_bytes(),'text/html')
  if path=='/sw.js':return self.send((ROOT/'sw.js' if state['new'] else OUT/'previous/sw.js').read_bytes())
  if path=='/version.txt':return self.send(NEW if state['new'] else OLD,'text/plain')
  if path=='/js/config.js':return self.send('export const APP_VERSION=document.querySelector(\'meta[name="dfl-app-version"]\').content;export const LEAGUE_FOUNDED=2017;')
  if path=='/js/update.js':return self.send((OUT/'previous/js/update.js' if state['legacy'] and not state['new'] else ROOT/'js/update.js').read_bytes())
  if path.endswith('/app.js') and '/js/bundle/' in path:
   version=NEW if '/'+NEW+'/' in path else OLD
   return self.send('''import {setupUpdates,checkForUpdate} from '/js/update.js';
const version='''+json.dumps(version)+''';
if(version==='''+json.dumps(NEW)+''')await new Promise(r=>setTimeout(r,3500));
document.querySelector('#tabbar').innerHTML='<a href="#/home">Home</a><a href="#/clubhouse">Clubhouse</a><a href="#/trade">Trades</a><a href="#/sportsbook">Book</a><button>More</button>';
document.querySelector('#view').innerHTML='<h1>Updated league page</h1>';
window.handoffReady=version;setupUpdates();window.reviewCheck=checkForUpdate;dispatchEvent(new Event('dfl:app-ready'));
''')
  if path.endswith('/collapse.js') and '/js/bundle/' in path:return self.send('export {};')
  super().do_GET()
s=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}/';results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for mode,legacy in [('light',False),('dark',True)]:
  state.update(new=False,legacy=legacy);c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='allow');errors=[];page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  c.add_init_script('localStorage.setItem("dfl.mode",'+json.dumps(mode)+''');
window.handoffFrames=[];
function observe(){const nav=document.querySelector('#tabbar'),splash=document.querySelector('#splash');if(sessionStorage.getItem('review.updating')&&nav&&nav.getClientRects().length&&getComputedStyle(nav).visibility!=='hidden'&&/Keepers/.test(nav.innerText))handoffFrames.push({time:performance.now(),text:nav.innerText,splash:!!splash});requestAnimationFrame(observe)}requestAnimationFrame(observe);
''')
  page.goto(base+'#/home',wait_until='domcontentloaded');page.wait_for_function('window.handoffReady==="'+OLD+'"');page.evaluate('navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"})');page.wait_for_function('!!navigator.serviceWorker.controller',timeout=60000)
  page.evaluate('document.querySelector("#splash")?.remove()');state['new']=True;page.evaluate('reviewCheck()');page.wait_for_selector('#update-go');page.screenshot(path=str(OUT/f'gate-{mode}.png'));page.evaluate('sessionStorage.setItem("review.updating","1")')
  if not legacy:
   page.evaluate("window.nativeGetRegistration=navigator.serviceWorker.getRegistration.bind(navigator.serviceWorker);navigator.serviceWorker.getRegistration=async()=>({update:async()=>{throw Error('Offline fixture')}})")
   page.locator('#update-go').click();page.wait_for_function('document.querySelector("#update-go").textContent==="RETRY UPDATE"&&!document.querySelector("#update-go").disabled')
   assert page.locator('#update').is_visible();assert page.evaluate('sessionStorage.getItem("dfl.update.reboot")') is None
   page.screenshot(path=str(OUT/f'retry-{mode}.png'));page.evaluate('navigator.serviceWorker.getRegistration=nativeGetRegistration')
  start=time.monotonic()
  with page.expect_navigation(wait_until='domcontentloaded',timeout=60000):page.locator('#update-go').click()
  page.wait_for_timeout(1700)
  assert page.locator('#splash.is-rebooting').is_visible(),'Update plate vanished on timer'
  assert page.locator('#tabbar').evaluate('e=>getComputedStyle(e).visibility')=='hidden','Legacy chrome exposed'
  page.screenshot(path=str(OUT/f'opening-{mode}.png'))
  page.wait_for_function('window.handoffReady==="'+NEW+'"',timeout=30000);page.wait_for_selector('#splash',state='detached',timeout=5000)
  assert page.locator('#tabbar').evaluate('e=>getComputedStyle(e).visibility')=='visible'
  assert 'Clubhouse' in page.locator('#tabbar').inner_text()
  assert page.evaluate('handoffFrames.length')==0,page.evaluate('handoffFrames')
  assert not errors,errors
  page.screenshot(path=str(OUT/f'ready-{mode}.png'))
  result={'mode':mode,'legacyUpdater':legacy,'secondsIncludingDeliberate3_5sRenderDelay':round(time.monotonic()-start,2),'staleFrames':page.evaluate('handoffFrames'),'errors':errors};results.append(result);print('PASS',json.dumps(result),flush=True);c.close()
 b.close()
s.shutdown();(OUT/'handoff-checks.json').write_text(json.dumps(results,indent=2))
