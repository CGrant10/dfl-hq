"""Production highlights/recap/share journey with isolated reads and no pushes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_HIGHLIGHTS_REVIEW_DIR',ROOT.parent/'dfl-highlights-review'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('</head>')[0]+'</head>'
html=head+'''<body><main id="view" class="view" data-pulse-system="1" data-page-system="1" style="padding:16px"><h1>Clubhouse</h1><button class="btn" id="other">Other matchup</button><div id="highlights"></div></main><script type="module">
import {mountMatchupHighlights} from './js/matchup-highlights.js';import {savedMoments} from './js/game-day-moments-model.js';import {footballMomentRows} from './js/football-moments.js';import {shareFootballMoment} from './js/football-moment-share.js';import {saveMode} from './js/theme.js';import {reviewTextContrast} from './tools/home-review-contrast.js';
window.theme=saveMode;window.contrast=()=>reviewTextContrast(document.querySelector('.gd-moment-recap[open]')||document.querySelector('#view'));window.motion=true;window.isActive=true;window.fail=false;window.selected='7';window.reads=[];window.held=false;window.release=null;
const wr={id:'7564',name:'Ja’Marr Chase',position:'WR',nflTeam:'CIN',role:'receiver',points:32.2},qb={id:'6770',name:'Joe Burrow',position:'QB',nflTeam:'CIN',role:'passer',points:25.1};
const a={roster:'1',name:'The Bayou Bombers',identity:{team_name:'The Bayou Bombers',accent_color:'#C8102E'},score:121.4,starters:[wr,qb],lineup:[wr,qb]},b={roster:'2',name:'Klutch Sports Group',identity:{team_name:'Klutch Sports Group',accent_color:'#EFC94C'},score:119.2,starters:[{id:'3',name:'Opponent starter',points:20}],lineup:[]};
window.model={leagueId:'fixture',season:2026,week:7,completed:false,games:[{id:'7',isMine:true,sides:[a,b]},{id:'8',sides:[{...a,roster:'3',name:'Other A'},{...b,roster:'4',name:'Other B'}]}]};
const now=Date.now(),make=(id,kind='touchdown')=>({id:String(id),gameId:'999',at:now-1000+(id-100)*100,eligible:true,kind,yards:42,period:3,clock:'4:12',text:'Joe Burrow pass to Ja’Marr Chase for 42 yards, TOUCHDOWN.',players:[wr,qb]});
const rows=footballMomentRows({leagueId:'fixture',season:2026,week:7,now:now+10000,feeds:[{game_id:'999',season:2026,week:7,fetched_at:new Date(now).toISOString(),plays:[make(100),make(101,'big-play'),make(102)]}],rows:[{roster_id:1,matchup_id:7,starters:['7564','6770']},{roster_id:2,matchup_id:7,starters:['3']}]});
window.records=rows.map((r,i)=>({...r,id:i+1,captured_at:new Date(now).toISOString()}));records.push({id:4,league_id:'fixture',season:2026,week:7,matchup_id:7,roster_id:1,kind:'lead',data:{scores:{1:110,2:109}},captured_at:new Date(now+10000).toISOString()});
window.customLoad=async(m,p,options)=>{reads.push({...options});if(held){held=false;await new Promise(r=>release=r)}if(fail)throw Error('Fixture unavailable');const all=records.filter(r=>String(r.matchup_id)===String(options.gameId)&&(!options.eventKey||r.event_key===options.eventKey)&&(!options.before||r.id<options.before)).sort((a,b)=>b.id-a.id),take=options.eventKey?1:3,data=all.slice(0,take);return {items:savedMoments(data,m,p),cursor:data.at(-1)?.id||null,more:all.length>take}};
window.wire=()=>mountMatchupHighlights(document.querySelector('#view'),{getModel:()=>model,getGame:()=>model.games.find(g=>g.id===selected),getHost:()=>document.querySelector('#highlights'),getMotion:()=>motion,active:()=>isActive,load:customLoad});window.live=wire();window.refresh=()=>live.update({force:true});document.querySelector('#other').onclick=()=>{selected=selected==='7'?'8':'7';void refresh()};await refresh();window.ready=true;
</script></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  path=self.path.split('?')[0];body=html if path=='/highlights-review.html' else "export const db=()=>{throw Error('No database in highlights review')};" if path=='/js/supabase.js' else "export const currentMember=()=>null;" if path=='/js/members.js' else None
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/html' if path.endswith('html') else 'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
checks=[];errors=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for theme in ['light','dark']:
  for width in [320,390]:
   c=browser.new_context(viewport={'width':width,'height':844},has_touch=True,service_workers='block');c.route('https://sleepercdn.com/**',lambda r:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()))
   page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/highlights-review.html#/clubhouse?season=2026&week=7&tab=matchups&matchup=7&moment=nfl:999:100:1');page.wait_for_function('ready');page.evaluate('theme',theme);page.evaluate('document.fonts.ready');page.wait_for_timeout(300);tag=f'{theme}/{width}'
   sheet=page.locator('.gd-moment-recap');frame=sheet.locator('.moment-recap-frame:visible')
   check(tag+' alert fetches and opens the exact older play',sheet.evaluate('e=>e.open') and 'TOUCHDOWN' in frame.inner_text() and page.evaluate('reads.some(r=>r.eventKey==="nfl:999:100:1")') and sheet.locator('[data-recap-go="0"]').get_attribute('aria-pressed')=='true')
   check(tag+' long play detail is tucked away until requested',not frame.locator('.moment-play-details').evaluate('e=>e.open'))
   frame.locator('.moment-play-details>summary').click()
   check(tag+' verified play has real player, yards, quarter, clock and description',all(x in frame.inner_text() for x in ['Ja’Marr Chase','42','Q3 · 4:12','Joe Burrow pass']) and 'Fantasy points' not in frame.inner_text())
   check(tag+' play frame and controls fit mobile',sheet.evaluate('e=>{const r=e.getBoundingClientRect(),f=e.querySelector("footer").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&f.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth}') and frame.locator('[data-recap-share]').evaluate('e=>e.offsetHeight>=44'))
   check(tag+' readable themed highlight',not page.evaluate('contrast().failures'))
   page.screenshot(path=str(OUT/f'play-{theme}-{width}.png'))
   frame.locator('[data-recap-share]').click();page.wait_for_selector('.dfl-share-preview canvas',timeout=20000)
   check(tag+' shares through existing clean and photo chooser',page.locator('.dfl-share-preview button[data-share-style="clean"]').is_visible() and page.locator('.dfl-share-preview #dfl-share-player option').count()==2 and page.locator('.dfl-share-preview canvas').evaluate('e=>e.width>=1000&&e.height>=1000'))
   page.locator('button[data-share-style="photo"]').click();page.wait_for_function('document.querySelector(".dfl-share-preview canvas")?.dataset.shareStyle==="photo"');page.locator('[data-share-close]').click();sheet.locator('[data-recap-close]').click();page.wait_for_function('!document.querySelector(".gd-moment-recap").open')
   page.evaluate('void refresh()');page.wait_for_timeout(150);check(tag+' closing an alert does not reopen it on refresh',not sheet.evaluate('e=>e.open'));check(tag+' alert close returns focus to the recap button',page.locator('[data-highlights-recap]').evaluate('e=>e===document.activeElement'))
   check(tag+' highlights lead with readable player names and separate outcomes',page.locator('.moment-summary-copy>strong').evaluate_all('es=>es.every(e=>parseFloat(getComputedStyle(e).fontSize)>=17)') and page.locator('.moment-summary-label').count()>0)
   check(tag+' compact highlight list fits and has useful portraits',page.locator('[data-highlight]').count()==3 and page.locator('.matchup-highlights').evaluate('e=>e.scrollWidth<=e.clientWidth') and page.locator('[data-highlight] .dfl-player-portrait').count()==2)
   page.evaluate('model.completed=true;void refresh()');page.wait_for_timeout(180);page.locator('[data-highlights-recap]').click();page.wait_for_timeout(280);sheet.locator('[data-recap-go]').last.click();page.wait_for_timeout(300)
   check(tag+' postgame frame uses actual finals and top starter',all(x in frame.inner_text() for x in ['121.40','119.20','32.20 pts','Ja’Marr Chase','Last saved lead change']) and 'barely survived' in frame.inner_text())
   check(tag+' final frame fits and remains readable',sheet.evaluate('e=>e.scrollWidth<=e.clientWidth') and not page.evaluate('contrast().failures'))
   page.screenshot(path=str(OUT/f'final-{theme}-{width}.png'));sheet.locator('[data-recap-close]').click();page.wait_for_timeout(260)
   page.locator('[data-highlights-recap]').click();page.wait_for_timeout(260);check(tag+' recap reopens at its default first frame',sheet.locator('[data-recap-go="0"]').get_attribute('aria-pressed')=='true');sheet.locator('[data-recap-close]').click();page.wait_for_timeout(260)
   page.locator('#other').click();page.wait_for_timeout(150);check(tag+' switching matchup never leaks another game highlights',page.locator('[data-highlight]').count()==0 and 'No saved highlights' in page.locator('.matchup-highlights').inner_text())
   page.locator('#other').click();page.wait_for_timeout(150);page.evaluate('held=true;void refresh()');page.wait_for_timeout(50);page.locator('#other').click();page.wait_for_timeout(80);page.evaluate('release()');page.wait_for_timeout(200);check(tag+' late previous-matchup responses are discarded',page.locator('[data-highlight]').count()==0)
   page.evaluate('fail=true;void refresh()');page.wait_for_timeout(150);check(tag+' failed read has a retry',page.locator('[data-highlights-retry]').is_visible());page.evaluate('fail=false');page.locator('[data-highlights-retry]').click();page.wait_for_timeout(150);check(tag+' retry recovers without navigation',page.locator('[data-highlights-retry]').count()==0)
   page.evaluate("selected='7';history.replaceState(null,'','#/clubhouse?season=2026&week=7&tab=matchups&matchup=7&moment=nfl:999:888:1');void refresh()");page.wait_for_timeout(180)
   check(tag+' missing alert never opens an unrelated play',not sheet.evaluate('e=>e.open') and 'This highlight is unavailable' in page.locator('.matchup-highlights').inner_text())
   page.evaluate('window.readCount=reads.length;void live.update()');page.wait_for_timeout(100);check(tag+' missing alert respects normal refresh cadence',page.evaluate('reads.length===readCount'))
   page.evaluate("history.replaceState(null,'','#/clubhouse?season=2026&week=7&tab=matchups&matchup=7');held=true;void refresh()");page.wait_for_timeout(60);page.evaluate('isActive=false;release()');page.wait_for_timeout(100);page.evaluate('isActive=true;void refresh()');page.wait_for_timeout(180)
   check(tag+' returning to a tab after a hidden response can refresh again',page.locator('[data-highlight]').count()==3 and 'unavailable' not in page.locator('.matchup-highlights').inner_text())
   page.evaluate('motion=false');page.emulate_media(reduced_motion='reduce');page.locator('[data-highlight]').first.click();page.wait_for_timeout(270)
   check(tag+' reduced motion opens the chosen highlight without running animations',sheet.evaluate('e=>e.open&&e.getAnimations({subtree:true}).length===0'))
   sheet.locator('[data-recap-close]').click();page.wait_for_timeout(250);page.set_viewport_size({'width':320,'height':480});page.locator('[data-highlight]').first.click();page.wait_for_timeout(270)
   check(tag+' short phone keeps recap controls accessible while content scrolls',sheet.evaluate('e=>{const f=e.querySelector("footer").getBoundingClientRect(),d=e.querySelector(".moment-recap-deck");return f.bottom<=innerHeight&&f.top>=0&&d.scrollHeight>d.clientHeight&&e.scrollWidth<=e.clientWidth}'))
   page.evaluate('live.stop()');check(tag+' teardown removes the recap and listeners',page.locator('.gd-moment-recap').count()==0)
   page.set_viewport_size({'width':width,'height':844})
   page.evaluate('''async()=>{const {mountMomentRecap}=await import('/js/moment-recap.js');const {savedMoments}=await import('/js/game-day-moments-model.js');const row={id:900,league_id:'fixture',season:2026,week:7,matchup_id:7,roster_id:1,player_id:'7564',kind:'surge',captured_at:new Date().toISOString(),data:{points:24.83,delta:8.12}};window.scoreRecap=mountMomentRecap({getMotion:()=>false});scoreRecap.open(savedMoments([row],model),'7')}''')
   score_sheet=page.locator('.gd-moment-recap[open]');check(tag+' point updates use short honest labels without sync jargon',all(text in score_sheet.inner_text() for text in ['Points added','+8.12','16.71','24.83']) and 'sync' not in score_sheet.inner_text().lower() and 'touchdown' not in score_sheet.inner_text().lower())
   page.screenshot(path=str(OUT/f'points-{theme}-{width}.png'));page.evaluate('scoreRecap.stop()')
   c.close()
 check('no browser errors',not errors)
 browser.close()
server.shutdown()
