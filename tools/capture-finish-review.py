"""Production finish controller, Watch and Clubhouse with fixture-only reads."""
import json,os,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'))
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?',1)[0].lstrip('/');file=OUT/'index.html' if not path else ROOT/path
  if not file.is_file():self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp'}.get(file.suffix,'application/octet-stream'));self.end_headers();self.wfile.write(file.read_bytes())
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 context.route('**/*.supabase.co/**',lambda r:r.fulfill(status=200,content_type='application/json',body='[]'))
 page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto('http://127.0.0.1:'+str(server.server_port)+'/');page.wait_for_function('!!window.reviewSetTheme');page.evaluate('document.fonts.ready')
 page.evaluate('''async sources=>{
  const names=['banter-memory-ui','player-week-details','player-week-detail-data','live-football','ui','sleeper-links','team-presentation','player-presentation','identity-rules','score-temperature','game-day-lineup-comparison','game-day-score-motion','game-day-moment-effects','game-day-experience-model','page-disclosure','game-day-dom','score-freshness','game-day-panels','clubhouse-matchup-model','watch-score-collapse','moment-recap','record-chases','record-chases-model','matchup-finish','matchup-finish-model','game-day-matchup-share','matchup-story','matchup-highlights','game-day-model','clubhouse-center-model','clubhouse-center-ui','clubhouse-polish','clubhouse-matchup-cards'];
  const helpers=Object.assign({},...await Promise.all(names.map(name=>import('./js/'+name+'.js'))));
 const mountDetails=helpers.mountPlayerWeekDetails;helpers.mountPlayerWeekDetails=(root,options)=>mountDetails(root,{...options,load:async()=>[]});
  const noop=()=>{},member={id:'finish-reader'},providers={shareMatchupReceipt:data=>{const f=window.finishFixture;f.shared=data;if(f.holdShare)return new Promise((resolve,reject)=>f.rejectShare=reject)},currentMember:()=>member,loadWeeklyStats:async()=>({data:[]}),sleeper:{league:async()=>({roster_positions:['QB']})},mountPlayerSpotlight:()=>({stop:noop,update:noop,setMotion:noop}),mountScoreVfx:()=>({stop:noop,refresh:noop}),loadRivalryCalls:async()=>[],rivalryStoryHtml:()=>'',db:()=>({from:()=>({select:()=>({match:()=>({order:()=>({order:()=>({limit:async()=>({data:[]})})})})})})})};
  const deps={...helpers,...providers};
  const center=Function(...Object.keys(deps),sources.center+';return mountClubhouseCenter')(...Object.values(deps));
  const watch=Function(...Object.keys(deps),'return function mountGameDayWatch'+sources.watch)(...Object.values(deps));
  window.finishFixture={helpers,center,watch,member,motion:true,stops:[],shareCalls:0};
  const f=finishFixture;f.members=[{id:member.id,sleeper_user_id:'a',team_name:'The Very Long Championship Bayou Bombers'},{id:'other',sleeper_user_id:'b',team_name:'Klutch Sports Group'}];
  f.week={leagueId:'finish-review',season:2026,week:6,completed:true,members:f.members,games:[{matchup_id:1,user1:'a',roster1:1,user2:'b',roster2:2,left:{roster:1,memberId:member.id,name:f.members[0].team_name,score:110.04},right:{roster:2,memberId:'other',name:f.members[1].team_name,score:110}}]};
  f.rows=[{roster_id:1,points:110.04,starters:['p1'],players:['p1'],players_points:{p1:25}},{roster_id:2,points:110,starters:['p2'],players:['p2'],players_points:{p2:24}}];f.players={p1:{n:'Demo quarterback',p:'QB',t:'KC'},p2:{n:'Demo opponent',p:'QB',t:'NO'}};
  f.model=()=>helpers.buildGameDay({week:f.week,rows:f.rows,players:f.players,members:f.members,memberId:member.id});
  f.region=document.createElement('div');document.querySelector('#view').dataset.route='clubhouse';document.querySelector('#tabbar [data-route=home]')?.classList.remove('on');document.querySelector('#tabbar [data-route=clubhouse]')?.classList.add('on');window.reviewSyncNav?.();document.querySelector('#view').replaceChildren(f.region);
  f.region.hidden=true;f.region.innerHTML='<div class="clubhouse-page clubhouse-command-center"><div id="clubhouse-panel-matchups"><div data-clubhouse-scoreboard></div><section data-clubhouse-matchup="1">'+helpers.matchupCardHtml(f.week.games[0],f.week,new Map())+'</section></div></div>';
  f.c=center(f.region,f.week,{loadStats:async()=>({data:[]}),loadLeague:async()=>({roster_positions:['QB']})});f.stops.push(()=>f.c.stop());f.c.update({rows:f.rows,players:f.players});
  f.root=document.createElement('div');document.querySelector('#view').append(f.root);
  f.w=watch(f.root,{getModel:f.model,getHistory:()=>[],getMotion:()=>f.motion,members:f.members,onRefresh:async()=>true,onMotion:()=>{f.motion=!f.motion;f.w.setMotion()}});f.stops.push(()=>f.w.stop());
 }''',{'center':'let stopCurrent=null;'+(ROOT/'js/clubhouse-center.js').read_text().split('let stopCurrent=null;')[1].replace('export function','function'),'watch':(ROOT/'js/game-day-watch.js').read_text().split('export function mountGameDayWatch')[1]})
 page.wait_for_timeout(80)
 assert page.locator('[data-finish-playing]').count()==0
 page.evaluate('finishFixture.region.hidden=false')
 page.locator('.clubhouse-game-teams').scroll_into_view_if_needed()
 page.wait_for_function('!!document.querySelector("[data-finish-playing]")')
 assert page.locator('[data-matchup-score-value]').all_text_contents()==['110.04','110.00']
 page.wait_for_timeout(1500)
 assert page.locator('[data-finish-playing]').count()==0
 checks.append('finite automatic finish with actual digits')
 page.evaluate('finishFixture.c.update({rows:finishFixture.rows,players:finishFixture.players})');page.wait_for_timeout(80)
 assert page.locator('[data-finish-playing]').count()==0
 page.evaluate('finishFixture.w.open()');page.wait_for_timeout(150)
 assert page.locator('.gameday-watch .matchup-finish').count()==1
 assert page.locator('.gameday-watch .gd-watch-entrance').count()==0
 assert page.locator('[data-finish-playing]').count()==0
 checks.append('Watch shares the seen state and skips pregame intro for final')
 page.evaluate('''()=>{const d=document.querySelector('.gameday-watch'),spacer=document.createElement('div');spacer.id='finish-review-spacer';spacer.style.height='900px';d.querySelector('[data-watch-content]').append(spacer);d.scrollTop=260}''')
 page.wait_for_function('document.querySelector(".gameday-watch").classList.contains("is-score-compact")')
 page.locator('.gameday-watch [data-finish-replay]').click()
 assert page.locator('.gameday-watch').evaluate('e=>e.scrollTop===0&&!e.classList.contains("is-score-compact")')
 page.evaluate('document.querySelector("#finish-review-spacer").remove()')
 checks.append('replay expands the scrolled scoreboard before revealing teams')
 page.wait_for_function('!!document.querySelector(".gameday-watch [data-finish-playing]")')
 assert page.locator('.gameday-watch .gd-watch-scoreboard .gd-thermal-value').all_text_contents()==['110.04','110.00']
 page.locator('.gameday-watch [data-watch-motion]').click();page.wait_for_timeout(60)
 assert page.locator('[data-finish-playing]').count()==0
 checks.append('replay works and motion-off cancels mid-reveal')
 page.locator('.gameday-watch [data-finish-share]').click();page.wait_for_timeout(50)
 assert page.evaluate('finishFixture.shared.sides[0].score')==110.04
 checks.append('selected final uses the existing share-card payload')
 page.locator('.gameday-watch [data-finish-replay]').click();page.wait_for_timeout(60)
 assert page.locator('[data-finish-playing]').count()==0
 page.locator('.gameday-watch [data-watch-close]').click();page.wait_for_timeout(220)
 for mode in ['light','dark']:
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('(mode)=>reviewSetTheme(mode)',mode)
   page.evaluate('finishFixture.w.open()');page.wait_for_timeout(80)
   page.locator('.gameday-watch').evaluate('e=>e.scrollTop=0')
   assert page.locator('.gameday-watch').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
   page.screenshot(path=str(OUT/f'finish-watch-{mode}-{width}.png'))
   page.locator('.gameday-watch [data-watch-close]').click();page.wait_for_timeout(200)
   for kind,score in [('clutch',110.04),('blowout',150),('tie',110)]:
    page.evaluate('score=>{const f=finishFixture;f.rows[0].points=score;f.c.update({rows:f.rows,players:f.players})}',score)
    page.locator('.clubhouse-game-teams').evaluate("e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-70,behavior:'instant'})")
    page.wait_for_timeout(60)
    assert page.locator('.clubhouse-matchup-card[data-finish-playing]').count()==0,'Correction replayed celebration'
    assert page.locator('.clubhouse-matchup-card .matchup-finish').get_attribute('data-finish-kind')==kind
    assert page.locator('[data-matchup-score-value]').all_text_contents()==[f'{score:.2f}','110.00']
    metrics=page.locator('.clubhouse-matchup-card').evaluate('''e=>({overflow:document.documentElement.scrollWidth>innerWidth+1,names:[...e.querySelectorAll('.clubhouse-matchup-name')].every(n=>n.scrollWidth<=n.clientWidth+1),buttons:[...e.querySelectorAll('.matchup-finish-actions button')].every(n=>n.getBoundingClientRect().height>=44),roastVisible:getComputedStyle(e.querySelector('.matchup-finish-roast')).visibility==='visible',duplicate:getComputedStyle(e.querySelector('[data-matchup-chirp]')).display!=='none'})''')
    assert not metrics['overflow'] and metrics['names'] and metrics['buttons'] and metrics['roastVisible'] and not metrics['duplicate'],metrics
    page.screenshot(path=str(OUT/f'finish-{mode}-{width}-{kind}.png'))
    checks.append({'mode':mode,'width':width,'kind':kind,**metrics})
 page.evaluate('''()=>{const f=finishFixture;f.c.stop();f.week.week=5;f.c=f.center(f.region,f.week,{loadStats:async()=>({data:[]}),loadLeague:async()=>({roster_positions:['QB']}),autoFinish:false});f.c.update({rows:f.rows,players:f.players})}''');page.wait_for_timeout(100)
 assert page.locator('[data-finish-playing]').count()==0
 checks.append('archive results remain static until explicit replay')
 page.emulate_media(reduced_motion='reduce');page.locator('.clubhouse-matchup-card [data-finish-replay]').click();page.wait_for_timeout(80)
 assert page.locator('[data-finish-playing]').count()==0
 checks.append('reduced motion shows complete static receipt')
 page.emulate_media(reduced_motion='no-preference');page.locator('.clubhouse-matchup-card [data-finish-replay]').click();page.wait_for_function('!!document.querySelector("[data-finish-playing]")')
 page.evaluate('finishFixture.holdShare=true')
 page.locator('.clubhouse-matchup-card [data-finish-share]').click();page.wait_for_timeout(50)
 before=page.locator('.clubhouse-matchup-card [data-finish-share]').evaluate('e=>e.outerHTML')
 page.evaluate('finishFixture.stops.forEach(stop=>stop());finishFixture.rejectShare(Error("Late native share failure"))');page.wait_for_timeout(50)
 assert page.locator('.clubhouse-matchup-card [data-finish-share]').evaluate('e=>e.outerHTML')==before
 checks.append('late sharing completion leaves stopped surfaces untouched')
 assert page.locator('[data-finish-playing]').count()==0
 assert page.locator('.clubhouse-matchup-card').evaluate('e=>e.getAnimations({subtree:true}).filter(a=>a.constructor===Animation&&a.playState==="running").length')==0
 assert not errors,errors
 checks.append('teardown cancels animation, observers and dialog')
 print(json.dumps({'finishChecks':checks,'errors':errors}),flush=True)
 browser.close()
server.shutdown()
