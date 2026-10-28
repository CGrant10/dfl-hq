"""Shared player card with delayed photos/average, real controllers and no writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];FIXTURE=Path(os.environ.get('DFL_SHEET_REVIEW_DIR','/tmp/dfl-player-1507'));OUT=Path(os.environ.get('DFL_PLAYER_FINISH_DIR',FIXTURE/'finish'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
model={'player':{'id':'7564','name':'Ja’Marr Chase','position':'WR','nflTeam':'CIN'},'season':2026,'week':6,'points':29,'state':'final','injury':{'tag':'Healthy','availability':'Available','body':''},'owner':None,'ownerLabel':'The exceptionally long DFL team name','recent':[{'week':4,'points':12,'rawStats':{'rec':6,'rec_yd':60}},{'week':5,'points':31,'rawStats':{'rec':8,'rec_yd':170,'rec_td':1}},{'week':6,'points':29,'rawStats':{'rec':9,'rec_yd':140,'rec_td':1},'opponent':'PIT'}],'stats':{'items':[]},'seasonAverage':None}
checks=[];errors=[];held=[]
def check(name,ok):
 checks.append({'name':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 c=browser.new_context(viewport={'width':390,'height':844},has_touch=True,service_workers='block')
 c.route('**/npm/@supabase/supabase-js@*/+esm',lambda r:r.fulfill(content_type='text/javascript',headers={'Access-Control-Allow-Origin':'*'},body="export function createClient(){throw Error('Fixture writes blocked')}"))
 def photo(r):
  if 'slow=' in r.request.url:held.append(r)
  else:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())
 c.route('https://sleepercdn.com/**',photo)
 c.route('**/player-finish.html',lambda r:r.fulfill(content_type='text/html',body=(FIXTURE/'index.html').read_text().replace('http://127.0.0.1:8765/',base)))
 c.route('**/js/player-card-data.js',lambda r:r.fulfill(content_type='text/javascript',body='export async function loadPlayerCard(s,c,{onSeasonAverage=()=>{}}={}){window.releaseAverage=()=>onSeasonAverage({value:23.2,games:5,stale:false});return '+json.dumps(model)+'}'))
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'player-finish.html');page.wait_for_function('window.reviewReady');page.evaluate('document.fonts.ready')
 page.evaluate('''()=>{const source=document.querySelector('[data-review-player]');Object.assign(source.style,{position:'fixed',left:'20px',top:'180px'});Object.assign(source.querySelector('.dfl-player-portrait').style,{display:'block',width:'36px',height:'36px'});source.dataset.playerCard='7564'}''')
 def open_card():
  page.evaluate('void openReviewPlayer()');page.wait_for_selector('.player-card-owner');page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")')
 def close_card():
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")')
 for theme in ['light','dark']:
  page.evaluate('window.reviewTheme',theme)
  for width in [320,390,600]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('document.querySelector("#view").dataset.route="clubhouse"');open_card();card=page.locator('.dfl-player-card');body=card.locator('[data-player-card-body]');tag=f'{theme}/{width}'
   check(tag+' card is ready while optional average is pending',body.get_attribute('aria-busy') is None and card.locator('.player-card-season-average').is_hidden())
   check(tag+' useful headline and origin are visible',card.locator('[data-player-game-line]').inner_text()=='9 rec · 140 yd · 1 TD' and card.locator('[data-player-card-origin]').inner_text()=='Clubhouse')
   page.evaluate('window.keptPrimary=document.querySelector(".player-card-primary");window.keptY=document.querySelector("[data-player-card-body]").scrollTop;window.primaryTop=keptPrimary.getBoundingClientRect().top;releaseAverage()')
   check(tag+' optional average patches without replacing controls',card.locator('.player-card-season-average strong').inner_text()=='23.2' and page.evaluate('keptPrimary===document.querySelector(".player-card-primary")&&keptY===document.querySelector("[data-player-card-body]").scrollTop&&Math.abs(primaryTop-keptPrimary.getBoundingClientRect().top)<1'))
   page.screenshot(path=str(OUT/f'card-{theme}-{width}.png'))
   more=card.locator('.player-card-more');more.locator('summary').click();page.wait_for_timeout(320)
   check(tag+' secondary tools expand without overflow',more.evaluate('e=>e.open&&!e.getAnimations().length&&!e.style.height') and card.evaluate('e=>e.scrollWidth<=e.clientWidth'))
   page.evaluate("document.documentElement.style.fontSize='32px'");page.wait_for_timeout(150)
   check(tag+' larger text and controls fit',card.evaluate('e=>e.scrollWidth<=e.clientWidth&&[...e.querySelectorAll("button,summary")].filter(n=>n.getClientRects().length).every(n=>n.getBoundingClientRect().height>=43)'))
   page.evaluate("document.documentElement.style.fontSize=''");close_card();open_card()
   check(tag+' warm reopen resets tools and body',not more.evaluate('e=>e.open') and body.evaluate('e=>e.scrollTop===0'));close_card()
 # A delayed source photo becomes part of the current flight, without restarting it.
 page.set_viewport_size({'width':390,'height':844});page.evaluate('''()=>{const p=document.querySelector('[data-review-player] .dfl-player-portrait');p.classList.remove('has-photo');p.querySelector('img').src='https://sleepercdn.com/content/nfl/players/7564.jpg?slow=one';void openReviewPlayer()}''');page.wait_for_selector('.dfl-connected-portrait')
 page.evaluate('document.querySelector(".dfl-connected-portrait").getAnimations()[0].pause()');page.wait_for_timeout(80)
 overlay=page.locator('.dfl-connected-portrait');before=overlay.bounding_box();check('slow image starts with usable initials',overlay.locator('span').count()==1 and overlay.locator('img').evaluate('e=>!e.complete'))
 while held:held.pop().fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())
 page.wait_for_function('!!document.querySelector(".dfl-connected-portrait img")?.naturalWidth');after=overlay.bounding_box()
 check('late photo preserves the travelling geometry',all(abs(before[k]-after[k])<1 for k in ['x','y','width','height']))
 page.evaluate('document.querySelector(".dfl-connected-portrait").getAnimations()[0].play()');page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")');close_card()
 # Completing a photo after dismissal cannot resurrect its overlay.
 page.evaluate('''()=>{const p=document.querySelector('[data-review-player] .dfl-player-portrait');p.classList.remove('has-photo');p.querySelector('img').src='https://sleepercdn.com/content/nfl/players/7564.jpg?slow=cancel';void openReviewPlayer()}''');page.wait_for_selector('.dfl-connected-portrait');close_card()
 while held:held.pop().fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())
 page.wait_for_timeout(150);check('late image completion cannot reopen a dismissed card',page.locator('dialog[open],.dfl-connected-portrait').count()==0)
 # An optional response from an earlier opening cannot patch its successor.
 open_card();page.evaluate('window.oldAverage=releaseAverage');close_card();open_card();page.evaluate('oldAverage()')
 check('old optional results cannot update a fresh opening',page.locator('.player-card-season-average').is_hidden());close_card()
 # Refreshing a trade card must return to that offer, not another occurrence of the player.
 page.evaluate('''async()=>{const view=document.querySelector('#view');view.dataset.route='trade';const portrait=document.querySelector('[data-review-player] .dfl-player-portrait').outerHTML;view.insertAdjacentHTML('beforeend',['first','second'].map(key=>`<article data-offer-key="${key}"><button data-player-card="7564">${portrait}Chase</button></article>`).join(''));const {openPlayerCard}=await import('/js/player-card.js');void openPlayerCard({id:'7564'},{source:view.querySelector('[data-offer-key=second] button')})}''');page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")');page.wait_for_selector('.player-card-owner')
 check('trade entry retains its context',page.locator('[data-player-card-origin]').inner_text()=='Trade board')
 page.evaluate('''()=>{const card=document.querySelector('[data-offer-key=second]');card.innerHTML=card.innerHTML}''');close_card()
 check('return focus follows the original refreshed offer',page.evaluate('document.activeElement.closest("[data-offer-key]")?.dataset.offerKey==="second"'))
 check('no browser errors',not errors);browser.close()
server.shutdown();print(json.dumps({'checks':len(checks),'errors':errors}))
