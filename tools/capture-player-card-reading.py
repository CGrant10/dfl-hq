"""Shared player card with delayed photos/average, real controllers and no writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];FIXTURE=Path(os.environ.get('DFL_SHEET_REVIEW_DIR','/tmp/dfl-player-1507'));OUT=Path(os.environ.get('DFL_PLAYER_READING_DIR',FIXTURE/'reading'));OUT.mkdir(parents=True,exist_ok=True)
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
 c.route('**/js/player-card-data.js',lambda r:r.fulfill(content_type='text/javascript',body='export async function loadPlayerCard(s,c,{onSeasonAverage=()=>{}}={}){window.releaseAverage=()=>onSeasonAverage({value:23.2,games:5,stale:false});const model='+json.dumps(model)+';if(window.holdWarm)await new Promise(r=>window.releaseWarm=r);model.points=window.warmScore??model.points;return model;}'))
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'player-finish.html');page.wait_for_function('window.reviewReady');page.evaluate('document.fonts.ready')
 page.evaluate('''()=>{const source=document.querySelector('[data-review-player]');Object.assign(source.style,{position:'fixed',left:'20px',top:'180px'});Object.assign(source.querySelector('.dfl-player-portrait').style,{display:'block',width:'36px',height:'36px'});source.dataset.playerCard='7564'}''')
 def open_card():
  page.evaluate('void openReviewPlayer()');page.wait_for_selector('.player-card-owner');page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")')
 def close_card():
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")')
 for theme in ['light','dark']:
  page.evaluate('window.reviewTheme',theme)
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844});open_card();card=page.locator('.dfl-player-card');tag=f'{theme}/{width}';page.wait_for_timeout(220)
   check(tag+' neutral availability does not add a redundant row',card.locator('.player-card-availability').count()==0)
   check(tag+' current week and score lead the card',card.locator('.gameday-spotlight-score strong').inner_text().startswith('29.00') and card.locator('[data-player-game-week="6"]').get_attribute('aria-pressed')=='true')
   page.screenshot(path=str(OUT/f'player-{theme}-{width}.png'))
   group=card.locator('[data-player-stat-group]').first;group.click();page.wait_for_timeout(260)
   page.evaluate("""()=>{window.keptCard={photo:document.querySelector('.player-card-hero img'),watch:document.querySelector('[data-player-watch]'),score:document.querySelector('.gameday-spotlight-score strong'),value:document.querySelector('.gameday-spotlight-score .gd-thermal-value'),group:document.querySelector('[data-player-stat-group]'),body:document.querySelector('[data-player-card-body]'),scroll:document.querySelector('[data-player-card-body]').scrollTop};}""")
   page.evaluate("""async()=>{window.cardApi=await import('/js/player-card.js');cardApi.updatePlayerCard({id:'7564',season:2026,week:6,points:31,state:'final'},true)}""")
   check(tag+' live score retains its numeric node and control surfaces',page.evaluate('keptCard.photo===document.querySelector(".player-card-hero img")&&keptCard.watch===document.querySelector("[data-player-watch]")&&keptCard.score===document.querySelector(".gameday-spotlight-score strong")&&keptCard.value===document.querySelector(".gameday-spotlight-score .gd-thermal-value")'))
   check(tag+' actual score update settles smoothly',card.locator('.gd-thermal-value').evaluate('e=>e.textContent==="31.00"&&e.getAnimations().some(a=>a.playState==="running")'))
   check(tag+' refresh preserves expanded stats and reading position',group.get_attribute('aria-expanded')=='true' and page.evaluate('keptCard.body.scrollTop===keptCard.scroll'))
   card.locator('[data-player-game-week="4"]').click()
   check(tag+' selecting another game clears score-only motion',card.locator('.gd-thermal-value').evaluate('e=>e.textContent==="12.00"&&!e.getAnimations().length'))
   check(tag+' a different game starts with its own folded stats',card.locator('[data-player-stat-group][aria-expanded="true"]').count()==0)
   page.evaluate('cardApi.updatePlayerCard({id:"7564",season:2026,week:6,points:33,state:"final"},true)')
   check(tag+' current updates cannot overwrite the historical game being read',card.locator('.gd-thermal-value').inner_text()=='12.00' and card.locator('[data-player-game-week="4"]').get_attribute('aria-pressed')=='true')
   check(tag+' week indicator follows the selected game',card.locator('.player-game-week-list').evaluate('e=>e.style.getPropertyValue("--player-selected-week")==="0"'))
   card.locator('[data-player-game-week="6"]').click()
   for points in [0,-1.25,None]:
    page.evaluate('(points)=>cardApi.updatePlayerCard({id:"7564",season:2026,week:6,points,state:"final"},false)',points)
    expected='—' if points is None else f'{points:.2f}';check(tag+' genuine score '+expected,card.locator('.gd-thermal-value').inner_text()==expected and card.locator('.gd-thermal-value').evaluate('e=>!e.getAnimations().length'))
   card.locator('[data-player-game-week="4"]').click();check(tag+' card Motion off disables the week underline transition',card.locator('.player-game-week-list').evaluate('e=>getComputedStyle(e,"::after").transitionDuration.split(",").every(t=>parseFloat(t)<=.001)'));card.locator('[data-player-game-week="6"]').click()
   page.emulate_media(reduced_motion='reduce');page.evaluate('cardApi.updatePlayerCard({id:"7564",season:2026,week:6,points:30,state:"final"},true)')
   check(tag+' Reduced Motion keeps score and week changes static',card.locator('.gd-thermal-value').evaluate('e=>!e.getAnimations().length') and card.locator('.player-game-week-list').evaluate('e=>getComputedStyle(e,"::after").transitionDuration.split(",").every(t=>parseFloat(t)<=.001)'))
   page.emulate_media(reduced_motion='no-preference');page.evaluate('document.documentElement.style.fontSize="32px";document.documentElement.dataset.readability="comfortable"');page.wait_for_timeout(150)
   check(tag+' enlarged text and controls stay inside the sheet',card.evaluate('e=>e.scrollWidth<=e.clientWidth+1&&[...e.querySelectorAll("button,summary")].filter(n=>n.getClientRects().length).every(n=>n.getBoundingClientRect().height>=43)'))
   page.screenshot(path=str(OUT/f'player-large-{theme}-{width}.png'));page.evaluate('document.documentElement.style.fontSize="16px";delete document.documentElement.dataset.readability');close_card();open_card()
   check(tag+' reopening starts at the current week and top',card.locator('[data-player-card-body]').evaluate('e=>e.scrollTop===0') and card.locator('[data-player-game-week="6"]').get_attribute('aria-pressed')=='true')
   close_card()
 # Cached preview refreshes keep loaded images and real controls mounted.
 open_card();page.evaluate('window.warmPhoto=document.querySelector(".player-card-hero img");window.warmCompare=document.querySelector("[data-player-compare]")')
 page.evaluate('window.holdWarm=true;window.warmScore=32;void openReviewPlayer()');page.wait_for_function('!!window.releaseWarm');page.locator('[data-player-stat-group]').first.click();page.wait_for_timeout(240);page.evaluate('releaseWarm()');page.wait_for_function('!document.querySelector("[data-player-card-body]").hasAttribute("aria-busy")')
 check('warm refresh retains loaded portrait and primary control',page.evaluate('warmPhoto===document.querySelector(".player-card-hero img")&&warmCompare===document.querySelector("[data-player-compare]")'))
 check('warm data arrival preserves an open stat group and updates its number',page.locator('[data-player-stat-group]').first.get_attribute('aria-expanded')=='true' and page.locator('.gd-thermal-value').inner_text()=='32.00')
 close_card();check('no script errors',not errors);browser.close()
server.shutdown();print(json.dumps({'checks':len(checks),'passed':True}))
