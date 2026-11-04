"""Production goal/repair handlers with sample rosters; external writes blocked."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FIXTURE=Path(os.environ.get('DFL_TRADE_REVIEW_DIR',ROOT.parent/'dfl-trade-review'))
OUT=Path(os.environ.get('DFL_TRADE_FAIR_REVIEW_DIR',FIXTURE/'fair-search'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?',1)[0]
  body="export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};export const privilegedFunctionHeaders=()=>({});" if path=='/js/supabase.js' else "export const currentMember=()=>null;export const loadMemberDirectory=async()=>[];" if path=='/js/members.js' else None
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def translate_path(self,path):
  clean=path.split('?',1)[0];return str(FIXTURE/clean.removeprefix('/trade-review/')) if clean.startswith('/trade-review/') else str(ROOT/clean.lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(name,ok):
 checks.append({'name':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
  for theme in ['light','dark']:
   for font,motion in [(16,'no-preference'),(32,'reduce')]:
    tag=f'{width}/{theme}/{font}/{motion}'
    context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block',reduced_motion=motion)
    context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade');page.wait_for_function('window.reviewReady');page.evaluate('document.fonts.ready')
    page.evaluate('''async ({theme,font})=>{const t=await import('/js/theme.js');t.pinMode(theme);document.documentElement.style.fontSize=font+'px';const m=await import('/js/ui-motion.js');m.startUiMotion();}''',{'theme':theme,'font':font})
    def settled():page.wait_for_function('!document.querySelector(".tb-search-placeholder")&&!document.querySelector("[data-tb-offers][aria-busy=true]")');page.wait_for_timeout(100)
    def picked():return page.locator('[data-td-pick]:checked').evaluate_all('es=>es.map(e=>[e.dataset.tdPick,e.value])')
    def pick(side,id):
     page.locator('.td-builder').evaluate('e=>e.open=true');page.locator(f'[data-td-roster="{side}"]').evaluate('e=>e.open=true')
     page.locator(f'[data-td-pick="{side}"][value="{id}"]').check();page.wait_for_timeout(200)
    settled()
    check(tag+' goals are visible with setup collapsed and All teams selected',not page.locator('.tb-setup').evaluate('e=>e.open') and page.locator('[data-ta-shop-partner]').input_value()=='all' and page.locator('[data-tb-quick-goal]').evaluate_all('es=>es.length===4&&es.every(e=>e.checkVisibility())'))
    check(tag+' goal touch targets and text fit',page.locator('[data-tb-quick-goal]').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44&&e.getBoundingClientRect().width>=44&&e.scrollWidth<=e.clientWidth+1)'))
    for goal in ['RB','WR','consolidate','best']:
     page.locator(f'[data-tb-quick-goal="{goal}"]').click();settled()
     check(tag+' '+goal+' keeps goal, focus and team search synchronized',page.locator('[data-tb-goal]').input_value()==goal and page.locator(f'[data-tb-quick-goal="{goal}"]').evaluate('e=>e.getAttribute("aria-pressed")==="true"&&e===document.activeElement') and page.locator('[data-ta-shop-partner]').input_value()=='all')
    page.evaluate('''()=>{for(const goal of ['RB','WR','consolidate','RB','best'])document.querySelector(`[data-tb-quick-goal="${goal}"]`).click()}''');settled()
    check(tag+' rapid goal changes retain only the final selection',page.locator('[data-tb-quick-goal][aria-pressed="true"]').count()==1 and page.locator('[data-tb-quick-goal="best"]').get_attribute('aria-pressed')=='true' and page.locator('[data-tb-goal]').input_value()=='best')
    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/f'goals-{width}-{theme}-{font}.png'))
    check(tag+' goal text contrast',not page.locator('.tb-quick-goals').evaluate("async e=>{const {reviewTextContrast}=await import('/tools/home-review-contrast.js');return reviewTextContrast(e).failures.length}"))
    page.locator('[data-tb-quick-goal="RB"]').click();settled();page.locator('.tb-setup').evaluate('e=>e.open=true')
    page.locator('[data-tb-receive-position="RB"]').uncheck();settled()
    check(tag+' exclusions disable the goal and reset both goal controls',page.locator('[data-tb-quick-goal="RB"]').is_disabled() and page.locator('[data-tb-goal]').input_value()=='best' and page.locator('[data-tb-quick-goal="best"]').get_attribute('aria-pressed')=='true')
    page.locator('[data-td-mode="manual"]').click();pick(0,'1-0');pick(1,'2-8');before=picked()
    button=page.locator('[data-td-find-counter]');check(tag+' unfair deal has Make this fair',button.inner_text()=='Make this fair')
    button.click();page.locator('[data-td-use-counter]').first.wait_for()
    check(tag+' adjustments preview without changing the original package',picked()==before and page.locator('.td-counter-list article p').evaluate_all('es=>es.every(e=>parseFloat(e.textContent)>=90)'))
    page.screenshot(path=str(OUT/f'preview-{width}-{theme}-{font}.png'))
    page.locator('[data-td-use-counter]').first.click()
    result=page.evaluate('''async()=>{const {evaluateTradeDeal}=await import('/js/trade-workspace.js');const sends=[0,1].map(i=>[...document.querySelectorAll(`[data-td-pick="${i}"]:checked`)].map(e=>e.value));return evaluateTradeDeal(window.reviewData.teams.slice(0,2),sends,window.reviewData.pool).result}''')
    check(tag+' applied repair regrades Fair and retains both core players',result['fairness']>=90 and '1-0' in result['sendA'] and '2-8' in result['sendB'] and not result['cutIncomingA'] and not result['cutIncomingB'])
    check(tag+' applying a repair focuses Undo',page.locator('[data-td-verdict] [data-td-undo]').evaluate('e=>e===document.activeElement&&!e.hidden'))
    page.screenshot(path=str(OUT/f'repair-{width}-{theme}-{font}.png'))
    page.locator('[data-td-verdict] [data-td-undo]').click()
    check(tag+' Undo restores the exact original package',picked()==before and page.locator('[data-td-find-counter]').inner_text()=='Make this fair')
    page.locator('[data-td-remove-pick="0"][data-player-id="1-0"]').click();page.locator('[data-td-remove-pick="1"][data-player-id="2-8"]').click();pick(0,'1-4');pick(1,'2-6');before=picked()
    page.locator('[data-td-find-counter]').click();page.wait_for_function('document.querySelector("[data-td-counter-results]").textContent.includes("No small fair adjustment")')
    check(tag+' unavailable small repair is honest and leaves the package intact',picked()==before and page.locator('[data-td-use-counter]').count()==0)
    check(tag+' no page errors or horizontal overflow',not errors and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    context.close()
 browser.close()
server.shutdown()
