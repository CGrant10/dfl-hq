"""Actual trade editing handlers with isolated rosters and blocked writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];FIXTURE=Path(os.environ.get('DFL_TRADE_REVIEW_DIR','/tmp/dfl-trade-1509'));OUT=Path(os.environ.get('DFL_TRADE_EDIT_REVIEW_DIR',FIXTURE/'editing'));OUT.mkdir(parents=True,exist_ok=True)
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
   c=browser.new_context(viewport={'width':width,'height':844},has_touch=True,is_mobile=True,service_workers='block');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade');page.wait_for_function('window.reviewReady');page.wait_for_selector('.tb-offer');page.evaluate('document.fonts.ready')
   page.evaluate('''async theme=>{const {saveMode}=await import('/js/theme.js');saveMode(theme);const {mountPageMotion,startUiMotion}=await import('/js/ui-motion.js');startUiMotion();window.stopEditMotion=mountPageMotion(document.querySelector('#view'));}''',theme)
   page.locator('.tb-offer').first.locator('[data-td-load-offer]').click();page.wait_for_selector('.td-ticket');page.wait_for_timeout(350)
   page.screenshot(path=str(OUT/f'analyze-{width}-{theme}.png'))
   if os.environ.get('DFL_TRADE_EDIT_BEFORE'):
    print(width,theme,page.locator('.td-item-copy').evaluate_all('es=>es.map(e=>({name:e.innerText,width:e.clientWidth,height:e.clientHeight}))'),flush=True);c.close();continue
   check(f'{width}/{theme} readable trade text contrast',not page.evaluate("async()=>{const {reviewTextContrast}=await import('/tools/home-review-contrast.js');return reviewTextContrast(document.querySelector('[data-td-verdict]')).failures.length}"))
   check(f'{width}/{theme} full player names have real reading space',page.locator('.td-item-copy').evaluate_all('es=>es.length>0&&es.every(e=>e.clientWidth>=120&&e.scrollWidth<=e.clientWidth+1)'))
   tag=f'{width}/{theme}'
   before=page.locator('.td-cols').inner_text();other=page.locator('.td-col').nth(1).inner_text()
   trigger=page.locator('.td-item [data-td-replace-pick]').first;old=trigger.get_attribute('data-player-id')
   trigger.click();page.wait_for_selector('.trade-player-picker[open]')
   check(tag+' replacement excludes all players already in the deal',page.locator(f'[data-picker-player="{old}"]').count()==0)
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".trade-player-picker[open]")')
   check(tag+' Cancel keeps the whole offer and restores focus',page.locator('.td-cols').inner_text()==before and trigger.evaluate('e=>e===document.activeElement'))
   page.locator('.td-lineup-preview').evaluate('e=>e.open=true');trigger.click()
   option=page.locator('[data-picker-player]').first;new=option.get_attribute('data-picker-player');option.click();page.wait_for_timeout(350)
   check(tag+' a swap changes only one side and returns focus to the new player',page.locator('.td-col').nth(1).inner_text()==other and page.locator(f'.td-item [data-player-id="{new}"]').evaluate('e=>e===document.activeElement'))
   check(tag+' value updates preserve open lineup details',page.locator('.td-lineup-preview').evaluate('e=>e.open'))
   page.locator('[data-td-verdict] [data-td-undo]').evaluate('e=>e.click()')
   check(tag+' Undo restores the exact prior package and values',page.locator('.td-cols').inner_text()==before)
   page.locator('.td-builder').evaluate('e=>e.open=true');page.wait_for_timeout(80)
   check(tag+' editing reveals the compact package reference',page.locator('[data-td-edit-bar]').is_visible())
   side=page.locator('.td-side').first;side.locator('[data-td-roster]').evaluate('e=>e.open=true')
   box=side.locator('[data-td-pick][value="1-3"]');box.scroll_into_view_if_needed();top=box.bounding_box()['y'];box.check();page.wait_for_timeout(350)
   check(tag+' picking keeps the tapped roster row in place',abs(box.bounding_box()['y']-top)<3)
   bar=page.locator('[data-td-edit-bar]');check(tag+' the package stays visible while browsing a roster',bar.bounding_box()['y']>=43 and bar.bounding_box()['y']<100)
   check(tag+' selected players and checkboxes agree',side.locator('[data-td-remove-pick]').count()==2 and box.is_checked())
   page.screenshot(path=str(OUT/f'editing-{width}-{theme}.png'))
   side.locator('[data-td-remove-pick][data-player-id="1-3"]').evaluate('e=>e.click()');bar.locator('[data-td-undo]').click()
   check(tag+' Undo restores an accidentally removed player',side.locator('[data-td-remove-pick][data-player-id="1-3"]').count()==1 and box.is_checked())
   side.locator('[data-td-filter]').fill('Kenneth');page.locator('[data-td-clear]').evaluate('e=>e.click()')
   check(tag+' clearing the entire trade keeps Undo available',page.locator('[data-td-total-count]').inner_text()=='0' and bar.locator('[data-td-undo]').is_visible())
   bar.locator('[data-td-undo]').click();check(tag+' Undo after clear preserves package and roster search',page.locator('[data-td-total-count]').inner_text()=='3' and side.locator('[data-td-filter]').input_value()=='Kenneth')
   page.locator('[data-td-clear]').evaluate('e=>e.click()');page.locator('[data-td-add-member]').evaluate('e=>e.click()')
   for i,pid,to in [(0,'1-3','2'),(1,'2-4','3'),(2,'3-1','1')]:
    lane=page.locator('.td-side').nth(i);lane.locator('[data-td-roster]').evaluate('e=>e.open=true');lane.locator('[data-td-filter]').fill('');lane.locator(f'[data-td-pick][value="{pid}"]').check();lane.locator('[data-td-destination]').select_option(to)
   check(tag+' a complete three-way has a real analysis',page.locator('.td-ticket-head h2').inner_text()=='3-team deal' and page.locator('.td-routed-player').count()==3)
   first=page.locator('.td-side').first;first.locator('[data-td-replace-pick]').click();page.locator('[data-picker-player="1-1"]').click();page.wait_for_timeout(350)
   check(tag+' replacing a three-way player keeps its explicit destination',first.locator('[data-td-destination="1-1"]').input_value()=='2' and page.locator('[data-td-destination="2-4"]').input_value()=='3' and page.locator('[data-td-destination="3-1"]').input_value()=='1')
   page.locator('[data-td-edit-bar] [data-td-undo]').click()
   check(tag+' three-way Undo restores the original player and destination',first.locator('[data-td-destination="1-3"]').input_value()=='2' and page.locator('.td-routed-player').count()==3)
   page.locator('[data-td-verdict]').evaluate('e=>e.scrollIntoView({block:"start"})');page.screenshot(path=str(OUT/f'three-team-{width}-{theme}.png'))
   page.evaluate("document.documentElement.style.fontSize='32px'");page.wait_for_timeout(100)
   check(tag+' larger text and all full names fit the screen',page.evaluate('document.documentElement.scrollWidth<=innerWidth') and page.locator('.td-item-copy').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'))
   page.screenshot(path=str(OUT/f'large-text-{width}-{theme}.png'));page.evaluate("document.documentElement.style.fontSize=''")
   page.emulate_media(reduced_motion='reduce');first.locator('[data-td-replace-pick]').click();page.locator('[data-picker-player="1-1"]').click();page.wait_for_timeout(60)
   check(tag+' reduced motion commits swaps without leftover portraits',page.locator('.dfl-connected-portrait').count()==0 and first.locator('[data-td-destination="1-1"]').count()==1)
   first.locator('[data-td-replace-pick]').click();page.evaluate('reviewLeave()');page.wait_for_timeout(60)
   check(tag+' leaving closes an in-progress replacement',page.locator('.trade-player-picker[open],.dfl-connected-portrait').count()==0)
   check(f'{width}/{theme} no browser errors' ,not errors);page.evaluate('stopEditMotion();reviewLeave()');c.close()
 browser.close()
server.shutdown()
