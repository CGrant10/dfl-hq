"""Compact Home score surface: actual controllers, isolated data and images."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];FIXTURE=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'));OUT=Path(os.environ.get('DFL_DOCK_REVIEW_DIR','/tmp/dfl-scoreboard-finish'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT),**kw)
 def do_GET(self):
  if self.path.split('?')[0]=='/scoreboard-finish.html':
   self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write((FIXTURE/'index.html').read_bytes());return
  super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
checks=[];errors=[]
def check(label,ok):
 checks.append({'check':label,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,label;print('PASS '+label,flush=True)
def settle(page):
 page.wait_for_timeout(90)
 page.evaluate('''()=>{const s=document.querySelector('.gameday-matchup').getBoundingClientRect(),top=document.querySelector('.topbar').getBoundingClientRect().bottom;scrollTo({top:Math.max(0,s.top+scrollY-top-104+Math.max(96,s.height-24)*1.1),behavior:'instant'})}''')
 page.wait_for_function('''()=>{const b=document.querySelector('.home-score-dock');return b&&!b.inert&&Number(getComputedStyle(b).opacity)>.999}''')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for mode in ['light','dark']:
  for width in [320,390,768]:
   c=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block')
   c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()) if r.request.resource_type=='image' else r.abort())
   page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/scoreboard-finish.html',wait_until='domcontentloaded');page.wait_for_function('window.reviewDeck');page.evaluate('document.fonts.ready');page.evaluate('mode=>reviewSetTheme(mode)',mode)
   page.evaluate('''()=>{reviewStage.suspend('scoreboard-finish',true);window.values=[...document.querySelectorAll('.gameday-matchup .home-projected-total,.gameday-matchup .gd-thermal-value')];values.forEach((n,i)=>n.textContent=i?'94.10':'100.25');const source=document.querySelector('.gameday-matchup');source.classList.remove('is-projected');document.querySelector('.home-game-phase').textContent='Final';source.querySelectorAll('.gameday-faceoff-mark').forEach(n=>{n.innerHTML='<img src="tools/fixtures/player-portrait.png" alt="">';n.classList.add('has-photo')})}''');settle(page);dock=page.locator('.home-score-dock');tag=f'{mode}/{width}'
   check(tag+' scores retain exact values and the known leader',dock.locator('[data-dock-score]').all_text_contents()==['100.25','94.10'] and dock.get_attribute('data-leader')=='left' and dock.locator('[data-dock-score]').evaluate_all('ns=>getComputedStyle(ns[0]).color!==getComputedStyle(ns[1]).color'))
   check(tag+' full names, framed photos and score columns fit',dock.evaluate('''e=>{const names=[...e.querySelectorAll('[data-dock-name]')],scores=[...e.querySelectorAll('[data-dock-score]')].map(n=>n.getBoundingClientRect());return names.every(n=>n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1)&&Math.abs(scores[0].top-scores[1].top)<1&&e.getBoundingClientRect().left>=0&&e.getBoundingClientRect().right<=innerWidth+1}'''))
   contrast=page.evaluate('''async()=> (await import('/tools/home-review-contrast.js')).reviewTextContrast(document.querySelector('.home-score-dock'))''')
   if contrast['failures']:
    (OUT/f'{mode}-{width}-contrast-failure.json').write_text(json.dumps(contrast,indent=2));dock.screenshot(path=str(OUT/f'{mode}-{width}-contrast-failure.png'))
   check(tag+' readable text contrast '+json.dumps(contrast['failures']),not contrast['failures'])
   if width<700:
    check(tag+' compact scoreboard leaves room for the page',dock.evaluate('(e,max)=>e.offsetHeight>=44&&e.offsetHeight<=max',72 if width==320 else 64))
   dock.screenshot(path=str(OUT/f'{mode}-{width}-dock.png'))
   if width==390:page.screenshot(path=str(OUT/f'{mode}-390-context.png'))
   page.evaluate("values[1].textContent='110.05'");page.wait_for_function('document.querySelector(".home-score-dock").dataset.leader==="right"');check(tag+' a score correction can change the highlighted side',dock.locator('[data-dock-score]').nth(1).inner_text()=='110.05')
   page.evaluate("values[0].textContent='0.00';values[1].textContent='0.00'");page.wait_for_function('document.querySelector(".home-score-dock").dataset.leader==="tie"');check(tag+' a real zero tie highlights neither side',dock.locator('[data-dock-score]').all_text_contents()==['0.00','0.00'] and dock.locator('[data-dock-score]').evaluate_all('ns=>getComputedStyle(ns[0]).color===getComputedStyle(ns[1]).color'))
   page.evaluate("values[0].textContent='—'");page.wait_for_function('document.querySelector(".home-score-dock").dataset.leader==="unknown"');check(tag+' an unknown total never becomes a lead or a zero',dock.locator('[data-dock-score]').first.inner_text()=='—')
   page.evaluate("document.querySelector('.gameday-matchup').classList.add('is-projected');document.querySelector('.home-game-phase').textContent='Upcoming';values[0].textContent='140.00';values[1].textContent='120.00'");settle(page)
   check(tag+' forecasts remain labeled and visually neutral',dock.get_attribute('data-leader')=='projected' and 'Projected' in dock.locator('.home-score-caption').inner_text() and dock.locator('[data-dock-score]').evaluate_all('ns=>getComputedStyle(ns[0]).color===getComputedStyle(ns[1]).color'))
   page.evaluate("document.querySelector('.gameday-matchup').classList.remove('is-projected');document.querySelector('.home-game-phase').textContent='Final';document.querySelectorAll('.home-team-name strong').forEach((n,i)=>n.textContent=i?'Monday Night Mayhem':'The Very Long Bayou Championship Bombers')");settle(page)
   check(tag+' long current names wrap fully instead of truncating',dock.locator('[data-dock-name]').evaluate_all('ns=>ns.every(n=>n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1)'))
   if width==320:
    page.evaluate('document.documentElement.style.fontSize="200%"');settle(page);check(tag+' enlarged text stays within the fixed scoreboard',dock.evaluate('''e=>{const rows=[...e.querySelectorAll('.home-score-pair>span')].map(n=>n.getBoundingClientRect());return e.scrollWidth<=e.clientWidth+1&&rows[1].top>rows[0].bottom}''') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'));dock.screenshot(path=str(OUT/f'{mode}-320-large-text.png'));page.evaluate('document.documentElement.style.fontSize=""');settle(page)
   dock.click();page.wait_for_timeout(800);check(tag+' tapping returns to the original matchup',page.evaluate('document.activeElement===document.querySelector(".gameday-matchup")') and page.locator('.gameday-matchup').bounding_box()['y']>=0)
   c.close()
 check('No browser errors or production writes',not errors);browser.close()
server.shutdown()
