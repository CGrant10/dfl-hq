"""Real router, Home wire and receipt presentation; isolated completed trades."""
import json,os,threading,re
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_RECEIPT_MOTION_REVIEW_DIR',ROOT.parent/'dfl-receipt-motion-review'));OUT.mkdir(exist_ok=True)
fixture=(Path(os.environ.get('DFL_TRADE_REVIEW_DIR',ROOT.parent/'dfl-trade-review'))/'fixture.js').read_text()
receipts=json.loads(re.search(r'window.reviewReceiptFixtures=(.*);',fixture).group(1))
source=(ROOT/'js/pages/home.js').read_text();wire=source[source.index('function tradePackageLine('):source.index('/* Sleeper supplies')].replace('export ','')
STUBS={
 'js/member-lock.js':'export function startMemberLock(){}',
 'js/sportsbook-nav.js':'export function ensureSportsbookNav(){}',
 'js/inline.js':'export const canEdit=()=>true;',
 'js/supabase.js':'export const db=()=>{throw Error("Review database writes blocked")};export const edge=()=>{throw Error("Review edge writes blocked")};export const privilegedFunctionHeaders=()=>({});',
 'js/members.js':'export const getMemberId=()=>"receipt-review";export const currentMember=()=>null;export const loadMemberDirectory=async()=>[];',
 'js/performance-policy.js':'export const mountRouteWarmup=()=>()=>{};',
 'js/weekly-outlook-panel.js':'export function mountWeeklyOutlook(){}',
 'js/pages/home.js':"import {esc} from '../ui.js';import {tradeAlertViewModel} from '../trade-alerts.js';"+wire+'''export async function render(view){if(window.holdHome)await new Promise(resolve=>window.releaseHome=resolve);view.innerHTML='<h1>Home</h1><details data-page-detail="receipt-back"><summary>League details</summary>Saved state</details><section id="home-wrap"><div style="height:850px"></div>'+homeTradeWire([tradeAlertViewModel(window.receipts[0])])+'<div style="height:1400px"></div></section>';}''',
 'js/pages/trade.js':'''import {completedTradeMarkup} from '../trade-receipt-ui.js';export async function render(view){if(window.failReceipt){view.innerHTML='<h1>Trade</h1><div role="alert">Receipt unavailable</div>';return}view.innerHTML='<h1>Trade receipt</h1>'+completedTradeMarkup(window.receipts,new URLSearchParams(location.hash.split('?')[1]).get('tx'),{standalone:true});}''',
 'js/pages/clubhouse.js':'export async function render(view){view.innerHTML="<h1>Clubhouse</h1>";}',
}
HTML='''<!doctype html><html data-theme="dark" data-ui-motion="on"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/tokens.css"><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/ui.css"><link rel="stylesheet" href="/css/app-shared.css"><style>.topbar{height:44px}.view{padding:70px 14px 90px}#tabbar a{font-size:12px}</style></head><body><header class="topbar">DFL HQ</header><main id="view" class="view"></main><span id="route-announcer" class="sr-only" role="status"></span><nav id="tabbar" class="tabbar"><a href="#/home" data-route="home">Home</a><a href="#/trade" data-route="trade">Trade</a><a href="#/clubhouse" data-route="clubhouse">Clubhouse</a></nav><script>window.receipts='''+json.dumps(receipts)+''';window.transitions=[];const original=document.startViewTransition?.bind(document);if(original)document.startViewTransition=callback=>{const transition=original(callback);window.transitions.push(transition);transition.ready.catch(()=>{});return transition};</script><script type="module">import {startRouter} from '/js/router.js';startRouter();</script></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  path=self.path.split('?',1)[0].lstrip('/');body=HTML if not path else STUBS.get(path)
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/html' if not path else 'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(name,ok=True):
 assert ok,name
 checks.append(name);print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox'])
 for width in [320,390]:
  for theme in ['dark','light']:
   context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
   context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
   page=context.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR '+str(e),flush=True)))
   page.goto(f'http://127.0.0.1:{server.server_port}/#/home')
   page.wait_for_selector('.home-trade-item');page.evaluate("async theme=>{const t=await import('/js/theme.js');t.pinMode(theme)}",theme)
   card=page.locator('.home-trade-item');card.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-160,behavior:"instant"})');page.wait_for_timeout(350)
   page.locator('[data-page-detail="receipt-back"]').evaluate('e=>e.open=true');page.wait_for_timeout(50)
   top=card.bounding_box()['y'];y=page.evaluate('scrollY')
   card.click();page.wait_for_selector('.td-alert-receipt[data-route-focus]');page.wait_for_function('!document.querySelector("#route-placeholder")')
   page.evaluate('Promise.allSettled(transitions.map(t=>t.finished))')
   check(f'{width} {theme}: receipt connects without leftover names',page.evaluate('transitions.length===1&&!document.querySelector("[style*=view-transition-name]")&&!document.documentElement.dataset.receiptTransition'))
   check(f'{width} {theme}: correct three-team receipt',page.locator('.td-alert-receipt[data-route-focus] [data-receipt-team]').count()==3 and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.screenshot(path=str(OUT/f'receipt-{width}-{theme}.png'))
   page.go_back();page.wait_for_selector('.home-trade-item');page.evaluate('Promise.allSettled(transitions.map(t=>t.finished))')
   check(f'{width} {theme}: Back restores exact card and focus',abs(card.bounding_box()['y']-top)<=1 and abs(page.evaluate('scrollY')-y)<=1 and card.evaluate('e=>e===document.activeElement') and page.locator('[data-page-detail="receipt-back"]').evaluate('e=>e.open'))
   # Hydration moves the surrounding page: anchor restoration holds until input.
   page.evaluate('document.querySelector("#home-wrap > div").style.height="1000px"');page.wait_for_timeout(100)
   check(f'{width} {theme}: delayed Home layout keeps selected trade anchored',abs(card.bounding_box()['y']-top)<=1)
   page.mouse.wheel(0,300);page.wait_for_timeout(150)
   check(f'{width} {theme}: user scrolling releases restoration',abs(card.bounding_box()['y']-top)>100)
   # Reduced motion keeps normal navigation, receipt identity and Back restoration.
   card.scroll_into_view_if_needed();page.emulate_media(reduced_motion='reduce');count=page.evaluate('transitions.length');card.click();page.wait_for_selector('[data-route-focus]')
   check(f'{width} {theme}: reduced motion navigates without animation',page.evaluate('transitions.length')==count)
   page.go_back();page.wait_for_selector('.home-trade-item');page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(100)
   # Disable app motion independently of system preference.
   page.evaluate('document.documentElement.dataset.uiMotion="off"');count=page.evaluate('transitions.length');card.click();page.wait_for_selector('[data-route-focus]')
   check(f'{width} {theme}: app motion off is respected',page.evaluate('transitions.length')==count)
   page.go_back();page.wait_for_selector('.home-trade-item');page.evaluate('document.documentElement.dataset.uiMotion="on"')
   # A second navigation during the selected-card animation cannot paint over it.
   card.click();page.wait_for_selector('[data-route-focus]');page.evaluate('location.hash="#/clubhouse"');page.wait_for_selector('#view[data-route="clubhouse"] h1');page.wait_for_timeout(450)
   check(f'{width} {theme}: interruption leaves Clubhouse interactive',page.evaluate('!document.querySelector("#view").inert&&!document.documentElement.dataset.receiptTransition&&!document.querySelector("[style*=view-transition-name]")'))
   check(f'{width} {theme}: no horizontal overflow or browser errors',not errors and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   context.close()
 # Missing View Transition support still opens the same receipt and returns.
 context=browser.new_context(viewport={'width':390,'height':844});context.add_init_script('document.startViewTransition=undefined')
 context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
 page=context.new_page();page.goto(f'http://127.0.0.1:{server.server_port}/#/home');page.wait_for_selector('.home-trade-item');page.locator('.home-trade-item').click();page.wait_for_selector('[data-route-focus]');page.go_back();page.wait_for_selector('.home-trade-item')
 check('Unsupported browser keeps receipt and Back navigation');context.close();browser.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps(checks,indent=2));print(json.dumps({'checks':len(checks),'errors':[]}))
