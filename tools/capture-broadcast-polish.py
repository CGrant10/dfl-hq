"""Actual Home renderers with isolated league fixtures; no backend writes."""
import json, os, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
FIXTURE=Path(os.environ.get('DFL_REVIEW_DIR','/tmp/dfl-broadcast-1504'))
OUT=Path(os.environ.get('DFL_POLISH_REVIEW_DIR','/tmp/dfl-polish-1504'))
OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  name=path.split('?',1)[0].lstrip('/')
  return str(FIXTURE/'index.html' if name in ['', 'index.html'] else ROOT/name)
 def log_message(self,*args): pass

server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
checks=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block')
 def route(r):
  if r.request.url.startswith(url): return r.continue_()
  if 'sleepercdn.com/' in r.request.url: return r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())
  return r.abort()
 context.route('**/*',route)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(url);page.wait_for_function('!!window.reviewStage');page.evaluate('document.fonts.ready')
 page.evaluate('''async()=>{
  const {renderStage,startStage}=await import('/js/broadcast-stage.js');
  reviewStage.stop();window.polishRender=renderStage;window.polishStart=startStage;
  document.querySelector('.home-broadcast').innerHTML=renderStage(reviewDeck,{editorial:true,wide:true});
  window.reviewStage=startStage(document.querySelector('[data-bx-stage]'),reviewDeck);reviewStage.suspend('polish-review',true);
 }''')
 for mode in ['light','dark']:
  for width in [320,390,768]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('mode=>reviewSetTheme(mode)',mode);page.wait_for_timeout(300)
   page.locator('[data-bx-go="0"]').evaluate('n=>n.click()');page.wait_for_timeout(450)
   page.evaluate('document.activeElement?.blur();scrollTo(0,0)');page.wait_for_timeout(100)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   if width==390:page.screenshot(path=str(OUT/f'home-{mode}.png'))
   nav=page.locator('.home-newspaper-sections');nav.scroll_into_view_if_needed();page.wait_for_timeout(100)
   contrast=nav.evaluate('e=>reviewTextContrast(e)')
   assert contrast['checked']==5 and not contrast['failures'],(mode,width,contrast)
   assert nav.locator('button').evaluate_all('ns=>ns.every(n=>n.getBoundingClientRect().height>=44&&getComputedStyle(n).opacity==="1")')
   nav.locator('button').first.focus();assert nav.locator('button').first.evaluate('n=>n.matches(":focus-visible")')
   page.screenshot(path=str(OUT/f'sections-{mode}-{width}.png'))
   checks.append({'theme':mode,'width':width,'sectionContrast':contrast['minimum'],'keyboardFocus':True})
  # Larger system text must preserve full award names and separate art zones.
  page.set_viewport_size({'width':320,'height':844})
  page.evaluate('''()=>{
   reviewStage.stop();document.documentElement.style.fontSize='20px';
   window.polishLong=[{treatment:'champion',kicker:'2025 · League champion',headline:'The Bastards of the Very Long Championship Team Name'},reviewDeck[0]];
   document.querySelector('.home-broadcast').innerHTML=polishRender(polishLong,{editorial:true,wide:true});
   window.reviewStage=polishStart(document.querySelector('[data-bx-stage]'),polishLong);reviewStage.suspend('polish-review',true);
  }''')
  stage=page.locator('[data-bx-stage]');stage.scroll_into_view_if_needed();page.wait_for_timeout(450)
  assert stage.locator('.bx-brief-award').evaluate('''e=>{const a=e.querySelector('h2').getBoundingClientRect(),b=e.querySelector('.bx-brief-art').getBoundingClientRect(),f=e.querySelector('.bx-brief-action').getBoundingClientRect(),r=e.getBoundingClientRect();return a.right<=b.left+1&&f.bottom<=r.bottom+1&&e.querySelector('h2').scrollWidth<=e.querySelector('h2').clientWidth+1}''')
  stage.screenshot(path=str(OUT/f'large-text-award-{mode}.png'))
  page.evaluate("document.documentElement.style.fontSize=''")
  # Motion off also disables the new reveal and progress; keyboard still works.
  page.evaluate("document.documentElement.dataset.uiMotion='off'")
  pause=stage.locator('[data-bx-pause]');pause.focus();page.keyboard.press('Space');page.wait_for_timeout(80)
  assert pause.get_attribute('aria-label')=='Play the broadcast'
  page.evaluate('''()=>{
   reviewStage.stop();document.querySelector('.home-broadcast').innerHTML=polishRender(reviewDeck,{editorial:true,wide:true});
   window.reviewStage=polishStart(document.querySelector('[data-bx-stage]'),reviewDeck);reviewStage.suspend('polish-review',true);
  }''')
  stage.locator('[data-bx-go="1"]').evaluate('e=>e.click()');page.wait_for_timeout(100)
  assert stage.locator('.bx-layer>.bx-slide:not(.bx-leaving)').evaluate('e=>e.getAnimations({subtree:true}).filter(a=>a.playState==="running").length')==0
  page.evaluate("delete document.documentElement.dataset.uiMotion")
  checks.append({'theme':mode,'largeText':True,'motionOff':True,'pauseKeyboard':True})
 assert not errors,errors
 page.evaluate('reviewStage.stop()');browser.close()
server.shutdown()
(OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
print(json.dumps({'cases':len(checks),'errors':errors,'screenshots':str(OUT)}))
