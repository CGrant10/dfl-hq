"""Isolated mobile scroll controller and real score dock; no league writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_ALERT_REVIEW_DIR',ROOT.parent/'dfl-alert-review'));OUT.mkdir(parents=True,exist_ok=True)
HTML='''<!doctype html><html data-ui-motion="on"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="css/tokens.css"><link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/breaking-trade.css"><link rel="stylesheet" href="css/app-shared.css"><style>body{min-height:3000px}.topbar{height:44px}#view{min-height:2800px}.gameday-matchup{height:400px}.gameday-faceoff-team{display:inline-block;width:45%}.gameday-faceoff-mark{display:block;width:30px;height:30px}#more:not(.hidden){position:fixed;inset:0;background:#111;z-index:200}#tabbar{height:49px}</style><header class="topbar">DFL</header><aside class="breaking-trade">Three-team deal · Full receipt</aside><main id="view" class="view" data-route="home"><h1>Home</h1><div data-home-gameday-slot><section class="gameday-matchup"><div class="gameday-faceoff-team"><i class="gameday-faceoff-mark">KS</i><span class="home-team-name"><strong>Klutch Sports</strong></span><b class="home-projected-total">124</b></div><div class="gameday-faceoff-team"><i class="gameday-faceoff-mark">BB</i><span class="home-team-name"><strong>Bayou Bombers</strong></span><b class="home-projected-total">118</b></div></section></div><h2>Week ahead</h2></main><nav id="tabbar" class="tabbar">Navigation</nav><div id="more" class="hidden">More</div><script type="module">import{mountTradeAlertDock}from './js/trade-alert-dock.js';import{mountHomeScoreCollapse}from './js/home-score-collapse.js';import{scrollChromeBottom}from './js/scroll-chrome.js';const host=document.querySelector('.breaking-trade');const dock=mountTradeAlertDock(host,{onClick:e=>{if(e.target.closest('[data-dismiss-alert]')){host.hidden=true;dock.update('')}}});dock.update('<a class="breaking-trade-dock-copy" href="#/trade?tx=three-way"><span class="breaking-trade-dock-dot"></span><span><small>TRADE · WEEK 6</small><strong>Bayou Bombers ↔ Klutch Sports Group ↔ Dream Enders</strong></span><b>78%</b></a><button type="button" data-dismiss-alert aria-label="Dismiss this alert">×</button>');const score=mountHomeScoreCollapse(document.querySelector('#view'));window.chromeBottom=scrollChromeBottom;window.stopReview=()=>{dock.stop();score()};window.reviewReady=true;</script></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  if self.path.split('?')[0]=='/':
   self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(HTML.encode())
  else:super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);c=b.new_context(viewport={'width':390,'height':844},has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/#/home');page.wait_for_function('window.reviewReady');page.wait_for_timeout(200)
 dock=page.locator('.breaking-trade-dock');assert dock.is_hidden();checks.append('Full alert scrolls naturally without a duplicate fixed alert')
 for width in [320,390,430,900]:
  page.set_viewport_size({'width':width,'height':844});page.evaluate("scrollTo({top:900,behavior:'instant'})");page.wait_for_timeout(250);assert dock.is_visible()
  boxes=page.evaluate('''()=>{const d=document.querySelector('.breaking-trade-dock').getBoundingClientRect(),s=document.querySelector('.home-score-dock').getBoundingClientRect(),h=document.querySelector('.topbar').getBoundingClientRect(),n=document.querySelector('#tabbar').getBoundingClientRect();return {top:d.top,bottom:d.bottom,height:d.height,scoreTop:s.top,header:h.bottom,nav:n.bottom,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,chrome:chromeBottom()}}''')
  assert not boxes['overflow'] and boxes['height']==44,boxes
  assert abs(boxes['top']-max(boxes['header'],boxes['nav'] if width>=900 else 0))<=1,boxes
  assert abs(boxes['scoreTop']-boxes['bottom'])<=1 and boxes['chrome']==boxes['bottom'],boxes
  assert dock.locator('a').get_attribute('href')=='#/trade?tx=three-way'
  assert dock.locator('button').bounding_box()['width']>=44
  page.screenshot(path=str(OUT/f'sticky-{width}.png'));checks.append(f'{width}px compact alert clears header/navigation, has a 44px dismiss target and stacks above the score dock')
 page.set_viewport_size({'width':390,'height':844});page.evaluate("document.querySelector('.topbar').style.height='64px'");page.wait_for_timeout(200)
 geometry=page.evaluate("()=>({dock:document.querySelector('.breaking-trade-dock').getBoundingClientRect().bottom,score:document.querySelector('.home-score-dock').getBoundingClientRect().top,top:document.querySelector('.breaking-trade-dock').getBoundingClientRect().top})")
 assert geometry['top']==64 and geometry['score']==geometry['dock'],geometry
 page.evaluate("document.querySelector('.topbar').style.height=''");page.wait_for_timeout(200);checks.append('Header geometry changes reposition both docks without a new scroll')
 page.evaluate("document.querySelector('#more').classList.remove('hidden')");page.wait_for_timeout(100);assert dock.is_hidden();checks.append('More menu covers the page without the alert floating over it')
 page.evaluate("document.querySelector('#more').classList.add('hidden')");page.wait_for_timeout(100);assert dock.is_visible()
 page.evaluate("window.auditDialog=document.createElement('dialog');document.body.append(auditDialog);auditDialog.showModal()");page.wait_for_timeout(100);assert dock.is_hidden();page.evaluate("auditDialog.close();auditDialog.remove()");page.wait_for_timeout(100);assert dock.is_visible();checks.append('Modal visibility safely releases and restores the dock')
 page.set_viewport_size({'width':390,'height':844});page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(200);assert dock.evaluate('e=>getComputedStyle(e).animationName')=='none';checks.append('Reduced motion keeps the compact alert available without entrance animation')
 dock.locator('a').click();page.wait_for_timeout(150);assert page.url.endswith('#/trade?tx=three-way') and dock.is_hidden();checks.append('Tap opens the exact three-team receipt and removes the Home dock')
 page.evaluate("location.hash='#/home'");page.wait_for_timeout(150);assert dock.is_visible()
 page.evaluate("scrollTo({top:0,behavior:'instant'})");page.wait_for_timeout(150);assert dock.is_hidden();checks.append('Returning to the top restores the full alert without duplicate chrome')
 page.evaluate("scrollTo({top:900,behavior:'instant'})");page.wait_for_timeout(150);dock.locator('button').click();page.wait_for_timeout(150);assert dock.is_hidden() and page.locator('.breaking-trade').is_hidden();checks.append('Dismiss removes both alert surfaces')
 page.evaluate('stopReview();dispatchEvent(new Event("scroll"));dispatchEvent(new Event("resize"))');page.wait_for_timeout(100);assert dock.count()==0;assert not errors,errors;checks.append('Teardown removes the dock and listeners without runtime errors');b.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2));print('\n'.join('PASS '+s for s in checks));print(len(checks),'trade alert checks passed')
