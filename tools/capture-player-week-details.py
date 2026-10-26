"""Actual Clubhouse/Watch controllers, shared Sleeper cache and stat labels; no writes."""
import json,os,re,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_PLAYER_WEEK_REVIEW_DIR',ROOT.parent/'dfl-player-week-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_GET(self):
  code=None
  if self.path.split('?')[0]=='/js/supabase.js':code="const b=()=>new Proxy({}, {get:(_t,k)=>k==='then'?(r)=>Promise.resolve({data:[],error:null}).then(r):()=>b()});export const db=()=>({from:()=>b(),rpc:()=>b()});export const edge=()=>{throw Error('Writes blocked')};export const privilegedFunctionHeaders=()=>({});"
  if self.path.split('?')[0]=='/js/members.js':code="export const getMemberId=()=>1;export const currentMember=()=>({id:1});export const loadMemberDirectory=async()=>window.f?.members||[];"
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'</head><body><main id="view" class="view" data-route="clubhouse" data-pulse-system="1"><div id="center"></div><div id="watch"></div></main></body></html>'
checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
  for theme in ['light','dark']:
   context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block');calls=[];changed=False;failed=False
   def route(r):
    url=r.request.url
    if '/week-review.html' in url:return r.fulfill(content_type='text/html',body=html)
    if url.startswith(base):return r.continue_()
    match=re.search(r'/stats/nfl/2026/(\d+)',url)
    if match:
     week=int(match[1]);calls.append(week)
     if failed:return r.abort()
     rows=[]
     for team in range(1,5):
      for i in range(10):
       stats={'gp':1,'pts_ppr':week*10,'rec':7,'rec_yd':120 if changed and week==4 else 96,'rec_td':1,'rush_yd':63,'rush_td':1,'pass_yd':246,'pass_td':2,'pass_int':1,'sack':2,'int':1,'pts_allow':14,'fgm':2,'xpm':3}
       rows.append({'player_id':f'p{team}-{i}','season':'2026','week':week,'season_type':'regular','stats':stats})
     return r.fulfill(content_type='application/json',body=json.dumps(rows),headers={'Access-Control-Allow-Origin':'*'})
    if r.request.resource_type=='image':return r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
    return r.abort()
   context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/week-review.html',wait_until='domcontentloaded')
   page.evaluate('''async theme=>{
    const {pinMode}=await import('/js/theme.js');pinMode(theme);
    const {mountClubhouseCenter}=await import('/js/clubhouse-center.js'),{matchupCardHtml}=await import('/js/clubhouse-matchup-cards.js'),{buildGameDay}=await import('/js/game-day-model.js'),{mountGameDayWatch}=await import('/js/game-day-watch.js'),{savePageChoice}=await import('/js/page-disclosure.js');
    const f=window.f={};f.slots=['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'];
    f.members=[1,2,3,4].map(id=>({id,sleeper_user_id:'u'+id,team_name:['','Bastards of the Realm','The Bayou Bombers','Klutch Sports Group','The Bear Jew'][id]}));
    f.week={season:2026,week:4,leagueId:'fixture',completed:false,members:f.members,games:[1,2].map(n=>({matchup_id:n,user1:'u'+(n*2-1),user2:'u'+(n*2),roster1:n*2-1,roster2:n*2,left:{roster:n*2-1,name:f.members[n*2-2].team_name,memberId:n*2-1,score:75},right:{roster:n*2,name:f.members[n*2-1].team_name,memberId:n*2,score:65}}))};
    const names=['Patrick Mahomes','Christian McCaffrey','Kenneth Walker III','Amon-Ra St. Brown','Jaxon Smith-Njigba','George Kittle','Justin Jefferson','Brandon Aubrey','San Francisco 49ers','Tony Pollard'];f.players={};f.rows=[1,2,3,4].map(t=>{const ids=names.map((name,i)=>{const id=`p${t}-${i}`;f.players[id]={n:name,p:i===9?'RB':f.slots[i]==='FLEX'?'WR':f.slots[i],t:i===7?'DAL':'SF'};return id});return {roster_id:t,starters:ids.slice(0,9),players:ids,points:t%2?75:65,players_points:Object.fromEntries(ids.map((id,i)=>[id,i===0?22.4:i===3?22.6:7]))}});
    f.nfl=new Map([['SF',{key:'live',afterHalftime:true}],['DAL',{key:'upcoming'}]]);f.model=()=>buildGameDay({week:f.week,rows:f.rows,players:f.players,members:f.members,nfl:{teams:f.nfl},memberId:1,rosterPositions:f.slots});
    f.region=document.getElementById('center');f.region.innerHTML=`<div class="clubhouse-page clubhouse-command-center"><header class="page-head"><h1>Clubhouse</h1></header><div data-clubhouse-scoreboard></div><p data-clubhouse-stats-state></p>${f.week.games.map(g=>`<section data-clubhouse-matchup="${g.matchup_id}">${matchupCardHtml(g,f.week,new Map())}</section>`).join('')}</div>`;
    f.c=mountClubhouseCenter(f.region,f.week,{loadLeague:async()=>({roster_positions:f.slots}),autoFinish:false});f.update=force=>f.c.update({rows:f.rows,players:f.players,nfl:f.nfl,force});f.update(false);
    savePageChoice('watch-tab','matchup');f.w=mountGameDayWatch(document.getElementById('watch'),{getModel:f.model,getHistory:()=>[],getMotion:()=>true,members:f.members,onRefresh:async()=>f.update(true),onMotion:()=>{}});
    f.shutdown=()=>{f.c.stop();f.w.stop()};
   }''',theme)
   tag=f'{width}px {theme}';target=page.locator('[data-clubhouse-matchup="1"] [data-player-week-detail="1:p1-3"]');target.scroll_into_view_if_needed();page.wait_for_function('document.querySelector("[data-player-week-detail=\\"1:p1-3\\"] .gd-player-week-average")?.textContent==="20.0 PPR/g"')
   check(tag+' displays real weekly stats below the player and score','7 rec · 96 yd' in target.inner_text() and '2 TD' in target.inner_text())
   check(tag+' uses only completed games for live PPR average','20.0 PPR/g' in target.inner_text())
   check(tag+' fetches one set of weeks for the entire league',sorted(calls)==[1,2,3,4])
   check(tag+' keeps pregame stats separate',page.locator('[data-player-week-detail="1:p1-7"] .gd-player-week-line').inner_text()=='Yet to play')
   check(tag+' side-by-side stats fit both phone columns',page.locator('[data-clubhouse-matchup="1"] .gd-player-stat-line').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   contrast=target.evaluate("""e=>{
    const ctx=document.createElement('canvas').getContext('2d');const rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
    const lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
    let node=e,bg;while(node){bg=rgb(getComputedStyle(node).backgroundColor);if(bg[3]===255)break;node=node.parentElement}const a=lum(rgb(getComputedStyle(e).color)),b=lum(bg||[255,255,255,255]);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   }""")
   check(tag+' secondary stat text meets 4.5:1 contrast',contrast>=4.5)
   page.screenshot(path=str(OUT/f'{width}-{theme}-clubhouse.png'))
   # A stat refresh must leave player taps, score effects, open bench and scroll untouched.
   page.evaluate('''()=>{const row=document.querySelector('[data-gameday-row="1:p1-3"]');window.keptTap=row.querySelector('button');window.keptScore=row.querySelector('.gd-thermal-value');keptTap.focus({preventScroll:true});window.keptY=scrollY}''');changed=True;page.evaluate('f.update(true)');page.wait_for_function('document.querySelector("[data-player-week-detail=\\"1:p1-3\\"] .gd-player-week-line").textContent.includes("120 yd")')
   check(tag+' stat refresh preserves player/score nodes, focus and scroll',page.evaluate('keptTap===document.querySelector("[data-gameday-row=\\"1:p1-3\\"] button")&&keptScore===document.querySelector("[data-gameday-row=\\"1:p1-3\\"] .gd-thermal-value")&&document.activeElement===keptTap&&Math.abs(scrollY-keptY)<1'))
   page.evaluate("f.region.querySelector('[data-clubhouse-game=\"2\"]').click()")
   check(tag+' another matchup reuses the same weekly payloads',len(calls)==5 and '20.0 PPR/g' in page.locator('[data-player-week-detail="3:p3-3"]').inner_text())
   page.evaluate("f.w.open({tab:'matchup',gameId:'1'})");page.wait_for_selector('.gameday-watch[open]');watch=page.locator('.gameday-watch');page.wait_for_function('document.querySelector(".gameday-watch [data-player-week-detail=\\"1:p1-3\\"] .gd-player-week-average")?.textContent==="20.0 PPR/g"')
   check(tag+' GameDay Watch shares the stats and average','120 yd' in watch.locator('[data-player-week-detail="1:p1-3"]').inner_text() and len(calls)==5)
   watch.locator('[data-watch-tab="league"]').click();page.wait_for_selector('.gameday-watch #watch-panel-league:not([hidden]) [data-player-week-detail]');page.wait_for_function('document.querySelector(".gameday-watch #watch-panel-league .gd-player-week-average")?.textContent==="20.0 PPR/g"')
   check(tag+' league player board also shows the compact metrics','20.0 PPR/g' in watch.locator('#watch-panel-league .gd-player-week-average').first.inner_text())
   page.screenshot(path=str(OUT/f'{width}-{theme}-league.png'));watch.locator('[data-watch-tab="matchup"]').click()
   page.evaluate("f.nfl.set('SF',{key:'final'});f.w.update(null)");page.wait_for_function('document.querySelector(".gameday-watch [data-player-week-detail=\\"1:p1-3\\"] .gd-player-week-average")?.textContent==="25.0 PPR/g"')
   check(tag+' final games join the average immediately using cached real stats',len(calls)==5)
   page.emulate_media(reduced_motion='reduce');check(tag+' reduced motion retains readable metrics',watch.locator('[data-player-week-detail="1:p1-3"] .gd-player-week-average').inner_text()=='25.0 PPR/g')
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".gameday-watch").open');failed=True;page.evaluate('f.update(true)');page.wait_for_function('document.querySelector("[data-clubhouse-stats-state]").textContent.includes("last")')
   check(tag+' failed refresh retains the known weekly stat line','120 yd' in page.locator('[data-player-week-detail="3:p3-3"]').inner_text())
   page.evaluate('f.shutdown()')
   page.evaluate("""async()=>{
    const {homeThermalBoard}=await import('/js/home-presentation.js'),{mountPlayerWeekDetails}=await import('/js/player-week-details.js'),{loadPlayerWeekDetails}=await import('/js/player-week-detail-data.js');
    document.getElementById('view').dataset.route='home';const root=document.createElement('section');root.id='home-wrap';root.style.marginTop='150vh';root.innerHTML=homeThermalBoard(f.model());document.getElementById('view').append(root);f.homeRoot=root;f.homeLoads=0;
    f.h=mountPlayerWeekDetails(root,{getModel:f.model,load:async(...args)=>{f.homeLoads++;return loadPlayerWeekDetails(...args)}});await f.h.update();
   }""")
   page.wait_for_timeout(80);check(tag+' offscreen Home stats do not start loading',page.evaluate('f.homeLoads===0'))
   page.locator('#home-wrap').scroll_into_view_if_needed();page.wait_for_function('document.querySelector("#home-wrap .gd-player-week-average")?.textContent.includes("25.0")')
   check(tag+' Home leaders show the same weekly stats and average',page.locator('#home-wrap .gd-player-week-line').first.inner_text().find('yd')>=0 and page.evaluate('f.homeLoads===1'))
   check(tag+' enriched Home leaders retain compact mobile rows',page.locator('#home-wrap .gameday-player').evaluate_all('es=>es.every(e=>{const b=e.getBoundingClientRect();return b.height<=100&&e.scrollWidth<=e.clientWidth+1&&[...e.querySelectorAll(".gd-player-week-detail,.gameday-player-score")].every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})})') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.locator('#home-wrap').screenshot(path=str(OUT/f'{width}-{theme}-home.png'));page.evaluate('f.h.stop()')
   check(tag+' controller teardown and all transitions finish without errors',not errors);context.close()
 browser.close()
server.shutdown()
