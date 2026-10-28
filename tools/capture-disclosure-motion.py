"""Real disclosure controller, position table and trade receipt; isolated data."""
import json,os,re,subprocess,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_DISCLOSURE_REVIEW_DIR','/tmp/dfl-disclosure-1505'));OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {tradeReviewFixture} from './tools/trade-review-fixture.mjs';import {buildTradeAlertSnapshot} from './js/trade-receipt-model.js';const d=tradeReviewFixture(),teams=d.teams.slice(0,2),rosterState=new Map(teams.map(t=>[String(t.id),new Set(t.playerIds)]));console.log(JSON.stringify(buildTradeAlertSnapshot({transaction:{transaction_id:'disclosure-fixture',type:'trade',status:'complete',roster_ids:[1,2],drops:{'1-4':1,'2-6':2},adds:{'1-4':2,'2-6':1},draft_picks:[],waiver_budget:[],created:Date.now(),leg:6},season:2026,week:6,teams,rosterState,pool:d.pool})));"],cwd=ROOT,text=True))
exports=re.findall(r'export (?:async )?function (\w+)',(ROOT/'js/supabase.js').read_text())
stub="export const configured=false,ACCESS_EVENT='fixture:access';"+''.join(f"export const {name}=()=>{{"+("throw Error('No backend in disclosure review')" if name in ['db','edge'] else 'return null')+"};" for name in exports)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html><head>'+head+'</head><body><main id="view" class="view" data-route="clubhouse"><div class="clubhouse-command-center" id="room"></div><div id="receipt"></div><button id="after">After the sections</button><div style="height:1000px" aria-hidden="true"></div></main><script type="module">'+'''
import {mountDisclosureMotion} from '/js/disclosure-motion.js';
import {mountPageMotion} from '/js/ui-motion.js';
import {clubhousePositionStatsHtml} from '/js/clubhouse-center-ui.js';
import {completedTradeMarkup} from '/js/trade-receipt-ui.js';
import {patchGameDay} from '/js/game-day-dom.js';
import {pinMode} from '/js/theme.js';
const players=Array.from({length:9},(_,i)=>({id:String(i),position:['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'][i],points:12+i,state:'playing'}));
const game={id:'7',sides:[{name:'The Very Long Bayou Bombers',score:122,starters:players,lineup:players},{name:'Klutch Sports Group',score:119,starters:players,lineup:players}]};
room.innerHTML=clubhousePositionStatsHtml(game,false);receipt.innerHTML=completedTradeMarkup([await(await fetch('/receipt.json')).json()],'',{standalone:true});
document.querySelector('.td-alert-receipt').open=false;
window.enabled=true;document.documentElement.dataset.uiMotion='on';window.mode=pinMode;window.patch=patchGameDay;
window.pageMotion=mountPageMotion(document.getElementById('view'));window.motion=mountDisclosureMotion(document.getElementById('view'),{selector:'.clubhouse-position-stats',getMotion:()=>enabled});window.ready=true;
</script></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  path=self.path.split('?')[0]
  body=html if path=='/review.html' else json.dumps(fixture) if path=='/receipt.json' else stub if path=='/js/supabase.js' else None
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/html' if path.endswith('html') else 'application/json' if path.endswith('json') else 'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
checks=[];errors=[]
def check(name,ok):
 checks.append({'name':name,'pass':bool(ok)});assert ok,name
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for theme in ['light','dark']:
  for width in [320,390,768]:
   c=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block')
   c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url) else r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()) if r.request.resource_type=='image' else r.abort())
   page=c.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR: '+str(e),flush=True)));page.goto(url+'/review.html');page.wait_for_function('window.ready===true');page.evaluate('mode',theme);page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
   label=f'{theme}/{width}';detail=page.locator('.clubhouse-position-stats');summary=detail.locator('summary');closed=detail.bounding_box()['height']
   summary.click();page.wait_for_timeout(40)
   sample=detail.evaluate('''e=>{const a=e.getAnimations().find(a=>a.effect.getKeyframes().some(f=>f.height));if(!a)return null;a.pause();a.currentTime=90;const h=e.getBoundingClientRect().height;return {h,first:parseFloat(a.effect.getKeyframes()[0].height),last:parseFloat(a.effect.getKeyframes().at(-1).height)}}''')
   check(label+' opens with a real height transition',sample and closed<sample['h']<sample['last'])
   # Reverse from the currently painted height, not from a fully open table.
   detail.evaluate("e=>e.querySelector('summary').click()")
   reverse=detail.evaluate('e=>parseFloat(e.getAnimations().find(a=>a.effect.getKeyframes().some(f=>f.height)).effect.getKeyframes()[0].height)')
   check(label+' closing reverses without a snap',abs(reverse-sample['h'])<1)
   page.wait_for_timeout(320);check(label+' native closed state has no retained animation',not detail.evaluate('e=>e.open||e.getAnimations().length||e.style.height'))
   summary.focus();page.keyboard.press('Enter');page.wait_for_timeout(320)
   check(label+' keyboard opens the original table',detail.evaluate('e=>e.open&&!!e.querySelector("table")'))
   summary.focus();page.keyboard.press('Space');page.wait_for_timeout(320)
   page.keyboard.press('Tab');check(label+' native Tab skips closed table content',page.locator('.td-alert-receipt>summary').evaluate('e=>e===document.activeElement'))
   # A real live patch arriving mid-open must extend the natural final height.
   top=summary.bounding_box()['y'];summary.click();page.wait_for_timeout(50)
   detail.evaluate('''e=>{const markup=e.innerHTML;patch(e,markup.replace('</tbody>','<tr><th>Updated player total</th><td>28.00</td><td>19.00</td></tr></tbody>'))}''');page.wait_for_timeout(360)
   check(label+' live patch settles at natural height',detail.evaluate('e=>e.open&&!e.getAnimations().length&&!e.style.height&&e.querySelector("table").getBoundingClientRect().bottom<=e.getBoundingClientRect().bottom+1'))
   check(label+' expanding preserves the summary position',abs(summary.bounding_box()['y']-top)<1)
   detail.screenshot(path=str(OUT/f'position-{theme}-{width}.png'))
   # Both lazy receipt growth and a quick triple tap must settle predictably.
   trade=page.locator('.td-alert-receipt');trade.locator(':scope>summary').click();page.wait_for_timeout(40)
   trade.evaluate('''e=>{const p=document.createElement('p');p.textContent='An additional saved receipt row';e.querySelector('.td-receipt-body').append(p)}''');page.wait_for_timeout(340)
   check(label+' expanded receipt stays fully visible',trade.evaluate('e=>e.open&&!e.getAnimations().length&&e.scrollHeight<=e.clientHeight+1'))
   trade.evaluate("e=>{for(let i=0;i<3;i++)e.querySelector('summary').click()}");page.wait_for_timeout(340)
   check(label+' rapid taps settle closed',not trade.evaluate('e=>e.open||e.getAnimations().length'))
   detail.evaluate('e=>e.open=false');summary.click();page.wait_for_timeout(40);page.set_viewport_size({'width':width+8,'height':844});page.wait_for_timeout(80)
   check(label+' resize releases the height without losing state',detail.evaluate('e=>e.open&&!e.getAnimations().length&&!e.style.height'))
   page.set_viewport_size({'width':width,'height':844});detail.evaluate('e=>e.open=false');summary.click();page.wait_for_timeout(40)
   page.evaluate('room.hidden=true;document.getElementById("view").dispatchEvent(new CustomEvent("dfl:clubhouse-tab"))')
   check(label+' switching tabs stops hidden motion',detail.evaluate('e=>e.open&&!e.getAnimations().length'))
   page.evaluate('room.hidden=false');detail.evaluate('e=>e.open=false');summary.click();page.wait_for_timeout(40);page.evaluate('enabled=false;motion.motionChanged()')
   check(label+' Motion off completes an in-flight open',detail.evaluate('e=>e.open&&!e.getAnimations().length'))
   summary.click();check(label+' Motion off closes immediately',not detail.evaluate('e=>e.open||e.getAnimations().length'))
   page.evaluate('enabled=true');page.emulate_media(reduced_motion='reduce');summary.click()
   check(label+' reduced motion stays native and still',detail.evaluate('e=>e.open&&!e.getAnimations().length'))
   page.emulate_media(reduced_motion='no-preference');summary.click();page.wait_for_timeout(30);page.evaluate('motion.stop()')
   check(label+' teardown releases closing geometry',not detail.evaluate('e=>e.open||e.getAnimations().length||e.style.height'))
   check(label+' phone stays within the viewport',not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'));page.evaluate('pageMotion()');c.close()
 check('no browser errors',not errors);browser.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps(checks,indent=2));print(json.dumps({'checks':len(checks),'errors':errors}))
