"""Actual live-game controller with isolated official/league stat fixtures."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_NFL_FINISH_DIR','/tmp/dfl-nfl-finish'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'''<style>html{--topbar-h:44px}body{margin:0}.topbar{height:44px}#view{padding:12px 16px;max-width:780px;margin:0 auto}.topbar>strong{padding:12px 16px;font-size:14px}</style></head><body><header class="topbar"><strong>DFL · NFL live</strong></header><main id="view" class="view" data-route="clubhouse"><section id="feed"></section></main></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  code=html if self.path.startswith('/nfl-finish.html') else "export const configured=()=>false;export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};" if self.path.startswith('/js/supabase.js') else None
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/html' if self.path.startswith('/nfl-finish') else 'text/javascript');self.end_headers();self.wfile.write(code.encode());return
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
 pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(base+'/nfl-finish.html',wait_until='domcontentloaded')
 pg.evaluate('''async()=>{
  const {mountNflGameCenter}=await import('/js/nfl-game-center.js');const {startUiMotion}=await import('/js/ui-motion.js');startUiMotion();
  const summary=await(await fetch('/tools/fixtures/nfl-game-center-summary.json')).json();
  const f=window.f={state:'in',summary,players:[{id:'1',name:'Tyler Shough',nflTeam:'NO',position:'QB',points:22,owner:'The Very Long Bayou Championship Bombers',isMine:true},{id:'3',name:'DK Metcalf',nflTeam:'PIT',position:'WR',points:30,owner:'Klutch Sports Group'}]};
  f.center=mountNflGameCenter(document.querySelector('#feed'),{getContext:()=>({season:2026,week:7,players:f.players}),loadStats:async()=>({data:[]}),loadBoard:async()=>({payload:{season:{year:2026,type:2},week:{number:7},events:[{id:'401873011',date:'2026-10-25T17:00:00Z',status:{type:{state:f.state,shortDetail:'Q3 8:20'}},competitions:[{competitors:[{team:{abbreviation:'NO'},homeAway:'home',score:'10'},{team:{abbreviation:'PIT'},homeAway:'away',score:'16'}]}]}]}}),loadSummary:async()=>{const s=structuredClone(summary);s.header.competitions[0].status.type.state=f.state;s.header.competitions[0].status.type.shortDetail=f.state==='post'?'Final':f.state==='pre'?'Scheduled':'Q4 2:00';return {summary:s,fetchedAt:Date.now()}}});await f.center.ready;f.center.pause();
  window.setTheme=async mode=>(await import('/js/theme.js')).pinMode(mode);
  window.reviewContrast=(await import('/tools/home-review-contrast.js')).reviewTextContrast;
 }''');pg.evaluate('document.fonts.ready')
 for theme in ['light','dark']:
  for width in [320,390,768]:
   pg.set_viewport_size({'width':width,'height':844});pg.evaluate('setTheme',theme);pg.wait_for_timeout(200)
   for mode in ['plays','fantasy']:
    pg.evaluate('mode=>f.center.setMode(mode)',mode);pg.wait_for_timeout(250);pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(100);tag=f'{theme}/{width}/{mode}'
    check(tag+' no horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and pg.locator('#feed').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
    contrast=pg.locator('#feed').evaluate('e=>reviewContrast(e)');check(tag+' text contrast '+json.dumps(contrast['failures']),not contrast['failures'])
    check(tag+' comfortable control targets',pg.locator('#feed').evaluate('''e=>[...e.querySelectorAll('button,select,summary')].filter(n=>n.getClientRects().length).every(n=>n.getBoundingClientRect().height>=43.5)'''))
    check(tag+' picker uses the observed game state', 'Q4 2:00' in pg.locator('[data-nfl-center-game] option:checked').inner_text())
    if mode=='plays':
     check(tag+' selected NFL scores stay separate from fantasy points',pg.locator('.nfl-center-score b').all_text_contents()==['16','10'])
     check(tag+' complete source descriptions are always visible',pg.locator('.nfl-play-details>p').evaluate_all('ns=>ns.length>0&&ns.every(n=>n.checkVisibility()&&n.textContent.trim().length>0)'))
     check(tag+' feed has no collapsed descriptions or extra tap controls',pg.locator('.nfl-center-plays details,.nfl-center-plays summary,.nfl-play-chevron').count()==0)
     check(tag+' compact play text keeps its hierarchy',pg.locator('.nfl-play-details').first.evaluate('e=>parseFloat(getComputedStyle(e.querySelector("h4")).fontSize)===14&&parseFloat(getComputedStyle(e.querySelector("p")).fontSize)===13'))
     pg.locator('[data-nfl-center-filter]').select_option('big');check(tag+' touchdown and big-play types remain distinct',pg.locator('[data-play-kind="touchdown"]').count()>0 and pg.locator('[data-play-kind="big-play"]').count()>0)
     if width==390:pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(100);pg.screenshot(path=str(OUT/f'{theme}-plays.png'))
     pg.locator('[data-nfl-center-filter]').select_option('all')
    else:
     sides=pg.locator('.nfl-fantasy-side');check(tag+' away and home stay side by side',sides.count()==2 and sides.nth(0).bounding_box()['x']<sides.nth(1).bounding_box()['x'])
     check(tag+' NFL score labels and actual league totals are explicit',pg.locator('.nfl-fantasy-team-score>small').all_text_contents()==['NFL','NFL'] and '22.0' in pg.locator('[data-nfl-your-player]').inner_text() and 'League' in pg.locator('[data-nfl-your-player]').inner_text())
     check(tag+' unknown player points are not made up',pg.locator('.nfl-fantasy-value>span>b').evaluate_all('ns=>ns.some(n=>n.textContent==="—")'))
     check(tag+' each team keeps full player names and stat lines',pg.locator('.nfl-fantasy-player').evaluate_all('ns=>ns.every(n=>n.scrollWidth<=n.clientWidth+1&&!!n.querySelector(".nfl-fantasy-stat-line").textContent)'))
     aligned=pg.locator('.nfl-center-fantasy').evaluate('''e=>{const sides=[...e.querySelectorAll('.nfl-fantasy-side')].map(s=>[...s.querySelectorAll('.nfl-fantasy-player')]);return sides[0].every((row,i)=>!sides[1][i]||['.nfl-fantasy-player-head :is(button,strong)','.nfl-fantasy-value>span','.nfl-fantasy-value>small','.nfl-fantasy-owner','.nfl-fantasy-stat-line'].every(sel=>Math.abs(row.querySelector(sel).getBoundingClientRect().top-sides[1][i].querySelector(sel).getBoundingClientRect().top)<1))}''')
     check(tag+' both teams align player names, points, owners and stat lines',aligned)
     check(tag+' smaller player names and points',pg.locator('.nfl-fantasy-player').first.evaluate('e=>parseFloat(getComputedStyle(e.querySelector(".nfl-fantasy-player-head button,.nfl-fantasy-player-head strong")).fontSize)===13&&parseFloat(getComputedStyle(e.querySelector(".nfl-fantasy-value b")).fontSize)===18'))
     if width==390:pg.screenshot(path=str(OUT/f'{theme}-fantasy.png'))
     if width==320:
      pg.evaluate("document.documentElement.style.fontSize='32px'");pg.wait_for_timeout(100)
      pg.screenshot(path=str(OUT/f'{theme}-large-fantasy.png'))
      fit=pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and pg.locator('.nfl-fantasy-player').evaluate_all('ns=>ns.every(n=>n.scrollWidth<=n.clientWidth+1)')
      if not fit:
       print('OVERFLOW',pg.locator('#feed').evaluate('''e=>[...e.querySelectorAll('*')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,cls:n.className,text:n.textContent.slice(0,60),client:n.clientWidth,scroll:n.scrollWidth,rect:n.getBoundingClientRect().toJSON()})).slice(0,15)'''),flush=True)
      check(tag+' 200% text retains both columns without clipping',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and pg.locator('.nfl-fantasy-player').evaluate_all('ns=>ns.every(n=>n.scrollWidth<=n.clientWidth+1)'))
      pg.screenshot(path=str(OUT/f'{theme}-large-fantasy.png'));pg.evaluate("document.documentElement.style.fontSize=''")
 for value in [0,-2.5]:
  pg.evaluate('async n=>{f.players[0].points=n;await f.center.refresh();f.center.pause()}',value)
  check(str(value)+' exact league points survive the presentation',str(f'{value:.1f}') in pg.locator('[data-nfl-your-player] .nfl-fantasy-value').inner_text())
 pg.evaluate("async()=>{f.summary.drives.current={plays:[{id:'999999999999',sequenceNumber:'999999999999',text:'A.Rodgers pass to D.Metcalf for 30 yards. TOUCHDOWN. No Play, penalty.',type:{id:'67',text:'Passing Touchdown'},statYardage:30,scoringPlay:true,awayScore:22,homeScore:10,period:{number:4},clock:{displayValue:'1:00'}}]};await f.center.refresh();f.center.pause();f.center.setMode('plays')}")
 void=pg.locator('[id$="-play-999999999999"][data-play-voided]');check('Nullified play stays neutral with its original description',void.count()==1 and void.get_attribute('data-play-kind')=='play' and 'No Play' in void.locator('.nfl-play-details>p').text_content())
 check('Nullified play has no touchdown result, score or video',void.locator('.nfl-play-result,.nfl-play-score,[data-nfl-center-clip]').count()==0 and 'No play' in void.inner_text())
 for filtered in ['scoring','big']:
  pg.locator('[data-nfl-center-filter]').select_option(filtered);check(filtered+' excludes nullified scores',pg.locator('[id$="-play-999999999999"]').count()==0)
 pg.locator('[data-nfl-center-filter]').select_option('all')
 pg.emulate_media(reduced_motion='reduce');pg.evaluate("f.center.setMode('plays')");pg.wait_for_timeout(100)
 check('Reduced Motion retains visible source details',pg.locator('.nfl-play-details>p').first.is_visible())
 pg.evaluate('f.center.stop()');check('No browser errors or production writes',not errors);b.close()
server.shutdown()
