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
 context.route('https://sleepercdn.com/**',lambda r:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()))
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
   check(f'{mode}/{width} shows exact pair and league projections',sheet.locator('.pc-compare-row').first.evaluate('e=>[...e.children].map(n=>[...n.childNodes].filter(c=>c.nodeType===3).map(c=>c.textContent).join("").trim())')==['Projection','22.3','20.1'])
   check(f'{mode}/{width} readable text contrast',not page.evaluate('window.reviewContrast().failures'))
   check('player names and actions align across both columns',sheet.locator('[data-compare-change]').evaluate_all('rows=>Math.abs(rows[0].getBoundingClientRect().top-rows[1].getBoundingClientRect().top)<1'))
   page.screenshot(path=str(OUT/f'{mode}-{width}-week.png'));sheet.locator('[data-compare-tab="trade"]').click()
   check(f'{mode}/{width} trade values stay separate from weekly points',sheet.locator('[data-compare-metrics]').inner_text().startswith('REST OF SEASON') and '93.0' in sheet.inner_text() and '#2' in sheet.inner_text())
   page.screenshot(path=str(OUT/f'{mode}-{width}-trade.png'));page.keyboard.press('Home')
   check('keyboard returns to the first comparison tab',sheet.locator('[data-compare-tab="week"]').get_attribute('aria-selected')=='true');closed()
   check('focus returns to comparison opener',page.locator('#pair').evaluate('e=>document.activeElement===e'))
 # Week selection, native reading and replacement continuity on the actual controller.
 page.set_viewport_size({'width':390,'height':844});opened()
 check('value columns align with their player identities',sheet.evaluate("e=>[...e.querySelectorAll('.pc-compare-row:first-of-type>b')].slice(0,2).every((v,i)=>{const a=v.getBoundingClientRect(),b=e.querySelectorAll('[data-compare-heads] section')[i].getBoundingClientRect();return Math.abs((a.left+a.right-b.left-b.right)/2)<1})"))
 sheet.locator('[data-compare-week]').select_option('5')
 check('past week shows actual scores instead of today projections',sheet.locator('.pc-compare-row').first.evaluate("e=>e.textContent.includes('Scored')&&e.textContent.includes('17.0')&&!e.textContent.includes('22.3')") and sheet.locator('[data-compare-week]').input_value()=='5')
 sheet.locator('.pc-compare-log>summary').click();page.wait_for_timeout(300)
 sheet.locator('.pc-compare-body').evaluate('e=>e.scrollTop=e.scrollHeight')
 saved=sheet.locator('.pc-compare-body').evaluate('e=>e.scrollTop')
 sheet.locator('[data-compare-change="right"]').evaluate('e=>e.click()')
 check('replacement can be cancelled without discarding comparison',sheet.locator('[data-compare-cancel]').is_visible() and sheet.locator('[data-compare-picker-title]').inner_text()=='Change right player')
 page.keyboard.press('Escape')
 check('picker Escape restores week, open log and reading position',sheet.is_visible() and sheet.locator('[data-compare-week]').input_value()=='5' and sheet.locator('.pc-compare-log').evaluate('e=>e.open') and abs(sheet.locator('.pc-compare-body').evaluate('e=>e.scrollTop')-saved)<1)
 sheet.locator('[data-compare-change="right"]').evaluate('e=>e.click()');sheet.locator('[data-compare-position]').select_option('');sheet.locator('[data-compare-pick="c"]').click();page.wait_for_timeout(350)
 check('new player keeps week and expanded history without inventing missing scores',sheet.locator('[data-compare-week]').input_value()=='5' and sheet.locator('.pc-compare-log').evaluate('e=>e.open') and sheet.locator('.pc-compare-row').first.inner_text().endswith('—') and sheet.locator('.pc-compare-gap').count()==0)
 sheet.locator('[data-compare-refresh]').evaluate('e=>e.click()');page.wait_for_function('!document.querySelector("[data-compare-refresh]").disabled')
 check('refresh keeps the selected historical week and game log',sheet.locator('[data-compare-week]').input_value()=='5' and sheet.locator('.pc-compare-log').evaluate('e=>e.open'))
 sheet.locator('[data-compare-tab="trade"]').click();sheet.locator('[data-compare-tab="week"]').click()
 check('tab round trip preserves week and game log',sheet.locator('[data-compare-week]').input_value()=='5' and sheet.locator('.pc-compare-log').evaluate('e=>e.open'))
 closed();opened();check('fresh opening starts on the current week with a collapsed log',sheet.locator('[data-compare-week]').input_value()=='6' and not sheet.locator('.pc-compare-log').evaluate('e=>e.open'));closed()
 for mode in ['light','dark']:
  page.evaluate('window.reviewTheme',mode);page.set_viewport_size({'width':320,'height':844});page.evaluate("document.documentElement.style.fontSize='200%'");opened()
  check(mode+' enlarged text fits without horizontal scrolling',sheet.evaluate('e=>e.scrollWidth<=e.clientWidth&&[...e.querySelectorAll(".pc-compare-heads section,.pc-compare-row>b")].every(n=>n.scrollWidth<=n.clientWidth+1)'))
  page.screenshot(path=str(OUT/f'{mode}-320-large-text.png'));closed();page.evaluate("document.documentElement.style.removeProperty('font-size')")
 page.set_viewport_size({'width':390,'height':844})
 for season,expected in [(2026,'4'),(2025,'6')]:
  page.evaluate("""async season=>{let card=document.querySelector('#context-card');if(!card){card=document.createElement('div');card.id='context-card';card.className='dfl-player-card';card.innerHTML='<button data-player-game-week="4" aria-pressed="true">Week 4</button><button id="context-compare">Compare</button>';document.querySelector('#view').append(card)}card.dataset.playerSeason=season;void (await import('./js/player-compare.js')).openPlayerComparison('a',{otherId:'b',source:card.querySelector('#context-compare')})}""",season)
  page.wait_for_selector('.dfl-player-compare[open]');page.wait_for_timeout(350)
  check(f'player-card context from season {season} chooses the appropriate comparison week',sheet.locator('[data-compare-week]').input_value()==expected);closed()
 page.evaluate("document.querySelector('#context-card')?.remove();document.documentElement.dataset.uiMotion='off'");opened();sheet.locator('.pc-compare-log>summary').click()
 check('Motion off expands the comparison log immediately',sheet.locator('.pc-compare-log').evaluate('e=>e.open&&e.getAnimations().length===0'))
 closed();page.evaluate("delete document.documentElement.dataset.uiMotion")
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
 # Choosing a player connects the actual result photo to its comparison slot.
 for mode in ['light','dark']:
  page.evaluate('window.reviewTheme',mode);page.set_viewport_size({'width':390,'height':844});opened(False)
  page.wait_for_function("()=>document.querySelector('[data-compare-pick=\"b\"] img')?.naturalWidth>0")
  origin=sheet.locator('[data-compare-pick="b"] .dfl-player-portrait').bounding_box()
  sheet.locator('[data-compare-pick="b"]').evaluate('e=>e.click()')
  actual=page.wait_for_function("""()=>{const e=document.querySelector('.dfl-connected-portrait'),a=e?.getAnimations()[0];if(!a)return false;a.pause();a.currentTime=0;return e.getBoundingClientRect().toJSON()}""").json_value()
  check(mode+' selected portrait starts at the tapped result',all(abs(origin[k]-actual[k])<1 for k in ['x','y','width','height']))
  check(mode+' selection connects only the chosen side',sheet.locator('[data-compare-side="right"] .dfl-player-portrait').evaluate("e=>e.style.visibility==='hidden'") and sheet.locator('[data-compare-side="left"] .dfl-player-portrait').evaluate("e=>e.style.visibility!=='hidden'"))
  page.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=140})")
  check(mode+' moving portrait does not cover readable name text',sheet.locator('[data-compare-side="right"] strong').evaluate('e=>Number(getComputedStyle(e).opacity)<.01'))
  page.screenshot(path=str(OUT/f'{mode}-selection-motion.png'))
  # Closing during a right-side flight must not launch the left player from it.
  page.keyboard.press('Escape');page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")')
  check(mode+' close during selection removes every copy and restores both portraits',sheet.locator('.dfl-player-portrait').evaluate_all("es=>es.every(e=>e.style.visibility!=='hidden')"))
 opened(False);sheet.locator('[data-compare-pick="b"]').evaluate('e=>{e.click();document.querySelector("[data-compare-close]").click()}')
 page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")')
 check('same-frame select and close cannot create a late portrait',page.locator('.dfl-connected-portrait').count()==0)
 page.emulate_media(reduced_motion='reduce');opened(False);sheet.locator('[data-compare-pick="b"]').click();page.wait_for_timeout(60)
 check('reduced motion keeps selection immediate without hidden portraits',page.locator('.dfl-connected-portrait').count()==0 and sheet.locator('.dfl-player-portrait').evaluate_all("es=>es.every(e=>e.style.visibility!=='hidden')"));closed();page.emulate_media(reduced_motion='no-preference')
 # When entered from a player image, a right-side selection must not become
 # the origin of the left player's return to that image.
 page.evaluate("""async()=>{const button=document.createElement('button');button.id='connected-open';button.className='dfl-player';button.style.cssText='position:fixed;left:20px;top:180px';button.innerHTML='<span class="dfl-player-portrait" style="display:block;width:36px;height:42px"><img src="https://sleepercdn.com/content/nfl/players/a.jpg" style="width:100%;height:100%" alt=""></span>';document.querySelector('#view').append(button);const {openPlayerComparison}=await import('./js/player-compare.js');void openPlayerComparison('a',{source:button})}""")
 page.wait_for_selector('[data-compare-pick="b"]');page.wait_for_timeout(550)
 left=sheet.locator('[data-compare-side="left"] .dfl-player-portrait').bounding_box()
 sheet.locator('[data-compare-pick="b"]').evaluate('e=>e.click()')
 page.wait_for_function("""()=>{const e=document.querySelector('.dfl-connected-portrait'),a=e?.getAnimations()[0];if(!a)return false;a.pause();a.currentTime=80;return true}""")
 actual=page.evaluate("""()=>{document.querySelector('[data-compare-close]').click();const e=document.querySelector('.dfl-connected-portrait'),a=e.getAnimations()[0];a.pause();a.currentTime=0;const box=e.getBoundingClientRect().toJSON();a.play();return {box,src:e.querySelector('img')?.src,copies:document.querySelectorAll('.dfl-connected-portrait').length}}""")
 check('closing during right-side selection returns the left player from its own image',all(abs(left[k]-actual['box'][k])<1 for k in ['x','y','width','height']) and actual['src'].endswith('/a.jpg') and actual['copies']==1)
 page.wait_for_function('!document.querySelector("dialog[open],.dfl-connected-portrait")')
 # Real portrait source, including a first request held past both motion phases.
 page.reload();page.wait_for_function('window.reviewReady')
 page.evaluate("window.reviewTheme('light')")
 page.evaluate("""async()=>{const button=document.createElement('button');button.id='connected-open';button.className='dfl-player';button.style.cssText='position:fixed;left:20px;top:180px';button.innerHTML='<span class="dfl-player-portrait" style="display:block;width:36px;height:42px"><img src="https://sleepercdn.com/content/nfl/players/a.jpg" style="width:100%;height:100%" alt=""></span>';document.querySelector('#view').append(button);await button.querySelector('img').decode();window.openCompare=(await import('./js/player-compare.js')).openPlayerComparison;window.openConnected=()=>window.openCompare('a',{source:button});window.hold=true;void window.openConnected()}""")
 for mode,width in [('light',390),('dark',390),('light',320),('dark',320)]:
  if mode!='light' or width!=390:
   page.evaluate('window.reviewTheme',mode);page.set_viewport_size({'width':width,'height':844});page.evaluate('void window.openConnected()')
  frame=page.wait_for_function("()=>{const a=document.querySelector('.dfl-connected-portrait')?.getAnimations()[0];if(!a)return false;a.pause();a.currentTime=100;return true}")
  check(f'{mode}/{width} comparison photo moves before panel',sheet.evaluate('e=>e.dataset.playerCardStage==="portrait"&&getComputedStyle(e).opacity==="0"&&e.getAnimations().length===0'))
  page.screenshot(path=str(OUT/f'{mode}-{width}-photo-first.png'))
  page.locator('.dfl-connected-portrait').evaluate('e=>e.getAnimations()[0].play()')
  page.wait_for_function("()=>{const d=document.querySelector('.dfl-player-compare');if(d.dataset.playerCardStage!=='card')return false;const a=d.getAnimations()[0];if(!a)return false;a.pause();a.currentTime=100;return true}")
  check(f'{mode}/{width} panel expands around stationary comparison photo',page.evaluate("()=>{const a=document.querySelector('.dfl-connected-portrait').getBoundingClientRect(),b=document.querySelector('[data-compare-side=left] .dfl-player-portrait').getBoundingClientRect();return ['left','top','width','height'].every(k=>Math.abs(a[k]-b[k])<1)&&b.width===72}"))
  page.screenshot(path=str(OUT/f'{mode}-{width}-panel-expand.png'))
  sheet.evaluate('e=>e.getAnimations()[0].play()');page.wait_for_function('!document.querySelector("[data-player-card-stage],.dfl-connected-portrait")')
  if mode=='light' and width==390:page.evaluate('window.hold=false;window.pendingReads.shift()()')
  page.wait_for_selector('[data-compare-pick="b"]');check(f'{mode}/{width} data cannot start a second photo flight',page.locator('.dfl-connected-portrait').count()==0);closed()
 page.evaluate('void window.openConnected()');page.wait_for_function('document.querySelector(".dfl-player-compare").open');page.evaluate('document.querySelector(".dfl-player-compare").close();void window.openConnected()')
 page.wait_for_function("()=>{const a=document.querySelector('.dfl-connected-portrait')?.getAnimations()[0];if(!a)return false;a.pause();a.currentTime=90;return true}")
 check('queued comparison close cannot cancel a new photo-first opening',sheet.evaluate('e=>e.open&&e.dataset.playerCardStage==="portrait"'));closed()
 check('early comparison close restores the source without overlays',page.locator('.dfl-connected-portrait').count()==0 and page.locator('#connected-open .dfl-player-portrait').evaluate('e=>e.style.visibility!=="hidden"'))
 check('no browser errors',not errors);browser.close();server.shutdown()
