"""Actual momentum controller and existing replay studio; isolated reads only."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_MOMENTUM_REVIEW_DIR','/tmp/dfl-momentum-1513'));OUT.mkdir(exist_ok=True,parents=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
HTML='<!doctype html><html lang="en"><head>'+head+'''</head><body><main id="view" class="view" data-route="clubhouse" data-page-system="1" style="padding:16px"><h1>Clubhouse</h1><div class="tabs"><button data-clubhouse-tab="matchups" aria-selected="true">Matchups</button><button data-clubhouse-tab="highlights" aria-selected="false">Highlights</button></div><button id="other" class="btn">Other matchup</button><div id="clubhouse-panel-matchups"><div id="momentum"></div></div><div id="clubhouse-panel-highlights" hidden><div data-clubhouse-reel-slot></div></div><div style="height:700px"></div></main><script type="module">
import {mountMatchupHighlights} from './js/matchup-highlights.js';import {mountClubhouseTeamHighlights} from './js/clubhouse-team-highlights.js';import {savedMoments} from './js/game-day-moments-model.js';import {pinMode} from './js/theme.js';import {reviewTextContrast} from './tools/home-review-contrast.js';import {startUiMotion} from './js/ui-motion.js';
startUiMotion();window.theme=pinMode;window.contrast=()=>reviewTextContrast(document.querySelector('.matchup-momentum'));window.selected='7';window.active=true;window.motion=true;window.historyFail=false;window.fail=false;window.held=false;window.release=null;window.historyReads=0;
const a={roster:'1',name:'The Very Long Championship Bayou Bombers',identity:{team_name:'Bayou Bombers'},score:80,starters:[],lineup:[],bench:[]},b={roster:'2',name:'Monday Night Mayhem',identity:{team_name:'Monday Night Mayhem'},score:75,starters:[],lineup:[],bench:[]};
window.model={leagueId:'momentum-review',season:2026,week:7,completed:false,events:[{id:'999'}],games:[{id:'7',sides:[a,b]},{id:'8',sides:[{...a,roster:'3',name:'Other A'},{...b,roster:'4',name:'Other B'}]}]};
const scores=[[42,40],[42,48],[60,48],[59.5,48],[72,75],[80,75]];window.scoreRows=scores.map(([score1,score2],i)=>({id:i+1,league_id:model.leagueId,season:2026,week:7,matchup_id:7,roster1:1,roster2:2,score1,score2,observed_at:new Date(Date.parse('2026-10-25T18:00:00Z')+i*900000).toISOString()}));
const base={league_id:model.leagueId,season:2026,week:7,matchup_id:7,roster_id:1},at=i=>scoreRows[i].observed_at;
window.rows=[{...base,id:20,roster_id:2,kind:'lead',captured_at:at(1),data:{scores:{1:42,2:48}}},{...base,id:21,player_id:'7564',kind:'surge',captured_at:at(2),data:{points:24.83,delta:8.12}},{...base,id:22,kind:'touchdown',event_key:'nfl:999:101:1',captured_at:at(4),data:{play:{id:'101',gameId:'999',kind:'touchdown',at:Date.parse(at(4))-20000,yards:42,period:3,clock:'4:12',text:'42-yard touchdown reception.'},players:[{id:'7564',name:'Ja’Marr Chase',position:'WR',role:'receiver',nflTeam:'CIN'}]}}];
const originals=await(await fetch('/tools/fixtures/home-highlight-clips.json')).json();window.clips=[{...originals[0],game_id:'999',play_id:'101'}];
const reel=mountClubhouseTeamHighlights(document.querySelector('#view'),{getModel:()=>model,getGame:()=>model.games.find(g=>g.id===selected),active:()=>active,load:async()=>clips,loadNfl:async()=>({payload:{events:[{id:'999'}]}})});
window.loads=0;window.mount=()=>{window.live?.stop();window.live=mountMatchupHighlights(document.querySelector('#view'),{momentum:true,getModel:()=>model,getGame:()=>model.games.find(g=>g.id===selected),getHost:()=>document.querySelector('#momentum'),getMotion:()=>motion,getPlayers:()=>({'7564':{n:'Ja’Marr Chase',p:'WR',t:'CIN'}}),active:()=>active,load:async(m,p,o)=>{loads++;if(held){held=false;await new Promise(r=>release=r)}if(fail)throw Error('Fixture failure');return {items:savedMoments(rows.filter(r=>String(r.matchup_id)===String(o.gameId)),m,p),cursor:null,more:false}},loadHistory:async(m,g)=>{historyReads++;if(historyFail)throw Error('Fixture scoreRows failure');return scoreRows.filter(r=>String(r.matchup_id)===String(g.id))},loadClips:async()=>clips,onClip:async(id,source,accepts)=>{if(window.clipHeld){clipHeld=false;await new Promise(r=>window.clipRelease=r)}return reel.openClip(id,{source,returnToGame:true,accepts})}})};mount();window.refresh=()=>live.update({force:true});document.querySelector('#other').onclick=()=>{selected=selected==='7'?'8':'7';void refresh()};await refresh();window.ready=true;
</script></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  path=self.path.split('?')[0];body=HTML if path=='/momentum-review.html' else "export const db=()=>{throw Error('Fixture database writes/reads blocked')};export const configured=()=>false;export const privilegedFunctionHeaders=()=>({});export const edge=()=>{throw Error('Fixture edge writes blocked')};" if path=='/js/supabase.js' else "export const currentMember=()=>null;export const getMemberId=()=>null;" if path=='/js/members.js' else None
  if body is None:return super().do_GET()
  self.send_response(200);self.send_header('Content-Type','text/html' if path.endswith('.html') else 'text/javascript');self.end_headers();self.wfile.write(body.encode())
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
checks=[];errors=[]
def check(name,ok):
 assert ok,name
 checks.append(name);(OUT/'checks.json').write_text(json.dumps(checks,indent=2));print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for theme in ['light','dark']:
  for width in [320,390,768]:
   c=browser.new_context(viewport={'width':width,'height':844},has_touch=True,is_mobile=True,service_workers='block')
   c.add_init_script("{const D=Date;window.Date=class extends D{constructor(...args){super(...(args.length?args:['2026-10-25T19:20:00Z']))}static now(){return D.parse('2026-10-25T19:20:00Z')}}}")
   def external(r):
    if r.request.url.startswith(base):return r.continue_()
    if r.request.url.endswith('.mp4'):return r.fulfill(content_type='video/mp4',body=(ROOT/'tools/fixtures/highlight-playback.mp4').read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
    if 'sleepercdn.com/' in r.request.url or 'espncdn.com/' in r.request.url or 'akamaized.net/' in r.request.url:return r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
    r.abort()
   c.route('**/*',external);page=c.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print(str(e),flush=True)));page.goto(base+'/momentum-review.html#/clubhouse?season=2026&week=7&tab=matchups&matchup=7');page.wait_for_function('window.ready===true');page.evaluate('theme',theme);page.evaluate('document.fonts.ready');tag=f'{theme}/{width}';host=page.locator('.matchup-momentum');host.scroll_into_view_if_needed();page.wait_for_timeout(150)
   check(tag+' observed traces and complete team names fit',host.locator('.momentum-trace').count()==2 and host.evaluate('e=>e.scrollWidth<=e.clientWidth') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   check(tag+' current checkpoint keeps actual scores',all(s in host.locator('[data-momentum-detail]').inner_text() for s in ['80.00','75.00']))
   check(tag+' contrast and useful targets',not page.evaluate('contrast().failures') and host.locator('button:visible,a:visible,input').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44)'))
   host.screenshot(path=str(OUT/f'{theme}-{width}-momentum.png'))
   slider=host.locator('[data-momentum-scrub]');slider.focus();page.keyboard.press('Home');check(tag+' keyboard reaches first real recorded score',all(s in host.locator('[data-momentum-detail]').inner_text() for s in ['42.00','40.00']))
   page.evaluate("scoreRows.push({...scoreRows.at(-1),id:7,score1:81.5,observed_at:'2026-10-25T19:18:00Z'});void refresh()");page.wait_for_timeout(140)
   check(tag+' new history preserves the selected checkpoint and focused native input',slider.evaluate('e=>e===document.activeElement') and slider.get_attribute('aria-valuetext').endswith('40.00'))
   host.locator('[data-momentum-latest]').click();check(tag+' Latest resumes following confirmed updates','81.50' in host.locator('[data-momentum-detail]').inner_text())
   # A refresh arriving during finger scrubbing cannot replace the slider or reorder its domain.
   slider.dispatch_event('pointerdown',{'pointerId':1,'pointerType':'touch'});page.evaluate('window.keptSlider=document.querySelector("[data-momentum-scrub]");scoreRows.push({...scoreRows[0],id:8,score1:43,observed_at:"2026-10-25T18:05:00Z"});void refresh()');page.wait_for_timeout(150)
   slider.evaluate('e=>{e.value="0";e.dispatchEvent(new Event("input",{bubbles:true}))}')
   check(tag+' drag retains its original index domain during refresh','42.00' in host.locator('[data-momentum-detail]').inner_text() and slider.evaluate('e=>e===keptSlider'))
   page.dispatch_event('body','pointerup',{'pointerId':1,'pointerType':'touch'});page.wait_for_timeout(80);check(tag+' release preserves the exact checkpoint while adopting new history',slider.evaluate('e=>e===keptSlider') and '42.00' in host.locator('[data-momentum-detail]').inner_text())
   # Real native touch changes the selection while vertical swipes still scroll the page.
   slider.scroll_into_view_if_needed();box=slider.bounding_box();cdp=c.new_cdp_session(page);y=box['y']+box['height']/2
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+12,'y':y}]})
   for step in range(1,9):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':box['x']+12+(box['width']-24)*step/8,'y':y}]});page.wait_for_timeout(16)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});check(tag+' native touch scrubbing remains responsive',int(slider.input_value())>0);cdp.detach()
   page.evaluate('scrollTo(0,0)');plot=host.locator('.momentum-plot').bounding_box();cdp=c.new_cdp_session(page);x=plot['x']+plot['width']/2;y=plot['y']+plot['height']*.8;before=page.evaluate('scrollY')
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
   for step in range(1,9):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-160*step/8}]});page.wait_for_timeout(16)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(100);cdp.detach();check(tag+' vertical touch scroll stays native over the chart',page.evaluate('scrollY')>before+40)
   host.locator('[data-momentum-filter="plays"]').click();page.wait_for_selector('[data-momentum-clip]');check(tag+' a verified play has an exact active clip and selected-week player card',host.locator('[data-momentum-clip]').get_attribute('href').endswith('clip='+page.evaluate('clips[0].id')) and host.locator('[data-player-card]').get_attribute('data-player-week')=='7')
   host.screenshot(path=str(OUT/f'{theme}-{width}-play.png'))
   video_link=host.locator('[data-momentum-clip]');video_link.click();page.wait_for_selector('.home-reel-player[open] video',timeout=20000);page.wait_for_timeout(450)
   check(tag+' opens the existing premium replay over the matchup without navigation','tab=matchups' in page.evaluate('location.hash') and page.locator('[data-reel-close]').get_attribute('aria-label')=='Back to game')
   page.evaluate('scoreRows.push({...scoreRows.find(r=>r.id===7),id:9,score1:82,observed_at:"2026-10-25T19:19:00Z"});void refresh()');page.wait_for_timeout(80);page.locator('[data-reel-close]').click();page.wait_for_function('!document.querySelector(".home-reel-player[open]")')
   check(tag+' replay returns to the same selected play and focus',video_link.evaluate('e=>e===document.activeElement') and host.locator('[data-momentum-filter="plays"]').get_attribute('aria-pressed')=='true')
   page.evaluate('window.clipHeld=true');video_link.click();page.wait_for_timeout(50);page.locator('#other').click();page.wait_for_timeout(80);page.evaluate('clipRelease()');page.wait_for_timeout(100)
   check(tag+' a delayed clip cannot open over a newly selected matchup',page.locator('.home-reel-player[open]').count()==0 and page.evaluate('selected')=='8')
   page.locator('#other').click();page.wait_for_timeout(100)
   page.locator('#other').click();page.wait_for_timeout(100);check(tag+' another matchup does not inherit scores or moments',page.locator('.momentum-trace').count()==0 and page.locator('[data-momentum-event]').count()==0)
   page.locator('#other').click();page.wait_for_timeout(100);check(tag+' returning restores that matchup’s chosen play',host.locator('[data-momentum-filter="plays"]').get_attribute('aria-pressed')=='true')
   page.evaluate('historyFail=true;void refresh()');page.wait_for_timeout(100);check(tag+' failed history refresh retains its usable chart and retry',host.locator('.momentum-trace').count()==2 and host.locator('[data-highlights-retry]').is_visible());page.evaluate('historyFail=false');host.locator('[data-highlights-retry]').click();page.wait_for_timeout(100)
   check(tag+' retry recovers without losing the selected play',host.locator('[data-highlights-retry]').count()==0 and host.locator('[data-momentum-clip]').count()==1)
   page.evaluate('held=true;void refresh()');page.wait_for_timeout(50);page.locator('#other').click();page.wait_for_timeout(50);page.evaluate('release()');page.wait_for_timeout(100);check(tag+' late prior-matchup response is discarded',page.locator('[data-momentum-event]').count()==0)
   page.locator('#other').click();page.wait_for_timeout(100);page.emulate_media(reduced_motion='reduce');page.evaluate('motion=false');host.locator('[data-momentum-filter="all"]').click();host.locator('[data-momentum-step="-1"]').click()
   check(tag+' reduced motion keeps navigation immediate',host.evaluate('e=>e.getAnimations({subtree:true}).length===0'))
   slider.focus();page.keyboard.press('Home');saved=slider.get_attribute('aria-valuetext');page.evaluate('document.querySelector("#view").dataset.routeReturning="true";mount();void refresh()');page.wait_for_timeout(150)
   check(tag+' Back restores that history entry’s exact checkpoint',host.locator('[data-momentum-scrub]').get_attribute('aria-valuetext')==saved)
   page.evaluate('document.querySelector("#view").dataset.routeReturning="false";mount();void refresh()');page.wait_for_timeout(150)
   check(tag+' a fresh visit starts at Latest instead of old reading state',host.locator('[data-momentum-latest]').is_disabled() and host.locator('[data-momentum-scrub]').get_attribute('aria-valuetext')!=saved)
   if width==320:
    page.evaluate("document.documentElement.style.fontSize='32px'");page.wait_for_timeout(80);check(tag+' 200% text keeps names, score details and controls in bounds',host.evaluate('e=>e.scrollWidth<=e.clientWidth') and host.locator('.momentum-legend strong,.momentum-scores strong').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth&&e.getBoundingClientRect().right<=e.parentElement.getBoundingClientRect().right+1)'));host.screenshot(path=str(OUT/f'{theme}-320-large-text.png'))
   page.evaluate('live.stop()');check(tag+' teardown removes recap and observers safely',page.locator('.gd-moment-recap').count()==0);c.close()
 check('No browser errors',not errors);browser.close()
server.shutdown()
