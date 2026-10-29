"""Production trade routing, inherited viewing scores and Home entry priorities.
Isolated rosters/video only; all production database and external writes blocked.
"""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_CONNECTED_POLISH_DIR','/tmp/dfl-connected-1514'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
MODEL={'player':{'id':'7564','name':'Ja’Marr Chase','position':'WR','nflTeam':'CIN'},'season':2026,'week':7,'points':29,'state':'final','injury':{'tag':'Healthy','availability':'Available','body':''},'owner':None,'ownerLabel':'Bayou Championship Bombers','recent':[],'stats':{'items':[]},'seasonAverage':None}
HTML='<!doctype html><html><head>'+head+'''</head><body><header class="topbar" style="height:44px">DFL HQ</header><main id="view" class="view" data-route="clubhouse" style="padding:16px"><div id="matchup"><h1>Clubhouse</h1><button class="btn" id="player" data-player-card="7564"><span class="dfl-player-portrait has-photo" style="display:block;width:36px;height:40px"><img style="width:100%;height:100%" src="https://sleepercdn.com/content/nfl/players/7564.jpg" alt=""></span>Ja’Marr Chase</button><button class="btn" id="clip">Watch play</button></div><button class="btn" id="unrelated">Other player card</button><div id="reel"></div></main><script type="module">
import {pinMode} from '/js/theme.js';import {startUiMotion} from '/js/ui-motion.js';import {viewingMatchup,setViewingMatchup} from '/js/matchup-view-context.js';import {openPlayerCard} from '/js/player-card.js';import {mountHomeHighlights} from '/js/home-highlights.js';
window.theme=pinMode;startUiMotion();window.model={leagueId:'fixture',season:2026,week:7,live:true,games:[],events:[]};window.game={id:'7',sides:[{roster:'1',name:'The Very Long Bayou Championship Bombers',score:72.45},{roster:'2',name:'Monday Night Mayhem',score:0}]};setViewingMatchup(document.querySelector('#matchup'),viewingMatchup(model,game));
const rows=await(await fetch('/tools/fixtures/home-highlight-clips.json')).json();window.reel=mountHomeHighlights(document.querySelector('#reel'),{getContext:()=>model,load:async()=>rows});await reel.refresh();
window.openPlayer=source=>openPlayerCard({id:'7564',season:2026,week:7},{source});document.querySelector('#player').onclick=e=>void openPlayer(e.currentTarget);document.querySelector('#unrelated').onclick=e=>void openPlayer(e.currentTarget);document.querySelector('#clip').onclick=e=>reel.openClip(rows[0].id,{source:e.currentTarget,returnToGame:true});window.ready=true;
</script></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  name=self.path.split('?')[0];code=HTML if name=='/connected-polish.html' else "export const db=()=>{throw Error('Review database calls blocked')};export const configured=()=>false;export const edge=()=>{throw Error('Review writes blocked')};export const privilegedFunctionHeaders=()=>({});" if name=='/js/supabase.js' else "export const currentMember=()=>null;export const getMemberId=()=>null;export const loadMemberDirectory=async()=>[];" if name=='/js/members.js' else 'export async function loadPlayerCard(){return '+json.dumps(MODEL)+'}' if name=='/js/player-card-data.js' else None
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/html' if name.endswith('.html') else 'text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
checks=[];errors=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for theme in ['light','dark']:
  for width in [320,390,768]:
   c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block')
   def route(r):
    if r.request.url.startswith(base):return r.continue_()
    if r.request.url.endswith('.mp4'):return r.fulfill(content_type='video/mp4',body=(ROOT/'tools/fixtures/highlight-playback.mp4').read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
    if r.request.resource_type=='image':return r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())
    r.abort()
   c.route('**/*',route);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.clock.install(time=datetime(2026,10,28,15,tzinfo=timezone.utc));page.goto(base+'/connected-polish.html#/clubhouse');page.wait_for_function('window.ready');page.evaluate('theme',theme);page.evaluate('document.fonts.ready');tag=f'{theme}/{width}'
   page.locator('#player').click();page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")');card=page.locator('.dfl-player-card[open]')
   check(tag+' player card keeps both exact fantasy scores and full team names',card.locator('.matchup-view-context b').all_text_contents()==['72.45','0.00'] and 'Bayou Championship Bombers' in card.locator('.matchup-view-context').inner_text())
   check(tag+' score context text has readable theme contrast',page.evaluate("async()=>!(await import('/tools/home-review-contrast.js')).reviewTextContrast(document.querySelector('.dfl-player-card [data-viewing-matchup]')).failures.length"))
   check(tag+' viewing score strip fits without hiding player stats',page.evaluate('document.documentElement.scrollWidth<=innerWidth') and card.locator('.player-card-game-stats').count()==1)
   page.screenshot(path=str(OUT/f'{theme}-{width}-player.png'))
   if width==320:
    page.evaluate('document.documentElement.style.fontSize="200%"');check(tag+' enlarged player context stays inside the sheet',card.locator('[data-viewing-matchup]').evaluate('e=>e.scrollWidth<=e.clientWidth+1'));page.screenshot(path=str(OUT/f'{theme}-320-player-large.png'));page.evaluate('document.documentElement.style.fontSize=""')
   card.locator('[data-player-card-close]').click();page.wait_for_function('!document.querySelector(".dfl-player-card[open]")')
   check(tag+' closing returns focus and removes every moving portrait',page.evaluate('document.activeElement.id==="player"&&!document.querySelector(".dfl-connected-portrait")'))
   page.locator('#clip').click();page.wait_for_selector('.home-reel-player[open] video');replay=page.locator('.home-reel-player[open]')
   check(tag+' clip keeps the fantasy matchup separate from NFL video scores',replay.locator('.matchup-view-context b').all_text_contents()==['72.45','0.00'] and replay.locator('.reel-scorebug').count()==1)
   page.evaluate('window.keptVideo=document.querySelector(".home-reel-player video")');replay.locator('[data-reel-next]:not(:disabled),[data-reel-previous]:not(:disabled)').first.click();check(tag+' another clip keeps fantasy context and releases the previous media source',replay.locator('.matchup-view-context b').all_text_contents()==['72.45','0.00'] and page.evaluate('document.querySelectorAll(".home-reel-player video").length===1&&!keptVideo.hasAttribute("src")'))
   # A player opened from a replay inherits the actual fantasy journey.
   page.evaluate('''async()=>{const {openPlayerCard}=await import('/js/player-card.js');void openPlayerCard({id:'7564',season:2026,week:7},{source:document.querySelector('[data-reel-next]')})}''');page.wait_for_selector('.dfl-player-card[open] .player-card-hero')
   check(tag+' nested player inherits the replay matchup',page.locator('.dfl-player-card[open] .matchup-view-context b').all_text_contents()==['72.45','0.00']);page.locator('.dfl-player-card[open] [data-player-card-close]').click();page.wait_for_function('!document.querySelector(".dfl-player-card[open]")')
   page.screenshot(path=str(OUT/f'{theme}-{width}-replay.png'));replay.locator('[data-reel-close]').click();page.wait_for_function('!document.querySelector(".home-reel-player[open]")');check(tag+' replay returns to the exact source',page.evaluate('document.activeElement.id==="clip"'))
   page.locator('#unrelated').click();page.wait_for_selector('.dfl-player-card[open] .player-card-hero');check(tag+' unrelated openings clear the prior matchup',page.locator('.dfl-player-card[open] [data-viewing-matchup]').is_hidden());page.locator('.dfl-player-card[open] [data-player-card-close]').click();page.wait_for_function('!document.querySelector(".dfl-player-card[open]")')
   page.locator('#clip').click();page.wait_for_selector('.home-reel-player[open] video');page.evaluate('window.dockedVideo=document.querySelector(".home-reel-player video")');page.locator('[data-reel-minimize]').click();page.wait_for_selector('.replay-dock');page.evaluate('reel.stop()');page.locator('[data-dock-expand]').click();page.wait_for_selector('.replay-dock-expanded[open]')
   check(tag+' detached replay retains the original fantasy matchup',page.locator('.replay-dock-expanded[open] .matchup-view-context b').all_text_contents()==['72.45','0.00'])
   check(tag+' expanding after leaving keeps the same native video',page.evaluate('dockedVideo===document.querySelector(".replay-dock-expanded video")'));page.locator('[data-dock-stop]').click();page.wait_for_function('!document.querySelector(".replay-dock,.replay-dock-expanded")')
   # Mount the production routing desk with isolated three-team data.
   page.evaluate('''async()=>{reel.stop();const {tradeReviewFixture}=await import('/tools/trade-review-fixture.mjs');const {tradeDeskMarkup,mountTradeDesk}=await import('/js/trade-desk.js');window.data=tradeReviewFixture();window.parties=data.teams.slice(0,3);window.state={memberIds:parties.slice(1).map(t=>t.id),sends:parties.map(t=>new Set([t.playerIds[2]])),destinations:{}};for(let i=0;i<3;i++)state.destinations[parties[i].playerIds[2]]=String(parties[(i+1)%3].id);const root=document.querySelector('#view');root.dataset.route='trade';root.innerHTML=tradeDeskMarkup(parties[0],data.teams,data.pool,state);window.stopDesk=mountTradeDesk(root,{team:parties[0],teams:data.teams,pool:data.pool,state,onDeal:d=>window.deal=d});window.ids=state.sends.map(s=>[...s][0]);}''')
   board=page.locator('[data-td-routing-board]');board.scroll_into_view_if_needed();ids=page.evaluate('ids');player=ids[0];team3=page.evaluate('String(parties[2].id)')
   check(tag+' compact receiving board shows all three packages',board.locator('.td-route-chip').count()==3 and board.locator('.td-route-lane').count()==3)
   before=page.evaluate('JSON.stringify(state.sends.map(s=>[...s]))');board.locator(f'[data-td-route-select="{player}"]').click();check(tag+' choosing a chip focuses a legal keyboard destination',page.evaluate('document.activeElement.matches("[data-td-route-to]:not(:disabled)")'))
   board.locator(f'[data-td-route-to="{team3}"]').click();check(tag+' tap routing changes only the receiver and recomputes the deal',page.evaluate('JSON.stringify(state.sends.map(s=>[...s]))')==before and page.evaluate('(id)=>state.destinations[id]',player)==team3 and page.locator('[data-td-route-announcement]').inner_text().find(' to ')>0)
   check(tag+' a missing receiving side produces no invented valid verdict',page.evaluate('deal===null') and page.locator('[data-td-routing-status]').count()==1)
   page.locator('[data-td-edit-bar] [data-td-undo]').click();check(tag+' Undo restores the exact routed deal',page.evaluate('!!deal&&String(state.destinations[ids[0]])===String(parties[1].id)'))
   board.scroll_into_view_if_needed();page.wait_for_timeout(320);page.screenshot(path=str(OUT/f'{theme}-{width}-routing.png'))
   # Drag the explicit handle; ordinary chip/name scrolling stays native.
   handle=board.locator(f'[data-td-route-drag="{player}"]');handle.scroll_into_view_if_needed();h=handle.bounding_box();target=board.locator(f'[data-td-route-zone="{team3}"]');t=target.bounding_box()
   page.mouse.move(h['x']+h['width']/2,h['y']+h['height']/2);page.mouse.down();page.mouse.move(t['x']+t['width']/2,t['y']+min(20,t['height']/2),steps=12);page.wait_for_timeout(60)
   check(tag+' dragging uses one pointer-transparent preview',page.locator('.td-route-ghost').count()==1 and page.locator('.td-route-ghost').evaluate('e=>getComputedStyle(e).pointerEvents==="none"'));page.mouse.up();page.wait_for_timeout(120)
   check(tag+' dropping routes the player and cleans the preview',page.evaluate('(id)=>state.destinations[id]',player)==team3 and page.locator('.td-route-ghost').count()==0)
   check(tag+' board fits the phone and leaves its normal chips vertically scrollable',page.evaluate('document.documentElement.scrollWidth<=innerWidth') and board.locator('[data-td-route-select]').first.evaluate('e=>getComputedStyle(e).touchAction!=="none"'))
   page.wait_for_timeout(400);board.locator(f'[data-td-route-select="{player}"]').click();page.keyboard.press('Escape');check(tag+' Escape cancels an armed move without changing terms',board.locator('[data-td-route-to]').count()==0 and page.evaluate('(id)=>state.destinations[id]',player)==team3)
   if width==320:
    page.locator('[data-td-edit-bar] [data-td-undo]').click();board.scroll_into_view_if_needed();page.wait_for_timeout(100)
    handle=board.locator(f'[data-td-route-drag="{player}"]');h=handle.bounding_box();t=board.locator(f'[data-td-route-zone="{team3}"]').bounding_box();cdp=c.new_cdp_session(page)
    def touch(kind,x,y):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind in ['touchEnd','touchCancel'] else [{'id':0,'x':x,'y':y,'radiusX':1,'radiusY':1,'force':1}]})
    x=h['x']+h['width']/2;y=h['y']+h['height']/2;tx=t['x']+t['width']/2;ty=t['y']+min(20,t['height']/2)
    touch('touchStart',x,y)
    for i in range(1,9):touch('touchMove',x+(tx-x)*i/8,y+(ty-y)*i/8);page.wait_for_timeout(18)
    touch('touchEnd',tx,ty);page.wait_for_timeout(80)
    check(tag+' native touch drag uses the same validated destination',page.evaluate('(id)=>state.destinations[id]',player)==team3 and page.locator('.td-route-ghost').count()==0)
    handle=board.locator(f'[data-td-route-drag="{player}"]');h=handle.bounding_box();x=h['x']+h['width']/2;y=h['y']+h['height']/2;touch('touchStart',x,y);touch('touchMove',x-20,y-20);touch('touchCancel',x-20,y-20)
    check(tag+' cancelled touch removes its preview without changing the trade',page.locator('.td-route-ghost').count()==0 and page.evaluate('(id)=>state.destinations[id]',player)==team3)
    cdp.detach()
    page.evaluate('document.documentElement.style.fontSize="200%"');board.scroll_into_view_if_needed();check(tag+' large text reflows the full team/player names',board.evaluate('e=>e.scrollWidth<=e.clientWidth+1'));page.screenshot(path=str(OUT/f'{theme}-320-routing-large.png'));page.evaluate('document.documentElement.style.fontSize=""')
   # Current Home chooses priorities once; late data must not move an engaged reader.
   page.evaluate('''async()=>{stopDesk();const {mountHomeRhythm}=await import('/js/home-rhythm.js');const root=document.querySelector('#view');root.innerHTML='<div class="home-personal-desk"><div data-home-personal-part="matchup">Matchup</div><div data-home-personal-part="decisions">Decisions</div></div><div data-home-rhythm-flow><div data-home-rhythm-part="week">Week</div><div data-home-rhythm-part="highlights">Clips</div></div>';scrollTo(0,0);document.activeElement?.blur();window.rhythm=mountHomeRhythm(root);window.edition={model:{season:2026,week:7,events:[{state:"upcoming",kickoff:Date.now()+3600000}]}};rhythm.update(edition)}''')
   check(tag+' pregame puts decisions before the matchup without duplicating either',page.locator('[data-home-personal-part]').evaluate_all('es=>es.map(e=>e.dataset.homePersonalPart)')==['decisions','matchup'])
   page.evaluate('edition.model.events[0].state="live";rhythm.update(edition)');check(tag+' new data cannot reshuffle a chosen visit',page.locator('[data-home-personal-part]').first.get_attribute('data-home-personal-part')=='decisions');page.evaluate('rhythm.stop()')
   for mode in ['live','aftermath']:
    page.evaluate('''async mode=>{const {mountHomeRhythm}=await import('/js/home-rhythm.js');const root=document.querySelector('#view');root.innerHTML='<div class="home-personal-desk"><div data-home-personal-part="decisions">Decisions</div><div data-home-personal-part="matchup">Matchup</div></div><div data-home-rhythm-flow><div data-home-rhythm-part="week">Week</div><div data-home-rhythm-part="highlights">Clips</div></div>';scrollTo(0,0);document.activeElement?.blur();window.rhythm=mountHomeRhythm(root);rhythm.update({model:{season:2026,week:7,completed:mode==='aftermath',events:[{state:'live'}]}})}''',mode)
    check(tag+' '+mode+' leads with the matchup or final result',page.locator('[data-home-personal-part]').first.get_attribute('data-home-personal-part')=='matchup');page.evaluate('rhythm.stop()')
   c.close()
 check('No browser errors or database mutations',not errors);b.close()
server.shutdown()
