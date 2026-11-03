"""Delayed, failed and responsive images through the real shared renderers."""
import json,os,re,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_IMAGE_REVIEW_DIR','/tmp/dfl-image-quality'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0];head=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',head)
html='''<!doctype html><html><head>HEAD</head><body><main id="view" class="view" data-route="clubhouse" data-pulse-system="1" style="padding:16px"><div class="clubhouse-command-center"><div data-clubhouse-leaders id="photos" style="display:flex;align-items:center;gap:16px;min-height:52px"></div><div id="poster"></div><p id="after">Same position while images arrive.</p></div></main><script type="module">
import {playerPortrait} from '/js/player-presentation.js';import {teamPortrait} from '/js/team-presentation.js';import {highlightPosterImage} from '/js/home-highlight-ui.js';import {patchGameDay} from '/js/game-day-dom.js';import {MEDICINE_GROUND} from '/js/team-theme.js';
const source=await(await fetch('/js/theme.js')).text(),modes=Function('MEDICINE_GROUND','return ('+source.match(/const MODES = (\\{[\\s\\S]*?\\n\\});/)[1]+')')(MEDICINE_GROUND),assignments=[...source.matchAll(/s\\.setProperty\\("([^\"]+)", m\\.([a-zA-Z0-9]+)\\);/g)];
window.setTheme=mode=>{document.documentElement.dataset.mode=mode;for(const [,name,key] of assignments)document.documentElement.style.setProperty(name,modes[mode][key])};
const playerHtml=playerPortrait({id:'11635',name:'Ladd McConkey'})+playerPortrait({id:'2449',name:'Stefon Diggs'},{size:96}),identity={profile_photo_source:'dfl',profile_image:'https://image.fixture/dfl.jpg',sleeper_team_image:'https://image.fixture/sleeper.jpg'};
window.photoHtml=playerHtml+teamPortrait({team_name:'Team photo',identity});
window.changeSavedPhoto=url=>{identity.profile_image=url;window.photoHtml=playerHtml+teamPortrait({team_name:'Team photo',identity});window.patchImages()};
window.posterHtml='<span class="home-reel-poster">'+highlightPosterImage('https://a.espncdn.com/photo/fixture.jpg')+'</span>';
photos.innerHTML=photoHtml;poster.innerHTML=posterHtml;window.patchImages=()=>{patchGameDay(photos,photoHtml);patchGameDay(poster,posterHtml)};window.ready=true;
</script></body></html>'''.replace('HEAD',head)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  if self.path=='/':self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(html.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/';checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox'])
 for dpr in [1,3]:
  for mode in ['light','dark']:
   c=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=dpr,is_mobile=True,has_touch=True);pending=[];requested=[];errors=[]
   def route(r):
    if r.request.url.startswith(base):return r.continue_()
    if r.request.resource_type=='image':pending.append(r);requested.append(r.request.url);return
    if '/npm/@supabase/supabase-js@' in r.request.url:return r.fulfill(content_type='text/javascript',body='export const createClient=()=>{throw Error("No database in image fixture")}',headers={'Access-Control-Allow-Origin':'*'})
    r.abort()
   c.route('**/*',route);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base,wait_until='domcontentloaded');page.wait_for_function('window.ready');page.evaluate('mode=>setTheme(mode)',mode);page.evaluate('document.querySelectorAll("img").forEach(n=>n.loading="eager")');page.wait_for_timeout(150)
   before=page.locator('#after').bounding_box();assert page.locator('#photos img').evaluate_all('ns=>ns.every(n=>getComputedStyle(n).opacity==="0")')
   assert page.locator('#photos>.dfl-player-portrait,#photos>.dfl-team-mark').evaluate_all('ns=>ns.every(n=>{const r=n.getBoundingClientRect();return r.width>=30&&r.height>=30&&r.top>=0&&r.bottom<innerHeight})'),'Image fixture did not render visible production portraits'
   batch=pending[:];pending.clear()
   for r in batch:
    failed='/players/2449.jpg' in r.request.url or '/dfl.jpg' in r.request.url
    r.fulfill(status=404 if failed else 200,content_type='image/png',body=b'' if failed else (ROOT/'tools/fixtures/player-portrait.png').read_bytes())
   page.wait_for_timeout(150)
   for r in pending[:]:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes());pending.remove(r)
   page.wait_for_timeout(220)
   assert page.locator('#photos .has-photo').count()==3
   assert page.locator('#photos img').evaluate_all('ns=>ns.every(n=>n.complete&&n.naturalWidth>0&&getComputedStyle(n).opacity==="1")')
   assert page.locator('.home-reel-poster').evaluate('e=>e.classList.contains("has-poster")&&getComputedStyle(e.querySelector("img")).opacity==="1"')
   assert abs(before['y']-page.locator('#after').bounding_box()['y'])<1,'Image load moved the following text'
   assert '/thumb/2449.jpg' in page.locator('#photos img').nth(1).get_attribute('src')
   assert page.locator('.dfl-team-mark img').get_attribute('src')=='https://image.fixture/sleeper.jpg'
   width=int(parse_qs(urlparse(page.locator('.home-reel-poster img').evaluate('e=>e.currentSrc')).query)['w'][0]);assert width in [240,480,960] and width<=960
   assert len([url for url in requested if '/combiner/i?' in url])==1,'Responsive poster downloaded more than one variant'
   page.evaluate('patchImages()');page.wait_for_timeout(30)
   assert page.locator('#photos .has-photo').count()==3 and not pending,'Live patch retried a failed image primary or hid its successful fallback'
   assert page.locator('.home-reel-poster').evaluate('e=>e.classList.contains("has-poster")&&getComputedStyle(e.querySelector("img")).opacity==="1"'),'Live patch hid an already loaded poster'
   page.evaluate('changeSavedPhoto("https://image.fixture/new.jpg")');page.wait_for_timeout(30)
   assert len(pending)==1 and pending[0].request.url=='https://image.fixture/new.jpg','A changed saved photo did not invalidate its old fallback'
   pending.pop().fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes());page.wait_for_timeout(200)
   assert page.locator('.dfl-team-mark img').get_attribute('src')=='https://image.fixture/new.jpg'
   # Failed images restore the real initials instead of keeping a blank photo state.
   photo=page.locator('#photos .dfl-player-portrait').first
   photo.locator('img').evaluate('e=>e.dispatchEvent(new Event("error"))')
   assert photo.locator('img').count()==0 and not photo.evaluate('e=>e.classList.contains("has-photo")')
   assert photo.locator('i').evaluate('e=>getComputedStyle(e).visibility!=="hidden"')
   page.screenshot(path=str(OUT/f'{mode}-{dpr}x.png'))
   page.emulate_media(reduced_motion='reduce');assert page.locator('img[data-image-reveal]').evaluate_all('ns=>ns.every(n=>getComputedStyle(n).transitionDuration==="0s")')
   assert not errors,errors
   checks.append({'mode':mode,'dpr':dpr,'posterWidth':width,'stableLayout':True,'portraitFallback':True,'photoPreferenceFallback':True,'posterSurvivesRefresh':True,'reducedMotion':True,'pageErrors':errors});c.close()
 browser.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps(checks,indent=2));print(json.dumps(checks))
