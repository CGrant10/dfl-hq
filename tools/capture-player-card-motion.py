from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
ROOT=Path(__file__).resolve().parents[1]
out=Path(os.environ.get('DFL_SHEET_REVIEW_DIR',ROOT.parent/'dfl-sheets-review'))
out.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_port)+'/'
results=[]
def check(name,ok):
 assert ok,name
 results.append(name);print('PASS '+name,flush=True);(out/'browser-checks.json').write_text(json.dumps(results,indent=2))
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']}
 if os.environ.get('HTTPS_PROXY'):launch['proxy']={'server':os.environ['HTTPS_PROXY'],'bypass':'127.0.0.1,localhost'}
 if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
 browser=p.chromium.launch(**launch)
 context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,service_workers='block')
 context.route('**/npm/@supabase/supabase-js@*/+esm',lambda r:r.fulfill(content_type='text/javascript',headers={'Access-Control-Allow-Origin':'*'},body="export function createClient(){throw Error('Sheet fixture cannot access a database')}"))
 context.route('https://sleepercdn.com/**',lambda r:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()))
 context.route('**/sheet-review.html',lambda r:r.fulfill(content_type='text/html',body=(out/'index.html').read_text().replace('http://127.0.0.1:8765/',base)))
 model={'player':{'id':'7564','name':'Ja’Marr Chase','position':'WR','nflTeam':'CIN'},'leagueId':'1286077564572037120','season':2026,'week':6,'points':29,'state':'final','injury':{'tag':'Healthy','availability':'Available','body':''},'owner':None,'ownerLabel':'Fixture team','myRosterId':1,'recent':[{'week':4,'points':12},{'week':5,'points':22},{'week':6,'points':29}],'stats':{'items':[{'label':'Stat '+str(n),'value':n} for n in range(30)],'updatedAt':None}}
 context.route('**/js/player-card-data.js',lambda r:r.fulfill(content_type='text/javascript',body='export async function loadPlayerCard(){window.cardCalls=(window.cardCalls||0)+1;if(window.cardHold)await new Promise(r=>window.releaseCard=r);if(window.cardFail)throw Error("Fixture refresh unavailable");return '+json.dumps(model)+'}'))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'sheet-review.html');
 try:page.wait_for_function('window.reviewReady',timeout=60000)
 except Exception:
  print('Startup errors:',errors,flush=True);raise

 for width in [320,390]:
  for theme in ['light','dark']:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('window.reviewTheme',theme)
   page.evaluate("()=>{const source=document.querySelector('[data-review-player]');Object.assign(source.style,{position:'fixed',left:'20px',top:'180px'});Object.assign(source.querySelector('.dfl-player-portrait').style,{display:'block',width:'36px',height:'36px'});Object.assign(source.querySelector('img').style,{width:'36px',height:'36px'});window.cardHold=true;window.releaseCard=null;void window.openReviewPlayer()}")
   page.wait_for_function('!!window.releaseCard&&!!document.querySelector(".dfl-connected-portrait")')
   state=page.evaluate("()=>{const d=document.querySelector('.dfl-player-card'),p=document.querySelector('.dfl-connected-portrait'),a=p.getAnimations()[0];a.pause();a.currentTime=100;return {stage:d.dataset.playerCardStage,opacity:getComputedStyle(d).opacity,boxMotion:d.getAnimations().length,photo:!!p.querySelector('img')?.naturalWidth}}")
   check(f'{theme}/{width} loaded portrait moves before the panel with held data',state['stage']=='portrait' and state['opacity']=='0' and state['boxMotion']==0 and state['photo'])
   page.screenshot(path=str(out/f'portrait-first-{theme}-{width}.png'))
   page.evaluate('document.querySelector(".dfl-connected-portrait").getAnimations()[0].play()');page.wait_for_function('document.querySelector(".dfl-player-card").dataset.playerCardStage==="card"')
   first=page.evaluate("()=>{const d=document.querySelector('.dfl-player-card'),a=d.getAnimations()[0];a.pause();a.currentTime=100;return document.querySelector('.dfl-connected-portrait').getBoundingClientRect().toJSON()}")
   page.screenshot(path=str(out/f'panel-expand-{theme}-{width}.png'))
   page.evaluate('window.cardHold=false;window.releaseCard()');page.wait_for_selector('.player-card-hero .player-card-owner')
   state=page.evaluate("()=>{const d=document.querySelector('.dfl-player-card'),p=document.querySelector('.dfl-connected-portrait');return {overlay:p.getBoundingClientRect().toJSON(),target:d.querySelector('.dfl-player-portrait').getBoundingClientRect().toJSON(),clip:d.getAnimations()[0].effect.getKeyframes().map(f=>f.clipPath),opacity:getComputedStyle(d).opacity}}")
   check(f'{theme}/{width} panel expands after arrival while the portrait stays fixed',all(abs(first[k]-state['overlay'][k])<1 and abs(first[k]-state['target'][k])<1 for k in ['x','y','width','height']) and state['opacity']=='1' and len(state['clip'])==2)
   page.evaluate('document.querySelector(".dfl-player-card").getAnimations().forEach(a=>a.play())');page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")')
   check(f'{theme}/{width} complete card has no leftover mask or hidden portrait',page.evaluate('getComputedStyle(document.querySelector(".dfl-player-card")).clipPath==="none"&&getComputedStyle(document.querySelector(".player-card-hero .dfl-player-portrait")).visibility==="visible"'))
   page.screenshot(path=str(out/f'portrait-open-{theme}-{width}.png'))
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")')
 # Cancel before the box is revealed, then reopen before its queued close event.
 page.evaluate('window.cardHold=true;void window.openReviewPlayer()');page.wait_for_selector('.dfl-connected-portrait')
 page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")');page.evaluate('window.cardHold=false;window.releaseCard()')
 check('early dismissal cannot reveal or reopen the panel',page.locator('dialog[open]').count()==0)
 page.evaluate('void window.openReviewPlayer()');page.wait_for_selector('.dfl-connected-portrait');page.evaluate('dispatchEvent(new Event("resize"))');page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")')
 check('resize settles into a usable static card',page.locator('.dfl-player-card').evaluate('e=>e.open&&getComputedStyle(e).opacity==="1"'));page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open]")')
 # Reopening in the same task ignores the previous native close event.
 page.evaluate('()=>{void window.openReviewPlayer()}');page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")')
 page.evaluate("()=>{const d=document.querySelector('.dfl-player-card');d.close();void window.openReviewPlayer()}");page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")')
 check('a queued close event cannot cancel a fresh opening',page.locator('.dfl-player-card').evaluate('e=>e.open&&getComputedStyle(e).opacity==="1"'))
 page.locator('[data-player-card-body]').evaluate('e=>e.scrollTop=100');page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")')
 page.evaluate('void window.openReviewPlayer()');page.wait_for_selector('.dfl-connected-portrait')
 check('reopening scrolled stats still moves the photo before the card',page.locator('.dfl-player-card').evaluate('e=>e.dataset.playerCardStage==="portrait"&&getComputedStyle(e).opacity==="0"'))
 page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")')
 for preference in ['off','reduce']:
  page.evaluate('window.reviewMotion', 'off' if preference=='off' else 'on');page.emulate_media(reduced_motion='reduce' if preference=='reduce' else 'no-preference');page.evaluate('void window.openReviewPlayer()');page.wait_for_selector('.player-card-hero .player-card-owner')
  check(preference+' immediately shows the card without a portrait flight',page.locator('.dfl-connected-portrait').count()==0 and page.locator('.dfl-player-card').evaluate('e=>getComputedStyle(e).opacity==="1"'))
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open]")')
 (out/'player-card-motion-checks.json').write_text(json.dumps(results,indent=2))
 check('no browser errors',not errors);browser.close();server.shutdown()
