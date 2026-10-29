"""Production record targets, Watch and artwork with isolated read-only data."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json,os,threading
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_RECORD_REVIEW_DIR',ROOT.parent/'dfl-record-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
index=(ROOT/'index.html').read_text();head=index[index.index('<head>')+6:index.index('</head>')]
html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+head+'''</head><body><main id="view" class="view" data-route="clubhouse" data-pulse-system="1" data-page-system="1"><button class="btn" id="open">Open matchup</button><div id="watch-root"></div><div id="profile-review"></div><div id="art-gallery"></div></main><script type="module">
import {saveMode} from './js/theme.js';import {startUiMotion} from './js/ui-motion.js';import {reviewTextContrast} from './tools/home-review-contrast.js';
window.reviewTheme=saveMode;window.reviewContrast=()=>reviewTextContrast(document.querySelector('.gameday-watch'));startUiMotion();window.reviewReady=true;
</script></body></html>'''
checks=[]
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS '+name,flush=True);(OUT/'checks.json').write_text(json.dumps(checks,indent=2))
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']}
 if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
 if os.environ.get('HTTPS_PROXY'):launch['proxy']={'server':os.environ['HTTPS_PROXY'],'bypass':'127.0.0.1,localhost'}
 browser=p.chromium.launch(**launch);context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,service_workers='block')
 context.route('**/npm/@supabase/supabase-js@*/+esm',lambda r:r.fulfill(content_type='text/javascript',headers={'Access-Control-Allow-Origin':'*'},body="export function createClient(){throw Error('Record review cannot access a database')}"))
 context.route('https://sleepercdn.com/**',lambda r:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()))
 context.route('**/record-art-review.html',lambda r:r.fulfill(content_type='text/html',body=html))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR '+str(e),flush=True)))
 requests=[];page.on('request',lambda r:requests.append(r.url) if '/assets/team-art/' in r.url else None)
 page.goto(base+'record-art-review.html');page.wait_for_function('window.reviewReady',timeout=60000)
 check('artwork is absent from startup requests',not requests)
 page.evaluate('''async sources=>{
 const names=['matchup-view-context','player-week-details','player-week-detail-data','live-football','ui','sleeper-links','team-presentation','player-presentation','identity-rules','score-temperature','game-day-lineup-comparison','game-day-score-motion','game-day-moment-effects','game-day-experience-model','page-disclosure','game-day-dom','score-freshness','game-day-panels','clubhouse-matchup-model','watch-score-collapse','moment-recap','record-chases','record-chases-model','matchup-finish','matchup-finish-model','game-day-matchup-share','matchup-story','matchup-highlights','game-day-model','clubhouse-center-model','clubhouse-center-ui','clubhouse-polish','clubhouse-matchup-cards','banter-memory-ui'];
 const helpers=Object.assign({},...await Promise.all(names.map(name=>import('./js/'+name+'.js'))));
 const mountDetails=helpers.mountPlayerWeekDetails;helpers.mountPlayerWeekDetails=(root,options)=>mountDetails(root,{...options,load:async()=>[]});
 const noop=()=>{},member={id:10};const providers={currentMember:()=>member,loadRivalryCalls:async()=>[],rivalryStoryHtml:()=>'',mountPlayerSpotlight:()=>({stop:noop,update:noop,setMotion:noop}),mountScoreVfx:()=>({stop:noop,refresh:noop}),db:()=>({from:()=>({select:()=>({match:()=>({order:()=>({order:()=>({limit:async()=>({data:[]})})})})})})})};
 const deps={...helpers,...providers,loadWeeklyStats:async()=>({data:[]}),sleeper:{league:async()=>({roster_positions:['WR']})}},factory=Function(...Object.keys(deps),'return function mountGameDayWatch'+sources.watch)(...Object.values(deps));
 const f=window.fixture={helpers,motion:true};f.centerFactory=Function(...Object.keys(deps),'let stopCurrent=null;'+sources.center+';return mountClubhouseCenter')(...Object.values(deps));
 f.members=[{id:10,sleeper_user_id:'474421180325949440',team_name:'Bastards of the Realm',sleeper_profile_image:'https://sleepercdn.com/avatars/thumbs/sleeper-left',profile_image:'https://sleepercdn.com/avatars/thumbs/dfl-left',profile_photo_source:'dfl'},{id:5,sleeper_user_id:'474395935292518400',team_name:'The Bayou Bombers',sleeper_profile_image:'https://sleepercdn.com/avatars/thumbs/sleeper-right'}];
 f.week={leagueId:'record-review',season:2026,week:7,completed:false,games:[{matchup_id:1,roster1:1,user1:f.members[0].sleeper_user_id,roster2:2,user2:f.members[1].sleeper_user_id}]};
 const format={rec:1,pass_td:4},history=(season,week,a,b)=>({season,week,roster1:1,user1:f.members[0].sleeper_user_id,score1:a,roster2:2,user2:f.members[1].sleeper_user_id,score2:b});
 f.history=[history(2025,6,160,159),history(2026,1,150,145)];
 f.archive=helpers.buildRecordArchive({archiveComplete:true,leagues:[2025,2026].map(season=>({season,scoring_settings:format})),standings:[2025,2026].flatMap(season=>f.members.map((m,i)=>({season,roster_id:i+1,sleeper_user_id:m.sleeper_user_id}))),matchups:f.history},{season:2026,week:7});
 f.reset=()=>{
  f.watch?.stop();f.motion=true;
  f.model=helpers.buildGameDay({week:{...f.week,completed:false},members:f.members,memberId:10,players:{p1:{n:'Demo receiver',p:'WR',t:'CIN'},p2:{n:'Demo running back',p:'RB',t:'DET'}},rows:[{roster_id:1,points:153.61,starters:['p1'],players:['p1'],players_points:{p1:21}},{roster_id:2,points:100,starters:['p2'],players:['p2'],players_points:{p2:18}}],nfl:{teams:new Map(['CIN','DET'].map(t=>[t,{key:'live',afterHalftime:true,kickoff:'2026-10-23T17:00:00Z'}])),payload:{events:[{id:'game',date:'2026-10-23T17:00:00Z',status:{type:{state:'in'}}}]}}});
  Object.assign(f.model,{recordArchive:f.archive,checkedAt:Date.now(),scoreStatus:'ready',nflAvailable:true,playersAvailable:true});
  f.watch=factory(document.querySelector('#watch-root'),{getModel:()=>f.model,getHistory:()=>f.history,getMotion:()=>f.motion,members:f.members,onRefresh:async()=>true,onMotion:()=>{f.motion=!f.motion;f.watch.setMotion()}});
 };
 f.advance=(score,options={})=>{const previous=structuredClone(f.model.snapshot);f.model.games[0].sides[0].score=score;f.model.snapshot.totals['1']=score;Object.assign(f.model,{checkedAt:Date.now(),...options});f.watch.update(previous)};
 f.reset();document.querySelector('#open').onclick=()=>f.watch.open({tab:'matchup'});
}''',{'watch':(ROOT/'js/game-day-watch.js').read_text().split('export function mountGameDayWatch')[1],'center':(ROOT/'js/clubhouse-center.js').read_text().split('let stopCurrent=null;')[1].replace('export function','function')})
 sheet=page.locator('.gameday-watch');records=sheet.locator('.dfl-record-watch');row=records.locator('[data-record-key]').first
 def opened():
  page.locator('#open').click();page.wait_for_selector('.gameday-watch[open]');records.wait_for();records.scroll_into_view_if_needed();page.wait_for_timeout(100)
 def closed():
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".gameday-watch[open]")')
 for mode in ['light','dark']:
  page.evaluate('window.reviewTheme',mode)
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('fixture.reset()');opened()
   check(f'{mode}/{width} exact record target with visible scope',all(text in records.text_content() for text in ['+6.40','160.00','Same scoring','2025–2026']))
   check(f'{mode}/{width} initial visit does not celebrate',row.evaluate('e=>e.getAnimations().length===0'))
   check(f'{mode}/{width} full current names, usable bounds and contrast',records.evaluate('e=>e.scrollWidth<=e.clientWidth&&[...e.querySelectorAll("strong")].every(n=>n.scrollWidth<=n.clientWidth)') and not page.evaluate('window.reviewContrast().failures'))
   check(f'{mode}/{width} loaded lineup pictures cannot spill into records',sheet.locator('.gd-lineup-pairs .dfl-player-portrait').evaluate_all('es=>es.every(e=>{const p=e.getBoundingClientRect(),i=e.querySelector("img")?.getBoundingClientRect();return !i||i.width<=p.width+1&&i.height<=p.height+1})'))
   records.screenshot(path=str(OUT/f'{mode}-{width}-record.png'))
   page.evaluate('fixture.row=document.querySelector("[data-record-key]")');page.wait_for_timeout(25);page.evaluate('fixture.advance(160.01)')
   check(f'{mode}/{width} only a fresh crossing gets a finite effect',row.evaluate('e=>e.getAnimations().length===1&&e.getAnimations()[0].effect.getTiming().duration===380'))
   check(f'{mode}/{width} live clearance remains distinct from an official final','Above league best' in records.text_content() and 'New league best' not in records.text_content())
   page.wait_for_timeout(420);page.wait_for_timeout(25);page.evaluate('fixture.advance(160.01)')
   check(f'{mode}/{width} unchanged sync retains row without replay',row.evaluate('e=>e===fixture.row&&e.getAnimations().length===0'))
   page.wait_for_timeout(25);page.evaluate('fixture.advance(159.50)');page.wait_for_timeout(25);page.evaluate('fixture.advance(160.02)')
   check(f'{mode}/{width} stat correction cannot replay a record effect',row.evaluate('e=>e.getAnimations().length===0'))
   page.evaluate('fixture.model.completed=true;fixture.advance(160.02)');page.wait_for_timeout(100)
   check(f'{mode}/{width} final result has no generated mascot',sheet.locator('.matchup-finish [data-team-art]').count()==0 and 'New league best' in records.text_content())
   page.wait_for_timeout(1300)
   check(f'{mode}/{width} final score and roast fit without a mascot',sheet.locator('.matchup-finish').evaluate('e=>{const score=e.querySelector(".matchup-finish-verdict").getBoundingClientRect(),roast=e.querySelector(".matchup-finish-roast").getBoundingClientRect();return e.scrollWidth<=e.clientWidth&&roast.top>=score.bottom-1&&!e.querySelector(".dfl-team-art")}'))
   sheet.locator('.matchup-finish').scroll_into_view_if_needed();page.wait_for_timeout(250);sheet.locator('.matchup-finish').screenshot(path=str(OUT/f'{mode}-{width}-final.png'));closed()
   page.evaluate('fixture.reset()');opened();sheet.locator('[data-watch-replay]').click();page.wait_for_timeout(850)
   check(f'{mode}/{width} chosen photos replace every generated mascot',sheet.locator('.gd-entrance-crest [data-team-art]').count()==0 and sheet.locator('.gd-entrance-crest .dfl-team-mark').count()==2 and sheet.locator('.gd-entrance-crest .dfl-team-mark img').first.get_attribute('src').endswith('/dfl-left'))
   page.screenshot(path=str(OUT/f'{mode}-{width}-entrance.png'))
   check(f'{mode}/{width} entrance photos and full team names fit',sheet.locator('.gd-entrance-team').evaluate_all('es=>es.every(e=>{const b=e.getBoundingClientRect(),p=e.querySelector(".dfl-team-mark").getBoundingClientRect(),n=e.querySelector("h3").getBoundingClientRect();return e.scrollWidth<=e.clientWidth&&p.left>=b.left-1&&p.right<=b.right+1&&p.bottom<=n.top})'))
   closed()
 # Stale or covered updates never queue an effect for a later visit.
 page.evaluate('fixture.reset()');opened();page.wait_for_timeout(25);page.evaluate('fixture.advance(160.01,{checkedAt:Date.now()-180000,scoreStatus:"offline"})')
 check('stale scores cannot trigger the record effect',row.evaluate('e=>e.getAnimations().length===0'));closed()
 page.evaluate('fixture.reset()');opened();page.evaluate('document.querySelector("#watch-root").hidden=true');page.wait_for_timeout(25);page.evaluate('fixture.advance(160.01)');page.evaluate('document.querySelector("#watch-root").hidden=false');records.scroll_into_view_if_needed()
 check('hidden crossing stays quiet when returned to view',row.evaluate('e=>e.getAnimations().length===0'));closed()
 for pref in ['off','reduce']:
  page.evaluate('fixture.reset()')
  if pref=='off':page.evaluate('fixture.motion=false;fixture.watch.setMotion()')
  else:page.emulate_media(reduced_motion='reduce')
  opened();page.wait_for_timeout(25);page.evaluate('fixture.advance(160.01)');check(pref+' keeps record totals static and progress still',row.evaluate('e=>e.getAnimations().length===0&&getComputedStyle(e.querySelector(".record-progress>i")).transitionDuration==="0s"'));closed();page.emulate_media(reduced_motion='no-preference')
 # Clubhouse uses its real controller and receives archive metadata separately.
 page.evaluate('''()=>{
  const f=fixture;f.watch.stop();f.cweek={...f.week,members:f.members,games:[{...f.week.games[0],left:{roster:1,uid:f.members[0].sleeper_user_id,memberId:10,name:f.members[0].team_name,score:153.61,featured:[]},right:{roster:2,uid:f.members[1].sleeper_user_id,memberId:5,name:f.members[1].team_name,score:100,featured:[]}}]};
  f.region=document.createElement('div');document.querySelector('#view').append(f.region);f.region.innerHTML='<div class="clubhouse-page clubhouse-command-center"><div id="clubhouse-panel-matchups"><div data-clubhouse-scoreboard></div><section data-clubhouse-matchup="1">'+f.helpers.matchupCardHtml(f.cweek.games[0],f.cweek,new Map())+'</section></div></div>';
  f.centerRows=[{roster_id:1,points:153.61,starters:['p1'],players:['p1'],players_points:{p1:21}},{roster_id:2,points:100,starters:['p2'],players:['p2'],players_points:{p2:18}}];f.centerData={rows:f.centerRows,players:{p1:{n:'Demo receiver',p:'WR',t:'CIN'},p2:{n:'Demo running back',p:'RB',t:'DET'}},nfl:new Map(['CIN','DET'].map(t=>[t,{key:'live',afterHalftime:true,kickoff:'2026-10-23T17:00:00Z'}]))};
  f.center=f.centerFactory(f.region,f.cweek,{loadStats:async()=>({data:[]}),loadLeague:async()=>({roster_positions:['WR']})});f.center.update(f.centerData);
 }''')
 check('Clubhouse waits for verified archive metadata',page.locator('[data-clubhouse-records] .dfl-record-watch').count()==0)
 page.evaluate('fixture.region.dispatchEvent(new CustomEvent("dfl:record-archive-ready",{detail:{season:2026,week:7,archive:fixture.archive}}))')
 club=page.locator('[data-clubhouse-records] .dfl-record-watch');club.scroll_into_view_if_needed();page.wait_for_timeout(80)
 check('late archive data adds a quiet Clubhouse record target','+6.40' in club.text_content() and club.locator('[data-record-key]').evaluate('e=>e.getAnimations().length===0'))
 page.evaluate('fixture.region.dispatchEvent(new CustomEvent("dfl:record-archive-ready",{detail:{season:2025,week:7,archive:null}}))')
 check('an older week cannot replace Clubhouse archive metadata',club.count()==1)
 page.wait_for_timeout(25);page.evaluate('fixture.centerRows[0].points=160.01;fixture.center.update(fixture.centerData)')
 check('fresh Clubhouse scores share the same bounded record effect',club.locator('[data-record-key]').evaluate('e=>e.getAnimations().some(a=>a.effect.getTiming().duration===380)'))
 page.wait_for_timeout(420);page.evaluate('fixture.centerRow=document.querySelector("[data-clubhouse-records] [data-record-key]");fixture.center.update(fixture.centerData)')
 check('unchanged Clubhouse sync preserves the record row',club.locator('[data-record-key]').evaluate('e=>e===fixture.centerRow&&e.getAnimations().length===0'))
 club.screenshot(path=str(OUT/'dark-390-clubhouse-record.png'))
 page.evaluate('fixture.center.stop();fixture.region.remove()')
 check('removed mascot assets are never requested',not requests)
 # Read the actual profile view-card builder, with existing identity renderers.
 source=(ROOT/'js/pages/profile-dfl.js').read_text().split('function viewCard(m, isMe, ctx) {')[1].split('function editCard(')[0]
 page.evaluate('''source=>{const h=fixture.helpers;fixture.profileCard=Function('avatar','nameBlock','profileIdentityDisplay','recordStrip','return function viewCard(m,isMe,ctx){'+source)(m=>h.teamPortrait(m),m=>`<div class="ph-id"><h1 class="profile-name">${h.esc(m.team_name)}</h1></div>`,()=>'',()=>'<div style="min-height:80px">2019 debut · DFL</div>');document.querySelector('#art-gallery').hidden=true}''',source)
 for mode in ['light','dark']:
  page.set_viewport_size({'width':320,'height':844});page.evaluate('window.reviewTheme',mode);page.evaluate('document.querySelector("#view").dataset.route="profile";document.querySelector("#profile-review").innerHTML=fixture.profileCard(fixture.members[0],false,{})')
  card=page.locator('.profile-head');check(mode+' profile keeps the selected photo and full name without mascot art',card.locator('[data-team-art]').count()==0 and card.locator('.dfl-team-mark img').get_attribute('src').endswith('/dfl-left') and card.locator('.profile-name').evaluate('e=>e.scrollWidth<=e.clientWidth'))
  card.screenshot(path=str(OUT/f'{mode}-320-profile.png'))
 page.evaluate('fixture.watch.stop()');check('teardown removes the Watch and every record row',page.locator('.gameday-watch,[data-record-key]').count()==0)
 check('no browser errors',not errors);browser.close();server.shutdown()
