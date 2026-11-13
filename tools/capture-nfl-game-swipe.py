"""NFL game navigation: real touch, official field data, no production writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_NFL_SWIPE_DIR','/tmp/dfl-nfl-swipe'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'<style>body{margin:0}#view{padding:12px 16px;max-width:780px;margin:0 auto}html{--topbar-h:0px;--dfl-scroll-top:0px;--dfl-scroll-height:0px}</style></head><body><main id="view" data-route="clubhouse"><section id="rail"></section><section id="feed"></section></main></body></html>'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  code=html if self.path.startswith('/nfl-swipe.html') else "export const configured=()=>false;export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};" if self.path.startswith('/js/supabase.js') else None
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/html' if self.path.startswith('/nfl-swipe') else 'text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}';checks=[];errors=[]
def check(label,ok):
 checks.append({'check':label,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,label;print('PASS '+label,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block')
 def route(r):
  if r.request.url.startswith(base):return r.continue_()
  if r.request.resource_type=='image':
   code=r.request.url.split('/')[-1].split('.')[0];file=ROOT/'tools/fixtures'/('nfl-'+code+'.png')
   return r.fulfill(content_type='image/png',body=(file if file.is_file() else ROOT/'tools/fixtures/player-portrait.png').read_bytes())
  r.abort()
 c.route('**/*',route);pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(base+'/nfl-swipe.html',wait_until='domcontentloaded')
 pg.evaluate('''async()=>{
  const {mountNflGameCenter}=await import('/js/nfl-game-center.js'),{mountMultigame}=await import('/js/multigame.js');(await import('/js/ui-motion.js')).startUiMotion();
  const raw=await(await fetch('/tools/fixtures/nfl-field-plays.json')).json(),stats=await(await fetch('/tools/fixtures/nfl-game-center-summary.json')).json();
  const f=window.f={reads:0,boards:0,stats:0,hold:'',selected:'',releases:{},raw};
  f.games=[['401873023',['CAR','GB']],['401900001',['SEA','LAR']],['401900002',['PIT','NO']]];
  f.directory=await(await fetch('/tools/fixtures/nfl-game-center-directory.json')).json();
  Object.values(f.directory).forEach(p=>p.t=p.t==='PIT'?'CAR':'GB');
  f.context=()=>({season:2026,week:8,players:[],playerDirectory:f.directory});
  const rail=mountMultigame(document.querySelector('#rail'),{getContext:f.context,onSelect:id=>f.center.selectGame(id)});f.rail=rail;
  f.center=mountNflGameCenter(document.querySelector('#feed'),{desk:true,getContext:f.context,loadProjections:async()=>({data:[]}),loadStats:async()=>{f.stats++;return {data:[]}},loadBoard:async()=>{f.boards++;return {payload:{season:{year:2026,type:2},week:{number:8},events:f.games.map(([id,codes])=>({id,date:'2026-10-30T00:15Z',status:{type:{state:'in',shortDetail:'Q2 6:12'}},competitions:[{competitors:codes.map((code,i)=>({team:{id:i?'9':'29',abbreviation:code},homeAway:i?'home':'away',score:i?'10':'14'}))}]}))}}},loadSummary:async game=>{f.reads++;if(f.hold===game.id)await new Promise(r=>f.releases[game.id]=r);const s=structuredClone(stats);s.scoringPlays=[];s.header={id:game.id,season:{year:2026,type:2},competitions:[{status:{type:{state:'in',shortDetail:'Q2 6:12'}},competitors:game.sides.map(t=>({team:{id:t.id,abbreviation:t.code},homeAway:t.home?'home':'away',score:t.score}))}]};if(game.id==='401873023'){s.drives={previous:[{plays:[{...raw.plays.home_gain,sequenceNumber:'1'},{...raw.plays.away_gain,sequenceNumber:'2'}]}]};s.boxscore.players=s.boxscore.players.map((t,i)=>({...t,team:{...t.team,abbreviation:i?'GB':'CAR'}}));}else{s.drives={previous:[]};s.boxscore={players:[]};}return {summary:s,fetchedAt:Date.now()}},onGameChange:id=>{f.selected=id;rail.select(id)},onBoard:(board,id)=>rail.update(board,id),onSummary:(game,result)=>rail.summary(game,result)});await f.center.ready;f.center.pause();
  window.setTheme=async mode=>(await import('/js/theme.js')).pinMode(mode);window.contrast=(await import('/tools/home-review-contrast.js')).reviewTextContrast;
 }''');pg.evaluate('document.fonts.ready');touch=c.new_cdp_session(pg)
 def event(kind,x=0,y=0):touch.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind in ['touchEnd','touchCancel'] else [{'x':x,'y':y}]})
 def swipe(dx=-210,dy=0,cancel=False,wait=320):
  pg.evaluate('scrollTo(0,0)');box=pg.locator('[data-nfl-game-stage] .nfl-game-hero').bounding_box() if pg.locator('.nfl-game-hero').count() else pg.locator('.nfl-fantasy-league').bounding_box();x=285 if dx<0 else 85;y=box['y']+box['height']*.55
  event('touchStart',x,y)
  for i in range(1,9):event('touchMove',x+dx*i/8,y+dy*i/8);pg.wait_for_timeout(16)
  event('touchCancel' if cancel else 'touchEnd');pg.wait_for_timeout(wait)
 def selected():return pg.locator('#feed').get_attribute('data-nfl-selected-game')
 def settled():return pg.locator('[data-nfl-game-stage]').evaluate('e=>getComputedStyle(e).transform==="none"&&!e.getAnimations().length') and pg.locator('.nfl-game-preview').count()==0
 for theme in ['light','dark']:
  pg.evaluate('setTheme',theme);pg.wait_for_timeout(60)
  for width in [320,390,430,768]:
   pg.set_viewport_size({'width':width,'height':844});pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(60)
   check(f'{theme}/{width} perspective field and strip fit',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and (width>=430 or pg.locator('.multigame-grid').evaluate('e=>e.scrollWidth>e.clientWidth')))
   check(f'{theme}/{width} all targets remain accessible',pg.locator('#view').evaluate('e=>[...e.querySelectorAll("button,select")].filter(e=>e.checkVisibility()).every(e=>e.getBoundingClientRect().height>=43.5)'))
   result=pg.locator('#view').evaluate('e=>contrast(e)');check(f'{theme}/{width} contrast '+json.dumps(result['failures']),not result['failures'])
   pg.screenshot(path=str(OUT/f'{theme}-{width}-plays.png'))
  pg.set_viewport_size({'width':320,'height':844});pg.evaluate('document.documentElement.style.fontSize="32px";document.documentElement.dataset.readability="comfortable"');pg.wait_for_timeout(80)
  check(theme+' stadium field and controls fit at 200% text',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  pg.screenshot(path=str(OUT/f'{theme}-large.png'));pg.evaluate('document.documentElement.style.fontSize="";document.documentElement.dataset.readability="compact"')
  pg.set_viewport_size({'width':390,'height':844});swipe(cancel=True)
  check(theme+' canceled swipe keeps game without stale layers',selected()=='401873023' and settled())
  before=pg.evaluate('f.reads');swipe(dx=-28,wait=350)
  # A slow, short drag is below distance and flick thresholds.
  check(theme+' short drag does not request another game',pg.evaluate('f.reads')==before and selected()=='401873023' and settled())
  swipe();check(theme+' left swipe selects next game and highlights strip',selected()=='401900001' and pg.locator('.multigame-card.is-selected').get_attribute('id')=='desk-game-401900001' and settled())
  check(theme+' new game never displays old players or play text',pg.locator('.nfl-center-plays li[id]').count()==0 and pg.locator('.nfl-stadium-description').inner_text()!='')
  swipe(dx=210);check(theme+' reverse swipe restores cached game',selected()=='401873023' and pg.locator('.nfl-center-plays li[id]').count()==2 and settled())
  before=pg.evaluate('f.reads');swipe(dx=180);check(theme+' first-game edge resists without looping',selected()=='401873023' and pg.evaluate('f.reads')==before and settled())
  pg.locator('[data-nfl-center-mode="fantasy"]').click();pg.wait_for_timeout(180);swipe()
  check(theme+' game swipe keeps Fantasy selected without leaking previous stats',selected()=='401900001' and pg.locator('[data-nfl-center-mode="fantasy"]').get_attribute('aria-pressed')=='true' and pg.locator('.nfl-score-player').count()==0)
  swipe(dx=210);check(theme+' Fantasy swipe back restores side-by-side players',selected()=='401873023' and pg.locator('.nfl-score-player').count()==20 and settled())
  pg.evaluate('scrollTo(0,0)');pg.screenshot(path=str(OUT/f'{theme}-fantasy.png'))
  pg.locator('[data-nfl-center-mode="plays"]').click();pg.wait_for_timeout(180)
  # Pointer moves must update a visual preview before release, not just trigger a click.
  pg.evaluate('scrollTo(0,0)');hero=pg.locator('[data-nfl-game-stage] .nfl-game-hero').bounding_box();y=hero['y']+95
  before=pg.evaluate('f.reads');event('touchStart',290,y);event('touchMove',220,y);pg.wait_for_timeout(40)
  check(theme+' finger tracking previews neighbor without a network read',pg.locator('.nfl-game-preview').count()==1 and pg.evaluate('f.reads')==before and pg.locator('[data-nfl-game-stage]').evaluate('e=>new DOMMatrixReadOnly(getComputedStyle(e).transform).m41<-20'))
  pg.screenshot(path=str(OUT/f'{theme}-drag.png'));event('touchCancel');pg.wait_for_timeout(250)
  pg.locator('[data-nfl-field-replay]').click();check(theme+' team marker follows finite official-endpoint animation',pg.locator('.nfl-field-ball').evaluate('e=>e.getAnimations().some(a=>a.effect.getTiming().iterations===1&&a.effect.getKeyframes().at(-1).transform===e.style.transform)'))
  pg.wait_for_timeout(1500);check(theme+' field leaves no looping animations',pg.locator('[data-nfl-field]').evaluate('e=>e.getAnimations({subtree:true}).length===0'))
  pg.evaluate('f.center.pause()')
 # A refresh during a captured drag must not replace the pointer target.
 pg.evaluate('scrollTo(0,0)');hero=pg.locator('[data-nfl-game-stage] .nfl-game-hero').bounding_box();y=hero['y']+95
 event('touchStart',290,y);event('touchMove',210,y);pg.wait_for_timeout(35)
 pg.evaluate('f.dragStage=document.querySelector("[data-nfl-game-stage]");void f.center.refresh()');pg.wait_for_timeout(90)
 check('live refresh preserves the captured stage and neighbor preview',pg.locator('[data-nfl-game-stage]').evaluate('e=>e===f.dragStage&&new DOMMatrixReadOnly(getComputedStyle(e).transform).m41<-20') and pg.locator('.nfl-game-preview').count()==1)
 event('touchCancel');pg.wait_for_timeout(250);check('cancel flushes the deferred live update cleanly',settled())
 # Continue touching before the arrival finishes, then reverse toward the prior game.
 swipe(wait=0);swipe(dx=210,wait=350);check('rapid reversal lands on the intended game without ghost layers',selected()=='401873023' and settled())
 before=pg.evaluate('f.reads');swipe(dx=5,dy=-150);check('vertical scrolling retains the game without hidden requests',selected()=='401873023' and pg.evaluate('f.reads')==before and settled())
 # A late reply must not paint over the game selected by a reverse swipe.
 pg.evaluate('f.hold="401900001"');swipe();check('slow game shows its own loading state',selected()=='401900001')
 swipe(dx=210);pg.evaluate('f.hold="";f.releases["401900001"]()');pg.wait_for_timeout(150)
 check('late response cannot overwrite a reverse swipe',selected()=='401873023' and pg.locator('.nfl-center-score strong').evaluate_all('es=>es.map(e=>e.dataset.nflScoreCode)')==['CAR','GB'])
 # Reduced motion preserves navigation without drag, field or slide animation.
 pg.emulate_media(reduced_motion='reduce');swipe();check('Reduced Motion retains game navigation with no running motion',selected()=='401900001' and pg.locator('#feed').evaluate('e=>e.getAnimations({subtree:true}).length===0') and settled())
 pg.emulate_media(reduced_motion='no-preference');pg.evaluate('async()=>{(await import("/js/page-disclosure.js")).savePageChoice("gameday-motion","off");dispatchEvent(new Event("storage"))}');swipe(dx=210)
 check('app motion off retains game navigation',selected()=='401873023' and settled() and pg.evaluate('document.documentElement.dataset.uiMotion==="off"') and pg.locator('#feed').evaluate('e=>e.getAnimations({subtree:true}).length===0'))
 pg.locator('#feed [data-replay-step="1"]').click();pg.wait_for_timeout(150);check('arrow navigation changes the same selected game',selected()=='401900001')
 pg.locator('[data-desk-game="401873023"]').click();pg.wait_for_timeout(150);check('game strip retains native tap selection',selected()=='401873023')
 pg.evaluate('f.center.stop();f.rail.stop()');before=pg.evaluate('f.reads');swipe();check('teardown removes swipe handlers and hidden polling',pg.evaluate('f.reads')==before and settled())
 check('no page errors or production writes',not errors);b.close()
server.shutdown();print(json.dumps({'checks':len(checks)}))
