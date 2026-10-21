"""Shared production motion with real touch input; isolated data, no league writes."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'tools/capture-tab-review.py'
scope={'__file__':str(source),'__name__':'motion_quality_tabs'}
exec(compile(source.read_text().split('with sync_playwright() as p:')[0],str(source),'exec'),scope)
OUT=Path(os.environ.get('DFL_MOTION_REVIEW_DIR',scope['OUT']/'motion'));OUT.mkdir(parents=True,exist_ok=True)
checks=[];measurements=[];errors=[]
def check(label,ok=True):
 checks.append({'check':label,'pass':bool(ok)})
 assert ok,label
 print('PASS '+label,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--no-proxy-server'])
 for width in [320,390,768]:
  for theme in ['dark','light']:
   context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
   context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{scope["server"].server_port}/',wait_until='domcontentloaded');page.wait_for_function('window.tabReviewReady');page.evaluate('document.fonts.ready')
   page.add_style_tag(url=f'http://127.0.0.1:{scope["server"].server_port}/css/trade-intentions.css')
   page.evaluate('''theme=>{reviewSetTheme(theme);const root=document.querySelector('#view');root.insertAdjacentHTML('beforeend',`<section id=motion-quality style="min-height:360px;padding:20px 0"><h2>Interaction check</h2><div id=hist-tabs class=tabs><button aria-selected=true>Week</button><button aria-selected=false>Matchups</button><button aria-selected=false>Records</button></div><div id=hist-body style="height:90px">Read-only motion fixture</div><button type=button class=btn id=press-action>Open matchup</button><dialog class=ti-dialog id=press-dialog><form style="padding:18px"><h2>Trade intentions</h2><button type=button class=btn id=dialog-action>Save intentions</button></form></dialog></section>`);window.actionCount=0;document.querySelector('#press-action').onclick=()=>actionCount++;document.querySelector('#dialog-action').onclick=()=>actionCount++;document.querySelector('#hist-tabs').onclick=e=>{if(e.target.tagName==='BUTTON')document.querySelectorAll('#hist-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b===e.target)))}}''',theme)
   page.locator('#motion-quality').evaluate('e=>e.scrollIntoView({block:"center"})');page.wait_for_timeout(300)
   result=page.evaluate('''async()=>{const rail=document.querySelector('#hist-tabs .dfl-selection-rail'),buttons=[...document.querySelectorAll('#hist-tabs>button')];let jumps=[];for(const [to,next] of [[1,2],[0,2],[1,0]]){buttons[to].click();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const a=rail.getAnimations()[0];if(!a)throw Error('Missing tab glide');a.pause();a.currentTime=90;const before=rail.getBoundingClientRect();buttons[next].click();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const b=rail.getAnimations()[0];b.pause();b.currentTime=0;const after=rail.getBoundingClientRect();jumps.push({position:Math.abs(before.left-after.left),width:Math.abs(before.width-after.width)});b.finish();await new Promise(requestAnimationFrame)}return jumps}''')
   measurements.append({'width':width,'theme':theme,'interruptedRail':result})
   check(f'{width} {theme}: interrupted tab glides keep the visible position and width',all(r['position']<.6 and r['width']<.6 for r in result))
   touch=context.new_cdp_session(page)
   def press(selector):
    node=page.locator(selector);node.evaluate('e=>e.scrollIntoView({block:"center"})');page.wait_for_timeout(80);box=node.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
    touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});page.wait_for_timeout(120)
    scale=node.evaluate('e=>parseFloat(getComputedStyle(e).scale)||1')
    touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(200)
    return scale
   baseline=page.locator('#press-action').evaluate('e=>({width:e.offsetWidth,top:e.offsetTop})')
   scale=press('#press-action')

   check(f'{width} {theme}: touch press responds and releases once',.98<scale<.995 and page.evaluate('actionCount===1') and page.locator('#press-action').evaluate('e=>getComputedStyle(e).scale==="1"'))
   check(f'{width} {theme}: press leaves document layout unchanged',page.locator('#press-action').evaluate('e=>({width:e.offsetWidth,top:e.offsetTop})')==baseline)
   # Cancellation and vertical scrolling must release feedback without clicks.
   node=page.locator('#press-action');box=node.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
   touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});page.wait_for_timeout(120)
   touch.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});page.wait_for_timeout(200)
   check(f'{width} {theme}: cancelled touches release without firing',node.get_attribute('data-ui-pressed') is None and page.evaluate('actionCount===1'))
   touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});page.wait_for_timeout(80)
   touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-80}]});touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(250)
   check(f'{width} {theme}: scrolling over an action neither sticks nor clicks',node.get_attribute('data-ui-pressed') is None and page.evaluate('actionCount===1'))
   page.locator('#press-action').evaluate('e=>e.disabled=true');scale=press('#press-action')
   check(f'{width} {theme}: disabled actions never fire or shrink',scale==1 and page.evaluate('actionCount===1'))
   page.locator('#press-action').evaluate('e=>{e.disabled=false;e.focus()}');page.keyboard.press('Space')
   check(f'{width} {theme}: keyboard activation fires once',page.evaluate('actionCount===2'))
   # Arena is intentionally outside generic page entrances; action feedback
   # must still work there without animating the race scene itself.
   page.evaluate("document.querySelector('#view').removeAttribute('data-ui-polished')");scale=press('#press-action')
   check(f'{width} {theme}: unpolished Arena-style actions keep the same press',.98<scale<.995)
   page.evaluate("document.querySelector('#view').dataset.uiPolished='1';document.querySelector('#press-dialog').showModal()")
   scale=press('#dialog-action');check(f'{width} {theme}: native popup actions share press timing',.98<scale<.995)
   check(f'{width} {theme}: popup primary action retains its readable foreground after touch',page.locator('#dialog-action').evaluate('''e=>{const probe=document.createElement('span');probe.style.color='var(--action-ink)';e.parentElement.append(probe);const expected=getComputedStyle(probe).color;probe.remove();return getComputedStyle(e).color===expected}'''))
   page.screenshot(path=str(OUT/f'popup-{width}-{theme}.png'))
   page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(80);scale=press('#dialog-action')
   check(f'{width} {theme}: reduced motion keeps popup controls still',scale==1)
   page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(80);page.evaluate("document.documentElement.dataset.uiMotion='off';dispatchEvent(new Event('dfl:ui-motion-change'))");scale=press('#dialog-action')
   check(f'{width} {theme}: app motion off keeps popup controls still',scale==1)
   page.evaluate("document.querySelector('#press-dialog').close();window.stopTabReview()")
   check(f'{width} {theme}: teardown removes tab effects',page.locator('.dfl-selection-rail,.dfl-scroll-cue,[data-ui-swipe-host]').count()==0)
   check(f'{width} {theme}: document stays inside screen edges',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   context.close()
 browser.close()
scope['server'].shutdown()
# Reuse the production scoreboard/header fixture for stable scroll metadata.
source=ROOT/'tools/capture-scroll-review.py';scope={'__file__':str(source),'__name__':'motion_quality_scroll'}
exec(compile(source.read_text().split('checks=[];errors=[]')[0],str(source),'exec'),scope)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--no-proxy-server'])
 page=browser.new_page(viewport={'width':390,'height':844},has_touch=True);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{scope["server"].server_port}/');page.wait_for_function('window.ready');page.evaluate('document.fonts.ready')
 for route in ['home','trade']:
  page.evaluate('r=>fixture(r)',route);page.wait_for_timeout(300)
  page.evaluate('scrollTo(0,450)');page.wait_for_timeout(500)
  sample=page.evaluate('''async()=>{let changes={};const observer=new MutationObserver(rs=>{for(const r of rs)changes[r.attributeName]=(changes[r.attributeName]||0)+1});observer.observe(document.querySelector('#view'),{subtree:true,attributes:true});for(let i=0;i<60;i++){scrollTo(0,420+(i%30)*3);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)}observer.disconnect();return changes}''')
  measurements.append({'route':route,'scrollFrames':60,'attributeChanges':sample})
  check(f'{route}: scroll frames do not rewrite unchanged accessible labels',sample.get('aria-label',0)==0 and sample.get('aria-hidden',0)==0)
  check(f'{route}: scroll frames do not rewrite unchanged visibility',sample.get('hidden',0)==0)
 page.evaluate('stopFixture()');check('scroll teardown removes fixed surfaces',page.locator('.home-score-dock,.dfl-scroll-context,.home-score-flight').count()==0)
 browser.close()
scope['server'].shutdown();check('No browser exceptions',not errors)
(OUT/'checks.json').write_text(json.dumps({'checks':checks,'measurements':measurements,'errors':errors},indent=2))
print(json.dumps({'checks':len(checks),'passed':sum(r['pass'] for r in checks),'output':str(OUT)}))
