"""Production Home components: reading hierarchy, tabs, rows and mobile reflow.

Use DFL_INTERFACE_BASELINE=1 to capture the pre-migration presentation.
League/provider data stays inside the existing isolated review fixture.
"""
import json,os,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
FIXTURE=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'))
OUT=Path(os.environ.get('DFL_INTERFACE_DIR',FIXTURE/'interface'));OUT.mkdir(parents=True,exist_ok=True)
BASELINE=bool(os.environ.get('DFL_INTERFACE_BASELINE'))
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?',1)[0].lstrip('/');file=FIXTURE/'index.html' if not path else ROOT/path
  if not file.is_file():self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png'}.get(file.suffix,'application/octet-stream'));self.end_headers();self.wfile.write(file.read_bytes())
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.route('https://**/*',lambda r:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()) if r.request.resource_type=='image' else r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded');page.wait_for_function('window.reviewStage')
 page.evaluate('''async()=>{
  reviewStage.stop();const {renderStage,startStage}=await import('./js/broadcast-stage.js');
  const {homeBroadcastDeck}=await import('./js/home-presentation.js');
  const deck=homeBroadcastDeck(reviewDeck,{now:new Date('2026-10-07T12:00:00Z')});
  document.querySelector('.home-broadcast').innerHTML=renderStage(deck,{editorial:true,wide:true});
  window.reviewStage=startStage(document.querySelector('[data-bx-stage]'),deck);reviewStage.suspend('interface-review',true);
  typeof reviewPageMotion==='function'?reviewPageMotion():reviewPageMotion?.stop?.();reviewVfx?.stop();reviewInjuryPanel?.stop();
 }''');page.evaluate('document.fonts.ready')
 for mode in ['light','dark']:
  page.evaluate('mode=>reviewSetTheme(mode)',mode)
  for width in [320,390,768]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('scrollTo(0,0)');page.wait_for_timeout(450)
   tag=f'{mode}-{width}'
   page.screenshot(path=str(OUT/f'{tag}-home.png'))
   plan=page.locator('[data-home-week-part="plan"]');plan.evaluate('e=>e.open=true')
   for tab in ['brief','picks','players','startsit']:
    page.locator(f'[data-week-tab="{tab}"]').evaluate('e=>e.click()');page.wait_for_timeout(350)
    plan.scroll_into_view_if_needed();page.wait_for_timeout(100)
    metrics=page.locator('#home-wrap').evaluate('''e=>{
     const nodes=[...e.querySelectorAll('.home-team-name strong,.home-week-tabs button,.home-position-tabs button,.home-weekly-digest [role="tabpanel"]:not([hidden]) .dfl-player-copy')].filter(n=>n.getClientRects().length);
     return {overflow:document.documentElement.scrollWidth>innerWidth+1,labelsFit:nodes.every(n=>n.scrollWidth<=n.clientWidth+1),font:getComputedStyle(e.querySelector('.home-week-tabs button')).fontFamily,targets:[...e.querySelectorAll('.home-week-tabs button,.home-position-tabs button')].filter(n=>n.getClientRects().length).every(n=>n.getBoundingClientRect().height>=44),title:getComputedStyle(e.querySelector('[data-home-week-part="plan"] summary strong')).fontSize};
    }''')
    contrast=plan.evaluate("async e=>(await import('./tools/home-review-contrast.js')).reviewTextContrast(e)")
    assert not metrics['overflow'] and metrics['labelsFit'] and metrics['targets'],(tag,tab,metrics)
    assert not contrast['failures'],(tag,tab,contrast['failures'])
    if not BASELINE:assert 'Inter' in metrics['font'],(tag,tab,'interface font missing')
    checks.append({'mode':mode,'width':width,'tab':tab,**metrics,'contrast':True})
    page.screenshot(path=str(OUT/f'{tag}-{tab}.png'))
   page.locator('[data-week-tab="brief"]').evaluate('e=>e.click()')
   page.locator('.home-league-desk').scroll_into_view_if_needed();page.wait_for_timeout(250)
   page.screenshot(path=str(OUT/f'{tag}-league.png'))
   if width==390:
    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/f'{tag}-full.png'),full_page=True)
   if width==320:
    page.evaluate("document.documentElement.style.fontSize='20px'")
    for tab in ['brief','players','startsit']:
     page.locator(f'[data-week-tab="{tab}"]').evaluate('e=>e.click()');page.wait_for_timeout(400)
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(tag,tab,'enlarged overflow')
     page.screenshot(path=str(OUT/f'{tag}-{tab}-large.png'))
    page.evaluate("document.documentElement.style.fontSize=''")
 assert not errors,errors
 browser.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps({'cases':checks,'errors':errors},indent=2));print(json.dumps({'layouts':len(checks),'enlarged':6,'errors':errors}))
