"""Real waiver renderer/refresh handlers with isolated data and no network writes."""
import json,os,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
output=Path(os.environ.get('DFL_WAIVER_REVIEW_DIR','/workspace/dfl-waiver-review'))
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  if self.path.split('?')[0]=='/js/roster-coach-data.js':
   body="export const clearRosterCoachCache=()=>{window.reviewRefreshes++};export const loadRosterCoach=async()=>{await new Promise(r=>setTimeout(r,80));if(window.reviewFailure)throw Error('Unavailable');return window.reviewSnapshot};"
   self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def translate_path(self,path):
  name=path.split('?')[0].split('#')[0]
  return str(output/name.removeprefix('/waiver-review/')) if name.startswith('/waiver-review/') else str(root/name.lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
results=[]
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']}
 if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
 browser=p.chromium.launch(**launch)
 for width in [320,390,768]:
  context=browser.new_context(viewport={'width':width,'height':844},service_workers='block')
  context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/waiver-review/index.html');page.wait_for_selector('.coach-market')
  assert 'Waiver order' in page.locator('.coach-market').inner_text()
  assert 'FAAB guide' not in page.locator('.roster-coach').inner_text()
  page.locator('.coach-more > summary').click();page.locator('[data-coach-detail="offer-rb"] summary').click();page.locator('.coach-drops summary').click()
  assert 'Claims are private' in page.locator('[data-coach-detail="offer-rb"]').inner_text()
  assert page.locator('.coach-drops li').count()==2
  page.evaluate("scrollTo({top:0,behavior:'instant'})")
  page.screenshot(path=str(output/f'waivers-{width}-priority.png'),full_page=True)
  page.locator('[data-coach-refresh]').click();page.wait_for_function('window.reviewRefreshes===1&&!document.querySelector("[data-coach-refresh]").disabled')
  assert page.locator('[data-coach-refresh]').evaluate('e=>e===document.activeElement')
  assert page.locator('[data-coach-detail="offer-rb"]').evaluate('e=>e.open')
  assert page.locator('[data-coach-detail="offer-wr"]').evaluate('e=>!e.open')
  assert page.locator('.coach-drops').evaluate('e=>e.open')
  for scenario in ['faab','partial']:
   page.evaluate('(scenario)=>{window.reviewSnapshot=window.waiverReviewFixture({faab:true,partial:scenario==="partial"});window.renderReview()}',scenario)
   page.wait_for_selector('.coach-market');text=page.locator('.roster-coach').inner_text()
   assert 'Waiver order' not in text
   assert ('DFL-guided FAAB' in text)==(scenario=='faab')
   if scenario=='partial':assert 'PARTIAL HISTORY' in text
   else:
    page.locator('.coach-intel summary').first.click();assert 'winning bids' in page.locator('.coach-intel').first.inner_text()
   page.screenshot(path=str(output/f'waivers-{width}-{scenario}.png'))
  page.evaluate('window.reviewFailure=true');page.locator('[data-coach-refresh]').click();page.wait_for_selector('[data-coach-retry]')
  assert page.locator('[data-coach-retry]').evaluate('e=>e===document.activeElement')
  page.evaluate('window.reviewFailure=false');page.locator('[data-coach-retry]').click();page.wait_for_selector('.coach-market')
  assert page.locator('[data-coach-refresh]').evaluate('e=>e===document.activeElement')
  for mode in ['dark','light']:
   page.evaluate("mode=>{document.documentElement.dataset.theme=mode;document.documentElement.style.fontSize='200%'}",mode)
   page.locator('.coach-intel summary').first.click()
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'{width}: enlarged type overflow'
   page.screenshot(path=str(output/f'waivers-{width}-large-{mode}.png'))
  assert not errors,errors
  results.append({'width':width,'priorityAndBidModes':True,'partialHistoryLabel':True,'recentDrops':True,'focusPreserved':True,'individualDetailsPreserved':True,'failureRecovery':True,'pageErrors':errors,'overflow':False});context.close()
 browser.close()
server.shutdown();(output/'waiver-review.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
