"""Production recap and saved-moment presentation; isolated data, no writes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json,os,threading
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_RECAP_REVIEW_DIR',ROOT.parent/'dfl-recap-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
index=(ROOT/'index.html').read_text();head=index[index.index('<head>')+6:index.index('</head>')]
html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+head+'''</head><body><main id="view"><button class="btn" id="open">Play recap</button></main><script type="module">
import {mountMomentRecap} from './js/moment-recap.js';import {savedMoments} from './js/game-day-moments-model.js';import {saveMode} from './js/theme.js';import {startUiMotion} from './js/ui-motion.js';import {reviewTextContrast} from './tools/home-review-contrast.js';
const side=(roster,name,accent)=>({roster,name,identity:{accent_color:accent,sleeper_profile_image:'https://sleepercdn.com/avatars/thumbs/fixture'},score:1,lineup:[{id:'a',name:'Ja’Marr Chase',position:'WR',nflTeam:'CIN'}]});
const model={leagueId:'fixture',season:2026,week:7,games:[{id:'1',sides:[side('1','The Bayou Bombers','#C8102E'),side('2','Klutch Sports Group','#EFC94C')]}]};
const row=(id,kind,data,roster=1)=>({id,kind,data,league_id:'fixture',season:2026,week:7,matchup_id:1,roster_id:roster,player_id:'a',captured_at:`2026-10-23T18:0${id}:00Z`});
window.items=savedMoments([row(1,'lead',{scores:{1:110.45,2:112.10}},2),row(2,'surge',{points:24.83,delta:8.12}),row(3,'big',{points:32.17})],model);
window.motion=true;window.recap=mountMomentRecap({getMotion:()=>window.motion,returnFocus:()=>document.querySelector('#open')});document.querySelector('#open').onclick=()=>window.recap.open(window.items,'1');
window.reviewTheme=saveMode;window.reviewContrast=()=>reviewTextContrast(document.querySelector('.gd-moment-recap'));startUiMotion();window.reviewReady=true;
</script></body></html>'''
checks=[]
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS '+name,flush=True);(OUT/'checks.json').write_text(json.dumps(checks,indent=2))
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
 if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
 if os.environ.get('HTTPS_PROXY'):launch['proxy']={'server':os.environ['HTTPS_PROXY'],'bypass':'127.0.0.1,localhost'}
 browser=p.chromium.launch(**launch);context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,service_workers='block')
 context.route('**/npm/@supabase/supabase-js@*/+esm',lambda r:r.fulfill(content_type='text/javascript',headers={'Access-Control-Allow-Origin':'*'},body="export function createClient(){throw Error('Recap review cannot access a database')}"))
 context.route('https://sleepercdn.com/**',lambda r:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()))
 context.route('**/recap-review.html',lambda r:r.fulfill(content_type='text/html',body=html))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR: '+str(e),flush=True)));page.goto(base+'recap-review.html');page.wait_for_function('window.reviewReady',timeout=60000)
 sheet=page.locator('.gd-moment-recap');active=sheet.locator('.moment-recap-frame[data-recap-index]:visible')
 def opened():
  page.locator('#open').click();page.wait_for_function('document.querySelector(".gd-moment-recap").open');page.wait_for_timeout(260)
 def closed():
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".gd-moment-recap[open]")');page.wait_for_function('document.activeElement.id==="open"')
 for mode in ['light','dark']:
  page.evaluate('window.reviewTheme',mode)
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844});opened()
   check(f'{mode}/{width} full teams and historical scores',all(text in active.inner_text() for text in ['The Bayou Bombers','Klutch Sports Group','110.45','112.10']))
   check(f'{mode}/{width} bounded sheet and controls',sheet.evaluate('e=>{const b=e.getBoundingClientRect();return b.left>=11&&b.right<=innerWidth-11&&b.top>=0&&b.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth&&[...e.querySelectorAll("footer button")].every(n=>n.offsetHeight>=44)}'))
   check(f'{mode}/{width} readable lead contrast',not page.evaluate('window.reviewContrast().failures'))
   page.screenshot(path=str(OUT/f'{mode}-{width}-lead.png'))
   sheet.locator('[data-recap-next]').click();page.wait_for_timeout(320)
   check(f'{mode}/{width} exact saved before/after swing',all(text in active.text_content() for text in ['Ja’Marr Chase','+8.12','16.71','24.83','Points added']))
   check(f'{mode}/{width} live region carries the actual moment',all(text in sheet.locator('[data-recap-announcement]').text_content() for text in ['Moment 2 of 4','Points added','+8.12']))
   page.wait_for_function('document.querySelector(".moment-recap-frame:not([hidden]) img").naturalWidth>0')
   check(f'{mode}/{width} loaded prominent portrait',active.locator('.dfl-player-portrait').evaluate('e=>e.getBoundingClientRect().width>=112&&e.querySelector("img").naturalWidth>0'))
   check(f'{mode}/{width} portrait stays clear of scores and names',active.evaluate('e=>{const p=e.querySelector(".dfl-player-portrait").getBoundingClientRect(),i=e.querySelector(".dfl-player-portrait img").getBoundingClientRect(),s=e.querySelector(".moment-recap-stat").getBoundingClientRect(),n=e.querySelector("h3").getBoundingClientRect();return ["left","top","right","bottom"].every(k=>Math.abs(p[k]-i[k])<=2)&&p.right<=s.left&&p.bottom<=n.top}'))
   check(f'{mode}/{width} readable player contrast',not page.evaluate('window.reviewContrast().failures'))
   page.screenshot(path=str(OUT/f'{mode}-{width}-surge.png'))
   sheet.locator('[data-recap-next]').click();page.wait_for_timeout(320)
   check(f'{mode}/{width} factual player total and banter','32.17' in active.inner_text() and 'fuck' in active.inner_text() and 'touchdown' not in active.inner_text().lower())
   sheet.locator('[data-recap-next]').click();check('ending retains working replay',sheet.locator('[data-recap-next]').is_disabled() and sheet.locator('[data-recap-play]').text_content()=='Replay')
   sheet.locator('[data-recap-play]').click();sheet.locator('[data-recap-play]').click();check('replay returns to first saved event',sheet.locator('.moment-recap-count').inner_text()=='1 of 4');closed()
 page.evaluate("window.reviewTheme('dark')");page.set_viewport_size({'width':390,'height':844});opened();touch=context.new_cdp_session(page)
 def swipe(dx,dy=0,end=True):
  b=active.bounding_box();x=b['x']+b['width']*(.8 if dx<0 else .2);y=max(b['y']+40,min(b['y']+b['height']*.45,650))
  touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for step in range(1,7):
   touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*step/6,'y':y+dy*step/6}]});page.wait_for_timeout(16)
  if end:touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 swipe(-150,end=False)
 check('reel follows finger with the next real frame',active.evaluate('e=>e.dataset.uiSwipeSettling==="true"&&Math.abs(new DOMMatrixReadOnly(getComputedStyle(e).transform).m41)>30') and sheet.locator('.dfl-tab-preview').count()==1)
 touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(330)
 check('swipe commits and releases copies',sheet.locator('.moment-recap-count').inner_text()=='2 of 4' and sheet.locator('.dfl-tab-preview,.dfl-tab-grab,[data-ui-swipe-settling]').count()==0)
 swipe(150);page.wait_for_timeout(330);check('reverse swipe returns to earlier event',sheet.locator('.moment-recap-count').inner_text()=='1 of 4')
 swipe(150);page.wait_for_timeout(260);check('first frame does not wrap',sheet.locator('.moment-recap-count').inner_text()=='1 of 4')
 swipe(0,90);check('vertical scroll does not change frame',sheet.locator('.moment-recap-count').inner_text()=='1 of 4')
 swipe(-150);sheet.locator('[data-recap-back]').click();page.wait_for_timeout(330)
 check('button interrupts settling without leftover layers',sheet.locator('.moment-recap-count').inner_text()=='1 of 4' and sheet.locator('.dfl-tab-preview,.dfl-tab-grab,[data-ui-swipe-settling]').count()==0)
 sheet.locator('[data-recap-go="2"]').click();page.wait_for_timeout(320);check('progress segments navigate directly',sheet.locator('.moment-recap-count').inner_text()=='3 of 4')
 closed();opened();b=sheet.locator('header').bounding_box();x=b['x']+65;y=b['y']+35
 touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for dy in [20,60,100,150]:
  touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+dy}]});page.wait_for_timeout(20)
 check('recap header follows a dismissal drag',sheet.get_attribute('data-sheet-moving')=='true')
 touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_function('!document.querySelector(".gd-moment-recap[open]")');check('drag dismissal returns focus',page.locator('#open').evaluate('e=>e===document.activeElement'))
 page.set_viewport_size({'width':320,'height':480});opened();sheet.locator('[data-recap-next]').click();page.wait_for_timeout(320)
 check('short phone keeps controls fixed and content scrollable',sheet.evaluate('e=>{const d=e.querySelector(".moment-recap-deck"),f=e.querySelector("footer").getBoundingClientRect();return d.scrollHeight>d.clientHeight&&f.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth}'))
 page.screenshot(path=str(OUT/'dark-320-short.png'));closed();page.set_viewport_size({'width':320,'height':844})
 context.route('**/players/thumb/missing.jpg',lambda r:r.abort())
 page.evaluate('window.originalItems=window.items;document.documentElement.dataset.readability="comfortable";window.items=Array.from({length:12},(_,i)=>({...window.originalItems[1],key:String(i+10),at:window.originalItems[1].at+i*1000,player:{id:"missing",name:"An Exceptionally Long Player Name For The Phone Screen",position:"WR",nflTeam:"CIN"}}))')
 opened();page.wait_for_function('!document.querySelector(".moment-recap-frame:not([hidden]) .dfl-player-portrait img")')
 check('bounded nine-frame reel with accessible progress targets',sheet.locator('.moment-recap-count').inner_text()=='1 of 9' and sheet.locator('[data-recap-go]').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().width>=24&&e.getBoundingClientRect().height>=24)'))
 check('failed photos and large text retain a readable frame',active.locator('.dfl-player-portrait i').is_visible() and sheet.evaluate('e=>e.scrollWidth<=e.clientWidth') and active.locator('h3').evaluate('e=>e.scrollWidth<=e.clientWidth'))
 page.screenshot(path=str(OUT/'dark-320-comfortable-fallback.png'));closed();page.evaluate('window.items=window.originalItems;document.documentElement.dataset.readability="compact"');page.set_viewport_size({'width':390,'height':844})
 page.evaluate('window.motion=false;document.documentElement.dataset.uiMotion="off"');opened()
 check('motion off has no moving sheet or frames',sheet.evaluate('e=>e.getAnimations({subtree:true}).length===0'));sheet.locator('[data-recap-next]').click();check('motion off retains static navigation',sheet.locator('.moment-recap-count').inner_text()=='2 of 4' and sheet.evaluate('e=>e.getAnimations({subtree:true}).length===0'));closed()
 page.evaluate('window.motion=true;document.documentElement.dataset.uiMotion="on"');page.emulate_media(reduced_motion='reduce');opened();check('reduced motion keeps recap still',sheet.evaluate('e=>e.getAnimations({subtree:true}).length===0'));closed();page.emulate_media(reduced_motion='no-preference')
 page.clock.install();opened();sheet.locator('[data-recap-play]').click();page.clock.fast_forward(4600);check('play advances one saved event',sheet.locator('.moment-recap-count').inner_text()=='2 of 4');sheet.locator('[data-recap-play]').click();page.clock.fast_forward(5000);check('pause stops automatic advancement',sheet.locator('.moment-recap-count').inner_text()=='2 of 4')
 sheet.locator('[data-recap-play]').click();page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))');page.clock.fast_forward(5000);check('backgrounding pauses the recap',sheet.locator('.moment-recap-count').inner_text()=='2 of 4');page.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');page.clock.resume();closed()
 opened();sheet.locator('[data-recap-play]').click();page.evaluate('window.recap.stop()');page.wait_for_timeout(300);check('teardown removes sheet and previews',page.locator('.gd-moment-recap,.dfl-tab-preview,.dfl-tab-grab').count()==0)
 check('no browser errors',not errors);browser.close();server.shutdown()
