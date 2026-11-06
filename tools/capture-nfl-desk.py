"""Actual live-game controller with isolated official/league stat fixtures."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_NFL_DESK_DIR','/tmp/dfl-nfl-desk'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'''<style>html{--topbar-h:44px}body{margin:0}.topbar{height:44px}#view{padding:12px 16px;max-width:1080px;margin:0 auto}.topbar>strong{padding:12px 16px;font-size:14px}</style></head><body><header class="topbar"><strong>DFL · NFL live</strong></header><main id="view" class="view" data-route="clubhouse"><section id="feed"></section></main><nav id="tabbar" class="bottomnav" aria-hidden="true" style="position:fixed;bottom:0;left:0;right:0;height:54px"></nav></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  code=html if self.path.startswith('/nfl-desk.html') else "export const configured=()=>false;export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};" if self.path.startswith('/js/supabase.js') else None
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/html' if self.path.startswith('/nfl-desk') else 'text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
checks=[];errors=[]
def check(label,ok):
 checks.append({'check':label,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,label;print('PASS '+label,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block')
 def route(r):
  if r.request.url.startswith(base):return r.continue_()
  if r.request.resource_type=='image':
   code=r.request.url.split('/')[-1].split('.')[0];file=ROOT/'tools/fixtures'/('nfl-'+code+'.png')
   return r.fulfill(content_type='image/png',body=(file if file.is_file() else ROOT/'tools/fixtures/player-portrait.png').read_bytes())
  r.abort()
 c.route('**/*',route)
 pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(base+'/nfl-desk.html',wait_until='domcontentloaded')
 pg.evaluate('''async()=>{
  const {mountNflGameCenter}=await import('/js/nfl-game-center.js');const {startUiMotion}=await import('/js/ui-motion.js');startUiMotion();
  const summary=await(await fetch('/tools/fixtures/nfl-game-center-summary.json')).json();
  const f=window.f={state:'in',summary,players:[{id:'1',name:'Tyler Shough',nflTeam:'NO',position:'QB',points:22,owner:'The Very Long Bayou Championship Bombers',isMine:true},{id:'3',name:'DK Metcalf',nflTeam:'PIT',position:'WR',points:30,owner:'Klutch Sports Group'}]};
  f.statsReads=0;f.statsTimes=[];f.weekly=[];f.boardReads=0;f.summaryReads=0;f.boardGate=null;f.options={desk:true,getContext:()=>({season:2026,week:7,players:f.players}),loadStats:async()=>{f.statsReads++;f.statsTimes.push(Date.now());if(f.failStats)throw Error("Weekly stats temporarily unavailable");return {data:f.weekly}},loadBoard:async()=>{f.boardReads++;if(f.boardGate)await f.boardGate;return ({payload:{season:{year:2026,type:2},week:{number:7},events:[{id:'401873011',date:'2026-10-25T17:00:00Z',status:{type:{state:f.state,shortDetail:'Q3 8:20'}},competitions:[{competitors:[{team:{abbreviation:'NO'},homeAway:'home',score:'10'},{team:{abbreviation:'PIT'},homeAway:'away',score:'16'}]}]}]}})},loadSummary:async()=>{f.summaryReads++;const s=structuredClone(f.summary);s.header.competitions[0].status.type.state=f.state;s.header.competitions[0].status.type.shortDetail=f.state==='post'?'Final':f.state==='pre'?'Scheduled':'Q4 2:00';return {summary:s,fetchedAt:Date.now()}}};f.remount=()=>{f.center=mountNflGameCenter(document.querySelector('#feed'),f.options);return f.center.ready};await f.remount();await Promise.resolve();f.center.pause();
  window.setTheme=async mode=>(await import('/js/theme.js')).pinMode(mode);
  window.reviewContrast=(await import('/tools/home-review-contrast.js')).reviewTextContrast;
 }''');pg.evaluate('document.fonts.ready')
 for theme in ['light','dark']:
  for width in [320,390,430,768]:
   pg.set_viewport_size({'width':width,'height':844});pg.evaluate('setTheme',theme);pg.wait_for_timeout(120)
   for mode in ['plays','fantasy']:
    tag=f'{theme}/{width}/{mode}';pg.locator(f'[data-nfl-center-mode="{mode}"]').click();pg.wait_for_timeout(200);pg.evaluate('scrollTo(0,0)')
    check(tag+' mode is selected honestly',pg.locator(f'[data-nfl-center-mode="{mode}"]').get_attribute('aria-pressed')=='true')
    check(tag+' one selected view and one NFL score',pg.locator('.nfl-live-plays').count()==(mode=='plays') and pg.locator('.nfl-live-stats').count()==(mode=='fantasy') and pg.locator('.nfl-center-score b').all_text_contents()==['16','10'])
    check(tag+' no page overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    check(tag+' 44px controls',pg.locator('#feed').evaluate('e=>[...e.querySelectorAll("button,select")].filter(e=>e.checkVisibility()).every(e=>e.getBoundingClientRect().height>=43.5)'))
    result=pg.locator('#feed').evaluate('e=>reviewContrast(e)');check(tag+' text contrast '+json.dumps(result['failures']),not result['failures'])
    if mode=='plays':
     check(tag+' full descriptions and quarter landmarks',pg.locator('.nfl-play-details>p').evaluate_all('es=>es.length>100&&es.every(e=>e.checkVisibility())') and pg.locator('.nfl-play-period:not([hidden])').count()>=4)
     pg.locator('[data-nfl-center-filter]').scroll_into_view_if_needed();y=pg.locator('.nfl-section-head').bounding_box()['y'];pg.locator('[data-nfl-center-filter]').select_option('big')
     check(tag+' filters keep their heading in place',abs(pg.locator('.nfl-section-head').bounding_box()['y']-y)<2)
     pg.locator('[data-nfl-center-filter]').select_option('all')
    else:
     check(tag+' all NFL players remain side by side',pg.locator('.nfl-fantasy-player').count()==20 and pg.locator('.nfl-fantasy-side').nth(0).bounding_box()['x']<pg.locator('.nfl-fantasy-side').nth(1).bounding_box()['x'])
     check(tag+' exact league points and unknown PPR remain distinct','22.0' in pg.locator('[data-nfl-your-player]').inner_text() and '—' in pg.locator('.nfl-center-fantasy').inner_text())
    pg.evaluate('scrollTo(0,0)');pg.screenshot(path=str(OUT/f'{theme}-{width}-{mode}.png'))
   if width==320:
    pg.evaluate('document.documentElement.style.fontSize="32px";document.documentElement.dataset.readability="comfortable"');pg.wait_for_timeout(100)
    check(theme+' Comfortable 200% text keeps full names inside columns',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and pg.locator('.nfl-fantasy-player').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'))
    pg.screenshot(path=str(OUT/f'{theme}-large.png'));pg.evaluate('document.documentElement.style.fontSize="";document.documentElement.dataset.readability="compact"')
 # Scores and ownership must not change the NFL box-score reading order.
 pg.locator('[data-nfl-center-mode="fantasy"]').click();pg.wait_for_timeout(180)
 pg.evaluate('f.rowOrder=[...document.querySelectorAll(".nfl-fantasy-player")].map(e=>e.id);f.savedPlayers=f.players;f.players=f.players.map(p=>({...p,points:p.position==="QB"?0:55,isMine:!p.isMine}));f.contextReads=f.summaryReads;f.center.updateContext()')
 check('Fantasy keeps fixed rows through score swings and ownership changes',pg.locator('.nfl-fantasy-player').evaluate_all('es=>JSON.stringify(es.map(e=>e.id))===JSON.stringify(f.rowOrder)') and pg.evaluate('f.summaryReads===f.contextReads'))
 check('recorded zero-point players remain visible',pg.locator('.nfl-fantasy-player').filter(has_text='Tyler Shough').locator('.nfl-fantasy-value b').inner_text()=='0.0')
 pg.evaluate('f.players=f.savedPlayers;f.center.updateContext()')
 photo=pg.locator('.nfl-fantasy-photo img').first;photo.dispatch_event('error')
 pg.wait_for_function('(()=>{const p=document.querySelector(".nfl-fantasy-photo img");return p?.src.includes("/teamlogos/nfl/")&&p.parentElement.classList.contains("has-photo")})()')
 pg.evaluate('f.fallbackSrc=document.querySelector(".nfl-fantasy-photo img").src;f.originalPoints=f.players[0].points;f.players[0].points=0;f.center.updateContext()')
 check('an unavailable headshot keeps its loaded NFL fallback through score updates',photo.evaluate('e=>e.src===f.fallbackSrc&&e.parentElement.classList.contains("has-photo")'))
 pg.evaluate('f.players[0].points=f.originalPoints;f.center.updateContext()')
 # A mode change is navigation, so it returns to each view's saved reading row.
 pg.locator('[data-nfl-center-mode="plays"]').click();pg.wait_for_timeout(200);row=pg.locator('.nfl-center-plays li[id]').nth(12);row.scroll_into_view_if_needed();rid=row.get_attribute('id');y=row.bounding_box()['y']
 pg.locator('[data-nfl-center-mode="fantasy"]').click();pg.wait_for_timeout(200)
 pg.locator('[data-nfl-center-mode="plays"]').click();pg.wait_for_timeout(200)
 check('switching views restores the play and its reading position',abs(pg.locator('#'+rid).bounding_box()['y']-y)<2 and pg.locator('#'+rid+' .nfl-play-details>p').is_visible())
 pg.clock.install();pg.evaluate('f.center.resume()');pg.clock.run_for(20);before=pg.evaluate('f.statsReads');pg.clock.run_for(5020)
 check('play-by-play does not fetch weekly fantasy stats',pg.evaluate('f.statsReads')==before)
 pg.locator('[data-nfl-center-mode="fantasy"]').click();pg.clock.run_for(200);pg.clock.run_for(25020)
 check('fantasy reads remain bounded between game polls',pg.evaluate('f.statsTimes.every((t,i)=>!i||t-f.statsTimes[i-1]>=19990)'))
 pg.evaluate('f.weekly=[{season:2026,week:7,season_type:"regular",team:"PIT",player:{full_name:"Aaron Rodgers",position:"QB"},stats:{pts_ppr:17.4}}]');pg.clock.run_for(25020)
 check('live PPR updates in the separate fantasy view',pg.locator('.nfl-fantasy-player').filter(has_text='Aaron Rodgers').locator('.nfl-fantasy-value b').inner_text()=='17.4')
 pg.locator('[data-nfl-center-mode="plays"]').click();pg.clock.run_for(200)
 row=pg.locator('.nfl-center-plays li[id]').nth(12);row.scroll_into_view_if_needed();rid=row.get_attribute('id');y=row.bounding_box()['y']
 pg.evaluate('f.summary.drives.current={plays:[{id:"999999999999",sequenceNumber:"999999999999",text:"A.Rodgers pass to D.Metcalf for 30 yards. TOUCHDOWN.",scoringPlay:true,statYardage:30,type:{id:"67",text:"Passing Touchdown"},awayScore:22,homeScore:10,period:{number:4},clock:{displayValue:"1:00"}}]}');pg.clock.run_for(5020)
 check('new plays preserve the older play being read',pg.locator('[id$="-play-999999999999"]').count()==1 and abs(pg.locator('#'+rid).bounding_box()['y']-y)<2)
 for theme in ['light','dark']:
  pg.evaluate('setTheme',theme);pg.clock.run_for(300)
  check(theme+' Back to live is tappable above navigation',pg.locator('[data-nfl-latest]').evaluate('e=>{const r=e.getBoundingClientRect(),n=document.querySelector("#tabbar").getBoundingClientRect();return !e.hidden&&r.bottom<=n.top-8&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'))
 pg.evaluate('f.center.stop()');reads=pg.evaluate('f.summaryReads');pg.clock.run_for(60000);check('teardown stops game reads',pg.evaluate('f.summaryReads')==reads)
 check('no browser errors or production writes',not errors);b.close()
server.shutdown()
print(json.dumps({'checks':len(checks)}))
