"""Real offer handlers, lazy starter previews and motion. No league writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];FIXTURE=Path(os.environ.get('DFL_TRADE_REVIEW_DIR','/tmp/dfl-trade-1506'));OUT=Path(os.environ.get('DFL_TRADE_BOARD_DIR',FIXTURE/'board'));OUT.mkdir(parents=True,exist_ok=True)
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
def click_offer_action(locator):
 menu=locator.locator('xpath=ancestor::details[contains(@class,"tb-offer-more")]')
 if menu.count() and menu.get_attribute('open') is None:menu.locator(':scope > summary').click()
 locator.click()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for width in [320,390]:
  for theme in ['light','dark']:
   c=browser.new_context(viewport={'width':width,'height':844},has_touch=True,is_mobile=True,service_workers='block');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes(),headers={'Access-Control-Allow-Origin':'*'}) if r.request.resource_type=='image' else r.abort());page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade');page.wait_for_function('window.reviewReady');page.wait_for_selector('.tb-offer');page.evaluate('document.fonts.ready')
   page.evaluate("""async theme=>{(await import('/js/theme.js')).saveMode(theme);const m=await import('/js/ui-motion.js');m.startUiMotion();window.stopBoardMotion=m.mountPageMotion(document.querySelector('#view'));}""",theme)
   page.wait_for_function('document.querySelectorAll(".tb-offer").length>=3');page.wait_for_timeout(300)
   tag=f'{width}px {theme}';cards=page.locator('.tb-offer');first=cards.first
   check(tag+' default actions stay compact without hiding players',first.locator('[data-tb-save]').is_visible() and first.locator('[data-tob-compare]').is_hidden() and first.locator('[data-td-load-offer]').is_visible())
   menu=first.locator('.tb-offer-more');menu.locator(':scope > summary').click()
   # Native details delivers toggle asynchronously; verify the positioned menu.
   page.wait_for_function('e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}',arg=menu.locator('.tb-offer-more-actions').element_handle(),timeout=2000)
   check(tag+' More actions fit inside the phone viewport',menu.locator('.tb-offer-more-actions').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}'))
   menu.locator(':scope > summary').press('Escape');check(tag+' Escape closes More and returns focus',menu.get_attribute('open') is None and menu.locator('summary').first.evaluate('e=>e===document.activeElement'))
   first.scroll_into_view_if_needed();first.screenshot(path=str(OUT/f'first-{width}-{theme}.png'));check(tag+' full packages stay visible',first.locator('.tb-package .tb-player').count()==sum(int(s.strip().split(' · ')[-1]) for s in first.locator('.tb-package>small').all_text_contents()))
   check(tag+' compact first offer',first.bounding_box()['height']<280)
   page.screenshot(path=str(OUT/f'board-{width}-{theme}.png'))
   click_offer_action(first.locator('[data-tob-compare]'));check(tag+' first selection waits for second offer',page.locator('[data-tob-open]').is_disabled())
   click_offer_action(cards.nth(1).locator('[data-tob-compare]'));check(tag+' two offers enable compare',page.locator('[data-tob-open]').is_enabled())
   click_offer_action(cards.nth(2).locator('[data-tob-compare]'));check(tag+' selection stays bounded to two',page.locator('[data-tob-compare][aria-pressed="true"]').count()==2)
   page.locator('[data-tob-open]').click();sheet=page.locator('.trade-offer-sheet[open]');sheet.wait_for();page.wait_for_timeout(300)
   check(tag+' two real offers open together',sheet.locator('.tob-comparison>section').count()==2)
   check(tag+' send and receive sections align',sheet.locator('.tob-comparison').evaluate('e=>{const a=e.children[0].querySelectorAll("h4"),b=e.children[1].querySelectorAll("h4");return [...a].every((n,i)=>Math.abs(n.getBoundingClientRect().top-b[i].getBoundingClientRect().top)<1)}'))
   check(tag+' comparison has current balance and lineup values',sheet.locator('.tob-metrics dd').count()==6)
   check(tag+' loaded portraits stay inside their player rows',sheet.locator('.dfl-player-portrait img').evaluate_all('es=>es.every(e=>{const b=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return b.left>=p.left-1&&b.top>=p.top-1&&b.right<=p.right+1&&b.bottom<=p.bottom+1})'))
   sheet.screenshot(path=str(OUT/f'comparison-{width}-{theme}.png'))
   sheet.locator('[data-tob-close]').click();page.wait_for_function('!document.querySelector(".trade-offer-sheet[open]")');check(tag+' close returns to compare control',page.locator('[data-tob-open]').evaluate('e=>e===document.activeElement'))
   page.locator('[data-tob-open]').click();sheet=page.locator('.trade-offer-sheet[open]');sheet.locator('[data-tob-remove="0"]').click();sheet.locator('[data-tob-close]').click();page.wait_for_function('!document.querySelector(".trade-offer-sheet[open]")');check(tag+' removing one offer returns focus to an enabled control',page.locator('[data-tob-clear]').evaluate('e=>e===document.activeElement'))
   click_offer_action(first.locator('[data-tob-compare]'));check(tag+' an alternative can be selected after removal',page.locator('[data-tob-open]').is_enabled())
   click_offer_action(first.locator('[data-tob-edit]'));sheet=page.locator('.trade-offer-sheet[open]');page.wait_for_timeout(300)
   check(tag+' player names are compact full-width replacement controls',sheet.locator('.tob-player-name').evaluate_all('es=>es.length>0&&es.every(e=>e.offsetHeight>=44&&e.clientWidth>=120&&e.scrollWidth<=e.clientWidth+1)'))
   primary=sheet.locator('[data-tob-use]');primary.scroll_into_view_if_needed();page.wait_for_timeout(100)
   check(tag+' review action uses readable theme colors',primary.evaluate('async e=>{const {reviewTextContrast}=await import("/tools/home-review-contrast.js");const r=reviewTextContrast(e);return r.checked>0&&!r.failures.length}'))
   original=sheet.locator('[data-tob-swap]').evaluate_all('es=>es.map(e=>e.dataset.tobSwap)')
   initial=sheet.locator('.tob-metrics dd').all_text_contents();swap=sheet.locator('[data-tob-swap]:not([disabled])').first;old=swap.get_attribute('data-tob-swap');page.evaluate('window.unchangedTradePhoto=[...document.querySelectorAll(".trade-offer-sheet .tob-players img")].at(-1)');swap.locator('.tob-edit-hint').click();picker=page.locator('.trade-player-picker[open]');picker.wait_for()
   choice=picker.locator('[data-picker-player]').first;new_id=choice.get_attribute('data-picker-player');choice.click();page.wait_for_function('!document.querySelector(".trade-player-picker[open]")')
   check(tag+' swap keeps the editor and remaining package',sheet.is_visible() and sheet.locator(f'[data-tob-swap="{new_id}"]').count()==1 and sheet.locator(f'[data-tob-swap="{old}"]').count()==0 and sheet.locator('[data-tob-swap]').count()==len(original))
   check(tag+' unchanged photos stay mounted through a swap',page.evaluate('unchangedTradePhoto?.isConnected===true'))
   check(tag+' swap recalculates the verdict and metrics',sheet.locator('.tob-metrics dd').all_text_contents()!=initial and sheet.locator('.tob-verdict b').inner_text()!='')
   sheet.screenshot(path=str(OUT/f'edit-{width}-{theme}.png'))
   sheet.locator('[data-tob-reset]').click();check(tag+' reset restores only this draft',sheet.locator('[data-tob-swap]').evaluate_all('es=>es.map(e=>e.dataset.tobSwap)')==original and sheet.locator('.tob-metrics dd').all_text_contents()==initial)
   sheet.locator('[data-tob-swap]:not([disabled])').first.click();page.locator('.trade-player-picker[open] [data-picker-player]').first.click();sheet.locator('[data-tob-use]').click();page.wait_for_selector('[data-td-verdict]');check(tag+' edited offer reaches existing analyzer',not page.locator('.trade-offer-sheet[open]').count() and page.locator('[data-td-verdict]').inner_text().strip()!='')
   page.locator('[data-offer-return]').click();page.wait_for_selector('.tb-offer');check(tag+' offers and comparison selections survive review',page.locator('[data-tob-compare][aria-pressed="true"]').count()==2)
   page.locator('[data-tob-open]').click();sheet=page.locator('.trade-offer-sheet[open]');page.evaluate('document.documentElement.style.fontSize="32px";document.documentElement.dataset.readability="comfortable"');page.wait_for_timeout(250)
   sheet.screenshot(path=str(OUT/f'comparison-large-{width}-{theme}.png'))
   check(tag+' 200% text comparison fits',sheet.evaluate('e=>e.scrollWidth<=e.clientWidth+1') and sheet.locator('.tob-body').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
   sheet.screenshot(path=str(OUT/f'comparison-large-{width}-{theme}.png'));page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".trade-offer-sheet[open]")')
   first=page.locator('.tb-offer').first;first.scroll_into_view_if_needed();first.screenshot(path=str(OUT/f'offer-large-{width}-{theme}.png'))
   check(tag+' 200% text gives full team names their own header row',first.locator('header').evaluate('e=>{const a=e.querySelector(".tb-offer-owner").getBoundingClientRect(),b=e.querySelector(".tb-offer-verdict").getBoundingClientRect();return a.width>=e.clientWidth*.9&&b.top>=a.bottom-1}'))
   check(tag+' 200% text player packages stack without clipped names',first.locator('.tb-package').evaluate_all('es=>es.length>1&&es[1].getBoundingClientRect().top>=es[0].getBoundingClientRect().bottom-1&&es.every(e=>e.scrollWidth<=e.clientWidth+1)'))
   page.evaluate('document.documentElement.style.fontSize="16px";delete document.documentElement.dataset.readability')
   page.emulate_media(reduced_motion='reduce');first=page.locator('.tb-offer').first;click_offer_action(first.locator('[data-tob-edit]'));check(tag+' reduced motion opens without active animation',page.locator('.trade-offer-sheet[open]').evaluate('e=>!e.getAnimations({subtree:true}).some(a=>a.playState==="running")'))
   page.evaluate('reviewLeave()');check(tag+' route cleanup closes editors and pending picker work',page.locator('.trade-offer-sheet').count()==0 and page.locator('.trade-player-picker[open]').count()==0)
   page.emulate_media(reduced_motion='no-preference')
   page.evaluate('''async()=>{const d=reviewData,parties=d.teams.slice(0,3),sends=[['1-3','1-4'],['2-3'],['3-3']],destinations={'1-3':'2','1-4':'3','2-3':'1','3-3':'1'};const {evaluateTradeDeal}=await import('/js/trade-workspace.js'),deal=evaluateTradeDeal(parties,sends,d.pool,destinations),offer={...deal.result,parties,sends,destinations,other:parties[1]};const root=document.querySelector('#view');root.innerHTML='<div data-tb-board-tools hidden></div>'+reviewOfferMarkup(offer,d.pool);const {mountTradeOfferBoard}=await import('/js/trade-offer-board.js');window.multiBoard=mountTradeOfferBoard(root,{getData:()=>d,getMine:()=>parties[0],getOffer:()=>offer,onUse:next=>window.multiUsed=next});}''')
   click_offer_action(page.locator('[data-tob-edit]'));sheet=page.locator('.trade-offer-sheet[open]');check(tag+' three-team editor shows every routed player',sheet.locator('[data-tob-swap]').count()==4 and sheet.locator('.tob-players small').evaluate_all('es=>es.every(e=>e.textContent.includes("→"))'))
   sheet.locator('[data-tob-swap="1-3"]').click();choice=page.locator('.trade-player-picker[open] [data-picker-player]').first;replacement=choice.get_attribute('data-picker-player');choice.click();sheet.locator('[data-tob-use]').click()
   check(tag+' three-team replacement keeps both original destinations',page.evaluate('(id)=>multiUsed.destinations[id]==="2"&&multiUsed.destinations["1-4"]==="3"&&!multiUsed.destinations["1-3"]',replacement))
   page.evaluate('multiBoard.stop()');check(tag+' no browser errors',not errors);c.close()
 browser.close()
server.shutdown();print(json.dumps({'checks':len(checks),'passed':True}))
