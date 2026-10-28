"""DFL timeline, memory, multigame and scout: actual controllers, isolated fixtures."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_NETWORK_REVIEW_DIR','/tmp/dfl-network-1503'));OUT.mkdir(parents=True,exist_ok=True);TRADE=Path('/workspace/dfl-trade-review')
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'</head><body><main id="view" class="view" data-route="clubhouse" data-pulse-system="1"><h1>DFL Sunday desk</h1><section id="desk"></section><div id="timeline"></div><div id="memory"></div><div id="award"></div></main></body></html>'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  name=self.path.split('?')[0];body=None
  if name=='/network-review.html':body=html
  if name=='/js/supabase.js':body="export const db=()=>({from:name=>{if(name!=='nfl_highlight_clips')throw Error('Unexpected review database read: '+name);const q={then:(a,b)=>Promise.resolve({data:window.f.clips,error:null}).then(a,b)};for(const k of ['select','gte','lte','gt','order','limit','abortSignal'])q[k]=()=>q;return q}});export const configured=()=>false;export const privilegedFunctionHeaders=()=>({});export const edge=()=>{throw Error('Review writes blocked')};"
  if name=='/js/members.js':body="export const currentMember=()=>null;export const getMemberId=()=>null;export const loadMemberDirectory=async()=>[];"
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/html' if name.endswith('.html') else 'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def translate_path(self,path):
  name=path.split('?')[0];return str(TRADE/name.removeprefix('/trade-review/')) if name.startswith('/trade-review/') else str(ROOT/name.lstrip('/'))
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}';checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,768]:
  for theme in ['light','dark']:
   c=b.new_context(viewport={'width':width,'height':844},has_touch=True,is_mobile=True,service_workers='block')
   def route(r):
    if r.request.url.startswith(base):return r.continue_()
    if r.request.resource_type=='image':return r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())
    return r.abort()
   c.route('**/*',route);pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(base+'/network-review.html#/clubhouse',wait_until='domcontentloaded')
   pg.evaluate('''async theme=>{
    (await import('/js/theme.js')).pinMode(theme);
    const f=window.f={reads:0,selected:[],active:true};
    f.game={id:'5',sides:[{roster:'1',uid:'a',name:'Bastards of the Realm',score:60,lineup:[{id:'1',name:'Tyler Shough',position:'QB',nflTeam:'NO',points:22,slotType:'QB'}],bench:[]},{roster:'2',uid:'b',name:'The Bayou Bombers',score:59,lineup:[],bench:[]}]};f.model={leagueId:'fixture',season:2026,week:7,completed:false,games:[f.game]};
    const lead=(key,at,roster,scores)=>({key,at,kind:'lead',roster,matchupId:'5',text:'Recorded lead change',recap:{sides:f.game.sides.map((s,i)=>({team_name:s.name,points:scores[i],leading:s.roster===roster}))},team:{team_name:f.game.sides.find(s=>s.roster===roster).name}});
    f.moments=[lead('10',Date.parse('2026-10-25T19:00:00Z'),'1',[45,40]),{key:'11',eventKey:'nfl:401873011:401873011981:1',at:Date.parse('2026-10-25T19:01:00Z'),kind:'touchdown',roster:'1',matchupId:'5',text:'Tyler Shough touchdown pass',title:'TD PASS',player:{id:'1',name:'Tyler Shough'},recap:{play:{id:'401873011981',gameId:'401873011',kind:'touchdown',yards:42,text:'A touchdown pass',period:3,clock:'8:20'},players:[{id:'1',name:'Tyler Shough',role:'passer'}]}},lead('12',Date.parse('2026-10-25T19:02:00Z'),'2',[45,52])];
    const clips=await(await fetch('/tools/fixtures/home-highlight-clips.json')).json();f.clips=[{...clips[0],play_id:'401873011981'}];
    f.timeline=(await import('/js/matchup-highlights.js')).mountMatchupHighlights(document.getElementById('view'),{getModel:()=>f.model,getGame:()=>f.game,getHost:()=>document.getElementById('timeline'),getPlayers:()=>({}),load:async()=>({items:f.moments,cursor:null,more:false})});await f.timeline.update();
    const history=[4,5,6].map(week=>({season:2026,week,user1:'a',user2:'b',roster1:1,roster2:2,score1:110,score2:80}));document.getElementById('memory').innerHTML=(await import('/js/banter-memory-ui.js')).banterMemoryMarkup(f.model,f.game,{history});
    const event=(id,teams,state='in')=>({id,date:'2026-10-25T17:00:00Z',status:{type:{state,shortDetail:'Q3 8:20'}},competitions:[{competitors:teams.map((code,i)=>({homeAway:i?'home':'away',team:{abbreviation:code},score:i?'14':'0'}))}]});
    f.board={season:{year:2026,type:2},week:{number:7},events:[event('401873011',['NO','PIT']),event('401900001',['WAS','NYG']),event('401900002',['BUF','KC']),event('401900003',['SF','SEA'],'pre')]};
    const summary=await(await fetch('/tools/fixtures/nfl-game-center-summary.json')).json();
    f.desk=(await import('/js/multigame.js')).mountMultigame(document.getElementById('desk'),{getContext:()=>({...f.model,players:[{id:'1',name:'Tyler Shough',position:'QB',nflTeam:'NO',points:22,isMine:true}]}),active:()=>f.active,member:()=>12,onSelect:id=>{f.selected.push(id);f.desk.select(id)},loadSummary:async game=>{f.reads++;return {summary:game.id==='401873011'?summary:{header:{id:game.id}},fetchedAt:Date.now()}}});await f.desk.update(f.board,'401873011');
    document.getElementById('award').innerHTML=(await import('/js/weekly-clubhouse-ui.js')).weeklyAwardsHtml({week:7,awards:[{key:'high-score',label:'Final boss',winners:[{name:'Bastards of the Realm'}],detail:'142.32 points'}]});
   }''',theme)
   tag=f'{width}px {theme}';pg.wait_for_selector('.multigame-card')
   check(tag+' shows three games with zero scores and actual roster points',pg.locator('.multigame-card').count()==3 and '22.0' in pg.locator('.multigame-card').first.inner_text() and pg.locator('.multigame-score b').first.inner_text()=='0')
   pg.locator('[data-desk-game="401900001"]').click();check(tag+' follows a chosen game with one selected tile',pg.evaluate('f.selected.at(-1)==="401900001"') and pg.locator('[data-desk-game][aria-pressed="true"]').count()==1)
   pg.locator('#multigame-edit>summary').click();check(tag+' a full desk disables adding a fourth game',pg.locator('[data-desk-pin="401900003"]').is_disabled())
   pg.locator('[data-desk-pin="401900002"]').uncheck();pg.locator('[data-desk-pin="401900003"]').check();pg.locator('#multigame-edit>summary').click()
   check(tag+' replaces pinned games without overflowing the three-game limit',pg.locator('[data-desk-game="401900003"]').count()==1 and pg.locator('.multigame-card').count()==3)
   pg.screenshot(path=str(OUT/f'{width}-{theme}-desk.png'))
   pg.locator('.matchup-timeline>summary').click();check(tag+' timeline orders actual saved moments oldest first',pg.locator('[data-timeline-moment]').first.get_attribute('data-timeline-moment')=='10')
   pg.locator('[data-timeline-moment="12"]').click();check(tag+' selecting a lead change shows both recorded scores', '52.00' in pg.locator('.timeline-detail').inner_text() and '45.00' in pg.locator('.timeline-detail').inner_text())
   pg.locator('[data-timeline-filter="plays"]').click();pg.wait_for_selector('.timeline-detail a[href*="clip=50276663"]')
   check(tag+' recorded touchdown opens its exact active video',pg.locator('[data-timeline-moment]').count()==1 and 'moment=nfl%3A401873011%3A401873011981%3A1' in pg.locator('.timeline-detail a').get_attribute('href'))
   pg.locator('[data-timeline-filter="all"]').click();pg.locator('[data-timeline-moment="12"]').click()
   pg.evaluate("f.moments.push({...f.moments[0],key:'13',at:Date.parse('2026-10-25T19:04:00Z')});f.timeline.update({force:true})")
   pg.wait_for_function('document.querySelectorAll("[data-timeline-moment]").length===4');check(tag+' refreshing preserves the open timeline and selected receipt',pg.locator('.matchup-timeline').evaluate('e=>e.open') and pg.locator('[data-timeline-moment="12"]').get_attribute('aria-pressed')=='true')
   pg.locator('.timeline-detail').scroll_into_view_if_needed();pg.wait_for_timeout(220);pg.screenshot(path=str(OUT/f'{width}-{theme}-timeline.png'))
   pg.locator('.banter-memory>summary').click();check(tag+' banter cites a real streak and links to its archived matchup','3 straight' in pg.locator('.banter-memory').inner_text() and pg.locator('.banter-memory a').first.get_attribute('href').startswith('#/clubhouse?season=2026&week=6'))
   pg.locator('.banter-memory').scroll_into_view_if_needed();pg.screenshot(path=str(OUT/f'{width}-{theme}-memory.png'))
   check(tag+' memory and timeline actions retain 44px targets',pg.locator('.timeline-filters button,.timeline-detail a,.banter-memory a').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44)'))
   pg.locator('#award').scroll_into_view_if_needed();pg.wait_for_timeout(450);pg.screenshot(path=str(OUT/f'{width}-{theme}-award.png'))
   check(tag+' theme fits phone edges',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   pg.emulate_media(reduced_motion='reduce');check(tag+' event identity respects reduced motion',pg.locator('.dfl-network-mark i').evaluate_all('es=>es.every(e=>getComputedStyle(e).animationName==="none")'))
   pg.evaluate('f.active=false;f.desk.stop();f.timeline.stop()')
   pg.goto(base+'/trade-review/index.html#/trade?team=1');pg.wait_for_function('window.reviewReady===true')
   pg.evaluate('''async theme=>{
    (await import('/js/theme.js')).pinMode(theme);reviewLeave();const d=window.reviewData;d.teams=d.teams.slice(0,2);
    for(const p of d.pool.values()){const t=p.id.split('-')[0],strong=t==='1'&&p.position==='RB'||t==='2'&&p.position==='WR',weak=t==='1'&&p.position==='WR'||t==='2'&&p.position==='RB';if(strong||weak){p.expectedPoints=(strong?22:8)*17;p.expectedPerGame=strong?22:8;p.tradeValue=strong?70:25}p.injuryStatus='';}
    d.teams=(await import('/js/team-analyzer.js')).analyzeLeague({rosters:d.teams.map(t=>({id:t.id,team_name:t.team_name,players:t.playerIds})),pool:d.pool}).sort((a,b)=>Number(a.id)-Number(b.id));renderReview();
   }''',theme)
   pg.wait_for_selector('.scout-card',state='attached');pg.locator('[data-tb-scout]').click();pg.wait_for_selector('.scout-card:visible')
   check(tag+' scout finds an actual legal two-way upgrade through the full search',pg.locator('.scout-card').count()==1 and '+14.0' in pg.locator('.scout-card').inner_text())
   check(tag+' scout shows both packages, value balance and both projected gains',all(text in pg.locator('.scout-card').inner_text() for text in ['You send','You get','Your lineup','Their lineup','100% balance']))
   pg.locator('.trade-scout').scroll_into_view_if_needed();pg.screenshot(path=str(OUT/f'{width}-{theme}-scout.png'))
   pg.locator('.scout-card [data-td-load-offer]').click();pg.wait_for_selector('[data-td-verdict]');check(tag+' scout review opens the existing fully evaluated ticket',pg.locator('.td-custom').evaluate('e=>e.open'))
   check(tag+' no browser errors or backend writes',not errors);c.close()
 b.close()
server.shutdown()
