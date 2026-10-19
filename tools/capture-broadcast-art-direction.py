"""Mobile production broadcast layouts with fixture-only league stories."""
import json,os,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?',1)[0].lstrip('/');file=OUT/'index.html' if not path else ROOT/path
  if not file.is_file():self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.woff':'font/woff'}.get(file.suffix,'application/octet-stream'));self.end_headers();self.wfile.write(file.read_bytes())
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:'+str(server.server_port)+'/');page.wait_for_function('!!window.reviewDeck');page.evaluate('document.fonts.ready')
 page.evaluate('''async()=>{
  reviewStage.stop();typeof reviewPageMotion==='function'?reviewPageMotion():reviewPageMotion?.stop?.();reviewInjuryPanel?.stop();reviewWeekFlow?.stop();reviewVfx?.stop();
  const {renderStage,startStage}=await import('./js/broadcast-stage.js');
  const original=reviewDeck,champ=original.find(s=>s.treatment==='champion'&&s.variant!=='chip'),chip=original.find(s=>s.treatment==='champion'&&s.variant==='chip'),injury=original.find(s=>s.treatment==='injuries');
  const packages=[{teamName:'The Very Long Championship Bayou Bombers',players:[{id:'7547',name:'Amon-Ra St. Brown',position:'WR',nflTeam:'DET'},{id:'1466',name:'Travis Kelce',position:'TE',nflTeam:'KC'}]},{teamName:'Klutch Sports Group',players:[{id:'3198',name:'Derrick Henry',position:'RB',nflTeam:'BAL'},{id:'8137',name:'George Pickens',position:'WR',nflTeam:'DAL'},{id:'2449',name:'Stefon Diggs',position:'WR',nflTeam:'WAS'}]},{teamName:'Monday Night Mayhem',players:[{id:'2216',name:'Mike Evans',position:'WR',nflTeam:'SF'},{id:'12527',name:'Ashton Jeanty',position:'RB',nflTeam:'LV'}]}];
  const trade={id:'review-deal',key:'review-deal',kind:'trade',treatment:'stat',kicker:'2026 · WEEK 6',figure:78,href:'#/trade?tx=review',tradeStory:{packages,outcome:{displayGrade:'Value edge'},balanceLabel:'group balance'}};
  window.artDeck=[{...champ,key:'champ',headline:'The Bayou Bombers'},{...chip,key:'chip',headline:'Monday Night Mayhem'},injury,trade,{...trade,key:'two-team',tradeStory:{...trade.tradeStory,packages:packages.slice(0,2)}},{key:'rivalry',kind:'fact',treatment:'announcement',storyKind:'rivalry',headline:'The rematch',kicker:'DFL RIVALRIES',figure:12,storyNames:['The Bayou Bombers','Klutch Sports Group'],storySeries:'7–5',href:'#/history'}];
  const view=document.querySelector('#view');view.innerHTML='<div id="home-wrap"><div class="home-frontpage"><div class="home-broadcast"></div></div></div>';
  document.querySelector('.home-broadcast').innerHTML=renderStage(artDeck,{editorial:true});
  window.artStage=startStage(document.querySelector('[data-bx-stage]'),artDeck);artStage.suspend('art-review',true);scrollTo(0,0);
 }''')
 for mode in ['light','dark']:
  for width in [320,390,768]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('mode=>reviewSetTheme(mode)',mode)
   for i,kind in enumerate(['champion','chip','injury','trade-three','trade-two','rivalry']):
    page.locator(f'[data-bx-go="{i}"]').evaluate('e=>e.click()');page.wait_for_timeout(500)
    slide=page.locator('.bx-layer>.bx-slide').last
    metrics=slide.evaluate('''e=>{
     const rect=e.getBoundingClientRect(),transport=e.closest('.bx-stage').querySelector('.bx-controls').getBoundingClientRect();
     const elements=[...e.querySelectorAll('h2,.bx-award-copy,.bx-editorial-illustration,.bx-trade-side,.injury-player,.bx-rivalry-pair')].filter(n=>n.getClientRects().length);
     const within=elements.every(n=>{const r=n.getBoundingClientRect();return r.left>=rect.left-1&&r.right<=rect.right+1&&r.bottom<=transport.top+1});
     const copy=e.querySelector('.bx-award-copy')?.getBoundingClientRect(),art=e.querySelector('.bx-editorial-illustration')?.getBoundingClientRect();
     const overlap=copy&&art&&copy.left<art.right-1&&art.left<copy.right-1&&copy.top<art.bottom-1&&art.top<copy.bottom-1;
     return {overflow:document.documentElement.scrollWidth>innerWidth+1,within,overlap:!!overlap,parties:e.querySelectorAll('.bx-trade-side').length};
    }''')
    assert not metrics['overflow'] and metrics['within'] and not metrics['overlap'],(mode,width,kind,metrics)
    if kind=='trade-three':assert metrics['parties']==3
    page.screenshot(path=str(OUT/f'art-{mode}-{width}-{kind}.png'));checks.append({'mode':mode,'width':width,'kind':kind,**metrics})
 page.emulate_media(reduced_motion='reduce');page.locator('[data-bx-go="3"]').evaluate('e=>e.click()');page.wait_for_timeout(60)
 assert page.locator('.bx-layer').evaluate('e=>e.getAnimations({subtree:true}).filter(a=>a.playState==="running").length')==0
 checks.append('reduced motion renders complete stories immediately');page.evaluate('artStage.stop()');assert not errors,errors
 browser.close()
server.shutdown();(OUT/'art-checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2));print(json.dumps({'layouts':len(checks)-1,'errors':errors}))
