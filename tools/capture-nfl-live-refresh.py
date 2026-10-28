"""Actual NFL controller, deterministic live updates, no production reads or writes."""
import json,os,threading
from datetime import datetime,timezone
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_NFL_REFRESH_REVIEW_DIR',ROOT.parent/'dfl-nfl-refresh-review'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'</head><body><video controls muted playsinline src="/tools/fixtures/highlight-playback.mp4" style="width:100%;max-height:100px"></video><main class="reel-game-browser" id="feed" style="height:650px;flex:none"></main></body></html>'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  code=html if self.path.startswith('/nfl-live-review.html') else "export const configured=()=>false;export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};" if self.path.startswith('/js/supabase.js') else None
  if code is not None:
   self.send_response(200);self.send_header('Content-Type','text/html' if self.path.startswith('/nfl-live-review') else 'text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}';checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for theme in ['light','dark']:
  c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.abort());pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.clock.install(time=datetime(2026,10,25,22,tzinfo=timezone.utc));pg.goto(base+'/nfl-live-review.html',wait_until='domcontentloaded')
  pg.evaluate('''async theme=>{
   (await import('/js/theme.js')).pinMode(theme);const {mountNflGameCenter}=await import('/js/nfl-game-center.js');
   const summary=await(await fetch('/tools/fixtures/nfl-game-center-summary.json')).json();
   const f=window.f={reads:0,boardReads:0,forces:[],summary,state:'in',active:true,fail:false,hold:false,hidden:false,online:true,extra:[]};
   Object.defineProperty(document,'hidden',{configurable:true,get:()=>f.hidden});Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>f.online});
   f.add=()=>f.extra.push({id:String(999999900000+f.extra.length),sequenceNumber:String(999999900000+f.extra.length),text:'A.Rodgers pass deep left to D.Metcalf for 29 yards.',type:{id:'24',text:'Pass Reception'},statYardage:29,period:{number:4},clock:{displayValue:'2:00'}});
   f.center=mountNflGameCenter(document.getElementById('feed'),{watchOthers:()=>f.pendingOthers===true,liveOthers:()=>f.liveOthers===true,getContext:()=>({season:2026,week:7,players:[]}),active:()=>f.active,loadStats:async()=>({data:[]}),loadBoard:async()=>{f.boardReads++;return {payload:{season:{year:2026,type:2},week:{number:7},events:[{id:'401873011',date:'2026-10-25T17:00:00Z',status:{type:{state:f.state,shortDetail:f.state==='post'?'Final':'Q4 2:00'}},competitions:[{competitors:[{team:{abbreviation:'NO'},homeAway:'home',score:'10'},{team:{abbreviation:'PIT'},homeAway:'away',score:'16'}]}]}]}}},loadSummary:async(_game,_season,options)=>{f.reads++;f.forces.push(options.force);if(f.hold)await new Promise(r=>f.release=r);if(f.fail)throw Error('Provider offline');const data=structuredClone(summary);data.header.competitions[0].status.type.state=f.state;data.drives.current={plays:[...f.extra]};return {summary:data,fetchedAt:Date.now()}}});
   f.video=document.querySelector('video');await f.video.play();
  }''',theme)
  pg.wait_for_selector('.nfl-center-plays h4');count=pg.locator('.nfl-center-plays li').count();tag=theme+' live feed'
  pg.evaluate('f.add()');before=pg.evaluate('f.reads');pg.clock.run_for(10020)
  check(tag+' gets the next play automatically after ten seconds',pg.evaluate('f.reads')==before+1 and pg.locator('.nfl-center-plays li').count()==count+1 and 'DK Metcalf' in pg.locator('.nfl-center-plays h4').first.inner_text())
  check(tag+' keeps newest plays at the top without moving the video',pg.locator('#feed').evaluate('e=>e.scrollTop===0') and pg.evaluate('f.video===document.querySelector("video")&&!f.video.paused'))
  pg.locator('.nfl-center-plays li').nth(12).scroll_into_view_if_needed();anchor=pg.locator('.nfl-center-plays li').nth(12);anchor_id=anchor.get_attribute('id');anchor.locator('summary').click();before_y=anchor.bounding_box()['y'];pg.evaluate('f.add()');pg.clock.run_for(10020)
  check(tag+' adds plays without moving an older play being read',abs(pg.locator('#'+anchor_id).bounding_box()['y']-before_y)<2)
  check(tag+' reports new plays without pulling the reader away',pg.locator('[data-nfl-latest]').is_visible() and '1 new play' in pg.locator('[data-nfl-latest]').inner_text())
  pg.locator('[data-nfl-latest]').click();check(tag+' Latest returns to the newest play and clears the count',pg.locator('[data-nfl-latest]').is_hidden() and pg.locator('.nfl-center-plays li').first.bounding_box()['y']>=pg.locator('#feed').bounding_box()['y'])
  check(tag+' preserves open play details during refresh',pg.locator('#'+anchor_id+' details').evaluate('e=>e.open'))
  pg.locator('[data-nfl-center-filter]').select_option('big');before=pg.evaluate('f.reads');pg.evaluate('f.add()');pg.clock.run_for(10020)
  check(tag+' keeps the selected play filter while updating',pg.locator('[data-nfl-center-filter]').input_value()=='big' and pg.evaluate('f.reads')==before+1)
  pg.locator('[data-nfl-center-mode="fantasy"]').click();before=pg.evaluate('f.reads');pg.clock.run_for(10020)
  check(tag+' fantasy stats update in the same live session',pg.evaluate('f.reads')==before+1 and pg.locator('.nfl-center-fantasy article').count()>0)
  pg.evaluate('f.hidden=true;document.dispatchEvent(new Event("visibilitychange"))');before=pg.evaluate('f.reads');pg.clock.run_for(40000)
  check(tag+' pauses reads while the app is hidden',pg.evaluate('f.reads')==before)
  pg.evaluate('f.hidden=false;document.dispatchEvent(new Event("visibilitychange"))');pg.clock.run_for(20)
  check(tag+' catches up immediately after returning with a forced read',pg.evaluate('f.reads')==before+1 and pg.evaluate('f.forces.at(-1)===true'))
  pg.evaluate('f.online=false;dispatchEvent(new Event("offline"))');before=pg.evaluate('f.reads');pg.clock.run_for(30000)
  check(tag+' stops offline reads and keeps saved stats visible',pg.evaluate('f.reads')==before and 'Offline' in pg.locator('.nfl-center-status').inner_text() and pg.locator('.nfl-center-fantasy article').count()>0)
  pg.evaluate('f.online=true;dispatchEvent(new Event("online"))');pg.clock.run_for(20)
  check(tag+' reconnects without the Refresh button',pg.evaluate('f.reads')==before+1 and 'Offline' not in pg.locator('.nfl-center-status').inner_text())
  pg.evaluate('f.fail=true');pg.clock.run_for(10020)
  check(tag+' preserves the last feed when a live request fails','Update unavailable' in pg.locator('.nfl-center-status').inner_text() and pg.locator('.nfl-center-fantasy article').count()>0)
  pg.evaluate('f.fail=false');pg.clock.run_for(10020)
  check(tag+' automatically recovers after a provider error','Update unavailable' not in pg.locator('.nfl-center-status').inner_text())
  pg.evaluate('f.hold=true');pg.clock.run_for(10020);before=pg.evaluate('f.reads');pg.clock.run_for(30000)
  check(tag+' prevents overlapping polling reads',pg.evaluate('f.reads')==before)
  pg.evaluate('f.hold=false;f.release()');pg.clock.run_for(20)
  pg.evaluate('f.active=false;f.center.pause()');before=pg.evaluate('f.reads');pg.clock.run_for(30000)
  check(tag+' stops polling a hidden Clubhouse tab',pg.evaluate('f.reads')==before)
  pg.evaluate('f.active=true;f.center.refresh()');pg.clock.run_for(20)
  check(tag+' switching back resumes automatic updates',pg.evaluate('f.reads')==before+1)
  pg.evaluate('f.state="post";f.add()');pg.clock.run_for(10020);before=pg.evaluate('f.reads');pg.clock.run_for(60000)
  check(tag+' captures the final play then stops polling a finished game',pg.evaluate('f.reads')==before)
  pg.evaluate('f.pendingOthers=true;f.liveOthers=false;f.center.refresh()');pg.clock.run_for(20);before=pg.evaluate('f.reads');pg.clock.run_for(30020)
  check(tag+' keeps checking upcoming pinned games after the featured game finishes',pg.evaluate('f.reads')==before+1)
  pg.evaluate('f.liveOthers=true;f.center.refresh()');pg.clock.run_for(20);before=pg.evaluate('f.reads');pg.clock.run_for(10020)
  check(tag+' follows a different pinned live game at the live cadence',pg.evaluate('f.reads')==before+1)
  pg.evaluate('f.pendingOthers=false;f.liveOthers=false;f.center.refresh()');pg.clock.run_for(20);before=pg.evaluate('f.reads');pg.clock.run_for(40000)
  check(tag+' stops the shared desk once every pinned game is finished',pg.evaluate('f.reads')==before)

  pg.locator('[data-nfl-center-mode="plays"]').click();pg.screenshot(path=str(OUT/(theme+'-updated-feed.png')))
  pg.evaluate('f.center.stop();dispatchEvent(new Event("online"));dispatchEvent(new Event("focus"))');pg.clock.run_for(30000)
  check(tag+' teardown removes timers and reconnect listeners',pg.evaluate('f.reads')==before and not errors)
  c.close()
 b.close()
server.shutdown()
