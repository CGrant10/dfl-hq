"""Production trade picker/roster motion with isolated data and no league writes."""
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
  for theme in ['dark','light']:
   context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
   context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
   page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade');page.wait_for_function('window.reviewReady');page.evaluate("async theme=>{const t=await import('/js/theme.js');t.pinMode(theme)}",theme)
   page.locator('[data-td-mode="manual"]').click();page.locator('[data-td-clear]').evaluate('e=>e.click()')
   side=page.locator('.td-side').first;side.locator('[data-td-roster]').evaluate('e=>e.open=true')
   side.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:"instant"})');page.wait_for_timeout(100)
   box=side.locator('[data-td-pick]').first;pid=box.get_attribute('value');box.click()
   page.wait_for_function('!!document.querySelector(".dfl-connected-portrait")')
   assert page.locator('.dfl-connected-portrait').count()==1
   selected=side.locator('.td-selected-player');assert selected.get_attribute('data-trade-player')==pid
   assert selected.bounding_box()['height']<=48
   page.screenshot(path=str(OUT/f'pick-{width}-{theme}.png'));page.wait_for_timeout(360)
   assert page.locator('.dfl-connected-portrait').count()==0
   selected.locator('[data-td-remove-pick]').click();page.wait_for_function('!!document.querySelector(".dfl-connected-portrait")')
   assert not box.is_checked() and box.evaluate('e=>e===document.activeElement')
   # Repeated selection cancels the preceding flight and keeps the committed state.
   box.evaluate('e=>{e.click();e.click();e.click()}');page.wait_for_timeout(50)
   assert box.is_checked() and side.locator('.td-selected-player').count()==1
   assert page.locator('.dfl-connected-portrait').count()<=1
   page.locator('[data-td-clear]').evaluate('e=>e.click()');page.wait_for_timeout(50)
   assert page.locator('.dfl-connected-portrait').count()==0 and side.locator('.td-selected-player').count()==0
   # A third member's explicit recipient survives the animation and redraw.
   page.locator('[data-td-add-member]').evaluate('e=>e.click()')
   side=page.locator('.td-side').first;side.locator('[data-td-roster]').evaluate('e=>e.open=true');side.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-80,behavior:"instant"})');page.wait_for_timeout(60)
   box=side.locator('[data-td-pick]').first;box.click();page.wait_for_timeout(340)
   destination=side.locator('[data-td-destination]');options=destination.locator('option').evaluate_all('es=>es.map(e=>e.value).filter(Boolean)');destination.select_option(options[-1])
   assert destination.input_value()==options[-1] and destination.get_attribute('aria-invalid')=='false'
   assert side.locator('.td-selected-player').count()==1
   # System and app motion preferences settle immediately without hiding players.
   page.emulate_media(reduced_motion='reduce');page.locator('[data-td-clear]').evaluate('e=>e.click()');box.click();page.wait_for_timeout(60)
   assert page.locator('.dfl-connected-portrait').count()==0
   page.emulate_media(reduced_motion='no-preference');page.locator('[data-td-clear]').evaluate('e=>e.click()');page.evaluate('localStorage.setItem("dfl.details.v1.guest.gameday-motion","off")');box.click();page.wait_for_timeout(60)
   assert page.locator('.dfl-connected-portrait').count()==0
   page.evaluate('localStorage.removeItem("dfl.details.v1.guest.gameday-motion")')
   page.locator('[data-td-mode="offers"]').first.evaluate('e=>e.click()');page.locator('.tb-setup').evaluate('e=>e.open=true')
   trigger=page.locator('[data-trade-picker="send"]');trigger.evaluate('e=>scrollTo({top:scrollY+e.closest("section").getBoundingClientRect().top-90,behavior:"instant"})');page.wait_for_timeout(80);trigger.click()
   choice=page.locator('.trade-player-picker[open] [data-picker-player]').first;pid=choice.get_attribute('data-picker-player');choice.click()
   page.wait_for_function('!!document.querySelector(".dfl-connected-portrait")')
   assert page.locator('.trade-player-picker[open]').count()==0
   assert page.locator(f'.tb-anchor-chips [data-trade-player="{pid}"]').count()==1
   assert trigger.evaluate('e=>e===document.activeElement')
   # Leaving while a portrait travels removes the layer and restores its target.
   page.evaluate('reviewLeave()');page.wait_for_timeout(40)
   assert page.locator('.dfl-connected-portrait').count()==0
   assert page.locator('[style*="visibility: hidden"]').count()==0
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors
   checks.append({'width':width,'theme':theme,'rosterAddRemove':True,'compactChip':True,'rapidSelection':True,'threeTeamRecipient':True,'reducedMotion':True,'appMotionOff':True,'pickerFlight':True,'focusReturn':True,'teardown':True,'errors':errors})
   print(json.dumps(checks[-1]),flush=True);context.close()
 browser.close()
server.shutdown();(OUT/'pick-motion-checks.json').write_text(json.dumps(checks,indent=2))
