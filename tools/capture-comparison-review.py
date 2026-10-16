"""Actual comparison sheet with deterministic read-only data and no database."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import os,json,threading
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_COMPARE_REVIEW_DIR',ROOT.parent/'dfl-comparison-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
index=(ROOT/'index.html').read_text();head=index[index.index('<head>')+6:index.index('</head>')]
html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+head+'''</head><body><main id="view"><button id="open" data-player-compare="a">Compare player</button><button id="pair" data-player-compare="a" data-compare-with="b">Compare pair</button></main><script type="module">
import {reviewTextContrast} from './tools/home-review-contrast.js';window.reviewContrast=()=>reviewTextContrast(document.querySelector('.dfl-player-compare'));import {mountPlayerCards} from './js/player-card-actions.js';import {saveMode} from './js/theme.js';import {startUiMotion} from './js/ui-motion.js';
mountPlayerCards();startUiMotion();window.reviewTheme=saveMode;window.reviewReady=true;
</script></body></html>'''
stub='''export async function loadPlayerComparison(){window.reads=(window.reads||0)+1;if(window.hold)await new Promise(r=>(window.pendingReads||(window.pendingReads=[])).push(r));if(window.fail)throw Error('offline');
const players=new Map([['a',{id:'a',name:'Ja’Marr Chase',position:'WR',nflTeam:'CIN',tradeValue:93,expertFeedStatus:'Fresh',expert:{rank:2,positionRank:1}}],['b',{id:'b',name:'Amon-Ra St. Brown',position:'WR',nflTeam:'DET',tradeValue:89,expertFeedStatus:'Fresh',expert:{rank:6,positionRank:3}}],['c',{id:'c',name:'Juwan Johnson',position:'TE',nflTeam:'NO',modelSource:'unrated'}]]);
return {analysis:{liveWeek:6,projectionSeason:2026,leagueFormat:{scoring:'ppr'},league:{scoring_settings:{rec:1,rec_yd:.1,rec_td:6}},nflSchedule:new Map([['CIN',{key:'upcoming',opponent:'CLE',kickoff:'2026-10-18T17:00:00Z'}],['DET',{key:'upcoming',opponent:'CHI'}]]),expertConsensus:{status:'Fresh',updatedAt:1792152000000}},players,owners:new Map([['a',window.newOwner||'The Bayou Bombers'],['b','Klutch Sports Group']]),weekly:new Map([['a',{hasGame:true,points:22.3,opponent:'CLE'}],['b',{hasGame:true,points:20.1,opponent:'CHI'}]]),weeks:[4,5].map(week=>({week,data:[{player_id:'a',season:2026,season_type:'regular',week,stats:{gp:1,rec:8,rec_yd:90}},{player_id:'b',season:2026,season_type:'regular',week,stats:{gp:1,rec:6,rec_yd:100}}]})),projectionsStale:false}}
'''
checks=[]
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS '+name,flush=True);(OUT/'checks.json').write_text(json.dumps(checks,indent=2))
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
 if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
 if os.environ.get('HTTPS_PROXY'):launch['proxy']={'server':os.environ['HTTPS_PROXY'],'bypass':'127.0.0.1,localhost'}
 browser=p.chromium.launch(**launch);context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,service_workers='block')
 context.route('**/npm/@supabase/supabase-js@*/+esm',lambda r:r.fulfill(content_type='text/javascript',headers={'Access-Control-Allow-Origin':'*'},body="export function createClient(){throw Error('Comparison review cannot access a database')}"))
 context.route('https://sleepercdn.com/**',lambda r:r.fulfill(content_type='image/webp',body=(ROOT/'assets/dfl-daily-champion.webp').read_bytes()))
 context.route('**/js/player-compare-data.js',lambda r:r.fulfill(content_type='text/javascript',body=stub))
 context.route('**/comparison-review.html',lambda r:r.fulfill(content_type='text/html',body=html))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'comparison-review.html');page.wait_for_function('window.reviewReady',timeout=60000)
 sheet=page.locator('.dfl-player-compare')
 def opened(pair=True):
  page.locator('#pair' if pair else '#open').click();page.wait_for_selector('.dfl-player-compare[open]');page.wait_for_timeout(350);page.wait_for_function('(()=>{const e=document.querySelector(".dfl-player-compare");return e?.open&&e.getAnimations().every(a=>!["running","pending"].includes(a.playState))})()')
  return sheet
 def closed():
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open]")')
 # Close before the first request resolves; its result must not populate a new opening.
 page.evaluate('window.hold=true');opened();page.wait_for_function('window.pendingReads?.length===1');closed();opened(False);page.wait_for_function('window.pendingReads?.length===2')
 page.evaluate('window.pendingReads.shift()()');page.wait_for_timeout(100)
 check('old request cannot replace a reopened picker',not sheet.locator('[data-compare-results]').inner_text() and sheet.locator('[data-compare-search]').is_disabled())
 page.evaluate('window.hold=false;window.pendingReads.shift()()');page.wait_for_selector('[data-compare-pick="b"]');closed()
 for mode in ['dark','light']:
  page.evaluate('window.reviewTheme',mode)
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':844});opened();page.wait_for_selector('.pc-compare-row')
   check(f'{mode}/{width} sheet and text fit mobile',sheet.evaluate('e=>{const b=e.getBoundingClientRect();return b.left>=11&&b.right<=innerWidth-11&&b.bottom<=innerHeight-11&&e.scrollWidth<=e.clientWidth&&[...e.querySelectorAll(".pc-compare-heads section,.pc-compare-row>b")].every(n=>n.scrollWidth<=n.clientWidth+1)}'))
   check(f'{mode}/{width} shows exact pair and league projections',sheet.locator('.pc-compare-row').first.inner_text().split()==['Projection','22.3','20.1'])
   check(f'{mode}/{width} readable text contrast',not page.evaluate('window.reviewContrast().failures'))
   check('player names and actions align across both columns',sheet.locator('[data-compare-change]').evaluate_all('rows=>Math.abs(rows[0].getBoundingClientRect().top-rows[1].getBoundingClientRect().top)<1'))
   page.screenshot(path=str(OUT/f'{mode}-{width}-week.png'));sheet.locator('[data-compare-tab="trade"]').click()
   check(f'{mode}/{width} trade values stay separate from weekly points',sheet.locator('[data-compare-metrics]').inner_text().startswith('REST OF SEASON') and '93.0' in sheet.inner_text() and '#2' in sheet.inner_text())
   page.screenshot(path=str(OUT/f'{mode}-{width}-trade.png'));page.keyboard.press('Home')
   check('keyboard returns to the first comparison tab',sheet.locator('[data-compare-tab="week"]').get_attribute('aria-selected')=='true');closed()
   check('focus returns to comparison opener',page.locator('#pair').evaluate('e=>document.activeElement===e'))
 opened(False);page.wait_for_selector('[data-compare-pick="b"]');check('picker initially excludes the selected player',sheet.locator('[data-compare-pick="a"]').count()==0)
 sheet.locator('[data-compare-position]').select_option('');sheet.locator('[data-compare-search]').fill('juwan');sheet.locator('[data-compare-pick="c"]').click()
 check('unrated players remain unknown instead of zero',sheet.locator('.pc-compare-row').first.inner_text().endswith('—'))
 sheet.locator('[data-compare-change="right"]').click();sheet.locator('[data-compare-search]').fill('amon');sheet.locator('[data-compare-pick="b"]').click();sheet.locator('[data-compare-tab="trade"]').click()
 page.evaluate('window.hold=true;window.newOwner="Current Team Name"');sheet.locator('[data-compare-refresh]').click();page.wait_for_function('window.pendingReads.length===1')
 check('refresh retains pair, tab and values while loading',sheet.locator('[data-compare-tab="trade"]').get_attribute('aria-selected')=='true' and '93.0' in sheet.inner_text())
 page.evaluate('window.hold=false;window.pendingReads.shift()()');page.wait_for_function('document.querySelector("[data-compare-side=left]").textContent.includes("Current Team Name")')
 check('refresh updates current team name without losing selection','Amon-Ra' in sheet.inner_text())
 page.evaluate('window.fail=true');sheet.locator('[data-compare-refresh]').click();page.wait_for_selector('[data-compare-retry]');check('failed refresh preserves usable comparison','93.0' in sheet.inner_text())
 page.evaluate('window.fail=false');sheet.locator('[data-compare-retry]').click();page.wait_for_function('!document.querySelector("[data-compare-retry]")');closed()
 page.emulate_media(reduced_motion='reduce');opened();check('reduced motion keeps the sheet and backdrop still',sheet.evaluate('e=>e.getAnimations({subtree:true}).length===0&&getComputedStyle(e,"::backdrop").animationName==="none"'));closed()
 page.emulate_media(reduced_motion='no-preference');opened();touch=context.new_cdp_session(page)
 def pull(dy):
  box=sheet.locator('header').bounding_box();x=box['x']+20;y=box['y']+15
  touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for n in range(1,5):touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+dy*n/4}]});page.wait_for_timeout(60)
  touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 pull(25);page.wait_for_function('!document.querySelector("[data-sheet-moving]")');check('short header pull settles without dismissing',sheet.is_visible())
 pull(150);page.wait_for_function('!document.querySelector("dialog[open]")');check('long header pull dismisses cleanly',page.locator('[data-sheet-moving]').count()==0)
 page.evaluate("()=>{window.savedViewport=Object.getOwnPropertyDescriptor(window,'visualViewport');const v=new EventTarget();v.height=400;v.offsetTop=80;Object.defineProperty(window,'visualViewport',{configurable:true,value:v});dispatchEvent(new Event('resize'))}");opened();page.wait_for_timeout(150)
 check('comparison stays inside the keyboard viewport',sheet.evaluate('e=>{const b=e.getBoundingClientRect();return b.top>=80&&b.bottom<=468}'));closed()
 page.evaluate("()=>{if(window.savedViewport)Object.defineProperty(window,'visualViewport',window.savedViewport);else delete window.visualViewport}")
 check('no browser errors',not errors);browser.close();server.shutdown()
