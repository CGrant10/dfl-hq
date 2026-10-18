"""Check the production Home weekly desk with fixture-only results."""
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'))
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?',1)[0].lstrip('/')
  file=OUT/'index.html' if path in ['', 'index.html'] else ROOT/path
  if not file.is_file(): self.send_error(404);return
  body=file.read_bytes();self.send_response(200)
  self.send_header('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp'}.get(file.suffix,'application/octet-stream'))
  self.end_headers();self.wfile.write(body)
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:'+str(server.server_port)+'/'
checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(url);page.wait_for_function('!!window.reviewWeekFlow');page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
 page.evaluate("""() => {
  const now=Date.now(),side=(name,score,state)=>({name,score,starters:[{state}]});
  const games=[{id:'mine',isMine:true,sides:[side('My team',105,'live'),side('My opponent',100,'live')]},
   {id:'close',sides:[side('The Very Long Bayou Championship Fantasy Football Bombers',111.04,'live'),side('Klutch Sports Group',111,'live')]},
   {id:'second',sides:[side('Dream Enders',99.5,'final'),side('Jack-HAMMER',101,'live')]}];
  window.phaseEditions={
   pregame:{model:{season:2026,week:6,events:[{state:'upcoming',kickoff:now+3600000}],games:[]}},
   live:{model:{season:2026,week:6,live:true,events:[{state:'live',kickoff:now-3600000}],games}},
   final:{model:{season:2026,week:6,completed:true,games}}
  };
 }""")
 order=lambda:page.locator('[data-home-week-flow]').evaluate("e=>[...e.children].map(n=>n.dataset.homeWeekPart)")
 for mode in ['light','dark']:
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('(mode)=>window.reviewSetTheme(mode)',mode)
   for phase in ['pregame','live','final']:
    page.evaluate("(phase)=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});window.reviewApplyWeek(phaseEditions[phase]);}",phase)
    page.wait_for_timeout(100)
    expected={'pregame':['plan','live','recap'],'live':['live','plan','recap'],'final':['recap','live','plan']}[phase]
    assert order()==expected,(phase,order())
    assert page.locator('.home-tuesday-receipt').count()==0,'Recap duplicated inside forecast'
    assert page.locator('[data-home-week-part="plan"]').evaluate('e=>e.open')==(phase=='pregame'),phase
    page.locator('.home-live-details').evaluate("e=>e.open=true")
    desk=page.locator('.home-week-desk')
    desk.evaluate("e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-100,behavior:'instant'})")
    page.wait_for_timeout(80)
    metrics=desk.evaluate("""e=>({overflow:e.scrollWidth>e.clientWidth+1,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
     badNames:[...e.querySelectorAll('.home-league-race strong,.home-receipt-leader h3,.home-receipt-close strong')].filter(n=>n.scrollWidth>n.clientWidth+1).length,
     links:[...e.querySelectorAll('.home-league-race a,.home-receipt-close')].every(n=>n.getAttribute('href').includes('week=6')&&n.getBoundingClientRect().height>=44)})""")
    assert not metrics['overflow'] and not metrics['pageOverflow'] and not metrics['badNames'] and metrics['links'],metrics
    if phase=='live':
     assert page.locator('.home-league-race a').count()==2
     assert 'My team' not in page.locator('.home-league-race').inner_text()
     assert '0.04-point gap' in page.locator('.home-league-race').inner_text()
     assert 'matchup=close' in page.locator('.home-league-race a').first.get_attribute('href')
    if phase=='final':
     assert 'Week 6 receipts' in page.locator('.home-week-receipt').inner_text()
     assert '111.04' in page.locator('.home-week-receipt').inner_text()
    page.screenshot(path=str(OUT/f'week-{mode}-{width}-{phase}.png'))
    checks.append({'mode':mode,'width':width,'phase':phase,**metrics})
 page.evaluate("()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});reviewApplyWeek(phaseEditions.live)}");page.wait_for_timeout(80)
 summary=page.locator('[data-home-week-part="plan"] > summary');summary.focus()
 page.evaluate('reviewWeekFlow.update(phaseEditions.final)');page.wait_for_timeout(80)
 assert order()==['live','plan','recap'],'Moved a focused section'
 assert summary.evaluate('e=>document.activeElement===e'),'Lost keyboard focus'
 page.evaluate("()=>{document.activeElement.blur();scrollTo({top:0,behavior:'instant'});dispatchEvent(new Event('scroll'))}");page.wait_for_timeout(80)
 assert order()==['recap','live','plan'],'Deferred order was not applied at top'
 page.evaluate("()=>{scrollTo({top:0,behavior:'instant'});reviewApplyWeek(phaseEditions.live)}");page.wait_for_timeout(80)
 page.locator('.home-week-desk').evaluate("e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-100,behavior:'instant'})");page.wait_for_timeout(80)
 before=page.evaluate('scrollY');page.evaluate('reviewWeekFlow.update(phaseEditions.final)');page.wait_for_timeout(80)
 assert order()==['live','plan','recap'] and abs(page.evaluate('scrollY')-before)<2,'Phase change moved the reader'
 page.evaluate("scrollTo({top:0,behavior:'instant'})");page.wait_for_timeout(80)
 assert order()==['recap','live','plan']
 page.evaluate('reviewApplyWeek(phaseEditions.pregame)');page.wait_for_timeout(80)
 page.locator('[data-home-week-part="plan"]').evaluate('e=>e.open=false');page.wait_for_timeout(80)
 page.evaluate('reviewApplyWeek(phaseEditions.live)');page.wait_for_timeout(80)
 page.evaluate('reviewApplyWeek(phaseEditions.pregame)');page.wait_for_timeout(80)
 assert page.locator('[data-home-week-part="plan"]').evaluate('e=>!e.open'),'Lost reader preference'
 page.evaluate('reviewWeekFlow.stop();reviewWeekFlow.update(phaseEditions.final);dispatchEvent(new Event("scroll"))');page.wait_for_timeout(80)
 assert order()==['plan','live','recap'],'Stopped controller performed work'
 assert not errors,errors
 print(json.dumps({'homeWeekFlow':checks,'focus':'passed','scrollStability':'passed','preferences':'passed','cleanup':'passed','browserErrors':errors}),flush=True)
 context.close();browser.close()
server.shutdown()
