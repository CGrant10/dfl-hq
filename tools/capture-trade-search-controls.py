"""Real offer handlers, lazy starter previews and motion. No league writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];FIXTURE=Path(os.environ.get('DFL_TRADE_REVIEW_DIR','/tmp/dfl-trade-1506'));OUT=Path(os.environ.get('DFL_TRADE_CONTROLS_DIR',FIXTURE/'controls'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?',1)[0]
  body="export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};export const privilegedFunctionHeaders=()=>({});" if path=='/js/supabase.js' else "export const currentMember=()=>null;export const loadMemberDirectory=async()=>[];" if path=='/js/members.js' else None
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def translate_path(self,path):
  clean=path.split('?',1)[0];return str(FIXTURE/clean.removeprefix('/trade-review/')) if clean.startswith('/trade-review/') else str(ROOT/clean.lstrip('/'))
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(name,ok):
 checks.append({'name':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for width in [320,390]:
  for mode in ['light','dark']:
   c=browser.new_context(viewport={'width':width,'height':844},has_touch=True,is_mobile=True,service_workers='block');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade');page.wait_for_function('reviewReady');page.wait_for_selector('.tb-offer');page.evaluate("async m=>(await import('/js/theme.js')).pinMode(m)",mode);tag=f'{width}/{mode}'
   page.locator('.tb-setup>summary').click();page.wait_for_timeout(300);page.locator('.tb-setup').scroll_into_view_if_needed()
   check(tag+' default is All teams with advanced fields folded',page.locator('[data-ta-shop-partner]').input_value()=='all' and not page.locator('.tb-refine').evaluate('e=>e.open') and not page.locator('[data-td-team]').is_visible())
   check(tag+' Want appears before Offer',page.locator('[data-tb-receive-targets]').bounding_box()['x']<page.locator('[data-tb-send-targets]').bounding_box()['x'])
   check(tag+' controls have no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.screenshot(path=str(OUT/f'controls-{width}-{mode}.png'))
   page.locator('[data-trade-picker="send"]').click();page.locator('[data-picker-player="1-4"]').click();page.wait_for_function('!document.querySelector(".trade-player-picker")?.open');page.wait_for_timeout(300)
   page.locator('[data-tb-protected]').click();sheet=page.locator('dialog.trade-protected-sheet');page.wait_for_timeout(300)
   check(tag+' full roster opens without keyboard focus',sheet.locator('[data-protected-player]').count()==11 and sheet.locator('h2').evaluate('e=>e===document.activeElement'))
   sheet.locator('[data-protected-player="1-4"]').check();page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog.trade-protected-sheet")')
   check(tag+' cancel leaves protection and send anchor untouched',page.locator('[data-tb-protected-count]').inner_text()=='0' and page.locator('[data-tb-send-targets] [data-tb-remove-anchor]').count()==1)
   page.locator('[data-tb-protected]').click();sheet=page.locator('dialog.trade-protected-sheet');sheet.locator('[data-protected-player="1-4"]').check();sheet.locator('input[type=search]').fill('Hockenson');sheet.locator('[data-protected-player="1-10"]').check();sheet.locator('input[type=search]').fill('')
   check(tag+' filtered selection retains previous choices',sheet.locator('[data-protected-player="1-4"]').is_checked() and sheet.locator('[data-protected-player="1-10"]').is_checked())
   check(tag+' roster names and touch rows fit',sheet.locator('.trade-protected-player').evaluate_all("es=>es.every(e=>e.getBoundingClientRect().height>=44&&getComputedStyle(e.querySelector('.dfl-player-copy>strong')).whiteSpace==='nowrap')"))
   page.screenshot(path=str(OUT/f'protected-{width}-{mode}.png'));sheet.locator('[data-protected-save]').click();page.wait_for_function("document.querySelector('[data-tb-protected-count]').textContent==='2'")
   check(tag+' protecting a selected sender removes that anchor',not page.locator('[data-tb-send-targets] [data-tb-remove-anchor]').count() and page.locator('[data-tb-add-anchor="send"] option[value="1-4"]').count()==0)
   for tier in ['fair','aggressive','steal']:
    page.locator(f'[data-tb-intent="{tier}"]').first.click();page.wait_for_function("document.querySelector('.tb-offers-card').getAttribute('aria-busy')==='false'")
    check(tag+' '+tier+' never displays a protected sender',not page.locator('.tb-offer [data-trade-player="1-4"],.tb-offer [data-trade-player="1-10"]').count())
   check(tag+' FantasyCalc link opens the real database without claiming preset filters',page.locator('.tb-market-link').get_attribute('href')=='https://fantasycalc.com/database' and 'Choose league filters' in page.locator('.tb-market-link').inner_text())
   page.reload();page.wait_for_function('reviewReady');page.wait_for_selector('.tb-offer,.ta-empty');page.locator('.tb-setup>summary').click();page.wait_for_timeout(300)
   check(tag+' new visit keeps exclusions and defaults to All teams',page.locator('[data-tb-protected-count]').inner_text()=='2' and page.locator('[data-ta-shop-partner]').input_value()=='all')
   page.locator('.tb-refine>summary').click();page.wait_for_timeout(300);page.locator('[data-td-team]').select_option('2');page.wait_for_timeout(100)
   check(tag+' another roster has separate exclusions',page.locator('[data-tb-protected-count]').inner_text()=='0')
   page.locator('[data-td-team]').select_option('1');page.wait_for_timeout(100)
   check(tag+' returning to the original roster restores exclusions',page.locator('[data-tb-protected-count]').inner_text()=='2')
   page.locator('[data-tb-protected]').click();sheet=page.locator('dialog.trade-protected-sheet');sheet.locator('[data-protected-clear]').click();sheet.locator('[data-protected-save]').click();page.wait_for_timeout(100)
   check(tag+' explicit Clear all restores sender choices',page.locator('[data-tb-protected-count]').inner_text()=='0' and page.locator('[data-tb-add-anchor="send"] option[value="1-4"]').count()==1)
   page.evaluate("document.documentElement.style.fontSize='32px'");page.locator('.tb-setup').scroll_into_view_if_needed();check(tag+' 200% controls stay in bounds',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));page.screenshot(path=str(OUT/f'large-{width}-{mode}.png'))
   page.locator('[data-tb-protected]').click();sheet=page.locator('dialog.trade-protected-sheet');page.wait_for_timeout(300);check(tag+' enlarged sheet keeps footer inside screen',sheet.locator('footer').evaluate('e=>e.getBoundingClientRect().bottom<=innerHeight+1'));page.screenshot(path=str(OUT/f'protected-large-{width}-{mode}.png'));page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog.trade-protected-sheet")')
   page.evaluate("async()=>{document.documentElement.style.fontSize='';const {savePageChoice}=await import('/js/page-disclosure.js');savePageChoice('gameday-motion','off')}");page.locator('[data-tb-protected]').click();page.wait_for_timeout(50)
   check(tag+' motion-off respects the saved setting',page.locator('dialog.trade-protected-sheet').evaluate('e=>!e.getAnimations().some(a=>a.playState==="running")'))
   page.evaluate('reviewLeave()');check(tag+' route cleanup removes the sheet without errors',not page.locator('dialog.trade-protected-sheet').count() and not errors);c.close()
 browser.close()
server.shutdown();print(json.dumps({'checks':len(checks)}))
