"""Received Sleeper offer review and complete counter packages. No league writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];FIXTURE=Path(os.environ.get('DFL_TRADE_REVIEW_DIR','/tmp/dfl-trade-1506'));OUT=Path(os.environ.get('DFL_RECEIVED_OFFER_DIR',FIXTURE/'received-offers'));OUT.mkdir(parents=True,exist_ok=True)
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
  for theme in ['light','dark']:
   c=browser.new_context(viewport={'width':width,'height':844},has_touch=True,is_mobile=True,service_workers='block');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade');page.wait_for_function('window.reviewReady');page.wait_for_selector('.tb-offer');page.evaluate("async theme=>{const {saveMode}=await import('/js/theme.js');saveMode(theme)}",theme)
   page.evaluate("reviewData.pool.get('2-6').name='CeeDee Lamb'");page.locator('[data-td-mode="manual"]').click();page.locator('[data-td-import]').click();dialog=page.locator('dialog.trade-import-sheet');page.wait_for_timeout(300);tag=f'{width} {theme}'
   check(tag+' import opens without keyboard focus',dialog.locator('h2').evaluate('e=>e===document.activeElement'))
   dialog.locator('[name=send]').fill('Unknown Player');dialog.locator('[name=receive]').fill('Unknown Receiver');dialog.locator('[type=submit]').click()
   check(tag+' unknown players remain in editor with useful error',dialog.is_visible() and dialog.locator('[data-import-error]').is_visible() and not page.locator('[data-td-use-counter]').count())
   names=page.evaluate("[reviewData.pool.get('1-4').name,reviewData.pool.get('2-6').name]")
   dialog.locator('[name=send]').fill(names[0]);dialog.locator('[name=receive]').fill(names[1]);page.screenshot(path=str(OUT/f'import-{width}-{theme}.png'))
   dialog.locator('[type=submit]').click();page.wait_for_selector('.td-counter-card');page.wait_for_function("!document.querySelector('[data-td-find-counter]').disabled")
   check(tag+' import grades exact package and automatically finds counters',page.locator('[data-td-total-count]').text_content().strip()=='2' and not page.locator('dialog.trade-import-sheet').count() and page.locator('[data-td-verdict]').is_visible())
   check(tag+' successful import focuses the trade verdict',page.locator('[data-td-verdict] h2').evaluate('e=>e===document.activeElement'))
   original=page.locator('.td-ticket').inner_text();cards=page.locator('.td-counter-card')
   check(tag+' whole packages, source IDs and routes stay visible',cards.evaluate_all("es=>es.length>0&&es.every(e=>e.querySelectorAll('.td-counter-packages>section').length===2&&[...e.querySelectorAll('[data-player-card]')].every(b=>b.dataset.playerCard&&b.dataset.counterTo&&b.getBoundingClientRect().height>=44))"))
   check(tag+' fair labels respect actual balance',cards.evaluate_all("es=>es.every(e=>e.dataset.counterKind!=='fair'||parseFloat(e.querySelector('header>b').textContent)>=90)"))
   check(tag+' single-line complete accessible player names',cards.locator('.dfl-player-copy>strong').evaluate_all("es=>es.length>0&&es.every(e=>getComputedStyle(e).whiteSpace==='nowrap'&&e.scrollHeight<=e.clientHeight+1&&e.closest('button').title.includes(e.textContent))"))
   check(tag+' no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   cards.first.scroll_into_view_if_needed();page.screenshot(path=str(OUT/f'counter-{width}-{theme}.png'))
   page.evaluate("document.documentElement.style.fontSize='32px'");check(tag+' enlarged counters remain inside the screen',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));page.screenshot(path=str(OUT/f'counter-large-{width}-{theme}.png'));page.evaluate("document.documentElement.style.fontSize=''")
   expected=cards.first.locator('[data-player-card]').evaluate_all('es=>es.map(e=>e.dataset.playerCard).sort()')
   cards.first.locator('[data-td-use-counter]').click();page.wait_for_timeout(100)
   selected=page.locator('.td-builder [data-td-selected] [data-td-remove-pick]').evaluate_all('es=>es.map(e=>e.dataset.playerId).sort()')
   check(tag+' Use counter applies exact displayed package',expected==selected)
   page.locator('[data-td-verdict] [data-td-undo]').click();page.wait_for_timeout(100)
   check(tag+' Undo restores received package and grade',page.locator('.td-ticket').inner_text()==original)
   page.evaluate("()=>{document.querySelector('[data-td-find-counter]').click();document.querySelector('[data-td-clear]').click()}");page.wait_for_timeout(300)
   check(tag+' editing cancels stale counter results',not page.locator('.td-counter-card').count())
   page.locator('[data-td-import]').click();page.wait_for_timeout(300);page.evaluate("document.documentElement.style.fontSize='32px'")
   check(tag+' enlarged import stays inside viewport',page.evaluate("()=>{const d=document.querySelector('dialog.trade-import-sheet'),r=d.getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}"))
   page.screenshot(path=str(OUT/f'import-large-{width}-{theme}.png'));page.keyboard.press('Escape');page.wait_for_timeout(350)
   check(tag+' Escape restores import button focus',not page.locator('dialog.trade-import-sheet').count() and page.locator('[data-td-import]').evaluate('e=>e===document.activeElement'))
   page.evaluate("async()=>{document.documentElement.style.fontSize='';document.documentElement.dataset.uiMotion='off';const {savePageChoice}=await import('/js/page-disclosure.js');savePageChoice('gameday-motion','off')}");page.locator('[data-td-import]').click();page.wait_for_timeout(50)
   check(tag+' motion-off import has no running animation',page.locator('dialog.trade-import-sheet').evaluate('e=>!e.getAnimations().some(a=>a.playState==="running")'))
   page.locator('[data-import-close]').click();page.wait_for_timeout(100);page.evaluate("async()=>{const {savePageChoice}=await import('/js/page-disclosure.js');savePageChoice('gameday-motion','on');document.documentElement.dataset.uiMotion='on'}");page.emulate_media(reduced_motion='reduce');page.locator('[data-td-import]').click();page.wait_for_timeout(50)
   check(tag+' reduced-motion import has no running animation',page.locator('dialog.trade-import-sheet').evaluate('e=>!e.getAnimations().some(a=>a.playState==="running")'))
   page.evaluate('reviewLeave()');check(tag+' route cleanup removes the open import',not page.locator('dialog.trade-import-sheet').count());check(tag+' no browser errors',not errors);c.close()
 browser.close()
server.shutdown();print(json.dumps({'checks':len(checks)}))
