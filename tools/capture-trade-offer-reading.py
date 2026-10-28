"""Real offer handlers, lazy starter previews and motion. No league writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];FIXTURE=Path(os.environ.get('DFL_TRADE_REVIEW_DIR','/tmp/dfl-trade-1506'));OUT=Path(os.environ.get('DFL_TRADE_READING_DIR',FIXTURE/'reading'));OUT.mkdir(parents=True,exist_ok=True)
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
 for width in [320,390,768]:
  for theme in ['light','dark']:
   c=browser.new_context(viewport={'width':width,'height':844},has_touch=True,is_mobile=True,service_workers='block');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade');page.wait_for_function('window.reviewReady');page.wait_for_selector('.tb-offer');page.evaluate('document.fonts.ready')
   page.evaluate('''async theme=>{const {saveMode}=await import('/js/theme.js');saveMode(theme);const {mountPageMotion,startUiMotion}=await import('/js/ui-motion.js');startUiMotion();window.stopReadingMotion=mountPageMotion(document.querySelector('#view'));}''',theme);page.wait_for_timeout(200)
   tag=f'{width}px {theme}';card=page.locator('.tb-offer').first;summary=card.locator('.tb-offer-preview>summary');details=card.locator('.tb-offer-preview')
   check(tag+' starter previews are lazy',page.locator('[data-offer-lineup]>div').count()==0)
   check(tag+' collapsed offer remains compact',card.evaluate('e=>e.getBoundingClientRect().height<280'))
   card.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-90,behavior:"instant"})');page.wait_for_timeout(80);page.screenshot(path=str(OUT/f'offers-{width}-{theme}.png'))
   started=summary.evaluate('e=>{e.click();return e.parentElement.getAnimations().some(a=>a.playState==="running")}');page.wait_for_timeout(65)
   check(tag+' real disclosure motion starts',started)
   check(tag+' opening calculates real starters',card.locator('.tb-preview-lineups>section').count()==2)
   jump=details.evaluate('e=>{const h=e.getBoundingClientRect().height;e.querySelector("summary").click();return Math.abs(e.getBoundingClientRect().height-h)}');check(tag+' reversal starts at the painted height',jump<3);page.wait_for_timeout(320)
   check(tag+' reverse closes naturally',not details.evaluate('e=>e.open') and details.evaluate('e=>!e.style.height&&!e.getAnimations().length'))
   summary.focus();page.keyboard.press('Enter');page.wait_for_timeout(330)
   check(tag+' keyboard expansion preserves native details',details.evaluate('e=>e.open') and summary.evaluate('e=>e===document.activeElement'))
   check(tag+' names and action targets fit',card.locator('.tb-preview-slot button').evaluate_all('es=>es.every(e=>e.offsetHeight>=44&&e.scrollWidth<=e.clientWidth+1)'))
   page.screenshot(path=str(OUT/f'lineups-{width}-{theme}.png'))
   key=card.get_attribute('data-offer-key');page.evaluate('window.setupBefore=document.querySelector(".tb-setup")');page.locator('[data-tb-generate]').click();page.wait_for_timeout(200)
   card=page.locator('.tb-offer').filter(has=page.locator('.tb-offer-preview[open]')).first
   check(tag+' more offers preserve setup and expanded comparisons',page.evaluate('setupBefore===document.querySelector(".tb-setup")') and page.locator('.tb-offer').count()==12 and card.get_attribute('data-offer-key')==key)
   card.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-90,behavior:"instant"})');page.wait_for_timeout(80);top=card.evaluate('e=>e.getBoundingClientRect().top');card.locator('[data-td-load-offer]').evaluate('e=>e.click()');page.wait_for_selector('[data-offer-return]');page.wait_for_timeout(350);page.locator('[data-offer-return]').evaluate('e=>e.click()');page.wait_for_function('(key)=>document.activeElement.closest("[data-offer-key]")?.dataset.offerKey===key',arg=key);page.wait_for_timeout(350)
   card=page.locator(page.evaluate('(key)=>`[data-offer-key="${CSS.escape(key)}"]`',key));details=card.locator('.tb-offer-preview');summary=details.locator('summary')
   check(tag+' back restores the exact offer position and expansion',abs(card.evaluate('e=>e.getBoundingClientRect().top')-top)<3 and details.evaluate('e=>e.open'))
   summary.click();page.wait_for_timeout(320);page.evaluate('document.documentElement.dataset.uiMotion="off"');summary.click();page.wait_for_timeout(50)
   check(tag+' motion off expands immediately',details.evaluate('e=>e.open&&!e.getAnimations().length'))
   summary.click();page.evaluate('document.documentElement.dataset.uiMotion="on"');page.emulate_media(reduced_motion='reduce');summary.click();page.wait_for_timeout(50)
   check(tag+' reduced motion expands immediately',details.evaluate('e=>e.open&&!e.getAnimations().length'))
   if width==390:
    page.emulate_media(reduced_motion='no-preference')
    page.evaluate('''()=>{const goal=document.querySelector('[data-tb-goal]');goal.value='starter';goal.dispatchEvent(new Event('change',{bubbles:true}));}''')
    page.wait_for_function('!document.querySelector(".tb-offers-card[aria-busy=true]")&&!!document.querySelector(".tb-offer")')
    improved=page.locator('.tb-offer').filter(has=page.locator('[data-td-load-offer]')).first
    improved.locator('.tb-offer-preview>summary').click();page.wait_for_timeout(330)
    check(tag+' starter-upgrade offers expose actual changed slots',improved.locator('.tb-preview-slot').count()>0)
    improved.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-90,behavior:"instant"})');page.wait_for_timeout(80);page.screenshot(path=str(OUT/f'upgrade-{theme}.png'))
   page.evaluate("document.documentElement.style.fontSize='32px'");page.wait_for_timeout(150)
   check(tag+' larger text stays inside the screen',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.evaluate("document.documentElement.style.fontSize=''")
   card=page.locator('.tb-offer').first
   card.locator('.tb-offer-pin>summary').click()
   check(tag+' keep-player controls remain in the card',card.locator('.tb-offer-pin button').evaluate_all('es=>es.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height>=44})'))
   if width==390:
    page.evaluate('''async()=>{
     const {evaluateTradeDeal}=await import('/js/trade-workspace.js'),{offerLineupMarkup}=await import('/js/trade-offer-preview.js');
     const parties=reviewData.teams.slice(0,3),sends=[['1-4','1-3'],['2-6'],['3-3']],destinations={'1-4':'3','1-3':'2','2-6':'1','3-3':'1'};
     const deal=evaluateTradeDeal(parties,sends,reviewData.pool,destinations),offer={...deal.result,parties,sends,destinations,other:parties[1]};
     const slot=document.querySelector('[data-tb-offers]');slot.innerHTML=reviewOfferMarkup(offer,reviewData.pool);slot.querySelector('[data-offer-lineup]').innerHTML=offerLineupMarkup(offer,parties[0],reviewData.pool);slot.querySelector('.tb-offer-preview').open=true;
    }''')
    multi=page.locator('.tb-multi-offer');multi.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-90,behavior:"instant"})');page.wait_for_timeout(200)
    check(tag+' all three teams retain explicit destinations',multi.locator('.tb-player-destination').count()==4 and multi.locator('.tb-preview-lineups>section').count()==3 and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.screenshot(path=str(OUT/f'three-team-{theme}.png'))

   check(tag+' no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.evaluate('stopReadingMotion();reviewLeave()');check(tag+' no browser errors',not errors);c.close()
 browser.close()
server.shutdown();print(json.dumps({'checks':len(checks)}))
