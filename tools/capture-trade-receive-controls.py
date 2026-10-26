"""Incoming-position controls, real workers and page handlers; isolated providers."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_TRADE_REVIEW_DIR',ROOT.parent/'dfl-trade-review'));EVIDENCE=Path(os.environ.get('DFL_TRADE_CONTROLS_DIR',OUT/'receive-controls'));EVIDENCE.mkdir(parents=True,exist_ok=True)
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
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(EVIDENCE/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
  for theme in ['light','dark']:
   context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block',reduced_motion='no-preference');context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
   page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade');page.wait_for_function('window.reviewReady');page.evaluate('document.fonts.ready');page.evaluate("async mode=>{const t=await import('/js/theme.js');t.pinMode(mode)}",theme)
   tag=f'{width}px {theme}'
   def settled():page.wait_for_function(r"[...document.querySelectorAll('.tb-intent-options [data-tb-intent-count]')].length===3&&[...document.querySelectorAll('.tb-intent-options [data-tb-intent-count]')].every(e=>/^\(\d+\)$/.test(e.textContent))&&!document.querySelector('.tb-offers-card[aria-busy=true]')",timeout=20000)
   def incoming_ok(positions):return page.locator('.tb-offer-flow .tb-package:nth-child(2) [data-player-card]').evaluate_all('(es,positions)=>es.every(e=>positions.includes(window.reviewData.pool.get(e.dataset.playerCard).position))',positions)
   settled();check(tag+' starts with every receive position enabled',page.locator('[data-tb-receive-position]:checked').count()==4)
   check(tag+' uses 44px checkbox labels and preset actions',page.locator('.tb-receive-options label,[data-tb-receive-preset]').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44&&e.getBoundingClientRect().width>=44)'))
   check(tag+' has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.screenshot(path=str(EVIDENCE/f'{width}-{theme}-all.png'))
   # Select a TE target and goal through the real production handlers.
   page.locator('[data-tb-league-target]').evaluate("e=>{e.value='2-5';e.dispatchEvent(new Event('change',{bubbles:true}))}");settled()
   page.locator('.tb-setup').evaluate('e=>e.open=true');page.locator('.tb-refine').evaluate('e=>e.open=true');page.locator('[data-tb-goal]').select_option('TE');settled();page.locator('.tb-setup').evaluate('e=>e.open=false')
   page.locator('[data-tb-receive-position="TE"]').scroll_into_view_if_needed();page.evaluate('window.receiveInput=document.querySelector("[data-tb-receive-position=TE]");window.sendPicker=document.querySelector("[data-trade-picker=send]")')
   page.locator('[data-tb-receive-position="TE"]').uncheck();settled()
   check(tag+' retains checkbox and send-picker DOM during filtering',page.evaluate('receiveInput===document.querySelector("[data-tb-receive-position=TE]")&&sendPicker===document.querySelector("[data-trade-picker=send]")'))
   check(tag+' removes a conflicting target and resets its goal',page.locator('[data-tb-remove-anchor="receive"]').count()==0 and page.locator('[data-tb-goal]').input_value()=='best')
   check(tag+' keeps the chosen trading partner',page.locator('[data-ta-shop-partner]').input_value()=='2')
   page.locator('[data-tb-receive-preset="flex-skill"]').click();settled()
   check(tag+' applies RB + WR with one tap',page.locator('[data-tb-receive-position]:checked').evaluate_all('es=>es.map(e=>e.value)')==['RB','WR'])
   for intent in ['fair','aggressive','steal']:
    page.locator(f'.tb-intent-options [data-tb-intent="{intent}"]').click();settled()
    check(tag+f' excludes unwanted positions from {intent} and closest offers',incoming_ok(['RB','WR']))
   page.locator('.tb-intent-options [data-tb-intent="fair"]').click();settled()
   page.locator('[data-trade-picker="receive"]').click();page.wait_for_selector('.trade-player-picker[open]');page.wait_for_timeout(320);check(tag+' tier switching does not dismiss a newly opened picker',page.locator('.trade-player-picker').evaluate('e=>e.open'))
   check(tag+' player picker only contains allowed incoming positions',page.locator('.trade-player-picker [data-picker-player]').evaluate_all("es=>es.length>0&&es.every(e=>['RB','WR'].includes(window.reviewData.pool.get(e.dataset.pickerPlayer).position))"))
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".trade-player-picker")?.open')

   contrast=page.locator('.tb-receive-positions').evaluate("""root=>{
    const ctx=document.createElement('canvas').getContext('2d');
    const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
    const lum=rgb=>rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    return Math.min(...[...root.querySelectorAll('label,button,legend')].map(e=>{let node=e,bg;while(node){bg=rgb(getComputedStyle(node).backgroundColor);if(bg[3]===255)break;node=node.parentElement;}const a=lum(rgb(getComputedStyle(e).color)),b=lum(bg||[255,255,255,255]);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}));
   }""")
   check(tag+' control text meets 4.5:1 contrast',contrast>=4.5)
   page.locator('.tb-receive-positions').scroll_into_view_if_needed();page.screenshot(path=str(EVIDENCE/f'{width}-{theme}-filtered.png'))
   # Keyboard focus remains on the original input; rapid changes use the latest query.
   page.locator('[data-tb-receive-position="RB"]').evaluate('e=>{scrollTo({top:scrollY+e.getBoundingClientRect().top-100,behavior:"instant"});e.focus({preventScroll:true});window.filterScroll=scrollY}');page.keyboard.press('Space');settled()
   check(tag+' keeps the scroll position while filtering',page.evaluate('Math.abs(scrollY-filterScroll)<1'))
   check(tag+' preserves keyboard focus while updating offers',page.evaluate('document.activeElement===document.querySelector("[data-tb-receive-position=RB]")'))
   page.locator('[data-tb-receive-position="WR"]').uncheck();settled()
   check(tag+' an empty selection stays empty with a clear recovery',page.locator('.tb-offer').count()==0 and 'Select a position' in page.locator('[data-tb-offers]').inner_text())
   page.locator('[data-tb-receive-preset="all"]').click();settled()
   page.locator('[data-tb-receive-position="QB"]').uncheck();page.locator('[data-tb-receive-position="TE"]').uncheck();page.locator('[data-tb-receive-position="RB"]').uncheck();settled()
   check(tag+' rapid toggles keep the latest selection and results',page.locator('[data-tb-receive-position]:checked').evaluate_all('es=>es.map(e=>e.value)')==['WR'] and incoming_ok(['WR']))
   page.locator('[data-tb-receive-preset="all"]').click();settled()
   check(tag+' restores all positions and cached results',page.locator('[data-tb-receive-position]:checked').count()==4 and page.locator('.tb-offer').count()>0)
   page.emulate_media(reduced_motion='reduce');page.locator('[data-tb-receive-position="QB"]').uncheck();settled()
   check(tag+' respects reduced motion',page.locator('.tb-receive-options label').first.evaluate('e=>getComputedStyle(e).transitionDuration.split(",").every(t=>parseFloat(t)<=.00001)'))
   check(tag+' has no uncaught errors',not errors);context.close()
 browser.close()
server.shutdown()
