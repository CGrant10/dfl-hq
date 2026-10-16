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
 context.route('https://sleepercdn.com/**',lambda r:r.fulfill(content_type='image/webp',body=(ROOT/'assets/dfl-daily-champion.webp').read_bytes()))
 context.route('**/sheet-review.html',lambda r:r.fulfill(content_type='text/html',body=(out/'index.html').read_text().replace('http://127.0.0.1:8765/',base)))
 model={'player':{'id':'7564','name':'Ja’Marr Chase','position':'WR','nflTeam':'CIN'},'season':2026,'week':6,'points':29,'state':'final','injury':{'tag':'Healthy','availability':'Available','body':''},'owner':None,'ownerLabel':'Fixture team','myRosterId':1,'recent':[{'week':4,'points':12},{'week':5,'points':22},{'week':6,'points':29}],'stats':{'items':[{'label':'Stat '+str(n),'value':n} for n in range(30)],'updatedAt':None}}
 context.route('**/js/player-card-data.js',lambda r:r.fulfill(content_type='text/javascript',body='export async function loadPlayerCard(){if(window.cardHold)await new Promise(r=>window.releaseCard=r);return '+json.dumps(model)+'}'))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'sheet-review.html');
 try:page.wait_for_function('window.reviewReady',timeout=60000)
 except Exception:
  print('Startup errors:',errors,flush=True);raise
 touch=context.new_cdp_session(page)
 def wait_clean():page.wait_for_function('!document.querySelector("[data-sheet-moving]")',timeout=5000)
 def open_sheet(kind):
  page.evaluate('window.openReview'+kind+'()');page.wait_for_selector('dialog[open]');page.wait_for_timeout(350)
  if kind=='Player':page.wait_for_selector('.player-card-hero');page.wait_for_timeout(250)
  return page.locator('dialog[open]').last
 def pull(sheet,dy,hold=70,end=True):
  handle=sheet.locator('[data-sheet-handle]');box=handle.bounding_box();x=box['x']+20;y=box['y']+15
  touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for n in range(1,5):touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+dy*n/4}]});page.wait_for_timeout(hold)
  page.wait_for_timeout(40)
  if end:touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 for kind in ['Player','Slip']:
  for mode in ['light','dark','medicine']:
   page.evaluate('window.reviewTheme',mode)
   for width in [320,390,600]:
    page.set_viewport_size({'width':width,'height':844});sheet=open_sheet(kind)
    box=sheet.bounding_box();check(kind+' '+mode+' '+str(width)+' mobile bounds',abs(box['width']-min(480,width-24))<1 and box['x']>=11 and box['x']+box['width']<=width-11 and abs(box['y']+box['height']-(844-12))<2)
    check(kind+' '+mode+' '+str(width)+' clear handle and close target',sheet.locator('.dfl-sheet-grip').is_visible() and sheet.locator('button').first.bounding_box()['height']>=44)
    if width==390:page.screenshot(path=str(out/(kind.lower()+'-'+mode+'.png')))
    sheet.locator('[data-player-card-close]' if kind=='Player' else '[data-close]').click();page.wait_for_function('!document.querySelector("dialog[open]")')
  page.set_viewport_size({'width':390,'height':844});sheet=open_sheet(kind)
  body=sheet.locator('[data-player-card-body]' if kind=='Player' else '.sb-slip-content')
  if kind=='Player':body.evaluate('e=>e.scrollTop=180');check('player content scrolls independently',body.evaluate('e=>e.scrollTop')>0)
  else:
   sheet.locator('input[name=stake]').fill('123');check('stake input retains typed amount',sheet.locator('input').input_value()=='123')
  scroll=body.evaluate('e=>e.scrollTop');pull(sheet,28,end=False)
  check(kind+' follows a short pull',sheet.evaluate('e=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(e).transform).m42-28)<2'))
  check(kind+' backdrop follows pull',sheet.evaluate('e=>Number(getComputedStyle(e,"::backdrop").opacity)<1'))
  touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});wait_clean()
  check(kind+' short pull settles without dismissing or changing content scroll',sheet.is_visible() and body.evaluate('e=>e.scrollTop')==scroll)
  pull(sheet,150)
  check(kind+' exit starts at the dragged frame and reaches offscreen',sheet.evaluate('e=>{const a=e.getAnimations().find(a=>a.effect.getKeyframes().some(f=>Number(f.opacity)===0)),frames=a?.effect.getKeyframes();if(!frames)return !e.open;const start=new DOMMatrixReadOnly(frames[0].transform).m42,end=new DOMMatrixReadOnly(frames.at(-1).transform).m42,current=new DOMMatrixReadOnly(getComputedStyle(e).transform).m42;return Math.abs(start-150)<2&&e.getBoundingClientRect().top-current+end>=innerHeight}'))
  page.wait_for_function('!document.querySelector("dialog[open]")')
  check(kind+' long pull closes and cleans up',page.locator('[data-sheet-moving]').count()==0)
  if kind=='Player':check('player dismissal returns focus',page.locator('[data-review-player]').evaluate('e=>document.activeElement===e'))
  else:
   sheet=open_sheet(kind);check('reopened slip preserves stake and both picks',sheet.locator('input').input_value()=='123' and sheet.locator('.sb-slip-pick').count()==2)
   sheet.locator('[data-close]').click();page.wait_for_function('!document.querySelector("dialog[open]")')
 for kind in ['Player','Slip']:
  sheet=open_sheet(kind);pull(sheet,90,end=False);touch.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});wait_clean();check(kind+' cancellation returns instead of dismissing',sheet.is_visible())
  page.emulate_media(reduced_motion='reduce');pull(sheet,150);page.wait_for_function('!document.querySelector("dialog[open]")');check(kind+' reduced motion still supports dismissal',page.locator('[data-sheet-moving]').count()==0)
  page.emulate_media(reduced_motion='no-preference')
 # Actual viewport math under a keyboard and a panned visible viewport.
 for kind in ['Player','Slip']:
  page.evaluate("""()=>{window.savedViewport=Object.getOwnPropertyDescriptor(window,'visualViewport');const v=new EventTarget();v.height=400;v.offsetTop=80;Object.defineProperty(window,'visualViewport',{configurable:true,value:v})}""")
  sheet=open_sheet(kind);box=sheet.bounding_box()
  check(kind+' stays inside keyboard viewport',box['y']>=80 and box['y']+box['height']<=480-11)
  pull(sheet,90,end=False);page.evaluate('window.visualViewport.height=420;window.visualViewport.dispatchEvent(new Event("resize"));window.dispatchEvent(new Event("resize"))')
  touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});wait_clean()
  check(kind+' viewport change cancels the drag safely',sheet.is_visible())
  sheet.locator('[data-player-card-close]' if kind=='Player' else '[data-close]').click();page.wait_for_function('!document.querySelector("dialog[open]")')
  page.evaluate("()=>{if(window.savedViewport)Object.defineProperty(window,'visualViewport',window.savedViewport);else delete window.visualViewport}")
 # Header gesture cannot take a vertical scroll from the player body.
 sheet=open_sheet('Player');body=sheet.locator('[data-player-card-body]');body.evaluate('e=>e.scrollTop=60');box=body.bounding_box();x=box['x']+box['width']/2;y=box['y']+120
 touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for n in range(1,5):touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-25*n}]});page.wait_for_timeout(30)
 touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(150)
 check('body gesture scrolls stats without dragging or dismissing',body.evaluate('e=>e.scrollTop')>60 and sheet.is_visible() and sheet.get_attribute('data-sheet-moving') is None)
 sheet.locator('[data-player-card-close]').click();page.wait_for_function('!document.querySelector("dialog[open]")')
 # Motion-off keeps all native controls and dismissal available.
 page.evaluate('window.reviewMotion("off")');sheet=open_sheet('Slip');pull(sheet,150);page.wait_for_function('!document.querySelector("dialog[open]")');check('motion off still dismisses without leaving transforms',page.locator('[data-sheet-moving]').count()==0);page.evaluate('window.reviewMotion("on")')
 sheet=open_sheet('Slip');sheet.locator('input').fill('211');sheet.locator('[data-close]').click();page.wait_for_function('!document.querySelector("dialog[open]")');page.evaluate('window.memberId="another-fixture-member"');sheet=open_sheet('Slip');check('stake draft is cleared for a different member',sheet.locator('input').input_value()=='50');sheet.locator('[data-close]').click();page.wait_for_function('!document.querySelector("dialog[open]")')
 page.evaluate('window.cardHold=true');page.evaluate('void window.openReviewPlayer()');page.wait_for_function('!!window.releaseCard');sheet=page.locator('.dfl-player-card');pull(sheet,150);page.wait_for_function('!document.querySelector("dialog[open]")');page.evaluate('window.cardHold=false;window.releaseCard()');page.wait_for_timeout(300)
 check('late player data cannot reopen dismissed card',page.locator('dialog[open]').count()==0)
 # Interrupt an actual portrait flight and verify its return begins there.
 page.evaluate('''window.reviewMotion("on");const source=document.querySelector('[data-review-player]');Object.assign(source.style,{position:'fixed',left:'20px',top:'180px'});Object.assign(source.querySelector('.dfl-player-portrait').style,{display:'block',width:'36px',height:'36px'});Object.assign(source.querySelector('img').style,{width:'36px',height:'36px'});scrollTo(0,0);void window.openReviewPlayer()''')
 origin=page.wait_for_function("""()=>{const e=document.querySelector('.dfl-connected-portrait'),a=e?.getAnimations()[0];if(!a)return false;a.pause();a.currentTime=110;return e.getBoundingClientRect().toJSON()}""").json_value()
 page.keyboard.press('Escape')
 returned=page.evaluate("""()=>{const e=document.querySelector('.dfl-connected-portrait'),a=e.getAnimations()[0];a.pause();a.currentTime=0;const box=e.getBoundingClientRect().toJSON();a.play();return box}""")
 check('interrupted player return continues from the visible portrait',all(abs(origin[k]-returned[k])<1 for k in ['x','y','width','height']))
 page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")')
 sheet=open_sheet('Player')
 check('unchanged player sync retains score node and body position',page.evaluate("""async()=>{const{updatePlayerCard}=await import('./js/player-card.js'),body=document.querySelector('[data-player-card-body]'),score=body.querySelector('.gd-thermal-number');body.scrollTop=80;const y=body.scrollTop;updatePlayerCard({id:'7564',points:29,state:'final',week:6});return score===body.querySelector('.gd-thermal-number')&&body.scrollTop===y}"""))
 page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open]")')
 # A fully rendered refresh anchors the visible row before the next frame.
 anchor=page.evaluate("""async()=>{const{captureRefreshView,restoreRefreshView}=await import('./js/view-memory.js');const host=document.createElement('section');host.style.height='2600px';host.innerHTML='<div data-spacer style="height:700px"></div><button data-player-card="anchor-player">Sample player</button><details id="refresh-open" open><summary>Saved comparison</summary><p>Keep open</p></details>';document.querySelector('#view').append(host);scrollTo(0,host.querySelector('button').getBoundingClientRect().top+scrollY-180);const before=host.querySelector('button').getBoundingClientRect().top,memory=captureRefreshView(host);host.querySelector('[data-spacer]').style.height='940px';host.querySelector('details').open=false;const stop=restoreRefreshView(host,memory);const result={before,after:host.querySelector('button').getBoundingClientRect().top,open:host.querySelector('details').open};stop();host.remove();scrollTo(0,0);return result}""")
 check('refresh preserves visible player and disclosure before repaint',abs(anchor['before']-anchor['after'])<1 and anchor['open'])
 page.evaluate('document.querySelector("#view").dataset.uiPolished="1";document.querySelector("#view").insertAdjacentHTML("beforeend",\'<button type="button" aria-pressed="false" data-press-test>Sample selection</button>\')')
 press=page.locator('[data-press-test]');press.hover();page.mouse.down();page.wait_for_timeout(120)
 check('selection controls share a restrained press',press.evaluate('e=>parseFloat(getComputedStyle(e).scale)<1'))
 page.mouse.up();page.evaluate('window.reviewMotion("off")');press.hover();page.mouse.down();page.wait_for_timeout(120)
 check('motion off keeps selection controls still',press.evaluate('e=>getComputedStyle(e).scale')=='1')
 page.mouse.up();page.locator('[data-press-test]').evaluate('e=>e.remove()');page.evaluate('window.reviewMotion("on")')
 check('no bets or backend writes',page.evaluate('window.rpcCalls')==0)
 check('no browser errors',not errors);browser.close();server.shutdown()
