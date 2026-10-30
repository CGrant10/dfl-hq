"""Official start/end field renderer, actual controller, deterministic updates; no writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_NFL_FIELD_DIR','/tmp/dfl-nfl-field'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'<style>html{--topbar-h:0px}body{margin:0;padding:0}#view{margin:0 auto;padding:12px 16px;max-width:780px}</style></head><body><main id="view" data-route="clubhouse"><section id="feed"></section></main></body></html>'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  code=html if self.path.startswith('/field-review.html') else "export const configured=()=>false;export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};" if self.path.startswith('/js/supabase.js') else None
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/html' if self.path.startswith('/field-review') else 'text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}';checks=[];errors=[]
def check(label,ok):
 checks.append({'check':label,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,label;print('PASS '+label,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block')
 c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures'/('nfl-'+r.request.url.split('/')[-1].split('.')[0]+'.png')).read_bytes()) if r.request.resource_type=='image' else r.abort())
 pg=c.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));pg.goto(base+'/field-review.html',wait_until='domcontentloaded')
 pg.evaluate('''async()=>{
  const fixture=await(await fetch('/tools/fixtures/nfl-field-plays.json')).json();const {mountNflGameCenter}=await import('/js/nfl-game-center.js');(await import('/js/ui-motion.js')).startUiMotion();
  const f=window.f={fixture,rows:[{...fixture.plays.home_gain,sequenceNumber:'1'},{...fixture.plays.away_gain,sequenceNumber:'2'}],early:null,hold:false,reads:0};
  f.center=mountNflGameCenter(document.querySelector('#feed'),{getContext:()=>({season:2026,week:8,players:[]}),loadStats:async()=>({data:[]}),loadBoard:async()=>({payload:{season:{year:2026,type:2},week:{number:8},events:[{id:'401873023',date:'2026-10-30T00:15Z',status:{type:{state:'in',shortDetail:'Q2'}},competitions:[{competitors:fixture.teams.map(t=>({team:{id:t.id,abbreviation:t.code},homeAway:t.home?'home':'away',score:'7'})),situation:{lastPlay:f.early}}]}]}}),loadSummary:async()=>{f.reads++;if(f.hold)await new Promise(r=>f.release=r);return {fetchedAt:Date.now(),summary:{header:{id:'401873023',season:{year:2026,type:2},competitions:[{status:{type:{state:'in',shortDetail:'Q1'}},competitors:fixture.teams.map(t=>({team:{id:t.id,abbreviation:t.code},homeAway:t.home?'home':'away',score:'3'}))}]},drives:{previous:[{plays:f.rows}]}}}}});await f.center.ready;f.center.pause();
  f.show=async name=>{f.rows=[{...f.fixture.plays[name],sequenceNumber:'1'}];f.early=null;await f.center.refresh();f.center.pause()};
  window.setTheme=async mode=>(await import('/js/theme.js')).pinMode(mode);window.contrast=(await import('/tools/home-review-contrast.js')).reviewTextContrast;
 }''');pg.evaluate('document.fonts.ready')
 for theme in ['light','dark']:
  pg.evaluate('setTheme',theme)
  for width in [320,390,768]:
   pg.set_viewport_size({'width':width,'height':844});pg.wait_for_timeout(100);tag=f'{theme}/{width}'
   check(tag+' wide field and play text fit',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and pg.locator('.nfl-field').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
   check(tag+' football field has mirrored numbers and real team ends',pg.locator('.nfl-field-numbers text').all_text_contents()==['10','10','20','20','30','30','40','40','50','50','40','40','30','30','20','20','10','10','CAR','GB'])
   check(tag+' current possession and next down match the ball position','2nd & 6' in pg.locator('.nfl-field>header').inner_text() and 'CAR 16' in pg.locator('.nfl-field>footer').inner_text())
   check(tag+' start and first-down markers are plotted',pg.locator('.nfl-field-scrimmage,.nfl-field-target').count()==2)
   check(tag+' source descriptions remain visible',pg.locator('.nfl-play-details>p').evaluate_all('ns=>ns.every(n=>n.checkVisibility())'))
   check(tag+' both offenses have explicit labels and distinct two-color rails',pg.locator('.nfl-play-team').all_text_contents()==['CAR','GB'] and pg.locator('[data-play-team="CAR"]').get_attribute('style')!=pg.locator('[data-play-team="GB"]').get_attribute('style'))
   check(tag+' all interactive targets retain 44px height',pg.locator('#feed button,#feed select').evaluate_all('ns=>ns.filter(n=>n.getClientRects().length).every(n=>n.getBoundingClientRect().height>=43.5)'))
   result=pg.locator('#feed').evaluate('e=>contrast(e)');check(tag+' UI text contrast '+json.dumps(result['failures']),not result['failures'])
   if width==390:pg.screenshot(path=str(OUT/f'{theme}-field.png'))
  pg.set_viewport_size({'width':320,'height':844});pg.evaluate("document.documentElement.style.fontSize='32px'");pg.wait_for_timeout(100)
  check(theme+' field controls and full descriptions fit at 200% text',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  pg.screenshot(path=str(OUT/f'{theme}-large.png'));pg.evaluate("document.documentElement.style.fontSize=''")
 pg.set_viewport_size({'width':390,'height':844});pg.evaluate("setTheme('dark')")
 older=pg.locator('[data-play-team="GB"] [data-nfl-field-play]');old_id=older.get_attribute('data-nfl-field-play');older.click();pg.wait_for_timeout(300)
 check('Selecting an old play updates the field without hiding full text',pg.locator('[data-nfl-field]').get_attribute('data-field-play')==old_id and pg.locator('.nfl-play-details>p').count()==2)
 pg.evaluate('async()=>{f.fieldNode=document.querySelector(".nfl-field-ball");await f.center.refresh();f.center.pause()}');check('An unchanged update preserves the selected historical field',pg.locator('[data-nfl-field]').get_attribute('data-field-play')==old_id and pg.locator('.nfl-field-ball').evaluate('e=>e===f.fieldNode'))
 check('Selected play exposes Latest and Back controls',pg.locator('[data-nfl-field-latest],[data-nfl-field-return]').count()==2)
 check('Ball movement uses one-shot position animation',pg.locator('.nfl-field-ball').evaluate('e=>e.getAnimations().some(a=>a.effect.getTiming().iterations===1&&a.effect.getKeyframes()[0].transform!==a.effect.getKeyframes().at(-1).transform)'))
 pg.locator('[data-nfl-field-return]').click();pg.wait_for_timeout(300);check('Back to play restores focus to its source',older.evaluate('e=>e===document.activeElement'))
 pg.locator('[data-nfl-field-latest]').click();pg.wait_for_timeout(50);check('Latest returns to the latest recorded field play',pg.locator('[data-nfl-field]').get_attribute('data-field-play')!=old_id)
 pg.evaluate("f.hold=true;f.early={...f.fixture.plays.away_gain,start:{team:f.fixture.plays.away_gain.start.team,yardLine:f.fixture.plays.away_gain.start.yardLine},id:'4018730239999',text:'Early scoreboard play',scoringPlay:false};void f.center.refresh()")
 pg.wait_for_selector('[id$="-play-4018730239999"]');check('Earlier scoreboard play appears before the detailed response completes','Early scoreboard play' in pg.locator('.nfl-center-plays li').first.inner_text())
 check('Newer board status and score are not rolled back by the older summary',pg.locator('.nfl-center-score b').all_text_contents()==['7','7'] and 'Q2' in pg.locator('[data-nfl-center-game] option:checked').inner_text())
 pg.evaluate('f.earlyAnimation=document.querySelector(".nfl-field-ball").getAnimations()[0]')
 pg.evaluate("f.rows.push({...f.early,start:f.fixture.plays.away_gain.start,text:'Confirmed full play',sequenceNumber:'3'});f.hold=false;f.release()");pg.wait_for_function("document.querySelector('.nfl-center-plays li')?.textContent.includes('Confirmed full play')")
 check('Confirmed details replace the same early row without duplicating it',pg.locator('[id$="-play-4018730239999"]').count()==1);pg.evaluate('f.center.pause()')
 check('Confirmed metadata does not replay the same ball movement',pg.locator('.nfl-field-ball').evaluate('e=>e.getAnimations().length===0||e.getAnimations()[0]===f.earlyAnimation'))
 for name,kind in [('loss','play'),('zero','play'),('turnover','turnover'),('touchdown','touchdown'),('field_goal','play'),('no_play','voided'),('punt','play'),('kickoff','play')]:
  pg.evaluate('f.show',name);pg.wait_for_timeout(60);check(name+' keeps correct field semantics',pg.locator('[data-nfl-field]').get_attribute('data-field-kind')==kind)
  if name=='no_play':check('Nullified plays have no successful ball animation',pg.locator('.nfl-field-ball').evaluate('e=>e.getAnimations().length===0'))
  if name=='touchdown':pg.screenshot(path=str(OUT/'dark-touchdown.png'))
 pg.evaluate("async()=>{f.rows=[{...f.fixture.plays.away_gain,start:{team:{id:'29'}},end:{}}];await f.center.refresh();f.center.pause()}")
 check('Missing coordinates retain team identity and description without inventing a ball',pg.locator('.nfl-field-ball').count()==0 and 'Field position unavailable' in pg.locator('.nfl-field').inner_text() and pg.locator('.nfl-play-team').inner_text()=='CAR' and pg.locator('.nfl-play-details>p').is_visible())
 pg.evaluate("async()=>{f.outside=document.createElement('div');document.body.append(f.outside);f.outsideAnimation=(await import('/js/ui-motion.js')).animateUi(f.outside,[{opacity:.9},{opacity:1}],{duration:10000});f.center.setMode('fantasy')}")
 check('Switching away from the field preserves unrelated UI animation',pg.evaluate('f.outsideAnimation.playState!=="idle"&&f.outsideAnimation.playState!=="finished"'))
 pg.evaluate("async()=>{(await import('/js/ui-motion.js')).cancelUiMotion(f.outside);f.outside.remove();f.center.setMode('plays')}")
 pg.emulate_media(reduced_motion='reduce');pg.evaluate("f.show('away_gain')");pg.wait_for_timeout(50)
 check('Reduced Motion retains final ball position with no running animation',pg.locator('.nfl-field-ball').evaluate('e=>e.getAnimations().length===0&&e.style.transform.includes("translate")'))
 pg.emulate_media(reduced_motion='no-preference');pg.evaluate("document.documentElement.dataset.uiMotion='off';localStorage.setItem('dfl.details.v1.guest.gameday-motion','off');f.show('home_gain')");pg.wait_for_timeout(50)
 check('Motion off retains a static field',pg.locator('.nfl-field-ball').evaluate('e=>e.getAnimations().length===0'))
 pg.evaluate('f.center.stop()');check('No browser errors or production writes',not errors);b.close()
server.shutdown()
