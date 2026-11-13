"""Actual Clubhouse/Home controllers with isolated league/provider fixtures."""
import json,os,threading
from datetime import datetime,timezone
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_CLUBHOUSE_LIVE_REVIEW_DIR',ROOT.parent/'dfl-clubhouse-live-review'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'</head><body><main id="view" class="view" data-route="clubhouse"></main></body></html>'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  if self.path.startswith('/clubhouse-review.html'):
   self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(html.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
fixture='''
window.f={writes:[],clipReads:0,failClips:false,holdClips:false};
f.members=[1,2,3,4].map(id=>({id,active:true,display_name:'Owner '+id,team_name:['','The Very Long Bayou Bombers','Klutch Sports Group','Bastards of the Realm','The Bear Jew'][id],sleeper_user_id:String(id)}));
f.catalog=Object.fromEntries(Array.from({length:1000},(_,i)=>[String(i+1),{n:'Player '+i,p:['QB','RB','WR','TE','K'][i%5],fp:[],t:'NO',s:'Active'}]));
Object.assign(f.catalog,{'1':{n:'Tyler Shough',p:'QB',t:'NO',s:'Active'},'2':{n:'Chris Olave',p:'WR',t:'NO',s:'Active'},'3':{n:'DK Metcalf',p:'WR',t:'PIT',s:'Active'},'4':{n:'Josh Allen',p:'QB',t:'BUF',s:'Active'},'5':{n:'Jayden Daniels',p:'QB',t:'WAS',s:'Active'},'6':{n:'George Kittle',p:'TE',t:'SF',s:'Active'}});
Object.values(f.catalog).forEach(p=>p.fp=[]);
f.rows=[[1,['1'],['1','2']],[2,['4','3'],['3','4']],[3,['5'],['5']],[4,['0','0','6'],['6']]].map(([roster_id,starters,players])=>({roster_id,matchup_id:Math.ceil(roster_id/2),starters,players,points:100+roster_id,players_points:{'1':22,'2':7,'3':30,'4':12,'5':24,'6':3}}));
f.week={season:2026,week:7,leagueId:'fixture',completed:false,voteClosesAt:'2026-10-29T12:00:00Z',games:[1,2].map(n=>({matchup_id:n,user1:String(n*2-1),user2:String(n*2),roster1:n*2-1,roster2:n*2,score1:100+n*2-1,score2:100+n*2})),threads:[],votes:[]};
f.event=(id,teams)=>({id,date:'2026-10-25T17:00:00Z',status:{period:3,type:{state:'in',description:'Live',shortDetail:'Q3 8:20'}},competitions:[{competitors:teams.map((abbreviation,i)=>({team:{abbreviation},score:'14',homeAway:i===0?'home':'away'}))}]});
f.board={season:{year:2026,type:2},week:{number:7},events:[f.event('401873011',['NO','PIT']),f.event('401900001',['WAS','NYG'])]};
const table=name=>name==='members'?f.members:name==='nfl_player_directory'?{players:f.catalog,fetched_at:new Date().toISOString()}:name==='nfl_highlight_clips'?f.clips||[]:name==='sleeper_leagues'?[{season:2026,sleeper_league_id:'fixture'}]:[];
const rpc=name=>name==='clubhouse_week_index'?[{season:2026,week:7,completed:false},{season:2026,week:6,completed:true}]:name==='clubhouse_week_data'?f.week:name==='nfl_live_week'?[]:null;
const builder=(data,name)=>{const q={then:async(a,b)=>{if(name==='nfl_highlight_clips'){f.clipReads++;if(f.holdClips)await new Promise(r=>f.release=r)}return Promise.resolve({data,error:name==='nfl_highlight_clips'&&f.failClips?{message:'Fixture offline'}:null}).then(a,b)}};for(const k of ['select','order','limit','eq','neq','gte','gt','lte','lt','in','not','is','match','range','abortSignal','contains'])q[k]=()=>q;q.single=q.maybeSingle=()=>q;for(const k of ['insert','update','upsert','delete'])q[k]=()=>{f.writes.push(name+':'+k);return builder(null,name)};return q};
window.fixtureDb={from:name=>builder(table(name),name),rpc:name=>builder(rpc(name),name),functions:{invoke:async()=>({data:null,error:null})},channel:()=>{const c={on:()=>c,subscribe:()=>c};return c},removeChannel:async()=>{}};
'''
checks=[]
if os.environ.get('DFL_CLUBHOUSE_SWIPE_ONLY'):
 fixture+='''
 f.members.push(...Array.from({length:8},(_,i)=>({id:i+5,active:true,display_name:'Owner '+(i+5),team_name:'Fixture Team '+(i+5),sleeper_user_id:String(i+5)})));
 f.week.games=Array.from({length:6},(_,i)=>({matchup_id:i+1,user1:String(i*2+1),user2:String(i*2+2),roster1:i*2+1,roster2:i*2+2,score1:101+i*2,score2:102+i*2}));
 '''
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in ([320,375,390,430,768] if os.environ.get('DFL_CLUBHOUSE_LAYOUT_ONLY') else [320,390]):
  for mode in ['light','dark']:
   c=browser.new_context(viewport={'width':width,'height':844},has_touch=True,is_mobile=True,service_workers='block');c.add_init_script(fixture)
   def route(r):
    u=r.request.url
    if '/npm/@supabase/supabase-js@' in u:return r.fulfill(content_type='text/javascript',body='export const createClient=()=>window.fixtureDb;',headers={'Access-Control-Allow-Origin':'*'})
    if u.startswith(base):return r.continue_()
    if u.endswith('.mp4'):return r.fulfill(content_type='video/mp4',body=(ROOT/'tools/fixtures/highlight-playback.mp4').read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
    if r.request.resource_type=='image':return r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
    data=None
    if 'api.sleeper.app/' in u:
     if '/matchups/' in u:data=f_rows
     elif u.endswith('/rosters'):data=[dict(row,owner_id=str(row['roster_id']),reserve=[],taxi=[]) for row in f_rows]
     elif u.endswith('/users'):data=[{'user_id':str(i),'metadata':{'team_name':['','The Very Long Bayou Bombers','Klutch Sports Group','Bastards of the Realm','The Bear Jew'][i]}} for i in range(1,5)]
     elif '/state/nfl' in u:data={'season':'2026','week':7,'season_type':'regular'}
     elif '/stats/nfl/' in u and '/stats/nfl/2026/' not in u:data={}
     elif '/stats/nfl/' in u:data=[{'player_id':str(i),'season':'2026','week':int(u.split('/stats/nfl/2026/')[1].split('?')[0]),'season_type':'regular','stats':{'gp':1,'pts_ppr':20,'pass_yd':246,'pass_td':2,'rec':7,'rec_yd':96}} for i in range(1,7)]
     else:data={'season':'2026','roster_positions':['QB','WR','TE'],'scoring_settings':{'rec':1},'league_id':'fixture','status':'in_season'}
    elif 'site.api.espn.com/' in u:
     if '/summary?' in u:
      data=json.loads((ROOT/'tools/fixtures/nfl-game-center-summary.json').read_text())
      if '401900001' in u:
       data['header']['id']='401900001';data['drives']={};data['boxscore']={'players':[]};data['scoringPlays']=[]
     else:data=f_board
    if data is not None:return r.fulfill(content_type='application/json',body=json.dumps(data),headers={'Access-Control-Allow-Origin':'*'})
    return r.abort()
   f_rows=[{'roster_id':i,'matchup_id':(i+1)//2,'starters':['1'] if i==1 else ['4','3'] if i==2 else ['5'] if i==3 else ['0','0','6'],'players':['1','2'] if i==1 else ['3','4'] if i==2 else [str(i+2)],'points':100+i,'players_points':{'1':22,'2':7,'3':30,'4':12,'5':24,'6':3}} for i in range(1,5)]
   if os.environ.get('DFL_CLUBHOUSE_SWIPE_ONLY'):
    f_rows += [{'roster_id':i,'matchup_id':(i+1)//2,'starters':[str(i)],'players':[str(i)],'points':100+i,'players_points':{str(i):12}} for i in range(5,13)]
   f_board={'season':{'year':2026,'type':2},'week':{'number':7},'events':[{'id':id,'date':'2026-10-25T17:00:00Z','status':{'period':3,'type':{'state':'in','description':'Live','shortDetail':'Q3 8:20'}},'competitions':[{'competitors':[{'team':{'abbreviation':t},'score':'14','homeAway':'home' if i==0 else 'away'} for i,t in enumerate(teams)]}]} for id,teams in [('401873011',['NO','PIT']),('401900001',['WAS','NYG'])]]}
   c.route('**/*',route);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.clock.install(time=datetime(2026,10,26,20,tzinfo=timezone.utc));page.goto(base+'/clubhouse-review.html#/clubhouse?tab=matchups',wait_until='domcontentloaded')
   page.evaluate('''async mode=>{
    (await import('/js/theme.js')).pinMode(mode);const m=await import('/js/members.js');m.selectMember(f.members[0]);
    const clips=await(await fetch('/tools/fixtures/home-highlight-clips.json')).json();f.clips=[{...clips[0],play_id:'401873011981'},clips[1],{...clips[0],id:'990001',game_id:'401900001',headline:'Jayden Daniels runs for a 30-yard touchdown',game_label:'WAS · NYG',source_url:'https://www.espn.com/video/clip/_/id/990001'}];
    const directory=await(await fetch('/tools/fixtures/nfl-game-center-directory.json')).json();for(const [id,p]of Object.entries(directory))if(!Object.values(f.catalog).some(q=>q.n===p.n&&q.t===p.t))f.catalog[id]=p;f.page=await import('/js/pages/clubhouse.js');document.getElementById('view').dataset.pulseSystem='1';document.getElementById('view').dataset.pageSystem='1';await f.page.render(document.getElementById('view'));f.stopPageSwipe=(await import('/js/ui-motion.js')).mountPageSwipeTabs(document.getElementById('view'));(await import('/js/player-card-actions.js')).mountPlayerCards();window.addEventListener('hashchange',()=>{const tab=new URLSearchParams(location.hash.split('?')[1]||'').get('tab');if(location.hash.startsWith('#/clubhouse')&&tab==='nfl'&&document.querySelector('#clubhouse-tab-'+tab)?.getAttribute('aria-selected')!=='true'){f.page.leave();void f.page.render(document.getElementById('view'))}});
   }''',mode)
   tag=f'{width}px {mode}';page.wait_for_selector('.gd-lineup-comparison',timeout=20000)
   # Recorded histories vary by matchup. Exercise a populated momentum chart
   # inside the real outer grid, rather than checking the empty fixture alone.
   page.evaluate('''async()=>{
    const {momentumMarkup}=await import('/js/matchup-momentum-ui.js'),at=Date.now();
    const game={id:'layout-stress',sides:[{name:'The Very Long Bayou Bombers',starters:[]},{name:'Bastards of the Realm',starters:[]}]};
    const choice={key:'score',kind:'score',at,scores:[112.34,138.54]};
    const view={choice,index:0,start:at-3600000,end:at,points:[choice],paths:[],x:()=>240,y:()=>70,entries:[choice,...['Green Bay Packers','Tucker Kraft','Matthew Golden','Rhamondre Stevenson'].map((name,i)=>({key:'play-'+i,kind:'touchdown',moment:{},player:{name}}))]};
    const probe=document.createElement('div');probe.className='clubhouse-matchup-list';probe.dataset.layoutProbe='';
    probe.innerHTML='<section data-clubhouse-matchup="layout-stress"><article class="clubhouse-game clubhouse-matchup-card">'+momentumMarkup(view,game,{season:2026,week:7})+'</article></section>';
    document.querySelector('.clubhouse-command-center').append(probe);
   }''')
   check(tag+' populated matchup history cannot widen its outer grid',page.locator('[data-layout-probe]').evaluate('''e=>[e,...e.querySelectorAll('[data-clubhouse-matchup],.clubhouse-matchup-card,.matchup-momentum,.momentum-plot,.momentum-events')].every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})'''))
   page.locator('[data-layout-probe]').screenshot(path=str(OUT/f'{width}-{mode}-populated-history.png'))
   page.locator('[data-layout-probe]').evaluate('e=>e.remove()')
   check(tag+' opens on competition with week tools folded',not page.locator('.clubhouse-context').evaluate('e=>e.open') and page.locator('[href="#/analyzer"]').count()>0)
   check(tag+' week control shares the heading without overlap',page.locator('.clubhouse-topline').evaluate('''e=>{const h=e.querySelector('.clubhouse-header').getBoundingClientRect(),s=e.querySelector('summary').getBoundingClientRect();return s.height>=44&&s.left>=h.right-1&&s.top<h.bottom&&s.right<=innerWidth}'''))
   page.evaluate('scrollTo(0,0)');page.wait_for_timeout(700);page.screenshot(path=str(OUT/f'{width}-{mode}-clubhouse-default.png'));page.locator('.clubhouse-matchup-desk').screenshot(path=str(OUT/f'{width}-{mode}-matchup-content.png'))
   check(tag+' starting players are visible on the first phone screen',page.locator('[data-clubhouse-matchup="1"] .gd-lineup-pairs .gd-compare-row').first.evaluate('e=>e.getBoundingClientRect().top<innerHeight-70'))
   check(tag+' matchup uses compact chips and a compact first player pair',page.locator('.clubhouse-matchup-strip').evaluate('e=>e.clientHeight<=56') and page.locator('[data-clubhouse-matchup="1"] .gd-compare-row').first.evaluate('e=>e.clientHeight<=100'))
   if os.environ.get('DFL_CLUBHOUSE_POINTS_ONLY'):
    page.evaluate("f.growCapture=new MutationObserver(()=>{for(const e of document.querySelectorAll('.player-return-score-copy')){const a=e.getAnimations()[0];if(a&&a.playState!=='paused'){a.pause();a.currentTime=180}}});f.growCapture.observe(document.body,{childList:true,subtree:true})")
    page.evaluate('''async()=>{f.page.leave();localStorage.removeItem('dfl.player-points.v1');const {currentMember}=await import('/js/members.js');const {recordViewedPoints}=await import('/js/viewed-player-points.js');const scope=`${currentMember()?.id||'guest'}:2026:7:league`,at=Date.now()-60000;recordViewedPoints(localStorage,scope,'1',18.6,at);recordViewedPoints(localStorage,scope,'4',14.5,at);await f.page.render(document.getElementById('view'))}''')
    page.wait_for_selector('[data-gameday-player="1"]');page.locator('[data-clubhouse-matchup="1"] .gd-compare-row').first.scroll_into_view_if_needed()
    page.wait_for_selector('.player-return-delta')
    page.wait_for_selector('.player-return-score-copy')
    check(tag+' only the gained score grows above the return delta',page.locator('.player-return-score-copy').count()==1 and page.locator('.player-return-score-copy').get_attribute('aria-hidden')=='true')
    check(tag+' real Clubhouse return shows the gained and corrected player points',set(page.locator('.player-return-delta').all_text_contents())=={'+3.4','−2.5'})
    check(tag+' return changes sit alongside their actual player totals',page.locator('[data-viewed-player="1"]').filter(visible=True).inner_text().startswith('22.00') and page.locator('[data-viewed-player="4"]').filter(visible=True).inner_text().startswith('12.00'))
    check(tag+' return changes use the phase slot without covering digits or stats',page.locator('.player-return-delta').evaluate_all('''es=>{const separate=(a,b)=>a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;return es.every(e=>{const r=e.getBoundingClientRect(),score=e.closest('[data-viewed-player]'),stats=score.closest('.gd-compare-player').querySelector('.gd-player-stat-line');return e.parentElement.tagName==='SMALL'&&separate(r,score.querySelector('.gd-thermal-value').getBoundingClientRect())&&(!stats||separate(r,stats.getBoundingClientRect()))})}'''))
    page.screenshot(path=str(OUT/f'{width}-{mode}-clubhouse-return-points.png'))
    check(tag+' real return changes fit without page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors)
    page.evaluate('f.growCapture.disconnect();f.page.leave()');check(tag+' leaving Clubhouse removes return effects',page.locator('.player-return-delta,.player-return-score-copy,[data-return-growing]').count()==0);c.close();continue
   if os.environ.get('DFL_CLUBHOUSE_SWIPE_ONLY'):
    from clubhouse_swipe_review import review_matchup_swipes
    review_matchup_swipes(page,c,check,OUT,tag,width,mode)
    check(tag+' matchup paging has no browser errors or league writes',not errors and page.evaluate('f.writes.every(name=>name.startsWith("app_client_issues:"))'))
    page.evaluate('f.page.leave()');c.close();continue
   if os.environ.get('DFL_CLUBHOUSE_ENTRY_ONLY'):
    for member,own in [(3,'2'),(2,'1')]:
     page.evaluate('''async member=>{f.page.leave();history.replaceState(null,'','#/clubhouse?tab=matchups');const m=await import('/js/members.js');m.selectMember(f.members.find(m=>m.id===member));(await import('/js/page-disclosure.js')).savePageChoice('clubhouse-matchup-2026-7',member===3?'1':'2');await f.page.render(document.getElementById('view'))}''',member)
     page.wait_for_selector('.gd-lineup-comparison')
     check(tag+f' profile {member} opens its own game {own} before any remembered game',page.locator('.clubhouse-matchup-strip [data-clubhouse-game]').first.get_attribute('data-clubhouse-game')==own and page.locator('.clubhouse-matchup-strip [aria-pressed="true"]').get_attribute('data-clubhouse-game')==own and page.locator('[data-clubhouse-duel-game]:not([hidden])').get_attribute('data-clubhouse-duel-game')==own)
     check(tag+f' profile {member} starts the rail at the first matchup',page.locator('.clubhouse-matchup-strip').evaluate('e=>e.scrollLeft<2'))
    page.evaluate('''async()=>{f.page.leave();history.replaceState(null,'','#/clubhouse?tab=matchups&matchup=2');await f.page.render(document.getElementById('view'))}''')
    page.wait_for_selector('.gd-lineup-comparison')
    check(tag+' explicit matchup link opens its target while own matchup stays first',page.locator('.clubhouse-matchup-strip [data-clubhouse-game]').first.get_attribute('data-clubhouse-game')=='1' and page.locator('.clubhouse-matchup-strip [aria-pressed="true"]').get_attribute('data-clubhouse-game')=='2')
    check(tag+' entry has no overflow, browser errors or writes',page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors and not page.evaluate('f.writes'))
    page.evaluate('f.page.leave()');c.close();continue
   page.locator('.clubhouse-context>summary').click()
   if os.environ.get('DFL_CLUBHOUSE_LAYOUT_ONLY'):
    page.locator('#view').evaluate("e=>e.style.paddingInline='16px'")
    for size,reader in [(16,'compact'),(16,'comfortable'),(20,'compact'),(32,'compact')]:
     page.evaluate("([size,reader])=>{document.documentElement.style.fontSize=size+'px';document.documentElement.dataset.readability=reader}",[size,reader]);page.evaluate('document.fonts.ready')
     check(f'{tag}/{size}px/{reader} open week controls fit beside or below the heading',page.locator('.clubhouse-topline').evaluate('''e=>{const h=e.querySelector('.clubhouse-header').getBoundingClientRect(),s=e.querySelector('summary').getBoundingClientRect(),body=e.querySelector('.clubhouse-context-body').getBoundingClientRect();return s.height>=44&&s.left>=0&&s.right<=innerWidth&&(s.left>=h.right-1||s.top>=h.bottom-1)&&body.top>=Math.max(h.bottom,s.bottom)-1&&body.right<=innerWidth+1}'''))
     for tab in ['matchups','highlights','nfl','leaders','overview','recap']:
      page.locator(f'[data-clubhouse-tab="{tab}"]').evaluate('e=>e.click()');page.wait_for_timeout(90)
      metrics=page.locator('.clubhouse-tabs').evaluate('''e=>{
       const r=e.getBoundingClientRect(),buttons=[...e.querySelectorAll('button')],selected=e.querySelector('[aria-selected="true"]'),b=selected.getBoundingClientRect(),marker=e.querySelector('.clubhouse-tab-indicator');
       return {width:e.clientWidth,scroll:e.scrollWidth,height:e.clientHeight,allFit:buttons.every(n=>{const a=n.getBoundingClientRect();return a.left>=r.left-1&&a.right<=r.right+1&&a.top>=r.top-1&&a.bottom<=r.bottom+1&&n.scrollWidth<=n.clientWidth+1}),targets:buttons.every(n=>n.getBoundingClientRect().height>=43.5&&n.getBoundingClientRect().width>=43.5),marker:Math.abs(parseFloat(marker.style.top)-(b.bottom-r.top-2))<1&&Math.abs(parseFloat(marker.style.left)-(b.left-r.left))<1};
      }''')
      bounds=page.locator('.clubhouse-command-center').evaluate('''e=>{const nodes=[e,...e.querySelectorAll('[role="tabpanel"],.clubhouse-section,.clubhouse-matchup-list,[data-clubhouse-matchup],.clubhouse-matchup-card,.clubhouse-game-teams,.clubhouse-game-side,.gd-compare-head,.gd-compare-row,.clubhouse-score-strip,.nfl-scores-fantasy')].filter(n=>n.getClientRects().length);return nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&n.clientWidth<=innerWidth})}''')
      rows=page.locator('.clubhouse-command-center').evaluate('''e=>{
       const separate=(a,b)=>a.right<=b.left+1||a.left>=b.right-1||a.bottom<=b.top+1||a.top>=b.bottom-1;
       const teams=[...e.querySelectorAll('.clubhouse-game-side')].filter(n=>n.getClientRects().length);
       const strips=[...e.querySelectorAll('.clubhouse-strip-team')].filter(n=>n.getClientRects().length);
       const players=[...e.querySelectorAll('[data-ui-player-row]')].filter(n=>n.getClientRects().length);
       const canvas=document.createElement('canvas').getContext('2d');
       const pickers=[...e.querySelectorAll('.clubhouse-week-picker select')];
       return teams.every(n=>{const score=n.querySelector('[data-matchup-score-value]')?.parentElement,logo=n.querySelector('.clubhouse-team-mark'),name=n.querySelector('.clubhouse-matchup-name');return (!score||score.scrollWidth<=score.clientWidth+1)&&(!name||name.scrollWidth<=name.clientWidth+1)&&(!score||!logo||separate(score.getBoundingClientRect(),logo.getBoundingClientRect()))})
        &&strips.every(n=>{const name=n.querySelector('strong'),score=n.querySelector('b');return name.scrollWidth<=name.clientWidth+1&&separate(name.getBoundingClientRect(),score.getBoundingClientRect())})
        &&players.every(n=>{const tap=n.querySelector('.gameday-player-tap'),score=n.querySelector('[data-ui-player-score]'),name=n.querySelector('.dfl-player-copy');return (!name||name.scrollWidth<=name.clientWidth+1)&&(!tap||!score||separate(tap.getBoundingClientRect(),score.getBoundingClientRect()))})
        &&pickers.every(n=>{const s=getComputedStyle(n);canvas.font=s.font;return canvas.measureText(n.selectedOptions[0].text).width<=n.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)+1});
      }''')
      check(f'{tag}/{size}px/{reader}/{tab} all tabs, marker, picker values and rows fit '+json.dumps({**metrics,'rows':rows,'bounds':bounds}),metrics['allFit'] and metrics['targets'] and metrics['marker'] and bounds and rows and metrics['scroll']<=metrics['width']+1)
     page.locator('[data-clubhouse-tab="recap"]').focus();page.keyboard.press('ArrowRight');check(f'{tag}/{size}px/{reader} keyboard wraps to Matchups',page.locator('[data-clubhouse-tab="matchups"]').get_attribute('aria-selected')=='true')
     if size==16 and reader=='compact' or size==32 and width==320:
      page.evaluate('scrollTo(0,0)');page.wait_for_timeout(350);page.screenshot(path=str(OUT/f'{width}-{mode}-{size}-layout.png'))
    check(tag+' no layout browser errors or writes',not errors and not page.evaluate('f.writes'))
    page.evaluate('f.page.leave()');c.close();continue
   check(tag+' one Clubhouse offers Matchups, Highlights and Leaders',page.locator('[data-clubhouse-tab]').count()==6 and page.locator('.gameday-watch').count()==0)
   check(tag+' every Clubhouse tab is fully visible',page.locator('.clubhouse-tabs').evaluate('''e=>{const r=e.getBoundingClientRect();return e.scrollWidth<=e.clientWidth+1&&[...e.querySelectorAll('button')].every(n=>{const b=n.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&n.scrollWidth<=n.clientWidth+1})}'''))
   check(tag+' player rows lead the live scoring targets',page.locator('[data-clubhouse-matchup="1"] .gd-lineup-comparison').evaluate('e=>{const players=e.querySelector(".gd-lineup-pairs"),targets=e.querySelector(".matchup-targets");return !!players&&(!targets||!!(players.compareDocumentPosition(targets)&Node.DOCUMENT_POSITION_FOLLOWING))}'))
   check(tag+' live matchup keeps both starting lineups side by side',page.locator('[data-clubhouse-matchup="1"] [data-gameday-player]').count()>=3)
   page.wait_for_function('document.querySelector("[data-clubhouse-matchup=\\"1\\"] .clubhouse-matchup-card")?.dataset.matchupState==="live"')
   page.wait_for_function("""document.querySelector('[data-clubhouse-duel-game="1"] .clubhouse-matchup-state')?.dataset.state==='live'""")
   check(tag+' live styling follows the actual NFL phase',page.locator('[data-clubhouse-duel-game="1"] .clubhouse-matchup-state').text_content().strip()=='Live')
   check(tag+' hides highlight loading until its tab is opened',page.evaluate('f.clipReads===0'))
   check(tag+' week tools retain both NFL viewing shortcuts with full touch targets',page.locator('.clubhouse-context [data-clubhouse-nfl-open]').count()==2 and page.locator('[data-clubhouse-nfl-open]').evaluate_all('es=>es.every(e=>e.clientHeight>=44)'))
   check(tag+' matchups are visible as logo-and-score tiles without a dropdown',page.locator('.clubhouse-matchup-strip [data-clubhouse-game]').count()==2 and page.locator('[data-matchup-select]').count()==0 and page.locator('.clubhouse-matchup-strip').is_visible())
   page.locator('[data-clubhouse-game="2"]').evaluate('e=>e.click()');check(tag+' tapping a matchup tile changes the exact matchup',not page.locator('[data-clubhouse-matchup="2"]').get_attribute('hidden'))
   page.locator('[data-clubhouse-game="1"]').evaluate('e=>e.click()');check(tag+' tapping the first tile restores the first game',page.locator('[data-clubhouse-game="1"]').get_attribute('aria-pressed')=='true')
   check(tag+' lineups precede team status and supporting details',page.locator('[data-clubhouse-matchup="1"] .clubhouse-matchup-card').evaluate('e=>!!(e.querySelector("[data-clubhouse-lineup]").compareDocumentPosition(e.querySelector("[data-clubhouse-team-stats]"))&Node.DOCUMENT_POSITION_FOLLOWING)'))
   page.wait_for_timeout(350)
   check(tag+' matchup chooser is a compact native horizontal rail',page.locator('.clubhouse-scoreboard-grid').evaluate('e=>getComputedStyle(e).gridAutoFlow==="column"&&getComputedStyle(e).overflowX==="auto"&&e.clientHeight<180'))
   rail=page.locator('.clubhouse-scoreboard-grid');rail.scroll_into_view_if_needed();page.wait_for_timeout(150)
   bounds=rail.bounding_box();first=rail.locator('button').first.bounding_box();x=min(first['x']+first['width']+5,bounds['x']+bounds['width']-8);y=first['y']+first['height']/2
   cdp=c.new_cdp_session(page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   for step in range(1,9):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-step*max(13,first['width']*.75/8),'y':y}]});page.wait_for_timeout(18)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(250)
   check(tag+' native matchup swipes do not switch Clubhouse tabs',rail.evaluate('e=>e.scrollWidth<=e.clientWidth+1||e.scrollLeft>20') and page.locator('#clubhouse-tab-matchups').get_attribute('aria-selected')=='true')
   rail.evaluate('e=>e.scrollLeft=0');page.evaluate('scrollTo(0,0)');page.wait_for_timeout(750)
   page.screenshot(path=str(OUT/f'{width}-{mode}-clubhouse-entry.png'))
   if os.environ.get('DFL_INTERFACE_AUDIT'):
    page.evaluate('document.fonts.ready')
    rail.locator('button').last.evaluate('e=>e.click()');page.wait_for_timeout(150)
    check(tag+' selected matchup is visible without moving the whole page rail',rail.evaluate('''e=>{const a=e.querySelector('[aria-pressed="true"]').getBoundingClientRect(),r=e.getBoundingClientRect();return a.left>=r.left-1&&a.right<=r.right+1}'''))
    rail.locator('button').first.evaluate('e=>e.click()');page.evaluate('scrollTo(0,0)');page.wait_for_timeout(450)
    interface=page.locator('.clubhouse-command-center').evaluate('''e=>({
     title:getComputedStyle(e.querySelector('h1')).fontFamily,
     tab:getComputedStyle(e.querySelector('[data-clubhouse-tab]')).fontFamily,
     picker:getComputedStyle(e.querySelector('#clubhouse-week')).fontFamily,
     names:[...e.querySelectorAll('.clubhouse-matchup-name strong')].filter(n=>n.getClientRects().length).every(n=>n.scrollWidth<=n.clientWidth+1),
     targets:[...e.querySelectorAll('[data-clubhouse-tab],.clubhouse-week-picker select,[data-clubhouse-nfl-open]')].filter(n=>n.getClientRects().length).every(n=>n.getBoundingClientRect().height>=44),
     overflow:document.documentElement.scrollWidth>innerWidth+1
    })''')
    check(tag+' shared interface family, fitting names and touch controls '+json.dumps(interface),all('Inter' in interface[k] for k in ['title','tab','picker']) and interface['names'] and interface['targets'] and not interface['overflow'])
    page.locator('[data-clubhouse-duel-game="1"] .clubhouse-game-teams').screenshot(path=str(OUT/f'{width}-{mode}-identity.png'))
    page.locator('[data-clubhouse-matchup="1"] .gd-lineup-comparison').screenshot(path=str(OUT/f'{width}-{mode}-lineup.png'))
    check(tag+' a duplicate sticky score strip does not compete with the header',not page.locator('[data-clubhouse-matchup="1"] .clubhouse-score-strip').is_visible())
    page.evaluate('''async()=>{const {mountPageScrollMotion}=await import('/js/page-scroll-motion.js'),{animateUi,cancelUiMotion}=await import('/js/ui-motion.js');f.stopScroll=mountPageScrollMotion(document.querySelector('#view'),{animate:animateUi,cancel:cancelUiMotion});document.querySelector('[data-clubhouse-matchup="1"] .gd-lineup-comparison').scrollIntoView({block:'start',behavior:'instant'})}''')
    page.wait_for_function('document.querySelector(".dfl-scroll-context.is-matchup")?.hidden===false')
    check(tag+' scrolling reference keeps the selected full names and exact totals',page.locator('.dfl-scroll-scores').evaluate('''e=>{const source=[...document.querySelectorAll('[data-clubhouse-matchup="1"] .clubhouse-strip-team')];return [...e.children].length===2&&[...e.children].every((side,i)=>side.querySelector('small').textContent===source[i].querySelector('strong').textContent&&side.querySelector('b').textContent===source[i].querySelector('b').textContent)}'''))
    page.locator('.dfl-scroll-context').screenshot(path=str(OUT/f'{width}-{mode}-score-reference.png'))
    page.evaluate('f.stopScroll()')
    page.evaluate('scrollTo(0,0)')
   page.locator('#clubhouse-tab-highlights').click()
   try:page.wait_for_selector('[data-home-reel-clip]',timeout=15000)
   except Exception:
    print('REEL DEBUG',page.evaluate('async()=>({reads:f.clipReads,now:Date.now(),session:(await import("/js/home-highlight-model.js")).highlightSession(),activeRows:(await import("/js/home-highlight-model.js")).activeHighlightClips(f.clips).length,scope:document.querySelector("[data-clubhouse-reel-slot]").innerText,view:document.querySelector("#clubhouse-panel-highlights").hidden,lineups:[...document.querySelectorAll("[data-gameday-player]")].map(e=>e.textContent.slice(0,70))})'),errors,flush=True)
    page.screenshot(path=str(OUT/'debug.png'));raise
   check(tag+' Your team matches the actual weekly roster',page.locator('[data-home-reel-clip]').count()==1 and 'Tyler Shough' in page.locator('.home-reel-cards').inner_text())
   check(tag+' personal player chips only offer roster-matched players',page.locator('[data-reel-player-filter="1"]').count()==1 and page.locator('[data-reel-player-filter="3"],[data-reel-player-filter="5"]').count()==0)
   page.screenshot(path=str(OUT/f'{width}-{mode}-highlights.png'))
   page.locator('[data-home-reel-open]').click();page.wait_for_function('document.querySelector(".home-reel-player video")?.currentTime>0.1')
   check(tag+' personal reel plays inside Clubhouse from clip one',page.locator('[data-reel-count]').inner_text()=='1 / 1' and page.locator('#home-reel-player-title').text_content()=='DFL REPLAY' and page.locator('[data-reel-choose]').count()==1 and 'Tyler Shough' in page.locator('[data-reel-headline]').inner_text() and page.locator('[data-team-reel-scope="mine"]').get_attribute('aria-pressed')=='true')
   page.locator('[data-reel-layout="browse"]').click();page.locator('[data-reel-search]').fill('Metcalf');check(tag+' personal search stays restricted to your team',page.locator('[data-reel-choose]').count()==0)
   page.locator('.reel-search-row [data-reel-clear]').click()
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".home-reel-player").open')
   reads_before_scope=page.evaluate('f.clipReads')
   page.locator('[data-team-reel-scope="matchup"]').click();page.wait_for_function('document.querySelectorAll("[data-home-reel-clip]").length===2')
   check(tag+' This matchup includes both rosters without other teams',page.locator('[data-home-reel-clip]').count()==2)
   page.locator('[data-team-reel-scope="league"]').click();page.wait_for_function('document.querySelectorAll("[data-home-reel-clip]").length===3')
   check(tag+' League clips stay inside the selected NFL week',page.locator('[data-home-reel-clip]').count()==3)
   check(tag+' scope switches reuse the same fresh clip metadata',page.evaluate('f.clipReads')==reads_before_scope)
   check(tag+' highlights use compact two-column game groups',page.locator('.reel-game-group').count()==2 and page.locator('.home-reel-grid').first.evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length===2'))
   page.screenshot(path=str(OUT/f'{width}-{mode}-league-grid.png'))
   # Real touch input: the page's delegated swipe must not consume this strip.
   page.evaluate("document.querySelector('.home-reel-players').scrollLeft=0")
   chip_rail=page.locator('[data-clubhouse-reel-slot] .home-reel-players');chip_rail.scroll_into_view_if_needed();box=chip_rail.bounding_box();cdp=c.new_cdp_session(page)
   def swipe(a,b):
    y=box['y']+box['height']/2
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':a,'y':y}]})
    for i in range(1,11):
     cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':a+(b-a)*i/10,'y':y}]});page.wait_for_timeout(16)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(250)
   swipe(box['x']+box['width']-15,box['x']+15);scrolled=chip_rail.evaluate('e=>e.scrollLeft')
   check(tag+' native player browsing swipes forward without changing Clubhouse tabs',scrolled>10 and page.locator('#clubhouse-tab-highlights').get_attribute('aria-selected')=='true')
   swipe(box['x']+15,box['x']+box['width']-15)
   check(tag+' native player browsing swipes back',chip_rail.evaluate('e=>e.scrollLeft')<scrolled)
   page.locator('[data-home-reel-game]').select_option('401900001');check(tag+' choosing an NFL game narrows the grid',page.locator('[data-home-reel-clip]').count()==1)
   page.locator('[data-home-reel-game]').select_option('');page.locator('[data-home-reel-search]').fill('Metcalf');check(tag+' grid search finds the requested player',page.locator('[data-home-reel-clip]').count()==1);page.locator('[data-home-reel-search]').fill('')
   page.locator('[data-clubhouse-nfl-open="plays"]').click();page.wait_for_selector('[data-nfl-center-rail] [data-replay-game="401873011"]',state='attached');page.wait_for_selector('.nfl-center-plays li',timeout=15000)
   check(tag+' NFL view removes unrelated league matchup chrome',page.locator('.clubhouse-duel-host').is_hidden() and page.locator('[data-clubhouse-scoreboard]').is_hidden())
   check(tag+' NFL stays inside Clubhouse with usable section navigation',page.locator('#clubhouse-panel-nfl [data-clubhouse-nfl-center]').count()==1 and page.locator('[data-nfl-fullscreen],[data-nfl-close]').count()==0 and not page.locator('.clubhouse-page').evaluate('e=>e.inert') and page.locator('#clubhouse-tab-matchups').is_visible())
   check(tag+' NFL game center shows the full play-by-play',page.locator('.nfl-center-plays li').count()>100)
   check(tag+' selected NFL game is fully readable',page.locator('[data-nfl-center-rail] [aria-pressed="true"]').evaluate('e=>e.scrollWidth<=e.clientWidth+1&&e.getBoundingClientRect().height>=44'))
   page.locator('[data-nfl-center-filter]').select_option('big');check(tag+' big plays show full names and a compact emphasized result',page.locator('.nfl-center-plays [data-play-kind="big-play"]').count()>0 and page.locator('.nfl-center-plays [data-play-kind="big-play"] .nfl-play-headline').evaluate_all('es=>es.length>0&&es.every(e=>parseFloat(getComputedStyle(e).fontSize)===14)'))
   play=page.locator('.nfl-center-plays [data-play-kind="big-play"]').first;check(tag+' full NFL descriptions are always visible',play.locator('.nfl-play-details>p:not(.nfl-feed-people)').is_visible() and page.locator('.nfl-center-plays details,.nfl-center-plays summary').count()==0)
   page.screenshot(path=str(OUT/f'{width}-{mode}-nfl-big-plays.png'))
   page.locator('[data-nfl-center-filter]').select_option('scoring');check(tag+' NFL scoring filter is precise',page.locator('.nfl-center-plays li').count()>2 and page.locator('.nfl-center-plays li').count()<20)
   page.locator('[data-nfl-center-mode="fantasy"]').click();check(tag+' fantasy overview identifies your players and league scoring',page.locator('[data-nfl-your-player]').count()>0 and page.locator('[data-nfl-your-player] [data-viewed-source="league"]').count()>0)
   page.wait_for_timeout(650)
   check(tag+' Stats starts below the compact toolbar without the Live hero',page.locator('.nfl-game-hero').count()==0 and page.locator('.nfl-quarter-wrap').bounding_box()['y']>=page.locator('.nfl-center-tools').bounding_box()['y'])
   check(tag+' fantasy is its own selected view',page.locator('#clubhouse-tab-nfl').get_attribute('aria-selected')=='true' and page.locator('.nfl-live-stats').is_visible() and page.locator('.nfl-live-plays').count()==0 and page.locator('[data-nfl-center-mode="fantasy"]').get_attribute('aria-pressed')=='true')
   check(tag+' NFL teams and player stats sit side by side',page.locator('.nfl-position-pair').count()>0 and page.locator('.nfl-score-player.is-away').first.bounding_box()['x']<page.locator('.nfl-score-player.is-home').first.bounding_box()['x'])
   check(tag+' each stat column contains only its NFL team',page.locator('.nfl-score-player').evaluate_all('es=>es.every(e=>e.querySelector(".nfl-score-position").textContent.includes(e.classList.contains("is-home")?"NO":"PIT"))'))
   check(tag+' player names and scores fit their columns',page.locator('.nfl-score-player').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'))
   page.screenshot(path=str(OUT/f'{width}-{mode}-nfl-fantasy.png'))
   page.evaluate("document.documentElement.style.fontSize='32px'");page.wait_for_timeout(60)
   check(tag+' NFL controls and side-by-side stats fit at 200% text',page.evaluate('document.documentElement.scrollWidth<=innerWidth') and page.locator('.nfl-score-player').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'))
   page.screenshot(path=str(OUT/f'{width}-{mode}-nfl-large-text.png'));page.evaluate("document.documentElement.style.fontSize=''")

   nfl_player=page.locator('.nfl-score-player[data-nfl-your-player] [data-player-card]').first;nfl_player.scroll_into_view_if_needed();nfl_id=nfl_player.get_attribute('data-player-card');nfl_player.click();page.wait_for_selector('.dfl-player-card .player-card-recent');page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")')
   check(tag+' NFL player cards open the week being viewed',page.locator('.dfl-player-card').get_attribute('data-player-season')=='2026' and page.locator('.dfl-player-card [data-player-game-week="7"]').get_attribute('aria-pressed')=='true')
   page.locator('[data-player-card-close]').click();page.wait_for_function('!document.querySelector(".dfl-player-card[open]")')
   check(tag+' player-card close returns to the same NFL stat row',nfl_player.evaluate('e=>e===document.activeElement'))

   check(tag+' NFL controls keep 44px touch targets',page.locator('[data-clubhouse-nfl-center] button,[data-clubhouse-nfl-center] select').evaluate_all('es=>es.filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=44)'))
   nfl_contrast=page.locator('[data-clubhouse-nfl-center]').evaluate('''root=>{
    const ctx=document.createElement('canvas').getContext('2d'),rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]},lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    return Math.min(...[...root.querySelectorAll('.nfl-scores-fantasy small,.nfl-scores-fantasy p,.nfl-scores-fantasy b,.nfl-center-modes button,.nfl-center-status')].map(e=>{let p=e,bg;while(p){bg=rgb(getComputedStyle(p).backgroundColor);if(bg[3]===255)break;p=p.parentElement}const a=lum(rgb(getComputedStyle(e).color)),b=lum(bg||[255,255,255,255]);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}));
   }''')
   check(tag+' NFL stats, scoring and game controls meet 4.5:1 contrast',nfl_contrast>=4.5)

   page.locator('[data-nfl-center-rail] [data-replay-game="401900001"]').click();page.wait_for_selector('.nfl-center-empty');check(tag+' switching NFL games never leaks the previous game’s stats',page.locator('.nfl-scores-fantasy article').count()==0)
   page.locator('[data-nfl-center-rail] [data-replay-game="401873011"]').click();page.locator('[data-nfl-center-mode="plays"]').click();page.wait_for_selector('.nfl-center-plays li[id]')
   check(tag+' returning to an NFL game restores its chosen filter',page.locator('[data-nfl-center-filter]').input_value()=='scoring')
   page.locator('[data-nfl-center-filter]').select_option('all')
   reading=page.locator('.nfl-center-plays li[id]').nth(12);reading.evaluate('e=>e.scrollIntoView({block:"center"})');reading_id=reading.get_attribute('id');reading_top=reading.bounding_box()['y']
   page.locator('[data-nfl-center-mode="fantasy"]').click();page.wait_for_selector('.nfl-score-player');page.locator('[data-nfl-center-mode="plays"]').click()
   check(tag+' separate views restore the exact play reading row',page.locator('#'+reading_id+' .nfl-play-details>p').is_visible() and page.locator('.nfl-live-stats').count()==0 and abs(page.locator('#'+reading_id).bounding_box()['y']-reading_top)<3)
   page.locator('[data-nfl-center-clip]').first.evaluate('e=>e.scrollIntoView({block:"center"})');page.wait_for_timeout(60)
   source=page.locator('[data-nfl-center-clip]').first;source.evaluate('e=>e.addEventListener("click",()=>f.clipSourceTop=e.getBoundingClientRect().top,{once:true,capture:true})');source.click();page.wait_for_function('document.querySelector(".home-reel-player")?.open')
   check(tag+' watching a play keeps the NFL game selected underneath',page.locator('#clubhouse-tab-nfl').get_attribute('aria-selected')=='true' and page.locator('[data-reel-close]').get_attribute('aria-label')=='Back to game')
   page.locator('[data-reel-close]').click();page.wait_for_function('!document.querySelector(".home-reel-player").open');page.wait_for_timeout(40)
   check(tag+' Back from a clip restores that exact play and focus',source.evaluate('e=>e===document.activeElement') and abs(source.bounding_box()['y']-page.evaluate('f.clipSourceTop'))<3)
   source.click();page.wait_for_function('document.querySelector(".home-reel-player")?.open')
   check(tag+' a play opens its exact video in the replay studio',page.locator('[data-reel-choose][aria-pressed="true"]').get_attribute('data-reel-choose')=='50276663')
   page.locator('[data-reel-layout="browse"]').click();page.locator('[data-reel-search]').fill('Metcalf');page.locator('[data-reel-mode="plays"]').click();page.wait_for_selector('.reel-game-browser .nfl-center-plays li');check(tag+' the video viewer includes the same NFL game center',page.locator('.reel-game-browser .nfl-center-plays li').count()>100)
   page.evaluate('f.statsVideo=document.querySelector(".home-reel-player video")');page.locator('[data-reel-mode="stats"]').click();page.wait_for_selector('.reel-game-browser .nfl-position-pair')
   check(tag+' replay uses the same two-column stats without replacing video',page.locator('.reel-game-browser .nfl-position-pair').count()>0 and page.evaluate('f.statsVideo===document.querySelector(".home-reel-player video")'));page.screenshot(path=str(OUT/f'{width}-{mode}-replay-stats.png'))
   check(tag+' replay matchup rail uses the observed final score',page.locator('[data-replay-game-strip] .replay-game[aria-pressed="true"] .replay-game-sides b').all_text_contents()==['16','10'] and page.locator('[data-replay-game-strip] .replay-game[aria-pressed="true"]>small').inner_text()=='Final')
   page.evaluate("document.documentElement.style.fontSize='32px'");page.wait_for_timeout(60)
   check(tag+' replay remains usable at 200% text',page.locator('.home-reel-player').evaluate('e=>e.scrollWidth<=e.clientWidth') and page.locator('[data-reel-close]').evaluate('e=>{const a=e.getBoundingClientRect(),b=e.closest("dialog").getBoundingClientRect();return a.right<=b.right&&a.height>=44}'))
   check(tag+' enlarged replay tabs show complete labels',page.locator('.reel-browser-modes button').evaluate_all('es=>es.every(e=>{const r=document.createRange();r.selectNodeContents(e);const t=r.getBoundingClientRect(),b=e.getBoundingClientRect();return t.left>=b.left&&t.right<=b.right&&t.top>=b.top&&t.bottom<=b.bottom})'))
   check(tag+' enlarged stats retain a clear workspace',not page.locator('.home-reel-stage').is_visible() and page.locator('.reel-game-browser').evaluate('e=>e.clientHeight>=250'))
   page.screenshot(path=str(OUT/f'{width}-{mode}-replay-large-text.png'));page.evaluate("document.documentElement.style.fontSize=''");page.locator('[data-reel-mode="plays"]').click();page.wait_for_selector('.reel-game-browser [data-nfl-center-clip]')
   page.screenshot(path=str(OUT/f'{width}-{mode}-replay-game-center.png'));replay_play=page.locator('.reel-game-browser [data-nfl-center-clip]').first;replay_play.scroll_into_view_if_needed();page.wait_for_timeout(80);replay_top=replay_play.bounding_box()['y'];replay_play.click();check(tag+' watching a play clears the old clip search visibly and starts the exact video',page.locator('[data-reel-search]').input_value()=='' and page.locator('[data-reel-choose][aria-pressed="true"]').get_attribute('data-reel-choose')=='50276663')
   check(tag+' replay offers a direct return to the selected play',page.locator('[data-reel-mode="plays"]').inner_text()=='Back to play')
   page.locator('[data-reel-mode="plays"]').click();page.wait_for_timeout(360)
   check(tag+' returning restores the exact play and its keyboard focus',replay_play.evaluate('e=>e===document.activeElement') and abs(replay_play.bounding_box()['y']-replay_top)<3)
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".home-reel-player").open')
   page.locator('#clubhouse-tab-matchups').click();page.wait_for_selector('#clubhouse-tab-matchups[aria-selected="true"]');page.locator('#clubhouse-tab-leaders').click();page.wait_for_selector('.gd-league-board .gameday-player')
   page.evaluate('f.leaderCanvas=document.querySelector("[data-clubhouse-leaders] .gd-vfx-canvas")')
   check(tag+' Leaders has its connected fire and ice surface',page.evaluate('!!f.leaderCanvas?.isConnected'))
   check(tag+' Leaders moved into Clubhouse with hot and cold filters',page.locator('[data-league-filter]').count()==3 and page.locator('[data-league-bench]').count()==1)
   page.locator('[data-league-filter="hot"]').click();check(tag+' hot filter returns only hot players',page.locator('.gd-league-board .gameday-player').count()>=1 and page.locator('.gd-league-board [data-score-temperature="cold"]').count()==0)
   page.locator('[data-league-filter="all"]').click();count=page.locator('.gd-league-board .gameday-player').count();page.locator('[data-league-bench]').check();check(tag+' bench checkbox adds bench players',page.locator('.gd-league-board .gameday-player').count()>count)
   check(tag+' filter and bench changes preserve the same effects surface',page.evaluate('f.leaderCanvas?.isConnected&&f.leaderCanvas===document.querySelector("[data-clubhouse-leaders] .gd-vfx-canvas")&&document.querySelectorAll("[data-clubhouse-leaders] .gd-vfx-canvas").length===1'))
   f_rows[0]['players_points']['1']=23.5
   page.locator('[data-matchup-refresh]').evaluate('e=>e.click()')
   page.wait_for_function('document.querySelector("[data-clubhouse-leaders] [data-gameday-score-key=\\"1:1\\"] .gd-thermal-value")?.textContent==="23.50"')
   check(tag+' a live score refresh keeps the effects surface connected',page.evaluate('f.leaderCanvas?.isConnected&&f.leaderCanvas===document.querySelector("[data-clubhouse-leaders] .gd-vfx-canvas")'))
   page.locator('#clubhouse-tab-matchups').click();page.locator('#clubhouse-tab-leaders').click()
   check(tag+' returning to Leaders preserves fire and ice',page.evaluate('f.leaderCanvas?.isConnected&&f.leaderCanvas===document.querySelector("[data-clubhouse-leaders] .gd-vfx-canvas")'))
   check(tag+' NFL scoreboard is available in Clubhouse',page.locator('.clubhouse-nfl-scoreboard').count()==1)
   page.screenshot(path=str(OUT/f'{width}-{mode}-leaders.png'))
   check(tag+' leader portraits and rows stay compact',page.locator('.gd-league-board .dfl-player-portrait').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().width<=40&&e.getBoundingClientRect().height<=44)') and page.locator('.gd-league-board .gameday-player').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height<150)'))
   page.screenshot(path=str(OUT/f'{width}-{mode}-leaders.png'))
   check(tag+' phone edges remain clear',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   check(tag+' live controls retain 44px targets',page.locator('.gd-league-controls button,.gameday-player-tap,[data-clubhouse-tab]').evaluate_all('es=>es.filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=44)'))
   contrast=page.locator('[data-clubhouse-leaders]').evaluate('''root=>{
    const ctx=document.createElement('canvas').getContext('2d'),rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]},lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    return Math.min(...[...root.querySelectorAll('.dfl-player-copy strong,.dfl-player-copy small,.gd-player-week-detail,.gd-league-controls button')].map(e=>{let p=e,bg;while(p){bg=rgb(getComputedStyle(p).backgroundColor);if(bg[3]===255)break;p=p.parentElement}const a=lum(rgb(getComputedStyle(e).color)),b=lum(bg||[255,255,255,255]);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}));
   }''')
   check(tag+' names, metadata and filters meet 4.5:1 contrast',contrast>=4.5)
   page.locator('#clubhouse-tab-highlights').click();page.locator('[data-team-reel-scope="mine"]').click();page.wait_for_function('document.querySelectorAll("[data-home-reel-clip]").length===1')
   page.evaluate('f.failClips=true');page.clock.run_for(31000);page.evaluate('dispatchEvent(new Event("focus"))');page.wait_for_timeout(180)
   check(tag+' failed refresh retains the correct personal clips',page.locator('[data-home-reel-clip]').count()==1)
   page.evaluate('f.failClips=false;f.holdClips=true');page.locator('[data-team-reel-scope="league"]').click();page.wait_for_function('typeof f.release==="function"');page.locator('[data-team-reel-scope="mine"]').click();page.evaluate('f.holdClips=false;f.release()');page.wait_for_function('document.querySelectorAll("[data-home-reel-clip]").length===1')
   check(tag+' rapid scope changes reject the old request',page.locator('[data-team-reel-scope="mine"]').get_attribute('aria-pressed')=='true' and 'Tyler Shough' in page.locator('.home-reel-cards').inner_text())
   page.emulate_media(reduced_motion='reduce');page.locator('#clubhouse-tab-recap').click();page.locator('#clubhouse-tab-highlights').click()
   check(tag+' reduced motion and distant tabs remain usable',page.locator('#clubhouse-tab-highlights').get_attribute('aria-selected')=='true' and page.locator('#clubhouse-panel-highlights').is_visible())
   page.evaluate('f.failClips=false');page.locator('[data-home-reel-open]').click();page.evaluate('f.keepVideo=document.querySelector(".home-reel-player video");f.stopPageSwipe();f.page.leave()')
   check(tag+' leaving Clubhouse removes the reel and stops playback',page.locator('.home-reel-player').count()==0 and page.evaluate('f.keepVideo.paused&&!f.keepVideo.hasAttribute("src")'))
   page.evaluate("async()=>{location.hash='#/clubhouse?season=2026&week=7&tab=highlights&matchup=1&moment=nfl:401873011:401873011981:1&nflGame=401873011&clip=50276663';await f.page.render(document.getElementById('view'))}")
   page.wait_for_selector('.home-reel-player[open]');check(tag+' video notification deep link opens the exact clip automatically',page.locator('[data-reel-choose][aria-pressed="true"]').get_attribute('data-reel-choose')=='50276663')
   page.evaluate('f.page.leave()')
   page.evaluate("async()=>{location.hash='#/clubhouse?season=2026&week=7&tab=highlights&matchup=1&moment=nfl:401873011:401873011981:1&nflGame=401873011&clip=999999';await f.page.render(document.getElementById('view'))}")
   page.wait_for_selector('#clubhouse-tab-nfl[aria-selected="true"]');page.wait_for_selector('.nfl-center-plays li')
   check(tag+' missing video deep link falls back to the game’s play-by-play',page.locator('.home-reel-player[open]').count()==0 and 'no longer available' in page.locator('[data-clubhouse-nfl-center]').inner_text() and page.locator('[data-clubhouse-nfl-center][data-nfl-selected-game]').get_attribute('data-nfl-selected-game')=='401873011')
   page.evaluate('f.page.leave()')
   if width==390 and mode=='dark':
    page.evaluate("async()=>{location.hash='#/clubhouse?season=2026&week=7&tab=highlights&player=3&query=DK%20Metcalf';await f.page.render(document.getElementById('view'))}")
    page.wait_for_function('document.querySelectorAll("[data-home-reel-clip]").length===1&&document.querySelector(".home-reel-cards").textContent.includes("Metcalf")')
    check('player-card highlight route shows that player across the league',page.locator('[data-team-reel-scope="league"]').get_attribute('aria-pressed')=='true')
    page.locator('[data-home-reel-search]').fill('Shough');page.evaluate("f.page.leave();document.getElementById('view').dataset.routeReturning='true'")
    page.evaluate("async()=>{await f.page.render(document.getElementById('view'))}")
    page.wait_for_selector('[data-home-reel-search]')
    page.wait_for_function('document.querySelector("[data-home-reel-search]").value==="Shough"')
    check('Back preserves changed clip filters over the original player link',page.locator('[data-home-reel-search]').input_value()=='Shough')
    page.evaluate("async()=>{f.page.leave();document.getElementById('view').dataset.routeReturning='false';location.hash='#/clubhouse?season=2026&week=7&tab=matchups&roster=4';await f.page.render(document.getElementById('view'))}")
    page.wait_for_selector('[data-clubhouse-matchup="2"]:visible')
    check('player-card matchup route selects the actual owning roster',page.locator('[data-clubhouse-matchup="1"]').is_hidden())
    page.evaluate('f.page.leave()')
    page.evaluate("async()=>{f.week.completed=true;(await import('/js/weekly-clubhouse-data.js')).clearClubhouseBriefCache();location.hash='#/clubhouse?season=2026&week=7&tab=recap';await f.page.render(document.getElementById('view'))}")
    page.wait_for_selector('.personal-postgame .postgame-player-open')
    check('the actual completed Clubhouse page renders your updated scored lineup recap', 'Tyler Shough' in page.locator('.personal-postgame').inner_text() and '23.50' in page.locator('.personal-postgame').inner_text())
    check('completed matchups use the final visual state',page.locator('.clubhouse-matchup-card[data-matchup-state="final"]').count()==1)
    page.screenshot(path=str(OUT/'390-dark-personal-final.png'))
    page.evaluate("async()=>{f.page.leave();f.week.completed=false;(await import('/js/weekly-clubhouse-data.js')).clearClubhouseBriefCache()}")
   page.evaluate('''async()=>{location.hash='#/home';const view=document.getElementById('view');view.dataset.route='home';view.innerHTML='<div id="home-wrap"><div class="home-personal-desk"><div data-home-gameday-slot></div><a data-home-primary href="#/analyzer"><span>Review lineup</span></a></div></div>';f.stopPreview=(await import('/js/home-matchup-preview.js')).mountHomeMatchupPreview(view.querySelector('[data-home-gameday-slot]'),{members:f.members,member:f.members[0],active:()=>true})}''')
   page.wait_for_selector('.gameday-matchup',timeout=15000)
   check(tag+' Home is a compact Clubhouse shortcut with no separate GameDay room',page.locator('.gameday-matchup').get_attribute('href').startswith('#/clubhouse') and page.locator('.gameday-watch,.home-live-details').count()==0)
   page.screenshot(path=str(OUT/f'{width}-{mode}-home.png'))
   check(tag+' no browser errors or league writes',not errors and page.evaluate('f.writes.every(name=>name.startsWith("app_client_issues:"))'))
   page.evaluate('f.stopPreview()');c.close()
 browser.close()
server.shutdown()
