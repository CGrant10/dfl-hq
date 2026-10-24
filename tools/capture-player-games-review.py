"""Actual player card, gesture controller and existing share preview; no writes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json,os,threading
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_PLAYER_GAMES_REVIEW_DIR',ROOT.parent/'dfl-player-games-review'));OUT.mkdir(exist_ok=True,parents=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
model={'player':{'id':'7564','name':'Ja’Marr Chase','position':'WR','nflTeam':'CIN'},'leagueId':'1286077564572037120','season':2026,'week':6,'points':29,'state':'final','injury':{'tag':'Healthy','availability':'Available','body':''},'owner':None,'ownerLabel':'Fixture team','myRosterId':1,'recent':[{'week':4,'points':12,'opponent':'BAL','gameTeam':'CIN','rawStats':{'rec':6,'rec_yd':60,'rec_td':0},'stats':{'items':[]}}, {'week':5,'points':31,'opponent':'CLE','gameTeam':'CIN','rawStats':{'rec':8,'rec_tgt':12,'rec_yd':170,'rec_td':1},'stats':{'items':[]}}, {'week':6,'points':29,'opponent':'PIT','gameTeam':'CIN','rawStats':{'rec':9,'rec_yd':140,'rec_td':1,'rush_att':1,'rush_yd':0},'stats':{'items':[]}}],'stats':{'items':[],'updatedAt':None}}
checks=[]
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS '+name,flush=True);(OUT/'checks.json').write_text(json.dumps(checks,indent=2))
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']}
 if os.environ.get('HTTPS_PROXY'):launch['proxy']={'server':os.environ['HTTPS_PROXY'],'bypass':'127.0.0.1,localhost'}
 if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
 browser=p.chromium.launch(**launch);context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,service_workers='block')
 context.route('**/npm/@supabase/supabase-js@*/+esm',lambda r:r.fulfill(content_type='text/javascript',headers={'Access-Control-Allow-Origin':'*'},body="export function createClient(){throw Error('Player games review cannot access a database')}"))
 context.route('https://sleepercdn.com/**',lambda r:r.fulfill(content_type='image/png',headers={'Access-Control-Allow-Origin':'*'},body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()))
 html=(Path(os.environ.get('DFL_SHEET_REVIEW_DIR',ROOT.parent/'dfl-sheets-review'))/'index.html').read_text().replace('http://127.0.0.1:8765/',base)
 context.route('**/player-games-review.html',lambda r:r.fulfill(content_type='text/html',body=html))
 context.route('**/js/player-card-data.js',lambda r:r.fulfill(content_type='text/javascript',body='export async function loadPlayerCard(){window.cardCalls=(window.cardCalls||0)+1;const m='+json.dumps(model)+';if(window.missingGame){m.recent[0].points=null;m.recent[0].rawStats={}}return m}'))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR '+str(e),flush=True)));page.goto(base+'player-games-review.html');page.wait_for_function('window.reviewReady');page.evaluate('document.fonts.ready')
 sheet=page.locator('.dfl-player-card');body=sheet.locator('[data-player-card-body]');slider=sheet.locator('.player-game-scrub');score=sheet.locator('.gameday-spotlight-score .gd-thermal-value')
 def open_card():
  page.evaluate('void window.openReviewPlayer()');page.wait_for_selector('.player-card-owner');page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")')
 def close_card():
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")')
 def game(week):sheet.locator(f'[data-player-game-week="{week}"]').evaluate('e=>e.click()')
 for theme in ['light','dark']:
  page.evaluate('window.reviewTheme',theme)
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844});open_card();name=f'{theme}/{width}'
   check(name+' defaults to the current game and exact score',score.text_content()=='29.00' and sheet.locator('[data-player-game-week="6"]').get_attribute('aria-pressed')=='true')
   page.evaluate('window.callsBefore=window.cardCalls');game(5)
   check(name+' week selection updates points and opponent together',score.text_content()=='31.00' and 'CLE' in sheet.locator('[data-player-game-details]').text_content())
   slider.focus();slider.press('Home');check(name+' keyboard selects the earliest recorded week',score.text_content()=='12.00' and slider.get_attribute('aria-valuenow')=='1')
   slider.press('End');check(name+' keyboard returns to the current week',score.text_content()=='29.00' and slider.get_attribute('aria-valuenow')=='3')
   # Real touch input must scrub horizontally while leaving vertical scrolling native.
   slider.scroll_into_view_if_needed();box=slider.bounding_box();touch=context.new_cdp_session(page);y=box['y']+box['height']*.5;x=box['x']+box['width']*.9
   touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   for i in range(1,8):touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-box['width']*.8*i/7,'y':y}]});page.wait_for_timeout(20)
   touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(50)
   check(name+' finger scrub selects the actual historical game',score.text_content()=='12.00' and sheet.locator('[data-player-game-week="4"]').get_attribute('aria-pressed')=='true')
   game(5);group=sheet.locator('[data-player-stat-group]').first;group.evaluate('e=>{e.click();const a=e.nextElementSibling.getAnimations()[0];if(a){a.pause();a.currentTime=80}}')
   check(name+' stat category expands with a finite height animation',sheet.locator('.player-game-stat-body').first.evaluate('e=>e.getAnimations().some(a=>a.effect.getTiming().duration===220)'))
   group.evaluate('e=>e.click()');page.wait_for_timeout(260);check(name+' rapid reversal closes without leftover height',sheet.locator('.player-game-stat-body').first.evaluate('e=>e.hidden&&!e.style.height'))
   group.evaluate('e=>e.click()');page.wait_for_timeout(260)
   check(name+' expanded receiving stats belong to the selected game','170' in sheet.locator('.player-game-stat-body').first.text_content() and 'Targets' in sheet.locator('.player-game-stat-body').first.text_content())
   slider.scroll_into_view_if_needed();box=slider.bounding_box();before=body.evaluate('e=>e.scrollTop');x=box['x']+box['width']*.5;y=box['y']+box['height']*.7
   touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   for i in range(1,7):touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-i*14}]});page.wait_for_timeout(25)
   touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(300)
   check(name+' vertical chart gestures scroll naturally without selecting another week',body.evaluate('e=>e.scrollTop')>before+10 and score.text_content()=='31.00' and sheet.evaluate('e=>e.open&&!e.dataset.sheetMoving'))
   body.evaluate('e=>e.scrollTop=0')
   page.evaluate('''async()=>{const {updatePlayerCard}=await import('./js/player-card.js');updatePlayerCard({id:'7564',season:2026,week:6,points:35,state:'live'})}''')
   check(name+' a live update preserves the selected historical game and expansion',score.text_content()=='31.00' and group.get_attribute('aria-expanded')=='true' and '35.00' in sheet.locator('[data-player-game-week="6"]').text_content())
   page.evaluate('window.keptScore=document.querySelector(".gameday-spotlight-score .gd-thermal-number");window.keptScroll=document.querySelector("[data-player-card-body]").scrollTop')
   page.evaluate('''async()=>{const {updatePlayerCard}=await import('./js/player-card.js');updatePlayerCard({id:'7564',season:2026,week:6,points:35,state:'live'})}''')
   check(name+' unchanged updates preserve the score node and scroll position',page.evaluate('keptScore===document.querySelector(".gameday-spotlight-score .gd-thermal-number")&&keptScroll===document.querySelector("[data-player-card-body]").scrollTop'))
   check(name+' game selection adds no player-data requests',page.evaluate('window.cardCalls===window.callsBefore'))
   check(name+' names, controls and stat columns fit narrow phones',sheet.evaluate('e=>e.scrollWidth<=e.clientWidth&&[...e.querySelectorAll("button")].filter(b=>b.getClientRects().length).every(b=>b.getBoundingClientRect().height>=43)'))
   body.screenshot(path=str(OUT/f'{theme}-{width}-selected.png'))
   # This is the existing image preview, not a custom share replacement.
   page.evaluate("localStorage.setItem('dfl.share.style','photo')");sheet.locator('[data-player-game-share]').evaluate('e=>e.click()');page.wait_for_selector('.dfl-share-preview canvas',timeout=30000)
   preview=page.locator('.dfl-share-preview');check(name+' existing share preview contains the selected week and score','WEEK 05' in preview.locator('canvas').get_attribute('aria-label') and '31.00' in preview.locator('canvas').get_attribute('aria-label'))
   check(name+' the existing preview renders a real exportable image',preview.locator('canvas').evaluate('e=>e.width>1000&&e.toDataURL("image/png").length>20000'))
   if width==390:preview.screenshot(path=str(OUT/f'{theme}-share-preview.png'))
   preview.locator('[data-share-close]').click();page.wait_for_selector('.dfl-share-preview',state='detached');check(name+' closing share returns to the same selected performance',score.text_content()=='31.00')
   close_card();open_card();check(name+' reopening resets the selected week and body position',score.text_content()=='29.00' and body.evaluate('e=>e.scrollTop===0'));close_card()
 # Missing scores and motion preferences never manufacture a performance.
 page.evaluate('window.missingGame=true');open_card();game(4)
 check('missing points stay unavailable and cannot be shared',score.text_content()=='—' and sheet.locator('[data-player-game-share]').is_disabled());close_card();page.evaluate('window.missingGame=false')
 for preference in ['off','reduce']:
  page.evaluate('window.reviewMotion','off' if preference=='off' else 'on');page.emulate_media(reduced_motion='reduce' if preference=='reduce' else 'no-preference');open_card();game(5);sheet.locator('[data-player-stat-group]').first.evaluate('e=>e.click()');page.wait_for_timeout(30)
  check(preference+' supports game selection and immediate stat expansion',score.text_content()=='31.00' and sheet.locator('.player-game-stat-body').first.evaluate('e=>!e.hidden&&!e.getAnimations().length'));close_card()
 check('no browser errors or backend writes',not errors and page.evaluate('window.rpcCalls')==0);browser.close();server.shutdown()
