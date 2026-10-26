"""Real app/worker first-launch checks; isolated providers and no league writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_STARTUP_REVIEW_DIR',ROOT.parent/'dfl-startup-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
fixture='''
window.catalogMissing=false;window.catalogReads=0;window.rawReads=0;window.bootEvents=[];
window.catalog=Object.fromEntries(Array.from({length:1000},(_,i)=>[String(i+1),{n:'Player '+i,p:['QB','RB','WR','TE','K'][i%5],fp:[],t:'BUF',i:null,s:'Active',pp:null,is:null,nu:123}]));
window.people=Array.from({length:12},(_,i)=>({id:i+1,active:true,display_name:'Owner '+(i+1),team_name:'Team '+(i+1),sleeper_user_id:String(i+1),sort_order:i}));
window.rows=people.map(m=>({roster_id:m.id,matchup_id:Math.ceil(m.id/2),points:100+m.id,starters:[String(m.id)],players:[String(m.id)],players_points:{[m.id]:25}}));
window.week={season:2026,week:7,leagueId:'fixture',completed:true,voteClosesAt:'2026-12-01T00:00:00Z',games:Array.from({length:6},(_,i)=>({matchup_id:i+1,user1:String(i*2+1),user2:String(i*2+2),roster1:i*2+1,roster2:i*2+2,score1:100+i*2+1,score2:100+i*2+2}))};
const table=name=>name==='app_settings'?[]:name==='members'?people:name==='sleeper_leagues'?[{season:2026,sleeper_league_id:'fixture',scoring_settings:{rec:1},status:'in_season'}]:name==='sleeper_rosters'?rows.map(r=>({...r,season:2026,sleeper_user_id:String(r.roster_id)})):name==='nfl_player_directory'?(catalogMissing?null:{players:catalog,fetched_at:new Date().toISOString()}):[];
const rpc=name=>name==='home_bootstrap'?{events:[],announcements:[],polls:[],leagues:[{season:2026,sleeper_league_id:'fixture',status:'in_season'}],golf:[],standings:[],golf_done:[]}:name==='clubhouse_week_index'?[{season:2026,week:7,completed:true}]:name==='clubhouse_week_data'?week:name==='nfl_live_week'?[]:null;
const builder=(data,object=false)=>{const q={then:(a,b)=>Promise.resolve({data,error:null}).then(a,b)};for(const name of ['select','order','limit','eq','neq','gte','gt','lte','lt','in','not','is','match','range','abortSignal','contains'])q[name]=()=>q;q.single=q.maybeSingle=()=>q;for(const name of ['insert','update','upsert','delete'])q[name]=()=>builder(null);return q};
window.fixtureDb={from:name=>{if(name==='nfl_player_directory')catalogReads++;return builder(table(name))},rpc:name=>builder(rpc(name)),functions:{invoke:async()=>({data:null,error:null})},channel:()=>{const c={on:()=>c,subscribe:()=>c,track:async()=>{},presenceState:()=>({})};return c},removeChannel:async()=>{}};
for(const event of ['dfl:app-ready','dfl:route-performance'])addEventListener(event,e=>bootEvents.push({event,at:performance.now()}));
'''
checks=[];errors=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for route in ['', '#/home']:
  c=browser.new_context(viewport={'width':390,'height':844},has_touch=True,service_workers='block');c.add_init_script(fixture)
  c.route('**/npm/@supabase/supabase-js@*/+esm',lambda r:r.fulfill(content_type='text/javascript',headers={'Access-Control-Allow-Origin':'*'},body='export const createClient=()=>window.fixtureDb;'))
  def provider(r):
   url=r.request.url
   if url.endswith('/players/nfl'):
    r.request.frame.page.evaluate('rawReads++');data={str(i+1):{'full_name':'Player '+str(i),'position':['QB','RB','WR','TE','K'][i%5],'fantasy_positions':[],'team':'BUF'} for i in range(1000)}
   elif '/matchups/' in url:data=[{'roster_id':i+1,'matchup_id':(i//2)+1,'points':101+i,'starters':[str(i+1)],'players':[str(i+1)],'players_points':{str(i+1):25}} for i in range(12)]
   elif url.endswith('/users'):data=[{'user_id':str(i+1),'metadata':{'team_name':'Team '+str(i+1)}} for i in range(12)]
   elif url.endswith('/rosters'):data=[{'roster_id':i+1,'owner_id':str(i+1),'players':[str(i+1)]} for i in range(12)]
   elif '/league/fixture' in url:data={'league_id':'fixture','season':'2026','status':'in_season','total_rosters':12,'roster_positions':['QB','RB','RB','WR','WR','TE','FLEX','K','DEF','BN'],'scoring_settings':{'rec':1}}
   elif '/state/nfl' in url:data={'season':'2026','week':8,'season_type':'regular','display_week':8}
   elif 'scoreboard' in url:data={'events':[]}
   else:data=[]
   r.fulfill(content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(data))
  c.route('https://api.sleeper.app/**',provider);c.route('https://site.api.espn.com/**',provider);c.route('https://site.web.api.espn.com/**',provider);c.route('https://sleepercdn.com/**',lambda r:r.abort())
  page=c.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR: '+str(e),flush=True)));page.goto(base+route,wait_until='domcontentloaded');page.wait_for_function('bootEvents.some(e=>e.event==="dfl:app-ready")',timeout=20000)
  tag='plain launch' if not route else 'Home route'
  page.wait_for_selector('[data-gameday-freshness][data-score-freshness="ready"]',state='attached',timeout=20000)
  check(tag+' renders Home and completes the real matchup loader',page.locator('#view').get_attribute('data-route')=='home' and page.locator('[data-gameday-freshness]').get_attribute('data-score-freshness')=='ready')
  check(tag+' uses the compact catalog without a full provider download',page.evaluate('catalogReads>=1&&rawReads===0'))
  check(tag+' remains within the phone width',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  if not route:
   check('plain launch enters Home without a navigation tap',page.evaluate('location.hash==="#/home"'))
   page.evaluate("import('./js/sleeper.js').then(m=>m.loadPlayers({maxAgeMs:0})).then(p=>window.forced=p)");page.wait_for_function('window.forced')
   check('explicit refresh still verifies directly with Sleeper',page.evaluate('rawReads===1&&forced["1"].n==="Player 0"'))
   page.evaluate("catalogMissing=true;import('./js/sleeper.js').then(async m=>{await m.clearSleeperAnalysisCache();window.fallback=await m.loadPlayers({maxAgeMs:300000})})");page.wait_for_function('window.fallback')
   check('a missing compact cache falls back to the provider',page.evaluate('rawReads===2&&fallback["1"].p==="QB"'))
   page.evaluate("import('./js/sleeper.js').then(async m=>{await m.clearSleeperAnalysisCache();window.openCache=caches.open;caches.open=async()=>{throw Error('Storage unavailable')};try{window.noStorage=await m.loadPlayers({maxAgeMs:0})}finally{caches.open=openCache}})");page.wait_for_function('window.noStorage')
   check('unavailable phone storage does not prevent player loading',page.evaluate('rawReads===3&&noStorage["1"].n==="Player 0"'))
  c.close()
 check('no uncaught app errors',not errors)
 browser.close()
server.shutdown()
