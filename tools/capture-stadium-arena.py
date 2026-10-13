"""Exercise the real stadium controller against an isolated shared-clock fixture.
Requires Playwright Chromium; never connects to the league database.
"""
import json, threading, time, copy
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
import os,tempfile
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('DFL_ARENA_REVIEW_DIR',tempfile.mkdtemp(prefix='dfl-arena-review-')));out.mkdir(parents=True,exist_ok=True)
members=[{'id':i+1,'display_name':name,'team_name':team,'active':True,'profile_image':'','accent_color':''} for i,(name,team) in enumerate([('Cody Grant','The Bayou Bombers'),('Kirk Franklin','Dakota Thunder'),('Marcus Williams','Full Send Football'),('David Jefferson','Fourth & Fuck It'),('Brandon Thomas','The Longest Team Name In The Entire League'),('Nathan Lewis','Red River Renegades'),('Chris Brown','Monday Night Mayhem'),('Andrew Martin','Big Sack Energy'),('Tyler James','Bison Stampede'),('Matt Robertson','No Punt Intended'),('Alex Johnson','The Bench Mob'),('Jesse Peterson','Saturday’s Hangover')])]
event={'id':999,'name':'2026 Draft Order','race_engine':'stadium-v1','race_duration_ms':60000,'race_revision':1,'race_manifest':None,'status':'setup','bc_state':'idle','bc_offset_ms':0,'bc_started_at':None}
participants=[{'member_id':m['id'],'sort_order':i,'number':i+1,'color':None} for i,m in enumerate(members)]
results=[];commands=[];base=time.time()*1000;elapsed=0;started=time.time();freeze=False;lock=threading.RLock()
def server_ms():return time.time()*1000
def shared_elapsed():return elapsed+(0 if freeze else (time.time()-started)*1000)
def set_elapsed(value,paused=False):
 global elapsed,started,freeze
 with lock:
  elapsed=value;started=time.time();freeze=paused
  event['bc_state']='paused' if paused else 'running';event['bc_offset_ms']=value if paused else 0;event['bc_started_at']=datetime.fromtimestamp((server_ms()-value)/1000,timezone.utc).isoformat();event['race_revision']+=1
  if not event['race_manifest']:event['race_manifest']={'engine':'stadium-v1','seed':2407,'order':[str(m['id']) for m in members][::-1],'story_duration_ms':60000,'run_id':'fixture-run'}
def snapshot(role):
 global results
 with lock:
  if event['bc_state']=='running' and shared_elapsed()>=event['race_duration_ms']:
   results=[{'member_id':int(x),'place':i+1,'finish_ms':round(event['race_duration_ms']*(.975+.025*i/(len(participants)-1)))} for i,x in enumerate(event['race_manifest']['order'])];event['bc_state']='finished';event['status']='complete';event['bc_offset_ms']=event['race_duration_ms'];event['bc_started_at']=None;event['race_revision']+=1
  return copy.deepcopy({'event':event,'participants':participants,'results':results,'server_ms':server_ms(),'can_control':role=='commissioner'})
stub="""export const db=()=>({rpc:async(name,args)=>{const r=await fetch('/qa/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-Role':localStorage.getItem('qaRole')||'spectator'},body:JSON.stringify(args)});const data=await r.json();return r.ok?{data,error:null}:{data:null,error:data}},channel:()=>{const c={on(){return c},subscribe(){return c},unsubscribe(){window.qaUnsubscribed=(window.qaUnsubscribed||0)+1},presenceState(){return {}},track(){}};return c}});"""
head=(root/'index.html').read_text().split('</head>')[0].replace('<head>','<head><base href="/">')+'</head>'
html=head+'''<body><div class="app"><header class="topbar" style="height:52px"><b>DFL HQ</b></header><main id="view" class="view" data-route="arena"></main><nav class="bottomnav" style="height:54px"><b>DFL</b><span>Home</span><span>GameDay</span><span>Clubhouse</span></nav></div><div id="toast" class="hidden" role="status"></div><script type="module">import {render,leave} from './js/pages/arena-stadium.js';window.qaLeave=leave;window.qaRefresh=()=>render(document.querySelector('#view'));await qaRefresh();window.qaReady=true;</script></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  name=self.path.split('?')[0];body=stub if name=='/js/supabase.js' else 'export const loadMemberDirectory=async()=>'+json.dumps(members)+'; export const currentMember=()=>null;' if name=='/js/members.js' else "export const canEdit=()=>localStorage.getItem('qaRole')==='commissioner';" if name=='/js/inline.js' else html if name=='/qa.html' else None
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/html' if name=='/qa.html' else 'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def do_POST(self):
  global elapsed,freeze,started,participants
  body=json.loads(self.rfile.read(int(self.headers['Content-Length'])));role=self.headers.get('X-Role');error=None
  with lock:
   if self.path.endswith('arena_stadium_command'):
    commands.append(body);action=body['p_action']
    if role!='commissioner':error={'code':'42501','message':'Only Arena commissioners can control races.'}
    elif body['p_revision']!=event['race_revision']:error={'code':'40001','message':'Race changed. Refresh the controls.'}
    elif action=='start':set_elapsed(-3000)
    elif action=='pause':set_elapsed(shared_elapsed(),True)
    elif action=='resume':set_elapsed(elapsed)
    elif action=='configure':
     if event['bc_state']=='paused':elapsed=elapsed/event['race_duration_ms']*(body['p_duration_seconds']*1000) if elapsed>=0 else elapsed
     event['race_duration_ms']=body['p_duration_seconds']*1000;event['name']=body['p_name'];event['race_revision']+=1
     if event['bc_state']=='idle':participants=[{'member_id':id,'sort_order':i,'number':i+1} for i,id in enumerate(body['p_member_ids'])]
    elif action=='reset':event['bc_state']='idle';event['race_manifest']=None;event['race_revision']+=1
   self.send_response(400 if error else 200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(error or snapshot(role)).encode())
 def translate_path(self,path):return str(root/path.split('?')[0].lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/qa.html#/arena?id=999'
report={'checks':[],'errors':[]}
def check(name,condition=True):
 assert condition,name
 report['checks'].append(name);print('PASS',name,flush=True);(out/'browser-checks.json').write_text(json.dumps(report,indent=2))
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server'])
 def context(role='spectator',width=390,reduced='no-preference'):
  c=browser.new_context(viewport={'width':width,'height':844},service_workers='block',reduced_motion=reduced,has_touch=True)
  c.add_init_script("localStorage.setItem('qaRole',"+json.dumps(role)+")")
  c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{server.server_port}') else r.abort());page=c.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(url);page.wait_for_function('window.qaReady===true');page.evaluate('document.fonts.ready');return c,page
 c,admin=context('commissioner');d,watch=context()
 check('spectator has no race controls',watch.locator('.sr-controls button').count()==0)
 check('all 12 racers visible in the board',watch.locator('.sr-position').count()==12)
 admin.screenshot(path=str(out/'arena-390-ready.png'))
 admin.locator('[data-edit]').click();check('commissioner can choose racers',admin.locator('[name=racer]').count()==12)
 admin.locator('[data-all]').click();admin.locator('[type=submit]').click();check('requires at least two selected racers',admin.locator('.sr-form-error').is_visible());admin.locator('[data-all]').click();admin.locator('[name=name]').fill('The Boys • Draft Order');admin.locator('[data-duration="90"]').click();admin.locator('[type=submit]').click();admin.wait_for_function('document.querySelector("[data-name]").textContent.includes("The Boys")')
 check('saved duration displayed',admin.locator('[data-duration-label]').inner_text()=='1:30');check('race editor closes',not admin.locator('.sr-editor-host').is_visible())
 admin.locator('[data-command=start]').click();admin.wait_for_selector('[data-command=pause]');watch.wait_for_function('document.querySelector("[data-state-label]").textContent==="Live"');check('both viewers receive shared start')
 admin.locator('[data-command=pause]').click();admin.wait_for_selector('[data-command=resume]');watch.wait_for_function('document.querySelector("[data-overlay]").textContent==="HOLD THE LINE"');positions=watch.locator('.sr-position').evaluate_all('es=>es.map(e=>e.style.transform)');watch.wait_for_timeout(900);check('paused positions do not advance',positions==watch.locator('.sr-position').evaluate_all('es=>es.map(e=>e.style.transform)'))
 admin.locator('[data-command=resume]').click();admin.wait_for_selector('[data-command=pause]');set_elapsed(36000);admin.wait_for_timeout(2400)
 admin.evaluate('scrollTo({top:0,behavior:"instant"})');admin.screenshot(path=str(out/'arena-390-racing.png'));watch.screenshot(path=str(out/'arena-390-spectator.png'))
 check('callout never covers the running field',admin.locator('.sr-stage').evaluate('e=>e.querySelector(".sr-moment").getBoundingClientRect().top>=e.querySelector("canvas").getBoundingClientRect().bottom-1'))
 check('rank order is live rather than future official order',watch.locator('.sr-position').evaluate_all('es=>es.map(e=>[e.dataset.racerId,e.querySelector(".sr-rank").textContent])')!=[[str(i+1),str(12-i)] for i in range(12)])
 admin.locator('[data-command=pause]').click();admin.wait_for_selector('[data-command=resume]');admin.locator('[data-edit]').click();check('racers locked during a paused draw',admin.locator('[name=racer]:disabled').count()==12);admin.locator('[data-duration="120"]').click();admin.locator('[type=submit]').click();admin.wait_for_function('document.querySelector("[data-duration-label]").textContent==="2:00"');check('paused duration edit works')
 admin.locator('[data-command=resume]').click();admin.wait_for_selector('[data-command=pause]');set_elapsed(111000);admin.wait_for_timeout(2300);admin.screenshot(path=str(out/'arena-390-final-sprint.png'))
 # New late joiners see current positions, not another countdown.
 late_c,late=context();check('late joiner catches the shared race',late.locator('[data-overlay]').inner_text()=='');check('late joiner sees same duration',late.locator('[data-duration-label]').inner_text()=='2:00')
 set_elapsed(120500);watch.wait_for_function('document.querySelector(".sr-final").hidden===false');check('official winner follows sealed draw',watch.locator('.sr-podium-place[data-place="1"] strong').inner_text()=='Jesse Peterson');check('entire finishing order shown',watch.locator('.sr-position').evaluate_all('es=>es.map(e=>[e.dataset.racerId,Number(e.querySelector(".sr-rank").textContent)]).sort((a,b)=>a[1]-b[1]).map(e=>e[0])')==[str(i) for i in range(12,0,-1)])
 watch.screenshot(path=str(out/'arena-390-finished.png'));check('spectator can replay',watch.locator('[data-replay]').is_visible());watch.locator('[data-replay]').click();watch.wait_for_function('document.querySelector("[data-overlay]").textContent==="3"');check('replay never writes race controls',commands[-1]['p_action']=='resume')
 for width in [320,390,768]:
  admin.set_viewport_size({'width':width,'height':844});admin.wait_for_timeout(400);check(f'{width}px has no horizontal overflow',admin.evaluate('document.documentElement.scrollWidth<=innerWidth'));admin.screenshot(path=str(out/f'arena-{width}-final.png'))
 admin.set_viewport_size({'width':844,'height':390});admin.wait_for_timeout(200);check('landscape has no overflow',admin.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 reduced_c,reduced=context(reduced='reduce');check('reduced motion respected',reduced.locator('.sr-room').get_attribute('data-motion')=='off');admin.locator('button[data-motion]').click();check('motion toggle stored',admin.evaluate("localStorage.getItem('dfl.reduceRaceMotion')==='1'"))
 admin.evaluate('window.qaLeave()');watch.evaluate('window.qaLeave()');check('subscriptions cleaned up',admin.evaluate('window.qaUnsubscribed')==1 and watch.evaluate('window.qaUnsubscribed')==1)
 check('no browser errors',not report['errors']);browser.close()
server.shutdown()
