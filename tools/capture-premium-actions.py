"""Production quick actions and actual video export with isolated, read-only data."""
import os,json,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_PREMIUM_REVIEW_DIR',ROOT.parent/'dfl-premium-review'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('</head>')[0]+'</head>'
html=head+'''<body><main id="view" class="view" data-pulse-system="1" style="padding:16px"><h1>Player actions</h1><div data-player-fixture></div><button id="bare-action" type="button">Open matchup</button><div role="tablist" data-ui-rail><button role="tab" aria-selected="true" id="stable-tab">This week</button></div><button type="button" id="finish">Share finish</button><div style="height:1600px"></div></main><script type="module">
import {mountPlayerCards} from './js/player-card-actions.js';import {playerIdentity} from './js/player-presentation.js';import {startUiMotion} from './js/ui-motion.js';import {saveMode} from './js/theme.js';import {openReplayShare,recordReplay,createReplayCanvas} from './js/arena/replay-share.js';import {buildStadiumRace} from './js/arena/stadium-model.js';import {finishRacers} from './js/arena/finish-model.js';import {replayShareModel} from './js/arena/replay-share-model.js';
document.querySelector('[data-player-fixture]').innerHTML=playerIdentity({id:'7564',name:'Ja’Marr Chase',position:'WR',nflTeam:'CIN',injuryStatus:'Healthy'},{interactive:true});mountPlayerCards();startUiMotion();window.theme=saveMode;window.clicks=0;document.querySelector('#bare-action').onclick=()=>clicks++;
window.setupRace=(count=12)=>{const members=Array.from({length:count},(_,i)=>({id:i+1,display_name:['Cody Grant','Kirk Franklin','Marcus Williams','David Jefferson','Brandon Thomas','Nathan Lewis','Chris Brown','Andrew Martin','Tyler James','Matt Robertson','Alex Johnson','Jesse Peterson'][i%12]+(i>=12?' II':''),team_name:'DFL team '+(i+1)}));window.racers=finishRacers({participants:members.map(m=>({member_id:m.id}))},members);window.raceEvent={id:999,name:'2026 Draft Order',bc_state:'finished',status:'complete'};window.race=buildStadiumRace(racers,{engine:'stadium-v1',seed:2407,presentation_version:2,order:racers.map(r=>r.id).reverse()},60000);window.results=race.paths.map(p=>({member_id:p.id,place:p.place,finish_ms:p.finishMs}));};setupRace();window.openFinish=()=>openReplayShare({event:raceEvent,results,racers,race,source:document.querySelector('#finish'),motion:()=>document.documentElement.dataset.uiMotion!=='off'});document.querySelector('#finish').onclick=openFinish;
window.testAbort=async()=>{const surface=createReplayCanvas(replayShareModel(raceEvent,results,racers,race));await surface.ready;const abort=new AbortController();const before=MediaStreamTrack.prototype.stop;let stops=0;MediaStreamTrack.prototype.stop=function(){stops++;return before.call(this)};const pending=recordReplay(surface,{signal:abort.signal});abort.abort();let canceled=false;try{await pending}catch(e){canceled=e.name==='AbortError'}surface.stop();MediaStreamTrack.prototype.stop=before;return {canceled,stops}};window.ready=true;</script></body></html>'''
model={'player':{'id':'7564','name':'Ja’Marr Chase','position':'WR','nflTeam':'CIN'},'myRosterId':1,'owner':{'id':2}}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_GET(self):
  path=self.path.split('?')[0];body=None
  if path=='/review.html':body=html
  elif path=='/js/player-card-data.js':body='export async function loadPlayerCard(){window.cardLoads=(window.cardLoads||0)+1;return '+json.dumps(model)+'}'
  elif path=='/js/supabase.js':body="export const db=()=>({rpc:async()=>({error:null})});"
  elif path=='/js/members.js':body="export const currentMember=()=>({id:1,sleeper_user_id:'fixture'});"
  elif path=='/js/player-card.js':body="export function openPlayerCard(selection,{source}){window.cardOpens=(window.cardOpens||0)+1;window.cardSource=source;window.cardSelection=selection}"
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/html' if path.endswith('html') else 'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
checks=[];errors=[]
def check(name,ok=True):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']}
 if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
 browser=p.chromium.launch(**launch)
 for theme in ['light','dark']:
  for width in [320,390]:
   context=browser.new_context(viewport={'width':width,'height':844},has_touch=True,is_mobile=True,service_workers='block',accept_downloads=True)
   context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()) if 'sleepercdn.com' in r.request.url else r.abort())
   page=context.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR '+str(e),flush=True)));page.goto(base+'/review.html');page.wait_for_function('window.ready');page.evaluate('document.fonts.ready');page.evaluate('window.theme',theme);tag=f'{theme}/{width}'
   check(tag+' no per-row data load before opening',page.evaluate('(window.cardLoads||0)===0'))
   touch=context.new_cdp_session(page);portrait=page.locator('.dfl-player-portrait').first;box=portrait.bounding_box();x=box['x']+15;y=box['y']+15
   def start():touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   start();touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-40}]});page.wait_for_timeout(500);touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(100)
   check(tag+' scrolling a portrait does not open a menu',page.locator('.player-quick-menu[open]').count()==0)
   page.evaluate('scrollTo(0,0)');box=portrait.bounding_box();x=box['x']+15;y=box['y']+15;start();page.wait_for_timeout(520);touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_selector('.player-quick-menu[open]');page.wait_for_timeout(260)
   menu=page.locator('.player-quick-menu');check(tag+' hold opens a compact menu without opening the card',page.evaluate('(window.cardOpens||0)===0') and menu.bounding_box()['height']<440)
   check(tag+' correct trade target and official generic Sleeper link',menu.locator('[data-trade]').get_attribute('href')=='#/trade?team=1&target=7564&partner=2' and menu.locator('a[target]').get_attribute('href')=='https://sleeperbot.app.link/esEa7TDlJN')
   check(tag+' all actions fit and have 44px touch targets',menu.evaluate('e=>e.getBoundingClientRect().left>=0&&e.getBoundingClientRect().right<=innerWidth&&[...e.querySelectorAll("button,nav a")].filter(b=>!b.hidden).every(b=>b.getBoundingClientRect().height>=44)'))
   if width==390:page.screenshot(path=str(OUT/f'quick-{theme}-{width}.png'))
   if theme=='dark' and width==390:page.locator('[data-player-card]').evaluate('e=>e.replaceWith(e.cloneNode(true))')
   menu.locator('[data-view]').click();page.wait_for_function('window.cardOpens===1');check(tag+' View player uses the original source exactly once',page.evaluate('cardSource===document.querySelector("[data-player-card]")&&cardSelection.id==="7564"'))
   page.locator('[data-player-quick]').focus();page.keyboard.press('Enter');page.wait_for_selector('.player-quick-menu[open]');page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".player-quick-menu")');check(tag+' explicit keyboard button returns focus',page.locator('[data-player-quick]').evaluate('e=>document.activeElement===e'))
   button=page.locator('#bare-action');box=button.bounding_box();xx=box['x']+20;yy=box['y']+20
   touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':xx,'y':yy}]});page.wait_for_timeout(120)
   check(tag+' previously unstyled buttons get immediate touch feedback',button.get_attribute('data-ui-pressed')=='true' and .98<float(button.evaluate('e=>getComputedStyle(e).scale'))<1)
   touch.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});page.wait_for_timeout(200);check(tag+' cancellation releases without submitting',button.get_attribute('data-ui-pressed') is None and page.evaluate('clicks===0'))
   page.locator('#finish').click();page.wait_for_selector('.sr-replay-share[open]');page.wait_for_timeout(500)
   share=page.locator('.sr-replay-share');check(tag+' finish image has a full-size, exportable canvas',share.locator('canvas').evaluate('e=>e.width===960&&e.height>600&&e.toDataURL().startsWith("data:image/png")'))
   check(tag+' preview stays within mobile bounds',share.evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height<=innerHeight-16}'))
   if width==390:page.screenshot(path=str(OUT/f'finish-{theme}-{width}.png'))
   if theme=='dark' and width==390:
    with page.expect_download() as download:share.locator('[data-save-media]').click()
    download.value.save_as(str(OUT/'official-finish.png'));check('actual PNG downloads with the correct filename',download.value.suggested_filename=='dfl-arena-999.png')
    share.locator('[data-create-clip]').click();page.wait_for_function('document.querySelector(".sr-replay-share video").src.startsWith("blob:")',timeout=18000)
    check('real recorder produces a playable clip',share.locator('video').evaluate('e=>new Promise(resolve=>{if(e.readyState>=1)resolve(e.videoWidth===960);else e.onloadedmetadata=()=>resolve(e.videoWidth===960)})'))
    with page.expect_download() as download:share.locator('[data-save-media]').click()
    clip=OUT/('finish-clip'+Path(download.value.suggested_filename).suffix);download.value.save_as(str(clip));check('actual clip download has video data',clip.stat().st_size>20000 and download.value.suggested_filename.endswith(('.webm','.mp4')))
    page.screenshot(path=str(OUT/'clip-dark-390.png'))
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".sr-replay-share")');check(tag+' closing restores focus and removes the preview',page.locator('#finish').evaluate('e=>document.activeElement===e'))
   context.close()
 context=browser.new_context(viewport={'width':390,'height':844},service_workers='block');context.route('https://sleepercdn.com/**',lambda r:r.abort());page=context.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR '+str(e),flush=True)));page.goto(base+'/review.html');page.wait_for_function('ready');page.evaluate('document.fonts.ready')
 aborted=page.evaluate('testAbort()');check('canceling recording stops capture tracks',aborted['canceled'] and aborted['stops']>=1)
 page.evaluate('setupRace(32);void openFinish()');page.wait_for_selector('.sr-replay-share[open]');page.wait_for_timeout(600);page.screenshot(path=str(OUT/'finish-32.png'));check('32 racers produce a complete export without narrowing the field',page.locator('.sr-replay-share canvas').evaluate('e=>e.width===960&&e.height>=1900'))
 page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".sr-replay-share")');page.evaluate('MediaRecorder=undefined;setupRace();void openFinish()');page.wait_for_selector('.sr-replay-share[open]');check('unsupported video keeps image and result sharing',not page.locator('[data-create-clip]').is_visible() and page.locator('[data-save-media]').is_enabled());page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".sr-replay-share")')
 page.evaluate('document.documentElement.dataset.uiMotion="off";void openFinish()');check('motion off keeps a static preview',not page.locator('[data-create-clip]').is_visible());page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".sr-replay-share")');context.close()
 browser.close();server.shutdown()
check('no browser errors or database writes',not errors)
