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
f.event=(id,teams)=>({id,date:'2026-10-25T17:00:00Z',status:{period:3,type:{state:'in',description:'Live',shortDetail:'Q3 8:20'}},competitions:[{competitors:teams.map(abbreviation=>({team:{abbreviation},score:'14'}))}]});
f.board={season:{year:2026,type:2},week:{number:7},events:[f.event('401873011',['NO','PIT']),f.event('401900001',['WAS','NYG'])]};
const table=name=>name==='members'?f.members:name==='nfl_player_directory'?{players:f.catalog,fetched_at:new Date().toISOString()}:name==='nfl_highlight_clips'?f.clips||[]:name==='sleeper_leagues'?[{season:2026,sleeper_league_id:'fixture'}]:[];
const rpc=name=>name==='clubhouse_week_index'?[{season:2026,week:7,completed:false},{season:2026,week:6,completed:true}]:name==='clubhouse_week_data'?f.week:name==='nfl_live_week'?[]:null;
const builder=(data,name)=>{const q={then:async(a,b)=>{if(name==='nfl_highlight_clips'){f.clipReads++;if(f.holdClips)await new Promise(r=>f.release=r)}return Promise.resolve({data,error:name==='nfl_highlight_clips'&&f.failClips?{message:'Fixture offline'}:null}).then(a,b)}};for(const k of ['select','order','limit','eq','neq','gte','gt','lte','lt','in','not','is','match','range','abortSignal','contains'])q[k]=()=>q;q.single=q.maybeSingle=()=>q;for(const k of ['insert','update','upsert','delete'])q[k]=()=>{f.writes.push(name+':'+k);return builder(null,name)};return q};
window.fixtureDb={from:name=>builder(table(name),name),rpc:name=>builder(rpc(name),name),functions:{invoke:async()=>({data:null,error:null})},channel:()=>{const c={on:()=>c,subscribe:()=>c};return c},removeChannel:async()=>{}};
'''
checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
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
     elif '/stats/nfl/' in u:data=[{'player_id':str(i),'season':'2026','week':int(u.split('/stats/nfl/2026/')[1].split('?')[0]),'season_type':'regular','stats':{'gp':1,'pts_ppr':20,'pass_yd':246,'pass_td':2,'rec':7,'rec_yd':96}} for i in range(1,7)]
     else:data={'season':'2026','roster_positions':['QB','WR','TE'],'scoring_settings':{'rec':1},'league_id':'fixture','status':'in_season'}
    elif 'site.api.espn.com/' in u:data=f_board
    if data is not None:return r.fulfill(content_type='application/json',body=json.dumps(data),headers={'Access-Control-Allow-Origin':'*'})
    return r.abort()
   f_rows=[{'roster_id':i,'matchup_id':(i+1)//2,'starters':['1'] if i==1 else ['4','3'] if i==2 else ['5'] if i==3 else ['0','0','6'],'players':['1','2'] if i==1 else ['3','4'] if i==2 else [str(i+2)],'points':100+i,'players_points':{'1':22,'2':7,'3':30,'4':12,'5':24,'6':3}} for i in range(1,5)]
   f_board={'season':{'year':2026,'type':2},'week':{'number':7},'events':[{'id':id,'date':'2026-10-25T17:00:00Z','status':{'period':3,'type':{'state':'in','description':'Live','shortDetail':'Q3 8:20'}},'competitions':[{'competitors':[{'team':{'abbreviation':t},'score':'14'} for t in teams]}]} for id,teams in [('401873011',['NO','PIT']),('401900001',['WAS','NYG'])]]}
   c.route('**/*',route);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.clock.install(time=datetime(2026,10,26,20,tzinfo=timezone.utc));page.goto(base+'/clubhouse-review.html#/clubhouse?tab=matchups',wait_until='domcontentloaded')
   page.evaluate('''async mode=>{
    (await import('/js/theme.js')).pinMode(mode);const m=await import('/js/members.js');m.selectMember(f.members[0]);
    const clips=await(await fetch('/tools/fixtures/home-highlight-clips.json')).json();f.clips=[clips[0],clips[1],{...clips[0],id:'990001',game_id:'401900001',headline:'Jayden Daniels runs for a 30-yard touchdown',game_label:'WAS · NYG',source_url:'https://www.espn.com/video/clip/_/id/990001'}];
    f.page=await import('/js/pages/clubhouse.js');await f.page.render(document.getElementById('view'));
   }''',mode)
   tag=f'{width}px {mode}';page.wait_for_selector('.gd-lineup-comparison',timeout=20000)
   check(tag+' one Clubhouse offers Matchups, Highlights and Leaders',page.locator('[data-clubhouse-tab]').count()==5 and page.locator('.gameday-watch').count()==0)
   check(tag+' live matchup keeps both starting lineups side by side',page.locator('[data-clubhouse-matchup="1"] [data-gameday-player]').count()>=3)
   check(tag+' hides highlight loading until its tab is opened',page.evaluate('f.clipReads===0'))
   page.locator('#clubhouse-tab-highlights').click()
   try:page.wait_for_selector('[data-home-reel-clip]',timeout=15000)
   except Exception:
    print('REEL DEBUG',page.evaluate('async()=>({reads:f.clipReads,now:Date.now(),session:(await import("/js/home-highlight-model.js")).highlightSession(),activeRows:(await import("/js/home-highlight-model.js")).activeHighlightClips(f.clips).length,scope:document.querySelector("[data-clubhouse-reel-slot]").innerText,view:document.querySelector("#clubhouse-panel-highlights").hidden,lineups:[...document.querySelectorAll("[data-gameday-player]")].map(e=>e.textContent.slice(0,70))})'),errors,flush=True)
    page.screenshot(path=str(OUT/'debug.png'));raise
   check(tag+' Your team matches the actual weekly roster',page.locator('[data-home-reel-clip]').count()==1 and 'Tyler Shough' in page.locator('.home-reel-cards').inner_text())
   check(tag+' personal player chips only offer roster-matched players',page.locator('[data-reel-player-filter="1"]').count()==1 and page.locator('[data-reel-player-filter="3"],[data-reel-player-filter="5"]').count()==0)
   page.screenshot(path=str(OUT/f'{width}-{mode}-highlights.png'))
   page.locator('[data-home-reel-open]').click();page.wait_for_function('document.querySelector(".home-reel-player video")?.currentTime>0.1')
   check(tag+' personal reel plays inside Clubhouse from clip one',page.locator('[data-reel-count]').inner_text()=='1 / 1' and 'Your team' in page.locator('#home-reel-player-title').text_content())
   page.locator('[data-reel-search]').fill('Metcalf');check(tag+' personal search stays restricted to your team',page.locator('[data-reel-choose]').count()==0)
   page.locator('.reel-search-row [data-reel-clear]').click()
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".home-reel-player").open')
   reads_before_scope=page.evaluate('f.clipReads')
   page.locator('[data-team-reel-scope="matchup"]').click();page.wait_for_function('document.querySelectorAll("[data-home-reel-clip]").length===2')
   check(tag+' This matchup includes both rosters without other teams',page.locator('[data-home-reel-clip]').count()==2)
   page.locator('[data-team-reel-scope="league"]').click();page.wait_for_function('document.querySelectorAll("[data-home-reel-clip]").length===3')
   check(tag+' League clips stay inside the selected NFL week',page.locator('[data-home-reel-clip]').count()==3)
   check(tag+' scope switches reuse the same fresh clip metadata',page.evaluate('f.clipReads')==reads_before_scope)
   page.locator('#clubhouse-tab-leaders').click();page.wait_for_selector('.gd-league-board .gameday-player')
   check(tag+' Leaders moved into Clubhouse with hot and cold filters',page.locator('[data-league-filter]').count()==3 and page.locator('[data-league-bench]').count()==1)
   page.locator('[data-league-filter="hot"]').click();check(tag+' hot filter returns only hot players',page.locator('.gd-league-board .gameday-player').count()>=1 and page.locator('.gd-league-board [data-score-temperature="cold"]').count()==0)
   page.locator('[data-league-filter="all"]').click();count=page.locator('.gd-league-board .gameday-player').count();page.locator('[data-league-bench]').check();check(tag+' bench checkbox adds bench players',page.locator('.gd-league-board .gameday-player').count()>count)
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
   page.evaluate('f.failClips=false');page.locator('[data-home-reel-open]').click();page.evaluate('f.keepVideo=document.querySelector(".home-reel-player video");f.page.leave()')
   check(tag+' leaving Clubhouse removes the reel and stops playback',page.locator('.home-reel-player').count()==0 and page.evaluate('f.keepVideo.paused&&!f.keepVideo.hasAttribute("src")'))
   page.evaluate('''async()=>{location.hash='#/home';const view=document.getElementById('view');view.dataset.route='home';view.innerHTML='<div id="home-wrap"><div class="home-personal-desk"><div data-home-gameday-slot></div><a data-home-primary href="#/analyzer"><span>Review lineup</span></a></div></div>';f.stopPreview=(await import('/js/home-matchup-preview.js')).mountHomeMatchupPreview(view.querySelector('[data-home-gameday-slot]'),{members:f.members,member:f.members[0],active:()=>true})}''')
   page.wait_for_selector('.gameday-matchup',timeout=15000)
   check(tag+' Home is a compact Clubhouse shortcut with no separate GameDay room',page.locator('.gameday-matchup').get_attribute('href').startswith('#/clubhouse') and page.locator('.gameday-watch,.home-live-details').count()==0)
   page.screenshot(path=str(OUT/f'{width}-{mode}-home.png'))
   check(tag+' no browser errors or league writes',not errors and page.evaluate('f.writes.every(name=>name.startsWith("app_client_issues:"))'))
   page.evaluate('f.stopPreview()');c.close()
 browser.close()
server.shutdown()
