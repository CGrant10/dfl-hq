"""Production finish/story components; isolated data, no league writes."""
import json,os,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FIXTURE=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'))
OUT=Path(os.environ.get('DFL_FINISH_REVIEW_DIR',ROOT.parent/'dfl-finish-stories'));OUT.mkdir(parents=True,exist_ok=True)
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
 context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=2)
 context.route('https://**/*',lambda r:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()) if 'sleepercdn.com/' in r.request.url else r.abort())
 def page_ready():
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded');page.wait_for_function('window.reviewDeck');page.evaluate('document.fonts.ready')
  page.evaluate("reviewStage.stop();reviewPageMotion();reviewInjuryPanel?.stop();reviewWeekFlow?.stop();reviewVfx?.stop()")
  return page
 page=page_ready()
 page.evaluate('''async()=>{
  const {finishRacers,officialFinish}=await import('./js/arena/finish-model.js'),{mountFinishPresentation}=await import('./js/arena/finish-presentation.js');
  const link=document.createElement('link');link.rel='stylesheet';link.href='css/stadium-arena.css';document.head.append(link);await new Promise(r=>link.onload=r);
  window.showFinish=count=>{
   window.finishController?.stop();
   const members=Array.from({length:count},(_,i)=>({id:i+1,display_name:i===1?'Christopher Verylonglastname':'DFL Racer '+(i+1),team_name:i===1?'The Longest Team Name In The Entire League':'Team '+(i+1)}));
   const snapshot={event:{bc_state:'finished',status:'complete'},participants:members.map((m,i)=>({member_id:m.id,number:i+1})),racer_kits:[{member_id:1,kit:{jersey:'#bb2038',helmet:'#ffffff',pants:'#26303b',number:17}},{member_id:2,kit:{jersey:'#ffb612',helmet:'#ffb612',pants:'#26303b',number:25,preset:'pokemon:pikachu'}}],results:members.map((m,i)=>({member_id:m.id,place:i+1,finish_ms:58500+i*123}))};
   window.finishModel=officialFinish(snapshot.event,snapshot.results,finishRacers(snapshot,members));
   const view=document.querySelector('#view');view.dataset.route='arena';view.innerHTML='<section class="stadium-arena"><header class="sr-title"><h1>DFL Stadium Dash</h1></header><section class="sr-final" aria-label="Official race results"></section></section>';
   window.finishController=mountFinishPresentation(view.querySelector('.sr-final'),finishModel,{motion:()=>window.finishMotion!==false});scrollTo(0,0);finishController.reveal();
  };
 }''')
 for theme in ['light','dark']:
  for width in [320,390,430,768]:
   for count in [2,12,32]:
    page.set_viewport_size({'width':width,'height':844});page.evaluate('m=>reviewSetTheme(m)',theme);page.evaluate('n=>showFinish(n)',count);page.wait_for_timeout(120)
    page.wait_for_function("document.querySelector('.sr-final').getAnimations({subtree:true}).every(a=>a.playState!=='running')")
    metrics=page.evaluate('''()=>{const host=document.querySelector('.sr-final'),box=host.getBoundingClientRect();const visible=[...host.querySelectorAll('.sr-podium-identity,.sr-finish-name,.sr-finish-time')];return {overflow:document.documentElement.scrollWidth>innerWidth,contained:visible.every(n=>{const r=n.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right&&n.scrollWidth<=n.clientWidth+1}),order:[...host.querySelectorAll('[data-finish-racer]')].map(n=>n.dataset.finishRacer),number:host.querySelector('.sr-podium-place[data-place="1"] .sr-jersey').textContent,completeNames:host.textContent.includes('Christopher Verylonglastname'),settled:host.getAnimations({subtree:true}).every(a=>a.playState!=='running')}}''')
    assert not metrics['overflow'] and metrics['contained'] and metrics['completeNames'] and metrics['settled'],(theme,width,count,metrics)
    assert metrics['order']==list(map(str,range(1,count+1))) and metrics['number']=='1'
    if width in [320,390] and count==12:page.screenshot(path=str(OUT/f'finish-{theme}-{width}.png'))
    checks.append({'theme':theme,'width':width,'racers':count,**metrics})
 for preference in ['off','reduce']:
  page.evaluate("document.documentElement.dataset.uiMotion='off'" if preference=='off' else "document.documentElement.dataset.uiMotion='on'")
  page.emulate_media(reduced_motion='reduce' if preference=='reduce' else 'no-preference');page.evaluate('showFinish(12)');page.wait_for_timeout(100)
  assert page.locator('.sr-final').evaluate('n=>n.getAnimations({subtree:true}).length===0'),(preference,page.locator('.sr-final').evaluate('n=>n.getAnimations({subtree:true}).map(a=>({target:a.effect.target.className,name:a.animationName,state:a.playState}))'))
  assert page.locator('[data-finish-racer]').count()==12
  checks.append({'motionPreference':preference,'immediateResult':True})
 page.emulate_media(reduced_motion='no-preference');page.evaluate("document.documentElement.dataset.uiMotion='on';showFinish(12);finishController.reveal();finishController.stop()")
 assert page.locator('.sr-final').evaluate('n=>n.getAnimations({subtree:true}).length===0');checks.append({'revealTeardown':True})
 page.evaluate("showFinish(12);finishController.reveal();document.documentElement.dataset.uiMotion='off';dispatchEvent(new Event('dfl:ui-motion-change'))")
 assert page.locator('.sr-final').evaluate('n=>n.getAnimations({subtree:true}).length===0');checks.append({'midRevealMotionOff':True})
 page.close();page=page_ready()
 page.evaluate('''async()=>{
  const {homeLeagueStory}=await import('./js/home-lead-story.js'),{renderStage,startStage}=await import('./js/broadcast-stage.js');
  const g=(a,b,high=130,low=90)=>({winner:{uid:a,name:a==='a'?'The Bayou Bombers':'Klutch Sports Group',value:high},loser:{uid:b,name:b==='b'?'The Bastards of the Very Long Championship Team Name':'Fourth & Fuck It',value:low}});
  const report={final:true,season:2026,week:5,games:[g('a','b'),g('c','d',115,95)]},row=(week,a='a',b='b',score1=120,score2=90)=>({season:2026,week,user1:a,user2:b,score1,score2});
  window.storySlides=[homeLeagueStory(report,{season:2026,week:6,history:[row(3),row(4)]}),homeLeagueStory(report,{season:2026,week:6,history:[row(1,'a','b',80,100),row(2,'a','b',90,110),row(4,'a','b',95,120)]}),homeLeagueStory(report,{season:2026,week:6,history:[1,2,3,4].flatMap(w=>[row(w,'a','b',100,95),row(w,'c','d',105,99)])})];
  window.showStory=index=>{window.storyStage?.stop();const host=document.querySelector('.home-broadcast'),deck=[reviewDeck[0],storySlides[index]];host.innerHTML=renderStage(deck,{editorial:true});window.storyStage=startStage(host.querySelector('[data-bx-stage]'),deck);storyStage.suspend('review',true);host.querySelector('[data-bx-go="1"]').click();host.scrollIntoView({block:'start'});};
 }''')
 for theme in ['light','dark']:
  for width in [320,390,430]:
   for index,kind in enumerate(['losing-run','revenge','season-high']):
    page.set_viewport_size({'width':width,'height':844});page.evaluate('m=>reviewSetTheme(m)',theme);page.evaluate('i=>showStory(i)',index);page.wait_for_timeout(400)
    metrics=page.locator('.bx-layer>.bx-slide').last.evaluate('''n=>{const r=n.getBoundingClientRect(),control=n.closest('.bx-stage').querySelector('.bx-controls').getBoundingClientRect(),parts=[...n.querySelectorAll('.bx-head,.bx-stat-metric,.bx-result-scores,.bx-story-action')],h=n.querySelector('.bx-head').getBoundingClientRect(),m=n.querySelector('.bx-stat-metric').getBoundingClientRect();return {within:parts.every(p=>{const b=p.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&b.bottom<=control.top+1}),separate:h.bottom<=m.top,subject:n.querySelectorAll('[data-story-subject]').length,rows:n.querySelectorAll('.bx-result-scores>div').length,overflow:document.documentElement.scrollWidth>innerWidth}}''')
    assert metrics['within'] and metrics['separate'] and metrics['subject']==1 and metrics['rows']==2 and not metrics['overflow'],(theme,width,kind,metrics)
    if width in [320,390]:page.screenshot(path=str(OUT/f'story-{theme}-{width}-{kind}.png'))
    checks.append({'theme':theme,'width':width,'story':kind,**metrics})
 page.evaluate('storyStage.stop()');context.close();browser.close()
server.shutdown();assert not errors,errors
(OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2));print(json.dumps({'cases':len(checks),'errors':errors}))
