"""Actual NFL Game Center; deterministic reference demo, no production reads/writes."""
import json,os,re,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_SCORES_REVIEW_DIR','/workspace/dfl-scores-review'));OUT.mkdir(parents=True,exist_ok=True);MEDIA=Path(os.environ.get('DFL_SCORES_MEDIA_DIR',str(ROOT/'tools/fixtures')))
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0];symbols=''.join(re.findall(r'<defs\b[\s\S]*?</defs>|<symbol\b[\s\S]*?</symbol>',(ROOT/'index.html').read_text()))
fixture='''
import {mountNflGameCenter} from '/js/nfl-game-center.js';import {pinMode} from '/js/theme.js';import {startUiMotion} from '/js/ui-motion.js';
startUiMotion();window.f={reads:0,statsReads:0,projectionReads:0,terminal:false,fail:false,active:true,hold:'',releases:{}};
f.source=await(await fetch('/tools/fixtures/nfl-scores-game.json')).json();f.summary=f.source.summary;
f.games=[{id:'900000020',codes:['WAS','NYG'],scores:[3,0]},{id:'900000021',codes:['NE','DET'],scores:[null,null]},{id:'900000022',codes:['KC','ATL'],scores:[null,null]}];
f.event=g=>({id:g.id,date:'2026-11-13T01:15:00Z',competitions:[{status:{type:{state:g.id==='900000020'?(f.terminal?'post':'in'):'pre',shortDetail:g.id==='900000020'?'Q2 10:23':'Nov 15 8:30 AM'}},competitors:g.codes.map((code,i)=>({team:{id:g.id==='900000020'?(i?'19':'28'):String(i+1),abbreviation:code},homeAway:i?'home':'away',score:g.scores[i]}))}]});
f.context=()=>({season:2026,week:10,players:f.source.players,playerDirectory:f.source.directory,scoringSettings:{pass_yd:.04,pass_td:4,pass_int:-2,rush_yd:.1,rush_td:6,rec:1,rec_yd:.1,rec_td:6}});
f.center=mountNflGameCenter(document.querySelector('#feed'),{desk:true,fullscreen:true,scrollRoot:document.querySelector('#feed'),restoreChoice:false,initialMode:'plays',getContext:f.context,active:()=>f.active,loadBoard:async()=>({payload:{season:{year:2026,type:2},week:{number:10},events:f.games.map(f.event)}}),loadSummary:async game=>{f.reads++;if(f.hold===game.id)await new Promise(r=>f.releases[game.id]=r);if(f.fail)throw Error('Fixture unavailable');return {summary:game.id==='900000020'?f.summary:{header:{id:game.id,season:{year:2026,type:2},competitions:[f.event(f.games.find(g=>g.id===game.id)).competitions[0]]},boxscore:{players:[]}},fetchedAt:Date.now()}},loadStats:async()=>{f.statsReads++;return {data:[]}},loadProjections:async()=>{f.projectionReads++;return {data:f.source.projections}}});await f.center.ready;f.center.pause();f.cardClicks=0;document.querySelector('#feed').addEventListener('click',e=>{if(e.target.closest('[data-player-card]'))f.cardClicks++});window.setTheme=pinMode;window.ready=true;
'''
html='<!doctype html><html lang="en"><head><base href="/">'+head+'<style>html{--topbar-h:0px;--dfl-scroll-top:0px;--dfl-scroll-height:0px}body{margin:0}#view{padding:0 8px;max-width:1000px;margin:auto}</style></head><body><svg width="0" height="0" style="position:absolute" aria-hidden="true">'+symbols+'</svg><main id="view" class="view" data-page-system="1" data-route="clubhouse"><section id="feed"></section></main><script type="module">'+fixture+'</script></body></html>'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  path=self.path.split('?')[0];code=html if path=='/gamecast-review/' else "export const db=()=>null;export const configured=()=>false;export const edge=()=>{throw Error('Writes blocked')};" if path=='/js/supabase.js' else None
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/html;charset=utf-8' if path=='/gamecast-review/' else 'text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}';checks=[]
def check(label,ok):
 checks.append({'check':label,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2))
 if not ok:pg.screenshot(path=str(OUT/'failure.png'))
 assert ok,label;print('PASS '+label,flush=True)
def swipe(pg,c):
 t=pg.locator('#feed [data-replay-games]');box=t.bounding_box();x=box['x']+box['width']*.85;y=box['y']+box['height']/2;start=t.evaluate('e=>e.scrollLeft');overflow=t.evaluate('e=>e.scrollWidth>e.clientWidth+20');cdp=c.new_cdp_session(pg);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for i in range(1,13):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-132*i/12,'y':y}]});pg.wait_for_timeout(20)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});pg.wait_for_timeout(400);return not overflow or abs(t.evaluate('e=>e.scrollLeft')-start)>20
def touch_drag(page,context,selector,dx=-150,dy=0):
 box=page.locator(selector).first.bounding_box();x=box['x']+box['width']*(.8 if dx<0 else .2);y=max(8,min(700,box['y']+box['height']/2));cdp=context.new_cdp_session(page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for i in range(1,13):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*i/12,'y':y+dy*i/12}]});page.wait_for_timeout(16)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(400)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,430,768]:
  for theme in ['dark','light']:
   c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block');pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if r.request.url.startswith(base):return r.continue_()
    if r.request.resource_type=='image':
     file=MEDIA/r.request.url.split('/')[-1].split('?')[0];fallback=ROOT/'tools/fixtures/player-portrait.png';return r.fulfill(content_type='image/png',body=(file if file.is_file() else fallback).read_bytes())
    r.abort()
   c.route('**/*',route);pg.goto(base+'/gamecast-review/');pg.wait_for_function('window.ready');pg.evaluate('setTheme',theme);pg.evaluate('document.fonts.ready');pg.evaluate('async()=>{window.contrast=(await import("/tools/home-review-contrast.js")).reviewTextContrast}');pg.wait_for_timeout(1100);tag=f'{width}-{theme}'
   check(tag+' full-screen viewport with exactly Live and Stats',pg.locator('[data-nfl-center-mode]').all_text_contents()==['Live','Stats'] and pg.locator('#feed').evaluate('e=>{const r=e.getBoundingClientRect();return r.x===0&&r.y===0&&Math.abs(r.height-innerHeight)<1}'))
   check(tag+' selected NFL score precedes the real field',pg.locator('.nfl-center-score b').all_text_contents()==['3','0'] and pg.locator('.nfl-stadium-ground').is_visible() and pg.locator('.nfl-center-score').bounding_box()['y']<pg.locator('.nfl-stadium-ground').bounding_box()['y'])
   check(tag+' field has the identified athlete and real drive caption',pg.locator('.nfl-field-player-label').text_content()=='T. Way 55 yd' and '3 plays' in pg.locator('.nfl-drive-caption').inner_text())
   check(tag+' full source descriptions and identified feed portraits',pg.locator('.nfl-play-details>p:not(.nfl-feed-people)').count()==4 and pg.locator('.nfl-feed-portrait').count()==4 and 'incomplete pass' in pg.locator('.nfl-center-plays').inner_text())
   check(tag+' Live does not fetch weekly stats or projections',pg.evaluate('f.statsReads===0&&f.projectionReads===0'))
   check(tag+' page and full-screen view have no horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and pg.locator('#feed').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
   result=pg.locator('#feed').evaluate('e=>contrast(e)');check(tag+' Live contrast '+json.dumps(result['failures']),not result['failures']);pg.screenshot(path=str(OUT/f'{tag}-live.png'))
   pg.locator('[data-nfl-center-mode="fantasy"]').click();pg.wait_for_timeout(250)
   check(tag+' Stats hides the Live hero and begins with the quarter scoreboard',pg.locator('.nfl-game-hero').count()==0 and pg.locator('.nfl-quarter-table tbody td').all_text_contents()[:5]==['0','3','—','—','3'])
   check(tag+' mirrored position groups and all source players',pg.locator('.nfl-position-group>h3').all_text_contents()==['QB','RB','WR','TE'] and pg.locator('.nfl-score-player').count()==17 and pg.locator('.nfl-score-player.is-away').first.bounding_box()['x']<pg.locator('.nfl-score-player.is-home').first.bounding_box()['x'])
   check(tag+' exact actual and projected totals and whole names','2.74' in pg.locator('.nfl-score-player').filter(has_text='J. Daniels').inner_text() and '18.28' in pg.locator('.nfl-score-player').filter(has_text='J. Daniels').inner_text() and pg.locator('.nfl-score-name').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'))
   check(tag+' zero-point rows remain without empty stat noise',pg.locator('.nfl-score-player').filter(has_text='R. Henry').locator('.nfl-score-totals>b').inner_text()=='0.00' and pg.locator('.nfl-score-player').filter(has_text='R. Henry').locator('.nfl-score-line').inner_text()=='')
   check(tag+' each player row and view control has a full touch target',pg.locator('#feed').evaluate('e=>[...e.querySelectorAll("button,select")].filter(e=>e.checkVisibility()).every(e=>e.getBoundingClientRect().height>=43.5)'))
   result=pg.locator('#feed').evaluate('e=>contrast(e)');check(tag+' Stats contrast '+json.dumps(result['failures']),not result['failures']);pg.screenshot(path=str(OUT/f'{tag}-stats.png'))
   pg.evaluate('f.rowOrder=[...document.querySelectorAll(".nfl-score-player")].map(e=>e.id);f.keptReads=f.reads;f.originalPlayers=f.source.players;f.source.players=f.source.players.map((p,i)=>({...p,points:40-i,isMine:!p.isMine}));f.center.updateContext()');check(tag+' scoring swings preserve order without a new game read',pg.evaluate('f.reads===f.keptReads&&JSON.stringify([...document.querySelectorAll(".nfl-score-player")].map(e=>e.id))===JSON.stringify(f.rowOrder)'));pg.evaluate('f.source.players=f.originalPlayers;f.center.updateContext()')
   pg.locator('[data-nfl-box-team="NYG"]').click();check(tag+' team box score shares the selected NFL game',pg.locator('.nfl-stat-group').first.get_attribute('aria-label')=='NYG Passing' and pg.locator('.nfl-position-group').count()==0);pg.screenshot(path=str(OUT/f'{tag}-team.png'));pg.locator('[data-nfl-box-team="fantasy"]').click()
   pg.evaluate('document.querySelector("#feed").scrollTop=0;f.keptReads=f.reads;f.rail=document.querySelector("[data-replay-games]");f.railLeft=f.rail.scrollLeft;f.railOverflow=f.rail.scrollWidth>f.rail.clientWidth+20');touch_drag(pg,c,'[data-replay-games]',dx=-110);check(tag+' native rail scrolling never selects or requests a game',pg.locator('#feed').get_attribute('data-nfl-selected-game')=='900000020' and pg.evaluate('f.reads===f.keptReads&&(!f.railOverflow||Math.abs(f.rail.scrollLeft-f.railLeft)>8)'))
   if width==390 and theme=='dark':
    pg.evaluate('document.querySelector("#feed").scrollTop=0');touch_drag(pg,c,'.nfl-score-player.is-home button',dx=-190);check('Stats player-row swipes select the next game without opening a card',pg.locator('#feed').get_attribute('data-nfl-selected-game')=='900000021' and pg.evaluate('f.cardClicks===0'));touch_drag(pg,c,'.nfl-fantasy-league',dx=190);check('Stats reverse swipe returns to the exact player list',pg.locator('#feed').get_attribute('data-nfl-selected-game')=='900000020' and pg.locator('.nfl-score-player').count()==17);pg.evaluate('f.center.pause()')
   pg.evaluate('document.querySelector("#feed").scrollTop=300');pg.wait_for_timeout(70);check(tag+' game rail and view tabs pin while Stats scrolls',abs(pg.locator('.nfl-center-tools').bounding_box()['y'])<1 and abs(pg.locator('.nfl-center-modes').bounding_box()['y']-pg.locator('.nfl-center-tools').bounding_box()['height'])<2);pg.evaluate('document.querySelector("#feed").scrollTop=0')
   pg.evaluate('document.querySelector("#feed").scrollTop=0;document.documentElement.style.fontSize="32px"');pg.wait_for_timeout(100);check(tag+' 200% text stays within the viewport',pg.locator('#feed').evaluate('e=>e.scrollWidth<=e.clientWidth+1'));pg.screenshot(path=str(OUT/f'{tag}-large.png'));pg.evaluate('document.documentElement.style.fontSize="16px"')
   pg.emulate_media(reduced_motion='reduce');pg.locator('[data-nfl-center-mode="plays"]').click();check(tag+' Reduced Motion keeps a readable field without running animation',pg.locator('[data-nfl-field]').evaluate('e=>e.getAnimations({subtree:true}).length===0'));pg.emulate_media(reduced_motion='no-preference')
   pg.locator('[data-nfl-field-replay]').click();check(tag+' Replay uses a finite play animation',pg.locator('.nfl-field-ball').evaluate('e=>e.getAnimations().some(a=>a.effect.getTiming().iterations===1)'));pg.wait_for_timeout(1500);check(tag+' the field has no continuing animation loop',pg.locator('[data-nfl-field]').evaluate('e=>e.getAnimations({subtree:true}).length===0'))
   pg.locator('[data-nfl-center-mode="fantasy"]').click();pg.wait_for_timeout(170);pg.evaluate('document.querySelector("#feed").scrollTop=0');pg.locator('[data-replay-game="900000021"]').click();pg.wait_for_function('document.querySelector("#feed").dataset.nflSelectedGame==="900000021"');check(tag+' explicit game activation retains Stats without old players',pg.locator('.nfl-score-player').count()==0 and pg.locator('[data-nfl-center-mode="fantasy"]').get_attribute('aria-pressed')=='true');pg.locator('[data-replay-game="900000020"]').click();pg.wait_for_function('document.querySelectorAll(".nfl-score-player").length===17')
   pg.locator('[data-nfl-center-mode="plays"]').click();pg.evaluate('f.terminal=true;f.summary.header.competitions[0].status.type={state:"post",shortDetail:"Final"};const p=f.summary.drives.current.plays.at(-1);f.summary.drives.current.plays.push({...p,id:"900000029999",sequenceNumber:"9999",type:{text:"End of Game"},text:"End of Game",statYardage:0});f.center.refresh()');pg.wait_for_function('document.querySelector(".nfl-stadium-description").textContent==="End of Game"');check(tag+' administrative events retain the final actual field spot',pg.locator('.nfl-stadium-position>b').inner_text()=='Final spot' and pg.locator('.nfl-field-result').inner_text()=='')
   check(tag+' unique IDs and no browser errors',pg.evaluate('(()=>{const ids=[...document.querySelectorAll("[id]")].map(e=>e.id);return ids.length===new Set(ids).size})()') and not errors)
   pg.evaluate('f.center.stop();f.stopped=f.reads;dispatchEvent(new Event("focus"))');pg.wait_for_timeout(60);check(tag+' teardown removes reads',pg.evaluate('f.stopped===f.reads'));c.close()
 b.close()
server.shutdown();print(f'{len(checks)} mobile Scores checks passed')
