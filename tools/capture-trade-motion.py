"""Real offer/detail transitions and directed packages, isolated from league writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_TRADE_REVIEW_DIR',ROOT.parent/'dfl-trade-review'))
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?',1)[0]
  body="export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};export const privilegedFunctionHeaders=()=>({});" if path=='/js/supabase.js' else "export const currentMember=()=>null;export const loadMemberDirectory=async()=>[];" if path=='/js/members.js' else None
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def translate_path(self,path):
  clean=path.split('?',1)[0];return str(OUT/clean.removeprefix('/trade-review/')) if clean.startswith('/trade-review/') else str(ROOT/clean.lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox'])
 for width in [320,390]:
  context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,reduced_motion='no-preference')
  context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade');page.wait_for_function('window.reviewReady');page.evaluate('document.fonts.ready')
  page.locator('.tb-offer').first.wait_for();page.evaluate('document.documentElement.dataset.uiMotion="on"')
  source=page.locator('.tb-offer').first;key=source.get_attribute('data-offer-key');source.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-90,behavior:"instant"})');page.wait_for_timeout(80)
  source.locator('[data-td-load-offer]').evaluate('e=>e.click()');page.wait_for_function('document.querySelectorAll(".dfl-connected-portrait").length>0')
  assert page.locator('.dfl-connected-portrait').count()<=6
  assert page.locator('.dfl-connected-portrait').evaluate_all('es=>es.every(e=>e.getAttribute("aria-hidden")==="true"&&getComputedStyle(e).pointerEvents==="none")')
  assert page.locator('[data-td-verdict] h2').first.evaluate('e=>e===document.activeElement')
  page.screenshot(path=str(OUT/f'trade-{width}-connected-detail.png'));page.wait_for_timeout(400);assert page.locator('.dfl-connected-portrait').count()==0
  page.locator('[data-offer-return]').evaluate('e=>e.click()');page.wait_for_function('document.querySelectorAll(".dfl-connected-portrait").length>0')
  assert page.evaluate('(key)=>document.activeElement.closest(".tb-offer").dataset.offerKey===key',key)
  page.wait_for_timeout(400);checks.append({'width':width,'connectedOffer':True,'boundedPortraits':True,'focusReturn':True})
  # Reduced motion and a route teardown both settle without a temporary layer.
  page.emulate_media(reduced_motion='reduce');page.locator('.tb-offer').first.locator('[data-td-load-offer]').evaluate('e=>e.click()');page.wait_for_timeout(80);assert page.locator('.dfl-connected-portrait').count()==0
  page.locator('[data-offer-return]').evaluate('e=>e.click()');page.emulate_media(reduced_motion='no-preference')
  page.locator('.tb-offer').first.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-90,behavior:"instant"})');page.wait_for_timeout(80)
  page.locator('.tb-offer').first.locator('[data-td-load-offer]').evaluate('e=>e.click()');page.wait_for_function('document.querySelectorAll(".dfl-connected-portrait").length>0')
  page.evaluate('dispatchEvent(new Event("resize"))');assert page.locator('.dfl-connected-portrait').count()==0
  page.locator('[data-offer-return]').evaluate('e=>e.click()');page.evaluate('reviewLeave()');page.wait_for_timeout(80);assert page.locator('.dfl-connected-portrait').count()==0
  assert not errors,errors;checks.append({'width':width,'reducedMotion':True,'resizeCancellation':True,'teardown':True});context.close()
 browser.close()
server.shutdown();(OUT/'motion-checks.json').write_text(json.dumps(checks,indent=2));print(json.dumps(checks))
