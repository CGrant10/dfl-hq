"""Native shared matchup transitions, with real browser snapshots and no league data."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import os,json,threading
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_MATCHUP_REVIEW_DIR',ROOT.parent/'dfl-matchup-review'));OUT.mkdir(parents=True,exist_ok=True)
html='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="css/tokens.css"><link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/ui.css"><link rel="stylesheet" href="css/app-shared.css"><style>#view{padding:90px 16px}#home-wrap{padding:0}.home-personal-desk{width:100%}.gameday-matchup{display:flex;justify-content:space-around}.dfl-team-mark{display:block;width:40px;height:40px;background:#962638;color:white;text-align:center;font-size:22px}.gd-thermal-value{display:block;font-size:28px}.fixture-destination{display:flex;justify-content:space-around}.fixture-destination .dfl-team-mark{width:64px;height:64px}.fixture-destination b{font-size:32px}</style></head><body><main id="view" data-route="home"></main><script type="module">
import{mountMatchupRouteMotion,renderWithMatchupMotion}from './js/matchup-route-motion.js';
mountMatchupRouteMotion();const native=document.startViewTransition.bind(document);window.nativeStarts=0;
document.startViewTransition=update=>{window.nativeStarts++;window.sourceNames=[...document.querySelectorAll('[style*=view-transition-name]')].map(n=>({text:n.textContent,name:n.style.viewTransitionName}));const t=native(async()=>{await update();window.targetNames=[...document.querySelectorAll('[style*=view-transition-name]')].map(n=>({text:n.textContent,name:n.style.viewTransitionName}))});window.transition=t;return t};
window.resetFixture=()=>{window.complete=false;window.nativeStarts=0;location.hash='#/home';const view=document.getElementById('view');view.dataset.route='home';view.innerHTML='<div id="home-wrap"><div class="home-personal-desk"><div class="gameday-matchup"><span data-gameday-team="1"><span class="dfl-team-mark">A</span><span class="home-team-total"><span class="gd-thermal-value">100.00</span></span></span><span data-gameday-team="2"><span class="dfl-team-mark">B</span><span class="home-team-total"><span class="gd-thermal-value">99.00</span></span></span></div><a data-home-clubhouse-link href="#/clubhouse?matchup=3">Clubhouse</a></div></div>';
view.querySelector('a').onclick=async event=>{event.preventDefault();const hash=event.currentTarget.getAttribute('href');location.hash=hash;await renderWithMatchupMotion(async()=>{view.dataset.route='clubhouse';view.innerHTML='<h1>Clubhouse</h1><div class="fixture-destination"><div data-matchup-roster="2"><span class="dfl-team-mark">B</span><b data-matchup-score-value>99.00</b></div><div data-matchup-roster="1"><span class="dfl-team-mark">A</span><b data-matchup-score-value>100.00</b></div></div>'}, {dataset:{route:'home'}},hash);window.complete=true};};resetFixture();window.ready=true;
</script></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  if self.path=='/matchup.html':self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(html.encode())
  else:super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS '+name,flush=True);(OUT/'checks.json').write_text(json.dumps(checks,indent=2))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--no-proxy-server']);page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/matchup.html');page.wait_for_function('window.ready')
 for width in [320,390]:
  page.set_viewport_size({'width':width,'height':844});page.evaluate('resetFixture()');page.locator('[data-home-clubhouse-link]').click();page.wait_for_function('window.complete');page.evaluate('async()=>{await window.transition.finished}')
  names=page.evaluate('window.targetNames');mapping={n['text']:n['name'] for n in names}
  check(f'{width}px team identity follows roster ID across reversed columns',mapping.get('A')=='dfl-matchup-team-0' and mapping.get('B')=='dfl-matchup-team-1')
  check('matching actual totals travel with the same team',mapping.get('100.00')=='dfl-matchup-score-0' and mapping.get('99.00')=='dfl-matchup-score-1')
  check('temporary transition names and state clean up',page.evaluate('!document.documentElement.dataset.matchupTransition&&![...document.querySelectorAll("[style]")].some(n=>n.style.viewTransitionName)'))
  page.screenshot(path=str(OUT/f'clubhouse-{width}.png'))
 page.emulate_media(reduced_motion='reduce');page.evaluate('resetFixture()');page.locator('[data-home-clubhouse-link]').click();page.wait_for_function('window.complete');check('reduced motion navigates directly without snapshot motion',page.evaluate('window.nativeStarts===0&&document.querySelector("h1").textContent==="Clubhouse"'))
 page.emulate_media(reduced_motion='no-preference');page.evaluate('resetFixture();document.documentElement.dataset.uiMotion="off"');page.locator('[data-home-clubhouse-link]').click();page.wait_for_function('window.complete');check('app motion off preserves direct navigation',page.evaluate('window.nativeStarts===0'))
 check('no browser errors',not errors);browser.close();server.shutdown()
