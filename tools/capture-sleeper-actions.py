"""Actual renderer shortcuts with isolated data; external destinations are intercepted."""
import json,os,re,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_SLEEPER_REVIEW_DIR','/tmp/dfl-sleeper-review'));OUT.mkdir(parents=True,exist_ok=True)
index=(ROOT/'index.html').read_text();head=index.split('<head>')[1].split('</head>')[0]
head+='<link rel="stylesheet" href="/css/team-analyzer.css"><link rel="stylesheet" href="/css/weekly-outlook.css">'
html='<!doctype html><html lang="en"><head><base href="/">'+head+'</head><body><div class="app"><header class="topbar" style="height:44px">DFL HQ</header><main id="view" class="view" data-page-system data-pulse-system="1"></main></div></body></html>'
trade=(ROOT/'js/pages/trade.js').read_text();header=trade[trade.index('function tradeBoardHeader'):trade.index('function tradeLab')]
club=(ROOT/'js/pages/clubhouse.js').read_text();context=club[club.index('<section class="card clubhouse-context"'):];context=context[:context.index('</section>')+len('</section>')]
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  name=self.path.split('?')[0]
  body=html if name=='/review.html' else "export const db=()=>{throw Error('Unexpected database access')};" if name=='/js/supabase.js' else "export const currentMember=()=>null;" if name=='/js/members.js' else None
  if body is not None:
   self.send_response(200);self.send_header('Content-Type','text/html' if name.endswith('.html') else 'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def translate_path(self,path):return str(ROOT/path.split('?')[0].lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
with sync_playwright() as p:
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']}
 if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
 browser=p.chromium.launch(**launch)
 for width in [320,390,768]:
  for theme in ['light','dark']:
   browser_context=browser.new_context(viewport={'width':width,'height':844},service_workers='block')
   browser_context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(status=200,content_type='text/html',body='<p>Intercepted external destination</p>') if r.request.is_navigation_request() else r.abort())
   page=browser_context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/review.html')
   page.evaluate('''async args=>{
    const {pinMode}=await import('/js/theme.js');pinMode(args.theme);
    const {sleeperAction}=await import('/js/sleeper-links.js'),{esc}=await import('/js/ui.js');
    const {startSitContent}=await import('/js/start-sit-ui.js'),{lineupCheckHtml}=await import('/js/game-day-readiness.js');
    const leagueId='1286077564572037120',view=document.getElementById('view');
    const header=Function('sleeperAction',args.header+';return tradeBoardHeader')(sleeperAction);
    const selected={season:2026,week:6},model={leagueId,season:2026,week:6},club=Function('model','index','selected','latest','weeklyHref','sleeperAction','return `'+args.club+'`')(model,[selected],selected,selected,()=>'',sleeperAction);
    const injured={name:'Bayou Bombers',lineup:[{id:'1',name:'Injured starter',slot:'WR',injuryStatus:'Out',state:'upcoming',kickoff:new Date(Date.now()+3600000).toISOString()}]};
    const swap={start:{id:'2',name:'Justin Jefferson',position:'WR',points:22},sit:{id:'3',name:'Michael Pittman Jr.',position:'WR',points:13},gain:9};
    const cases={lineup:{route:'analyzer',html:'<section class="wo-panel wo-startsit"><header class="wo-head"><h2>Start / Sit</h2></header>'+startSitContent({lineupIsSet:true,swaps:[swap]},{leagueId})+'</section>'},warning:{route:'home',html:'<div id="home-wrap"><section class="gameday-card">'+lineupCheckHtml([injured],{leagueId})+'</section></div>'},clubhouse:{route:'clubhouse',html:'<div class="clubhouse-page clubhouse-command-center">'+club+'</div>'},trade:{route:'trade',html:'<div class="ta-report td-page"><section class="tb-board">'+header('offers',leagueId)+'</section></div>'}};
    window.showSleeperCase=name=>{view.dataset.route=cases[name].route;view.innerHTML=cases[name].html;view.querySelectorAll('details').forEach(d=>d.open=true);window.scrollTo(0,0)};
   }''',{'theme':theme,'header':header,'club':context})
   for case in ['lineup','warning','clubhouse','trade']:
    page.evaluate('showSleeperCase',case);page.wait_for_timeout(750);link=page.locator('a.sleeper-action').first
    assert link.count()==1,(case,'Missing Sleeper action')
    assert page.locator('a.sleeper-action').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44)'),(case,'Touch targets')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(case,'Overflow')
    assert page.locator('a.sleeper-action').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().left>=8&&e.getBoundingClientRect().right<=innerWidth-8)'),(case,'Screen edge padding')
    expected=link.get_attribute('href');assert expected=='https://sleeperbot.app.link/esEa7TDlJN' and link.inner_text().strip()=='Open Sleeper'
    page.screenshot(path=str(OUT/f'{case}-{width}-{theme}.png'))
    with page.expect_popup() as popup_info:link.click()
    popup=popup_info.value;popup.wait_for_load_state();assert popup.url==expected,(popup.url,expected);popup.close()
    assert page.locator('#view').get_attribute('data-route')=={'lineup':'analyzer','warning':'home','clubhouse':'clubhouse','trade':'trade'}[case]
    checks.append(f'{width}-{theme}-{case}: official app launcher, popup, 44px target, padding, no overflow, DFL view preserved')
   assert not errors,errors
   browser_context.close()
 browser.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':[]},indent=2));print(f'{len(checks)} Sleeper browser scenarios passed')
