"""Real Home scoreboard: compositor/fallback paths, viewport changes and frame work."""
import json,os,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FIXTURE=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'))
OUT=Path(os.environ.get('DFL_SCORE_REVIEW_DIR',ROOT.parent/'dfl-score-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?',1)[0].lstrip('/');file=FIXTURE/'index.html' if not path else ROOT/path
  if not file.is_file():self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'}.get(file.suffix,'application/octet-stream'));self.end_headers();self.wfile.write(file.read_bytes())
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--no-proxy-server'])
 for driver in ['native','fallback']:
  context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=2)
  if driver=='fallback':context.add_init_script('window.ViewTimeline=undefined')
  context.route('https://**/*',lambda r:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()) if 'sleepercdn.com/' in r.request.url else r.abort())
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded');page.wait_for_function('window.reviewDeck');page.evaluate('document.fonts.ready');page.evaluate("reviewStage.suspend('score-review',true);document.querySelectorAll('.gameday-matchup .gameday-faceoff-mark').forEach(n=>{n.classList.remove('has-photo');n.innerHTML='<img src=\"tools/fixtures/player-portrait.png\" alt=\"\">'})");page.wait_for_function("[...document.querySelectorAll('.gameday-matchup .gameday-faceoff-mark img')].every(n=>n.complete&&n.naturalWidth>0)")
  page.evaluate("document.querySelectorAll('.gameday-matchup .gameday-faceoff-mark').forEach(n=>n.classList.add('has-photo'))");page.wait_for_function("document.querySelectorAll('.home-score-moving.has-photo').length===2")
  for mode in ['light','dark']:
   for width in [320,390,430]:
    page.set_viewport_size({'width':width,'height':844});page.evaluate('mode=>reviewSetTheme(mode)',mode);page.evaluate('scrollTo(0,0)');page.wait_for_timeout(100)
    assert page.locator('.home-score-flight').get_attribute('data-scroll-driver')==driver,driver+' path was not exercised'
    limits=page.evaluate("""()=>{const s=document.querySelector('.gameday-matchup').getBoundingClientRect(),top=document.querySelector('.topbar').getBoundingClientRect().bottom;return {start:s.top+scrollY-top-104,span:Math.max(96,s.height-24),height:document.documentElement.scrollHeight}}""")
    for t in [0,.03,.25,.5,.75,.97,1.03,.5,0]:
     page.evaluate('({l,t})=>scrollTo(0,Math.max(0,l.start+l.span*t))',{'l':limits,'t':t});page.wait_for_timeout(75)
     result=page.evaluate("""()=>{const source=document.querySelector('.gameday-matchup'),box=source.getBoundingClientRect(),top=document.querySelector('.topbar').getBoundingClientRect().bottom,t=Math.max(0,Math.min(1,(top+104-box.top)/Math.max(96,box.height-24))),p=t*t*t*(t*(t*6-15)+10),dock=document.querySelector('.home-score-dock'),names=[...document.querySelectorAll('[data-dock-name]')];return {t,p,opacity:Number(getComputedStyle(dock).opacity),overflow:document.documentElement.scrollWidth>innerWidth,completeNames:names.every(n=>n.textContent&&n.scrollWidth<=n.clientWidth+1),sameFont:[...source.querySelectorAll('.home-projected-total,.gd-thermal-value')].every((n,i)=>getComputedStyle(n).fontFamily===getComputedStyle(document.querySelectorAll('[data-dock-score]')[i]).fontFamily),separated:[...document.querySelectorAll('.home-score-moving-name')].every((n,i)=>{if(Number(getComputedStyle(n).opacity)<.6)return true;const a=n.getBoundingClientRect(),b=document.querySelectorAll('.home-score-moving[data-motion-kind=mark]')[i].getBoundingClientRect();return i===0?b.right<=a.left+1:a.right<=b.left+1}),copies:[...document.querySelectorAll('.home-score-moving')].length,hiddenCopies:[...document.querySelectorAll('.home-score-moving')].every(n=>Number(getComputedStyle(n).opacity)<.001)}}""")
     assert abs(result['opacity']-result['p'])<.012 and not result['overflow'] and result['completeNames'] and result['sameFont'] and result['separated'],(driver,mode,width,t,result)
     if result['t'] in [0,1]:assert result['hiddenCopies'],(driver,mode,width,t,'copies flashed at endpoint')
     if width in [320,390] and t in [.5,1.03]:page.screenshot(path=str(OUT/f'{driver}-{mode}-{width}-{"flight" if t==.5 else "dock"}.png'))
    # Browser toolbar changes height while the viewport width stays the same.
    page.evaluate('l=>scrollTo(0,l.start+l.span*.5)',limits);page.wait_for_timeout(100)
    page.evaluate("window.scoreNodes=[...document.querySelectorAll('.home-score-moving')]")
    opacity=page.locator('.home-score-dock').evaluate('n=>Number(getComputedStyle(n).opacity)')
    page.set_viewport_size({'width':width,'height':740});page.wait_for_timeout(120)
    assert page.evaluate("scoreNodes.length===6&&scoreNodes.every(n=>n.isConnected)"),(driver,mode,width,'height-only viewport change restarted flight')
    assert abs(page.locator('.home-score-dock').evaluate('n=>Number(getComputedStyle(n).opacity)')-opacity)<.005,'Viewport height changed the timeline position'
    page.set_viewport_size({'width':width,'height':844});page.wait_for_timeout(100)
    # Preserve the original document flow at every handoff.
    assert page.evaluate('document.documentElement.scrollHeight')==limits['height']
    checks.append({'driver':driver,'mode':mode,'width':width,'handoffs':True,'heightResize':True})
  # Instrument only after setup. Native drawing must not write flight transforms;
  # neither path may measure source geometry during a reversing scroll.
  page.evaluate("""()=>{window.sourceReads=0;window.flightWrites=0;const read=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){if(this.matches('.gameday-matchup'))sourceReads++;return read.call(this)};window.flightObserver=new MutationObserver(rs=>flightWrites+=rs.filter(r=>r.attributeName==='style').length);flightObserver.observe(document.querySelector('.home-score-flight'),{subtree:true,attributes:true})}""")
  work=page.evaluate("""async()=>{const source=document.querySelector('.gameday-matchup'),r=source.getBoundingClientRect(),start=r.top+scrollY-148,span=Math.max(96,r.height-24);sourceReads=0;const nodes=[...document.querySelectorAll('.home-score-moving')];for(const t of [...Array.from({length:60},(_,i)=>i/59),...Array.from({length:60},(_,i)=>1-i/59)]){scrollTo(0,Math.max(0,start+span*t));await new Promise(requestAnimationFrame)}await new Promise(requestAnimationFrame);flightObserver.disconnect();return {sourceReads,flightWrites,stable:nodes.every(n=>n.isConnected)}}""")
  assert work['sourceReads']==0 and work['stable'],(driver,work)
  if driver=='native':assert work['flightWrites']==0,work
  checks.append({'driver':driver,'scrollFrames':120,**work})
  page.evaluate("window.noisyScoreNodes=[...document.querySelectorAll('.home-score-moving')];const badge=document.createElement('span');badge.className='gd-score-delta';badge.textContent='+6.20';document.querySelector('.home-team-total').append(badge);window.scoreTestFreshness=document.createElement('p');scoreTestFreshness.dataset.gamedayFreshness='';document.querySelector('[data-home-gameday-slot]').append(scoreTestFreshness);scoreTestFreshness.textContent='Checked just now'")
  page.wait_for_timeout(100);page.evaluate("document.querySelector('.gd-score-delta').remove();scoreTestFreshness.remove()");page.wait_for_timeout(100)
  assert page.evaluate('noisyScoreNodes.length===6&&noisyScoreNodes.every(n=>n.isConnected)'),driver+' score feedback restarted flight'
  # Real vertical touch input and inertia under a slower main thread.
  cdp=context.new_cdp_session(page);cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
  page.evaluate('scrollTo(0,0)');page.wait_for_timeout(150);page.evaluate("window.touchScoreNodes=[...document.querySelectorAll('.home-score-moving')]")
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':190,'y':570}]})
  for i in range(1,9):
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':190,'y':570-18*i}]});page.wait_for_timeout(20)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(500)
  assert page.evaluate('scrollY>30&&touchScoreNodes.length===6&&touchScoreNodes.every(n=>n.isConnected)'),driver+' touch gesture restarted or blocked score motion'
  cdp.send('Emulation.setCPUThrottlingRate',{'rate':1});checks.append({'driver':driver,'touchFlingAt4xCpu':True})
  page.evaluate("window.testScoreDialog=document.createElement('dialog');testScoreDialog.textContent='Isolated modal';document.querySelector('#view').append(testScoreDialog);testScoreDialog.showModal()")
  page.wait_for_function('document.querySelector(".home-score-dock").hidden')
  assert page.locator('.home-score-moving').count()==0,'Modal left moving copies above its backdrop'
  page.evaluate('testScoreDialog.close();testScoreDialog.remove()');page.wait_for_function('document.querySelectorAll(".home-score-moving").length===6')
  # A live score and long current name must refresh the actual compact bar.
  page.evaluate("document.querySelector('.gameday-matchup .gd-thermal-value,.gameday-matchup .home-projected-total').textContent='131.22';document.querySelector('.home-team-name strong').textContent='Bayou Bombers Reloaded'")
  page.wait_for_function("document.querySelector('[data-dock-name]').textContent==='Bayou Bombers Reloaded'&&document.querySelector('[data-dock-score]').textContent==='131.22'")
  page.evaluate("document.documentElement.dataset.uiMotion='off';dispatchEvent(new Event('dfl:ui-motion-change'))");page.wait_for_timeout(80)
  assert page.locator('.home-score-moving').count()==0
  page.evaluate("()=>{const s=document.querySelector('.gameday-matchup').getBoundingClientRect();scrollTo(0,s.top+scrollY-148+Math.max(96,s.height-24)*.5)}");page.wait_for_timeout(100)
  assert page.locator('.home-score-dock').evaluate("n=>n.inert&&getComputedStyle(n).opacity==='0'"),'Motion-off leaves an invisible focus target'
  assert page.locator('.gameday-faceoff-team').evaluate_all('ns=>ns.every(n=>Number(getComputedStyle(n).opacity)===1)')
  page.evaluate("document.documentElement.dataset.uiMotion='on';dispatchEvent(new Event('dfl:ui-motion-change'))");page.wait_for_timeout(80)
  page.emulate_media(reduced_motion='reduce');page.wait_for_function('!document.querySelector(\".home-score-moving\")',timeout=5000)
  page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(80)
  page.evaluate('reviewPageMotion()');assert page.locator('.home-score-flight,.home-score-dock').count()==0
  context.close()
 assert not errors,errors
 browser.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2));print(json.dumps({'cases':len(checks),'errors':errors}))
