"""Actual live-game controller with isolated official/league stat fixtures."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_NFL_COMBINED_DIR','/tmp/dfl-nfl-combined'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'''<style>html{--topbar-h:44px}body{margin:0}.topbar{height:44px}#view{padding:12px 16px;max-width:1080px;margin:0 auto}.topbar>strong{padding:12px 16px;font-size:14px}</style></head><body><header class="topbar"><strong>DFL · NFL live</strong></header><main id="view" class="view" data-route="clubhouse"><section id="feed"></section></main></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  code=html if self.path.startswith('/nfl-combined.html') else "export const configured=()=>false;export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};" if self.path.startswith('/js/supabase.js') else None
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/html' if self.path.startswith('/nfl-combined') else 'text/javascript');self.end_headers();self.wfile.write(code.encode());return
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
 pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(base+'/nfl-combined.html',wait_until='domcontentloaded')
 pg.evaluate('''async()=>{
  const {mountNflGameCenter}=await import('/js/nfl-game-center.js');const {startUiMotion}=await import('/js/ui-motion.js');startUiMotion();
  const summary=await(await fetch('/tools/fixtures/nfl-game-center-summary.json')).json();
  const f=window.f={state:'in',summary,players:[{id:'1',name:'Tyler Shough',nflTeam:'NO',position:'QB',points:22,owner:'The Very Long Bayou Championship Bombers',isMine:true},{id:'3',name:'DK Metcalf',nflTeam:'PIT',position:'WR',points:30,owner:'Klutch Sports Group'}]};
  f.statsReads=0;f.weekly=[];f.boardReads=0;f.summaryReads=0;f.boardGate=null;f.options={combined:true,getContext:()=>({season:2026,week:7,players:f.players}),loadStats:async()=>{f.statsReads++;if(f.failStats)throw Error("Weekly stats temporarily unavailable");return {data:f.weekly}},loadBoard:async()=>{f.boardReads++;if(f.boardGate)await f.boardGate;return ({payload:{season:{year:2026,type:2},week:{number:7},events:[{id:'401873011',date:'2026-10-25T17:00:00Z',status:{type:{state:f.state,shortDetail:'Q3 8:20'}},competitions:[{competitors:[{team:{abbreviation:'NO'},homeAway:'home',score:'10'},{team:{abbreviation:'PIT'},homeAway:'away',score:'16'}]}]}]}})},loadSummary:async()=>{f.summaryReads++;const s=structuredClone(f.summary);s.header.competitions[0].status.type.state=f.state;s.header.competitions[0].status.type.shortDetail=f.state==='post'?'Final':f.state==='pre'?'Scheduled':'Q4 2:00';return {summary:s,fetchedAt:Date.now()}}};f.remount=()=>{f.center=mountNflGameCenter(document.querySelector('#feed'),f.options);return f.center.ready};await f.remount();await Promise.resolve();f.center.pause();
  window.setTheme=async mode=>(await import('/js/theme.js')).pinMode(mode);
  window.reviewContrast=(await import('/tools/home-review-contrast.js')).reviewTextContrast;
 }''');pg.evaluate('document.fonts.ready')
 # The full page keeps both sections, while limiting the initial player list.
 for theme in ['light','dark']:
  for width in [320,390,430,768,1100]:
   tag=f'{theme}/{width}';pg.set_viewport_size({'width':width,'height':844});pg.evaluate('setTheme',theme);pg.wait_for_timeout(100);pg.evaluate('scrollTo(0,0)')
   check(tag+' plays, two-team fantasy and field share one page',pg.locator('.nfl-live-stats').is_visible() and pg.locator('.nfl-live-plays').is_visible() and pg.locator('[data-nfl-field]').is_visible() and pg.locator('.nfl-center-modes').count()==0)
   check(tag+' preview shows two players per NFL side',pg.locator('.nfl-fantasy-player').count()==4 and pg.locator('.nfl-fantasy-side').evaluate_all('es=>es.every(e=>e.querySelectorAll("article").length===2)'))
   check(tag+' only one NFL score is shown',pg.locator('.nfl-center-score b').all_text_contents()==['16','10'] and pg.locator('.nfl-fantasy-team-score').count()==0)
   check(tag+' real scoring and unknown points remain distinct','22.0' in pg.locator('[data-nfl-your-player]').inner_text() and 'League' in pg.locator('[data-nfl-your-player]').inner_text() and '—' in pg.locator('.nfl-center-fantasy').inner_text())
   check(tag+' names and full play descriptions are visible',pg.locator('.nfl-play-details>p').evaluate_all('es=>es.length>100&&es.every(e=>e.checkVisibility()&&getComputedStyle(e).webkitLineClamp==="none")'))
   check(tag+' no page or stat-column overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and pg.locator('.nfl-fantasy-player').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'))
   contrast=pg.locator('#feed').evaluate('e=>reviewContrast(e)');check(tag+' theme text contrast '+json.dumps(contrast['failures']),not contrast['failures'])
   check(tag+' controls keep phone targets',pg.locator('#feed').evaluate('e=>[...e.querySelectorAll("button,select")].filter(e=>e.checkVisibility()).every(e=>e.getBoundingClientRect().height>=43.5)'))
   pg.screenshot(path=str(OUT/f'{theme}-{width}-overview.png'))
   pg.locator('[data-nfl-center-mode="plays"]').click();pg.wait_for_timeout(400)
   check(tag+' play shortcut focuses its section without hiding stats',pg.locator('[data-nfl-section="plays"]').evaluate('e=>e===document.activeElement') and pg.locator('.nfl-live-stats').is_visible())
   pg.screenshot(path=str(OUT/f'{theme}-{width}-plays.png'))
   pg.locator('[data-nfl-center-mode="fantasy"]').click();pg.wait_for_timeout(400)
   check(tag+' stats shortcut focuses its section without hiding plays',pg.locator('[data-nfl-section="fantasy"]').evaluate('e=>e===document.activeElement') and pg.locator('.nfl-live-plays').is_visible())
   panel=pg.locator('[data-nfl-stats-rows]');pg.evaluate('f.originalStat=document.querySelector(".nfl-fantasy-player");f.originalPlays=document.querySelector(".nfl-center-plays")');h=panel.bounding_box()['height']
   pg.evaluate('document.querySelector("#feed").addEventListener("click",()=>{const a=document.querySelector("[data-nfl-stats-rows]").getAnimations()[0];f.expandStarted=!!a&&a.playState==="running"&&a.effect.getComputedTiming().activeDuration===240;if(a){a.pause();a.currentTime=90}},{once:true})')
   pg.locator('[data-nfl-stats-expand]').click()
   check(tag+' all-players opens with finite motion',pg.evaluate('f.expandStarted') and pg.locator('.nfl-fantasy-player').count()==20)
   jump=pg.evaluate('()=>{const p=document.querySelector("[data-nfl-stats-rows]"),h=p.getBoundingClientRect().height;document.querySelector("[data-nfl-stats-expand]").click();return Math.abs(p.getBoundingClientRect().height-h)}')
   check(tag+' rapid reversal starts at the painted height',jump<2)
   pg.wait_for_timeout(300)
   check(tag+' collapse leaves no fixed height or replaced rows',abs(panel.bounding_box()['height']-h)<2 and panel.evaluate('e=>!e.style.height&&!e.getAnimations().length') and pg.evaluate('f.originalStat===document.querySelector(".nfl-fantasy-player")&&f.originalPlays===document.querySelector(".nfl-center-plays")'))
   pg.locator('[data-nfl-stats-expand]').click();pg.wait_for_timeout(300)
   pg.screenshot(path=str(OUT/f'{theme}-{width}-all-players.png'))
   check(tag+' all players keep full names, lines and two aligned columns',pg.locator('.nfl-fantasy-player').count()==20 and pg.locator('.nfl-fantasy-player').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1&&e.querySelector(".nfl-fantasy-stat-line").textContent)'))
   pg.locator('[data-nfl-stats-expand]').click();pg.wait_for_timeout(300)
   pg.locator('[data-nfl-center-filter]').scroll_into_view_if_needed();filter_top=pg.locator('.nfl-live-plays .nfl-section-head').bounding_box()['y']
   pg.locator('[data-nfl-center-filter]').select_option('big')
   check(tag+' filtering keeps the play heading in place',abs(pg.locator('.nfl-live-plays .nfl-section-head').bounding_box()['y']-filter_top)<2)
   check(tag+' filtering plays keeps the same fantasy rows and real points',pg.locator('.nfl-fantasy-player').count()==4 and '22.0' in pg.locator('[data-nfl-your-player]').inner_text() and pg.locator('[data-play-kind="touchdown"]').count()>0)
   pg.locator('[data-nfl-center-filter]').select_option('all')
  pg.set_viewport_size({'width':320,'height':844});pg.evaluate('document.documentElement.style.fontSize="32px";document.documentElement.dataset.readability="comfortable"');pg.wait_for_timeout(100);pg.evaluate('scrollTo(0,0)')
  check(theme+' Comfortable 200% text reflows without clipping',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and pg.locator('.nfl-fantasy-player').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'))
  pg.screenshot(path=str(OUT/f'{theme}-large.png'));pg.evaluate('document.documentElement.style.fontSize="";document.documentElement.dataset.readability="compact"')
 # Stop/motion preferences apply to the new expansion as well as the field.
 for reduced,pref in [('reduce','on'),('no-preference','off')]:
  pg.emulate_media(reduced_motion=reduced);pg.evaluate('async p=>{(await import("/js/page-disclosure.js")).savePageChoice("gameday-motion",p);dispatchEvent(new Event("dfl:route-performance"))}',pref)
  pg.locator('[data-nfl-stats-expand]').click();check(reduced+'/'+pref+' expands immediately',pg.locator('.nfl-fantasy-player').count()==20 and panel.evaluate('e=>!e.getAnimations().length'))
  pg.locator('[data-nfl-stats-expand]').click()
 pg.emulate_media(reduced_motion='no-preference');pg.evaluate('async()=>{(await import("/js/page-disclosure.js")).savePageChoice("gameday-motion","on");dispatchEvent(new Event("dfl:route-performance"))}')
 # Updates use the existing five-second game read and a bounded weekly-stat read.
 pg.clock.install();pg.evaluate('f.center.resume()');pg.clock.run_for(20)
 before=pg.evaluate('({board:f.boardReads,summary:f.summaryReads,stats:f.statsReads})');pg.evaluate('f.mutations=0;f.observer=new MutationObserver(ns=>f.mutations+=ns.length);f.observer.observe(document.querySelector("#feed"),{subtree:true,attributes:true,childList:true,characterData:true})');pg.clock.run_for(5020)
 check('unchanged automatic refresh preserves the DOM',pg.evaluate('f.mutations===0'));pg.evaluate('f.observer.disconnect()')
 check('combined view still uses one five-second game refresh',pg.evaluate('f.boardReads')==before['board']+1 and pg.evaluate('f.summaryReads')==before['summary']+1)
 check('weekly stats are not fetched every five seconds',pg.evaluate('f.statsReads')==before['stats'])
 pg.locator('.nfl-center-plays li[id]').nth(12).scroll_into_view_if_needed();row=pg.locator('.nfl-center-plays li[id]').nth(12);rid=row.get_attribute('id');y=row.bounding_box()['y']
 pg.evaluate('f.summary.drives.current={plays:[{id:"999999999999",sequenceNumber:"999999999999",text:"A.Rodgers pass to D.Metcalf for 30 yards. TOUCHDOWN.",scoringPlay:true,statYardage:30,type:{id:"67",text:"Passing Touchdown"},awayScore:22,homeScore:10,period:{number:4},clock:{displayValue:"1:00"}}]}');pg.clock.run_for(5020)
 check('a new play updates without moving the older play being read',pg.locator('[id$="-play-999999999999"]').count()==1 and abs(pg.locator('#'+rid).bounding_box()['y']-y)<2)
 check('new-play notice appears while fantasy stats stay on page',pg.locator('[data-nfl-latest]').is_visible() and pg.locator('.nfl-live-stats').is_visible())
 stats_before=pg.evaluate('f.statsReads')
 pg.evaluate('f.weekly=[{season:2026,week:7,season_type:"regular",team:"PIT",player:{full_name:"Aaron Rodgers",position:"QB"},stats:{pts_ppr:17.4}}]');pg.clock.run_for(20020)
 check('weekly PPR points refresh on their bounded cadence',pg.evaluate('f.statsReads')==stats_before+1 and pg.locator('.nfl-fantasy-player').filter(has_text='Aaron Rodgers').locator('.nfl-fantasy-value b').inner_text()=='17.4')
 check('a fantasy update preserves the older play being read',abs(pg.locator('#'+rid).bounding_box()['y']-y)<2)
 pg.evaluate('f.failStats=true');pg.clock.run_for(20020);failed_reads=pg.evaluate('f.statsReads');pg.clock.run_for(5020)
 check('weekly-stat failures keep the last points and do not retry every poll',pg.evaluate('f.statsReads')==failed_reads and pg.locator('.nfl-fantasy-player').filter(has_text='Aaron Rodgers').locator('.nfl-fantasy-value b').inner_text()=='17.4')
 pg.evaluate('f.failStats=false');pg.clock.run_for(20020)
 check('weekly-stat reads recover on the bounded cadence',pg.evaluate('f.statsReads')==failed_reads+1)
 pg.locator('[data-nfl-latest]').click();check('Latest returns to the first play',pg.locator('.nfl-center-plays li[id]').first.bounding_box()['y']>=pg.locator('.nfl-center-tools').bounding_box()['y'])
 pg.locator('[data-nfl-stats-expand]').evaluate('e=>e.click()');pg.clock.run_for(300)
 pg.evaluate('async()=>{f.center.stop();document.querySelector("#view").dataset.routeReturning="true";await f.remount();f.center.pause()}')
 check('Back restores the expanded game stats in the same week',pg.locator('.nfl-fantasy-player').count()==20 and pg.locator('[data-nfl-stats-expand]').get_attribute('aria-expanded')=='true')
 pg.evaluate('async()=>{f.center.stop();f.options.loadBoard=async()=>({payload:{season:{year:2026,type:2},week:{number:7},events:[]}});await f.remount();f.center.pause()}')
 check('an empty NFL week has one clear status and no stale stats or feed',pg.locator('.nfl-live-grid').is_hidden() and pg.locator('.nfl-fantasy-player').count()==0 and 'No NFL games available' in pg.locator('.nfl-center-status').inner_text())
 pg.evaluate('f.center.stop()');reads=pg.evaluate('f.summaryReads');pg.clock.run_for(60000);check('unmount stops game and stat reads',pg.evaluate('f.summaryReads')==reads)
 check('no browser errors or production writes',not errors);b.close()
server.shutdown()
print(json.dumps({'checks':len(checks)}))
