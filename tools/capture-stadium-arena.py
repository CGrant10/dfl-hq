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
presence={};broadcasts=[];removed=False;kits={};kit_saves=[];results=[];commands=[];base=time.time()*1000;elapsed=0;started=time.time();freeze=False;lock=threading.RLock()
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
  return copy.deepcopy({'event':event,'participants':participants,'results':results,'server_ms':server_ms(),'can_control':role=='commissioner','racer_kits':list(kits.values())})
stub="""export const db=()=>({rpc:async(name,args)=>{const r=await fetch('/qa/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-Role':localStorage.getItem('qaRole')||'spectator','X-Member':localStorage.getItem('qaMember')||'1'},body:JSON.stringify(args)});const data=await r.json();return r.ok?{data,error:null}:{data:null,error:data}},from:table=>{let id=0;const q={select(){return q},order(){return q},limit(){return q},then:async resolve=>{const r=await fetch('/qa/arena_stadium_snapshot',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const value=await r.json();resolve({data:value.event?[value.event]:[],error:null})},eq(k,v){id=v;return q},maybeSingle:async()=>{const r=await fetch('/qa/qa_load_racer_kit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({member_id:id})});return {data:await r.json(),error:null}}};return q},channel:(topic,options)=>{const handlers=[],key=options.config.presence.key;let timer,state={},cursor=0,closed=false;const call=async(path,body)=>{const r=await fetch('/qa/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return r.json()};const poll=async()=>{if(closed)return;const data=await call('qa_crowd',{cursor,key});if(closed)return;state=data.presence;cursor=data.cursor;for(const h of handlers){if(h.type==='presence')h.fn();if(h.type==='broadcast')for(const message of data.messages)if(message.key!==key)h.fn({payload:message.payload})}};const c={on(type,filter,fn){handlers.push({type,filter,fn});return c},subscribe(fn){queueMicrotask(()=>fn('SUBSCRIBED'));timer=setInterval(()=>void poll(),160);return c},unsubscribe(){closed=true;clearInterval(timer);void call('qa_untrack',{key});window.qaUnsubscribed=(window.qaUnsubscribed||0)+1},presenceState(){return state},async track(payload){await call('qa_track',{key,payload});await poll();return 'ok'},async send(message){if(window.qaFailReaction)return 'error';await call('qa_send',{key,payload:message.payload});return 'ok'}};return c}});"""
head=(root/'index.html').read_text().split('</head>')[0].replace('<head>','<head><base href="/">')+'</head>'
html=head+'''<body><div class="app"><header class="topbar" style="height:52px"><b>DFL HQ</b></header><main id="view" class="view page-in" data-route="arena"></main><nav class="bottomnav" style="height:54px"><b>DFL</b><span>Home</span><span>GameDay</span><span>Clubhouse</span></nav></div><div id="toast" class="hidden" role="status"></div><script type="module">import {render,leave} from './js/pages/arena-stadium.js';import {saveMode} from './js/theme.js';window.qaTheme=saveMode;window.qaLeave=leave;window.qaRefresh=()=>render(document.querySelector('#view'));await qaRefresh();window.qaReady=true;</script></body></html>'''
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  name=self.path.split('?')[0]
  body=None
  if name=='/js/supabase.js':body=stub
  elif name=='/js/members.js':body='export const loadMemberDirectory=async()=>'+json.dumps(members)+"; export const currentMember=()=>({id:Number(localStorage.getItem('qaMember')||'1'),display_name:'My DFL racer'});"
  elif name=='/js/inline.js':body="export const canEdit=()=>localStorage.getItem('qaRole')==='commissioner';"
  elif name=='/js/member-lock.js':body="export const verifiedPin=()=>null;export const markMemberUnlocked=()=>{};"
  elif name=='/qa.html':body=html
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/html' if name=='/qa.html' else 'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def do_POST(self):
  global elapsed,freeze,started,participants,results,removed
  body=json.loads(self.rfile.read(int(self.headers['Content-Length'])));role=self.headers.get('X-Role');me=int(self.headers.get('X-Member') or 1);error=None
  if self.path.rsplit('/',1)[-1] in ['qa_crowd','qa_track','qa_send','qa_untrack']:
   with lock:
    action=self.path.rsplit('/',1)[-1]
    if action=='qa_track':presence[body['key']]=[body['payload']]
    elif action=='qa_send':broadcasts.append({'key':body['key'],'payload':body['payload']})
    elif action=='qa_untrack':presence.pop(body['key'],None)
    data={'presence':presence,'messages':broadcasts[body.get('cursor',len(broadcasts)):],'cursor':len(broadcasts)}
    self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(data).encode());return
  with lock:
   if removed and self.path.endswith('arena_stadium_snapshot'):
    self.send_response(400);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'code':'22023','message':'Race not found.'}).encode());return
   if self.path.endswith('profile_lock_status') or self.path.endswith('qa_load_racer_kit') or self.path.endswith('arena_save_racer_kit'):
    data=False
    if self.path.endswith('qa_load_racer_kit'):data=kits.get(int(body['member_id']))
    elif self.path.endswith('arena_save_racer_kit'):
     previous=kits.get(me);revision=previous['revision'] if previous else 0
     if revision!=body['p_revision']:error={'code':'40001','message':'Racer changed. Reopen the editor.'}
     else:data={'member_id':me,'kit':body['p_kit'],'revision':revision+1};kits[me]=data;kit_saves.append(data)
    self.send_response(400 if error else 200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(error or data).encode());return
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
    elif action=='reset':
     if event['bc_state']=='finished':error={'code':'22023','message':'The finish is locked.'}
     else:event['race_revision']+=2 if event['bc_state']=='running' else 1;event['bc_state']='idle';event['status']='setup';event['race_manifest']=None;event['seed']=None;event['bc_offset_ms']=0;event['bc_started_at']=None;elapsed=0;freeze=True;results=[]
    elif action=='remove':
     if event['bc_state']!='finished':error={'code':'22023','message':'Only past races can be removed.'}
     else:
      removed=True;self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'removed_id':event['id']}).encode());return
   self.send_response(400 if error else 200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(error or snapshot(role)).encode())
 def translate_path(self,path):return str(root/path.split('?')[0].lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/qa.html#/arena?id=999'
report={'checks':[],'errors':[]}
def check(name,condition=True):
 assert condition,name
 report['checks'].append(name);print('PASS',name,flush=True);(out/'browser-checks.json').write_text(json.dumps(report,indent=2))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server'])
 def context(role='spectator',width=844,reduced='no-preference',height=390):
  c=browser.new_context(viewport={'width':width,'height':height},service_workers='block',reduced_motion=reduced,has_touch=True)
  c.add_init_script("localStorage.setItem('qaRole',"+json.dumps(role)+");localStorage.setItem('qaMember',"+json.dumps('1' if role=='commissioner' else '2')+")")
  c.add_init_script("""(()=>{const original=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(source?.src?.includes('/assets/stadium-arena/stadium.webp')&&args.length===8){window.qaDepthOffsets??={};qaDepthOffsets[args[5]===0?'far':'near']=args[4];}return original.call(this,source,...args)}})()""")
  c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{server.server_port}') else r.abort());page=c.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(url)
  try:page.wait_for_function('window.qaReady===true',timeout=60000)
  except Exception:
   print('LOAD ERROR',json.dumps({'errors':report['errors'],'body':page.locator('body').inner_text()[:700]}),flush=True);raise
  page.evaluate('document.fonts.ready');page.evaluate("window.qaStartedExpanded=document.querySelector('.sr-stage').classList.contains('sr-expanded')");
  if page.evaluate('qaStartedExpanded'):
   check('immersive stage fits the animated app shell',page.locator('.sr-stage').evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=-1&&r.left>=-1&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1}'));page.screenshot(path=str(out/'landscape-immersive-ready.png'));page.locator('.sr-stage').evaluate("e=>{e.style.setProperty('--sr-safe-left','32px');e.style.setProperty('--sr-safe-right','32px')}");check('immersive canvas and scoreboard clear landscape safe areas',page.locator('.sr-stage').evaluate("e=>{const c=e.querySelector('canvas').getBoundingClientRect(),s=e.querySelector('.sr-stage-score').getBoundingClientRect();return c.left>=32&&c.right<=innerWidth-32&&s.left>=32&&s.right<=innerWidth-32}"));page.locator('.sr-stage').evaluate("e=>{e.style.removeProperty('--sr-safe-left');e.style.removeProperty('--sr-safe-right')}");page.locator('[data-expand]').click()
  return c,page
 c,admin=context('commissioner');d,watch=context()
 check('commissioner opens with accessible controls instead of forced fullscreen',not admin.evaluate('qaStartedExpanded') and admin.locator('[data-edit]').is_visible())
 admin.locator('[data-expand]').click();admin.wait_for_function('document.fullscreenElement===document.querySelector(".sr-stage")||document.querySelector(".sr-stage").classList.contains("sr-expanded")')
 for mode in ['field','follow','auto']:
  admin.locator('[data-camera='+mode+']').click();check('fullscreen '+mode+' camera stays inside watch view',admin.locator('[data-camera='+mode+']').evaluate('e=>{const s=e.closest(".sr-stage").getBoundingClientRect(),r=e.getBoundingClientRect();return e.getAttribute("aria-pressed")==="true"&&r.top>=s.top&&r.bottom<=s.bottom&&r.height>=44}'))
  if mode=='follow':
   admin.locator('[data-follow-select]').select_option('5');check('fullscreen racer can be chosen',admin.locator('[data-follow-select]').input_value()=='5' and admin.locator('[data-camera=follow]').get_attribute('aria-pressed')=='true')
 print('FULLSCREEN LAYOUT',admin.evaluate("()=>({h:innerHeight,native:!!document.fullscreenElement,rows:[...document.querySelectorAll('.sr-stage,.sr-watch-toolbar,.sr-watch-surface,canvas,.sr-moment,.sr-controls')].map(e=>({c:e.className,h:e.getBoundingClientRect().height,css:getComputedStyle(e).height,flex:getComputedStyle(e).flex}))})"),flush=True)
 admin.screenshot(path=str(out/'fullscreen-layout.png'))
 check('compact fullscreen toolbar gives most height to the race',admin.locator('canvas').evaluate('e=>e.getBoundingClientRect().height>=innerHeight*.55'))
 check('stadium heading uses at most 44px',admin.locator('.sr-stage').evaluate('e=>parseFloat(e.style.getPropertyValue("--sr-field-top"))<=44'))
 for mode in ['dark','light']:
  admin.evaluate('m=>qaTheme(m)',mode);admin.screenshot(path=str(out/('fullscreen-'+mode+'.png')))
 admin.locator('[data-expand]').click();admin.wait_for_function('!document.fullscreenElement&&!document.querySelector(".sr-stage").classList.contains("sr-expanded")')

 admin.set_viewport_size({'width':390,'height':844});admin.wait_for_function('document.querySelector(".sr-stage").dataset.portrait==="true"')
 check('portrait shows a wide race with accessible controls',admin.locator('canvas').is_visible() and admin.locator('[data-edit]').is_enabled() and not admin.locator('.sr-orientation-gate').count())
 admin.locator('[data-edit]').click();admin.wait_for_selector('.sr-editor input[name=name]');admin.locator('[name=name]').fill('Portrait edit draft');check('commissioner can edit in portrait',admin.locator('[name=name]').input_value()=='Portrait edit draft');admin.wait_for_timeout(700);admin.screenshot(path=str(out/'commissioner-portrait-editor.png'));
 for mode in ['light','dark']:
  admin.evaluate('window.qaTheme',mode);admin.wait_for_timeout(100);admin.screenshot(path=str(out/f'commissioner-{mode}-editor.png'));check(mode+' commissioner form follows the app palette',admin.locator('.sr-editor').evaluate('e=>{const probe=document.createElement("i");probe.style.backgroundColor="var(--bg-2)";e.append(probe);const same=getComputedStyle(e).backgroundColor===getComputedStyle(probe).backgroundColor;probe.remove();return same&&e.scrollWidth<=e.clientWidth&&parseFloat(getComputedStyle(e.querySelector("input")).fontSize)>=16}'))
 admin.locator('[data-cancel]').click()
 admin.set_viewport_size({'width':844,'height':390});admin.wait_for_function('document.querySelector(".sr-stage").dataset.portrait==="false"')
 admin.evaluate("()=>{document.querySelector('.sr-stage').requestFullscreen=undefined}");admin.locator('[data-expand]').click()
 check('expanded stage contains commissioner controls',admin.locator('.sr-stage [data-edit]').is_visible() and admin.locator('.sr-stage [data-command=start]').is_visible())
 admin.locator('[data-edit]').click();check('edit exits watch mode and opens the race editor',not admin.locator('.sr-stage').evaluate('e=>e.classList.contains("sr-expanded")') and admin.locator('[name=name]').is_visible());admin.locator('[data-cancel]').click();admin.evaluate("()=>{delete document.querySelector('.sr-stage').requestFullscreen}")
 check('touch landscape opens immersive viewing',watch.evaluate('qaStartedExpanded'))
 watch.set_viewport_size({'width':390,'height':844});watch.wait_for_function('document.querySelector(".sr-stage").dataset.portrait==="true"')
 check('portrait watches inline without a rotate gate',watch.locator('canvas').is_visible() and not watch.locator('.sr-orientation-gate').count() and not watch.evaluate('document.body.classList.contains("sr-stadium-expanded")'))
 check('portrait field holds a widescreen ratio',watch.locator('canvas').evaluate('e=>{const r=e.getBoundingClientRect();return Math.abs(r.width/r.height-16/9)<.02&&r.height>150}'))
 watch.screenshot(path=str(out/'portrait-theater-ready.png'))
 watch.evaluate("()=>{document.querySelector('.sr-stage').requestFullscreen=()=>Promise.reject(new Error('Unsupported fullscreen'))}");watch.locator('[data-expand]').click();watch.wait_for_function('document.querySelector(".sr-stage").classList.contains("sr-expanded")')
 check('unsupported fullscreen still opens portrait theater',watch.locator('canvas').is_visible() and watch.locator('canvas').evaluate('e=>{const r=e.getBoundingClientRect();return Math.abs(r.width/r.height-16/9)<.02}'))
 check('expanded portrait controls fit inside the viewport',watch.locator('.sr-stage').evaluate('e=>[...e.querySelectorAll("[data-expand],[data-camera],.sr-crowd-menu summary")].every(b=>{const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&r.height>=44})'))
 watch.screenshot(path=str(out/'portrait-theater-expanded.png'));watch.locator('[data-expand]').click()
 check('portrait fallback closes and restores scrolling',not watch.evaluate('document.body.classList.contains("sr-stadium-expanded")') and watch.locator('[data-expand]').evaluate('e=>e===document.activeElement'))
 watch.evaluate("""()=>{const stage=document.querySelector('.sr-stage');window.qaOrientationLocks=[];stage.requestFullscreen=async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:stage});document.dispatchEvent(new Event('fullscreenchange'))};screen.orientation.lock=async mode=>qaOrientationLocks.push(mode);document.exitFullscreen=async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});document.dispatchEvent(new Event('fullscreenchange'))}}""")
 watch.locator('[data-expand]').click();watch.wait_for_function('!!document.fullscreenElement')
 check('portrait fullscreen never forces an orientation lock',watch.evaluate('qaOrientationLocks.length===0') and watch.locator('canvas').is_visible())
 watch.set_viewport_size({'width':844,'height':390});watch.wait_for_timeout(100);check('rotation keeps explicit fullscreen and camera controls',watch.evaluate('!!document.fullscreenElement') and watch.locator('[data-camera=auto]').is_visible())
 watch.locator('[data-expand]').click();watch.wait_for_function('!document.fullscreenElement');watch.evaluate("()=>{delete document.fullscreenElement;delete document.exitFullscreen;delete document.querySelector('.sr-stage').requestFullscreen;delete screen.orientation.lock}")
 watch.evaluate('dispatchEvent(new Event("resize"))');check('fullscreen exit stays closed after resize',not watch.locator('.sr-stage').evaluate('e=>e.classList.contains("sr-expanded")'))
 admin.evaluate("""()=>{const stage=document.querySelector('.sr-stage');stage.requestFullscreen=()=>new Promise(resolve=>window.qaFinishFullscreen=()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:stage});document.dispatchEvent(new Event('fullscreenchange'));resolve()});document.exitFullscreen=async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});document.dispatchEvent(new Event('fullscreenchange'))}}""")
 admin.locator('[data-expand]').click();admin.wait_for_function('!!window.qaFinishFullscreen');admin.locator('[data-expand]').click();admin.evaluate('qaFinishFullscreen()');admin.wait_for_function('!document.fullscreenElement');check('closing cancels a late fullscreen request',not admin.locator('.sr-stage').evaluate('e=>e.classList.contains("sr-expanded")'));admin.evaluate("()=>{delete document.fullscreenElement;delete document.exitFullscreen;delete document.querySelector('.sr-stage').requestFullscreen}")
 check('spectator has no race controls',watch.locator('.sr-controls button').count()==0)
 check('all 12 racers visible in the board',watch.locator('.sr-position').count()==12)
 admin.locator('[data-stadium-staging] [data-crowd-ready]').click()
 watch.wait_for_function('[...document.querySelectorAll("[data-ready-racer]")].find(e=>e.dataset.readyRacer==="1").dataset.ready==="true"')
 check('ready status reaches another viewer without affecting the draw',not event['race_manifest'] and len(commands)==0)
 watch.locator('[data-stadium-crowd] summary').click()
 watch.locator('[data-crowd-racer]').select_option('5');watch.locator('[data-crowd-call=heckle]').click()
 admin.wait_for_selector('.sr-crowd-pop');check('anonymous racer heckle reaches another viewer', 'Brandon Thomas' in admin.locator('.sr-crowd-pop').inner_text())
 check('crowd controls have 44px targets',watch.locator('.sr-crowd-controls button').evaluate_all('es=>es.filter(e=>!e.hidden).every(e=>e.getBoundingClientRect().height>=44)'))
 watch.screenshot(path=str(out/'crowd-watch.png'))
 watch.locator('[data-stadium-crowd] summary').click();watch.wait_for_timeout(1900)
 check('reactions expire without changing the race',admin.locator('.sr-crowd-pop').count()==0 and not event['race_manifest'])
 watch.locator('[data-stadium-crowd] summary').click();check('stadium sound is off until requested',watch.locator('[data-race-sound]').get_attribute('aria-pressed')=='false')
 watch.locator('[data-race-sound]').click();watch.wait_for_function('document.querySelector("[data-race-sound]").getAttribute("aria-pressed")==="true"');watch.locator('[data-race-sound]').click();watch.wait_for_function('document.querySelector("[data-race-sound]").getAttribute("aria-pressed")==="false"');check('sound can be enabled and stopped explicitly')
 watch.evaluate('window.qaFailReaction=true');watch.locator('[data-crowd-call=cheer]').click();watch.wait_for_function('document.querySelector("[data-crowd-status]").textContent.includes("could not send")');check('failed broadcast does not invent a reaction',watch.locator('.sr-crowd-pop').count()==0 and admin.locator('.sr-crowd-pop').count()==0)
 watch.evaluate('window.qaFailReaction=false');watch.locator('[data-stadium-crowd] summary').click()
 admin.screenshot(path=str(out/'arena-390-ready.png'))
 admin.locator('[data-my-racer]').click();admin.wait_for_selector('.sr-kit-dialog[open]');editor=admin.locator('.sr-kit-dialog');editor.locator('[data-kit-group="NFL"]').click();check('all 32 NFL teams available',editor.locator('[name=preset] option').count()==33);editor.locator('[name=preset]').select_option('nfl:BUF');editor.locator('[data-kit-skin]').last.click();editor.locator('[name=helmetStyle]').select_option('visor');editor.locator('[name=number]').fill('17');editor.locator('[data-kit-part="jersey"]').click();editor.locator('[data-kit-color="#ffb612"]').click();check('palette updates only selected uniform part',editor.locator('[name=jersey]').input_value()=='#ffb612' and editor.locator('[name=helmet]').input_value()=='#ffffff');editor.locator('[data-kit-part="pants"]').click();editor.locator('[name=uniformColor]').evaluate("e=>{e.value='#26303b';e.dispatchEvent(new Event('input',{bubbles:true}))}");check('custom color applies to selected pants',editor.locator('[name=pants]').input_value()=='#26303b' and editor.locator('[name=jersey]').input_value()=='#ffb612');check('custom color control has active part label',editor.locator('[data-kit-custom-label]').inner_text()=='Custom pants color');admin.wait_for_timeout(500);admin.screenshot(path=str(out/'racer-nfl.png'));editor.locator('[type=submit]').click();admin.wait_for_function('!document.querySelector(".sr-kit-dialog")');check('kit saves to selected member',kits[1]['kit']['preset']=='nfl:BUF' and kits[1]['kit']['number']==17 and kits[1]['kit']['helmetStyle']=='visor');check('saved kit leaves the race draw unchanged',event['race_manifest'] is None)
 admin.locator('[data-my-racer]').click();admin.wait_for_selector('.sr-kit-dialog[open]');editor=admin.locator('.sr-kit-dialog');check('racer persists when editor reopens',editor.locator('[name=number]').input_value()=='17');editor.locator('[data-kit-group="Pokémon"]').click();editor.locator('[name=preset]').select_option('pokemon:pikachu');admin.wait_for_timeout(300);admin.screenshot(path=str(out/'racer-pokemon.png'));editor.locator('[data-kit-group="Anime"]').click();editor.locator('[name=preset]').select_option('anime:naruto');admin.wait_for_timeout(300);admin.screenshot(path=str(out/'racer-anime.png'));admin.keyboard.press('Escape');admin.wait_for_function('!document.querySelector(".sr-kit-dialog")');check('cancel keeps saved kit',kits[1]['kit']['preset']=='nfl:BUF')
 watch.locator('[data-my-racer]').click();watch.wait_for_selector('.sr-kit-dialog[open]');second=watch.locator('.sr-kit-dialog');second.locator('[data-kit-group="Pokémon"]').click();second.locator('[name=preset]').select_option('pokemon:pikachu');second.locator('[name=number]').fill('25');second.locator('[type=submit]').click();watch.wait_for_function('!document.querySelector(".sr-kit-dialog")');check('members save independent racers',kits[1]['kit']['preset']=='nfl:BUF' and kits[2]['kit']['preset']=='pokemon:pikachu');shared=watch.evaluate('async()=>{const {loadStadiumRace}=await import("/js/arena/stadium-data.js");return (await loadStadiumRace(999)).racer_kits}');check('spectators receive both saved looks',len(shared)==2)
 admin.locator('[data-camera=field]').click();check('full field selected',admin.locator('[data-camera=field]').get_attribute('aria-pressed')=='true');admin.screenshot(path=str(out/'arena-full-field.png'));admin.locator('[data-follow-racer="5"]').click();check('tap a racer follows them',admin.locator('[data-camera=follow]').get_attribute('aria-pressed')=='true');admin.locator('[data-camera=auto]').click()
 admin.locator('[data-edit]').click();check('commissioner can choose racers',admin.locator('[name=racer]').count()==12)
 admin.locator('[data-all]').click();admin.locator('[type=submit]').click();check('requires at least two selected racers',admin.locator('.sr-form-error').is_visible());admin.locator('[data-all]').click();admin.locator('[name=name]').fill('The Boys • Draft Order');admin.locator('[data-duration="90"]').click();admin.locator('[type=submit]').click();admin.wait_for_function('document.querySelector("[data-name]").textContent.includes("The Boys")')
 check('saved duration displayed',admin.locator('[data-duration-label]').inner_text()=='1:30');check('race editor closes',not admin.locator('.sr-editor-host').is_visible())
 admin.locator('[data-command=start]').click();admin.wait_for_selector('[data-command=pause]');watch.wait_for_function('document.querySelector("[data-state-label]").textContent==="Live"');check('both viewers receive shared start')
 admin.locator('[data-reset]').click();admin.locator('[data-cancel-reset]').click();check('cancel reset keeps the live draw',event['bc_state']=='running')
 before=len(commands);admin.locator('[data-reset]').click();admin.locator('[data-confirm]').click();admin.wait_for_selector('[data-command=start]');check('running reset is one maintenance command',len(commands)==before+1 and commands[-1]['p_action']=='reset');check('reset clears the draw and keeps racers',event['race_manifest'] is None and len(participants)==12)
 admin.locator('[data-command=start]').click();admin.wait_for_selector('[data-command=pause]')
 admin.wait_for_function('Number(document.querySelector(".sr-stage").dataset.count)>0');admin.set_viewport_size({'width':390,'height':844});admin.evaluate('scrollTo({top:0,behavior:"instant"})');admin.wait_for_timeout(120);admin.screenshot(path=str(out/'stadium-countdown.png'));check('live countdown has three stadium start lights',admin.locator('.sr-start-lights i').count()==3 and admin.locator('.sr-start-lights').is_visible());admin.set_viewport_size({'width':844,'height':390})
 admin.locator('[data-command=pause]').click();admin.wait_for_selector('[data-command=resume]');watch.wait_for_function('document.querySelector("[data-overlay]").textContent==="HOLD THE LINE"');positions=watch.locator('.sr-position').evaluate_all('es=>es.map(e=>e.style.transform)');watch.wait_for_timeout(900);check('paused positions do not advance',positions==watch.locator('.sr-position').evaluate_all('es=>es.map(e=>e.style.transform)'))
 admin.locator('[data-command=resume]').click();admin.wait_for_selector('[data-command=pause]');set_elapsed(36000);admin.wait_for_timeout(2400)
 admin.locator('[data-camera=field]').click();admin.wait_for_timeout(700);admin.evaluate('scrollTo({top:0,behavior:"instant"})');admin.screenshot(path=str(out/'arena-full-field-racing.png'));check('full-field overlay stays within map',admin.locator('.sr-stage').get_attribute('data-field-overview')=='true');admin.locator('[data-camera=auto]').click();admin.wait_for_timeout(700);admin.evaluate('scrollTo({top:0,behavior:"instant"})');admin.screenshot(path=str(out/'arena-390-racing.png'));watch.screenshot(path=str(out/'arena-390-spectator.png'))
 # Real shared race frames drive the separated-lane showdown; no renderer hook.
 before_showdown_commands=len(commands)
 for width in [320,390,768]:
  for theme in ['dark','light']:
   set_elapsed(16300)
   duel_c,duel=context(width=width,height=1024 if width==768 else 844)
   duel.evaluate('m=>qaTheme(m)',theme);duel.locator('.sr-showdown:not([hidden])').wait_for();duel.wait_for_timeout(450)
   duel.evaluate('scrollTo({top:0,behavior:"instant"})');duel.screenshot(path=str(out/f'showdown-{width}-{theme}.png'))
   check(f'{width}px {theme} showdown names and gap fit the field',duel.locator('.sr-showdown').evaluate('e=>{const b=e.getBoundingClientRect();return [...e.querySelectorAll("strong,[data-duel-gap]")].every(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.left>=b.left&&r.right<=b.right+1&&r.top>=b.top&&r.bottom<=b.bottom})}'))
   check(f'{width}px {theme} showdown uses the right feed layout',duel.locator('.sr-showdown').get_attribute('data-columns')==('true' if width<650 else 'false'))
   check(f'{width}px {theme} showdown shows two actual member identities',duel.locator('[data-duel-slot]').evaluate_all('es=>es.length===2&&es.every(e=>e.dataset.racerId&&e.querySelector("strong").textContent&&/^#\d+$/.test(e.querySelector("b").textContent))') and len(set(duel.locator('[data-duel-slot]').evaluate_all('es=>es.map(e=>e.dataset.racerId)')))==2)
   if width==390 and theme=='dark':
    depth_before=duel.evaluate('({...qaDepthOffsets})');duel.wait_for_timeout(900);depth_after=duel.evaluate('({...qaDepthOffsets})')
    check('near crowd moves farther than distant stands while tracking the race',abs(depth_after['near']-depth_before['near'])>abs(depth_after['far']-depth_before['far'])>.001)
    duel.locator('[data-camera=field]').click();check('manual field camera overrides showdown',duel.locator('.sr-showdown').is_hidden());duel.locator('[data-camera=follow]').click();check('manual follow camera overrides showdown',duel.locator('.sr-showdown').is_hidden())
    duel.locator('[data-expand]').click();duel.wait_for_function('document.fullscreenElement||document.querySelector(".sr-stage").classList.contains("sr-expanded")');duel.set_viewport_size({'width':844,'height':390});duel.locator('[data-camera=auto]').click();duel.locator('.sr-showdown:not([hidden])').wait_for();duel.wait_for_timeout(450);duel.screenshot(path=str(out/'showdown-landscape-expanded.png'));check('expanded landscape keeps showdown and camera controls usable',duel.locator('[data-expand]').is_visible() and duel.locator('[data-camera=auto]').is_visible());duel.locator('[data-expand]').click()
    set_elapsed(17500,True);duel.evaluate('qaRefresh()');duel.wait_for_function('document.querySelector("[data-overlay]").textContent==="HOLD THE LINE"');duel.wait_for_timeout(450)
    frozen=duel.locator('canvas').evaluate('e=>e.toDataURL()');frozen_depth=duel.evaluate('({...qaDepthOffsets})');duel.wait_for_timeout(900)
    check('pause freezes the showdown, stands and sideline together',duel.locator('canvas').evaluate('e=>e.toDataURL()')==frozen and duel.evaluate('({...qaDepthOffsets})')==frozen_depth)
    duel.locator('[data-camera=follow]').click();duel.wait_for_timeout(700);duel.locator('[data-camera=auto]').click();duel.wait_for_timeout(800);paused_camera=duel.locator('canvas').evaluate('e=>e.toDataURL()');duel.wait_for_timeout(700)
    check('paused camera changes settle and then hold without restarting race motion',duel.locator('canvas').evaluate('e=>e.toDataURL()')==paused_camera and duel.locator('.sr-stage').get_attribute('data-showdown')=='true')
   duel.evaluate('window.qaLeave()');duel.wait_for_timeout(100);duel_c.close()
 set_elapsed(16300);still_c,still=context(width=390,height=844,reduced='reduce');still.wait_for_timeout(400)
 check('reduced motion keeps full field and static stadium layers',still.locator('.sr-showdown').is_hidden() and still.evaluate('qaDepthOffsets.far===-80&&qaDepthOffsets.near===-80'))
 still.evaluate('window.qaLeave()');still.wait_for_timeout(100);still_c.close();check('showdown camera never sends commissioner commands',len(commands)==before_showdown_commands)
 set_elapsed(36000);admin.evaluate('qaRefresh()');watch.evaluate('qaRefresh()');admin.wait_for_timeout(300)
 # Review live portrait camera modes in both app themes, not just the lobby.
 for width in [320,390,768]:
  admin.set_viewport_size({'width':width,'height':1024 if width==768 else 844})
  for theme in ['light','dark']:
   admin.evaluate('m=>qaTheme(m)',theme)
   for camera in ['auto','follow','field']:
    admin.locator('[data-camera='+camera+']').click();admin.wait_for_timeout(650);admin.evaluate('scrollTo({top:0,behavior:"instant"})');admin.screenshot(path=str(out/f'portrait-{width}-{theme}-{camera}.png'))
    check(f'{width}px {theme} {camera} portrait race stays wide and readable',admin.locator('canvas').evaluate('e=>{const r=e.getBoundingClientRect();return r.height>150&&Math.abs(r.width/r.height-16/9)<.02}') and admin.locator('[data-camera='+camera+']').evaluate('e=>e.getBoundingClientRect().height>=44') and admin.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    check(f'{width}px {theme} {camera} camera labels fit',admin.locator('[data-camera]').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth)'))
    check(f'{width}px {theme} {camera} crowd button never covers the field',admin.locator('.sr-crowd-menu summary').evaluate('e=>e.getBoundingClientRect().top>=document.querySelector("canvas").getBoundingClientRect().bottom-1'))
 portrait_c,portrait=context(width=390,height=844)
 check('a direct watch link opens a live race in portrait',not portrait.evaluate('qaStartedExpanded') and portrait.locator('canvas').is_visible() and portrait.locator('[data-overlay]').inner_text()=='')
 before_commands=len(commands);portrait_clock=portrait.locator('[data-clock]').inner_text();portrait_pixels=portrait.locator('canvas').evaluate('e=>e.toDataURL()');portrait.wait_for_timeout(1250)
 check('portrait clock and animated race continue without commissioner writes',portrait.locator('[data-clock]').inner_text()!=portrait_clock and portrait.locator('canvas').evaluate('e=>e.toDataURL()')!=portrait_pixels and len(commands)==before_commands)
 portrait.set_viewport_size({'width':844,'height':390});portrait.wait_for_function('document.querySelector(".sr-stage").classList.contains("sr-expanded")');check('rotating an inline portrait spectator expands the stadium')
 portrait.set_viewport_size({'width':390,'height':844});portrait.wait_for_function('!document.querySelector(".sr-stage").classList.contains("sr-expanded")');check('rotating back returns automatic viewing inline without a scroll lock',not portrait.evaluate('document.body.classList.contains("sr-stadium-expanded")'))
 portrait.evaluate('window.qaLeave()');portrait_c.close()
 admin.set_viewport_size({'width':844,'height':390});admin.locator('[data-camera=auto]').click()
 check('callout never covers the running field',admin.locator('.sr-stage').evaluate('e=>e.querySelector(".sr-moment").getBoundingClientRect().top>=e.querySelector("canvas").getBoundingClientRect().bottom-1'))
 check('rank order is live rather than future official order',watch.locator('.sr-position').evaluate_all('es=>es.map(e=>[e.dataset.racerId,e.querySelector(".sr-rank").textContent])')!=[[str(i+1),str(12-i)] for i in range(12)])
 admin.locator('[data-command=pause]').click();admin.wait_for_selector('[data-command=resume]');admin.locator('[data-edit]').click();check('racers locked during a paused draw',admin.locator('[name=racer]:disabled').count()==12);admin.locator('[data-duration="120"]').click();admin.locator('[type=submit]').click();admin.wait_for_function('document.querySelector("[data-duration-label]").textContent==="2:00"');check('paused duration edit works')
 admin.locator('[data-command=resume]').click();admin.wait_for_selector('[data-command=pause]');set_elapsed(111000);admin.wait_for_timeout(2300);admin.screenshot(path=str(out/'arena-390-final-sprint.png'))
 # New late joiners see current positions, not another countdown.
 late_c,late=context();check('late joiner catches the shared race',late.locator('[data-overlay]').inner_text()=='');check('late joiner sees same duration',late.locator('[data-duration-label]').inner_text()=='2:00')
 set_elapsed(120500);watch.wait_for_function('document.querySelector(".sr-final").hidden===false');check('official winner follows sealed draw',watch.locator('.sr-podium-place[data-place="1"] strong').inner_text()=='Jesse Peterson');check('entire finishing order shown',watch.locator('.sr-position').evaluate_all('es=>es.map(e=>[e.dataset.racerId,Number(e.querySelector(".sr-rank").textContent)]).sort((a,b)=>a[1]-b[1]).map(e=>e[0])')==[str(i) for i in range(12,0,-1)])
 watch.screenshot(path=str(out/'arena-390-finished.png'));check('spectator can replay',watch.locator('[data-replay]').is_visible());watch.locator('[data-replay]').click();watch.wait_for_function('document.querySelector("[data-overlay]").textContent==="3"');check('replay never writes race controls',commands[-1]['p_action']=='resume');watch.set_viewport_size({'width':390,'height':844});watch.wait_for_function('document.querySelector(".sr-stage").dataset.portrait==="true"');check('replay stays visible after rotating to portrait',watch.locator('canvas').is_visible());watch.set_viewport_size({'width':844,'height':390})
 event['race_duration_ms']=60000;event['race_manifest']['story_duration_ms']=60000
 for result in results:result['finish_ms']=round(60000*(.975+.025*(result['place']-1)/(len(results)-1)))
 watch.evaluate('qaRefresh()');watch.wait_for_selector('[data-photo-finish]:not([hidden])');watch.locator('[data-photo-finish]').click()
 watch.wait_for_function('document.querySelector("[data-moment-title]").textContent.includes("0.25×")')
 check('goal-line replay is local and keeps official order',len(results)==12 and results[0]['member_id']==12)
 watch.screenshot(path=str(out/'photo-finish-replay.png'))
 watch.locator('[data-stop-replay]').click();check('photo finish can return directly to the result',watch.locator('[data-stop-replay]').is_hidden())
 for width in [320,390,768]:
  admin.set_viewport_size({'width':width,'height':844});admin.wait_for_timeout(400);check(f'{width}px finished race is visible in a wide portrait window',admin.locator('canvas').is_visible() and admin.locator('canvas').evaluate('e=>{const r=e.getBoundingClientRect();return Math.abs(r.width/r.height-16/9)<.02}'));check(f'{width}px has no horizontal overflow',admin.evaluate('document.documentElement.scrollWidth<=innerWidth'));admin.screenshot(path=str(out/f'arena-{width}-final.png'))
  admin.evaluate('async()=>{location.hash="#/arena";await qaRefresh()}');check(f'{width}px lobby remains usable in portrait',not admin.locator('.sr-orientation-gate').count());admin.locator('[data-my-racer]').click();admin.wait_for_selector('.sr-kit-dialog[open]');check(f'{width}px editor has no overflow',admin.locator('.sr-kit-dialog').evaluate('e=>e.scrollWidth<=e.clientWidth+1'));admin.locator('.sr-kit-dialog').evaluate('e=>e.scrollTop=e.scrollHeight');check(f'{width}px live preview stays visible',admin.locator('.sr-kit-preview').evaluate('e=>{const p=e.getBoundingClientRect(),h=e.closest("form").querySelector("header").getBoundingClientRect();return p.top>=h.bottom-6&&p.bottom<innerHeight-80}'));admin.screenshot(path=str(out/f'racer-{width}-scrolled.png'));admin.keyboard.press('Escape');admin.wait_for_function('!document.querySelector(".sr-kit-dialog")');check(f'{width}px editor restores focus',admin.locator('[data-my-racer]').evaluate('e=>e===document.activeElement'));admin.evaluate('async()=>{location.hash="#/arena?id=999";await qaRefresh()}')
 admin.set_viewport_size({'width':844,'height':390});admin.wait_for_timeout(200);check('landscape has no overflow',admin.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 if admin.locator('.sr-stage').evaluate("e=>e.classList.contains('sr-expanded')"):admin.locator('[data-expand]').click()
 reduced_c,reduced=context(reduced='reduce');check('reduced motion respected',reduced.locator('.sr-room').get_attribute('data-motion')=='off');reduced.locator('[data-my-racer]').click();reduced.wait_for_selector('.sr-kit-dialog[open]');reduced.evaluate('async()=>{const {loadRacerArt}=await import("/js/arena/racer-kit-art.js");await loadRacerArt()}');check('uniform preview updates immediately with reduced motion',reduced.evaluate("""()=>{const d=document.querySelector('.sr-kit-dialog'),c=d.querySelector('canvas'),sum=()=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.reduce((a,v,i)=>a+(i%4===3?0:v),0);d.querySelector('[data-kit-part=jersey]').click();d.querySelector('[data-kit-color="#bb2038"]').click();const red=sum();d.querySelector('[data-kit-color="#ffffff"]').click();return sum()>red&&d.querySelector('[name=jersey]').value==='#ffffff'}"""));reduced.keyboard.press('Escape');reduced.wait_for_function('!document.querySelector(".sr-kit-dialog")');admin.locator('button[data-motion]').click();check('motion toggle stored',admin.evaluate("localStorage.getItem('dfl.reduceRaceMotion')==='1'"))
 admin.set_viewport_size({'width':390,'height':844});admin.evaluate('async()=>{location.hash="#/arena";await qaRefresh()}');watch.evaluate('async()=>{location.hash="#/arena";await qaRefresh()}');check('spectators cannot remove past races',watch.locator('[data-remove-race]').count()==0)
 denied=watch.evaluate('async()=>{const {db}=await import("/js/supabase.js");return (await db().rpc("arena_stadium_command",{p_event_id:999,p_action:"remove",p_revision:'+str(event['race_revision'])+'})).error?.code}')
 check('unauthorized deletion is rejected by server fixture',denied=='42501')
 admin.locator('[data-remove-race]').click();admin.locator('[data-cancel-remove]').click();check('cancel removal keeps official results',not removed and len(results)==12)
 admin.locator('[data-remove-race]').click();event['race_revision']+=1;admin.locator('[data-confirm-remove]').click();admin.wait_for_selector('.sr-remove-confirm [role=alert]:not([hidden])');check('stale removal keeps the past race',not removed)
 admin.evaluate('async()=>{await qaRefresh()}')
 for mode in ['dark','light']:
  admin.evaluate('m=>qaTheme(m)',mode);admin.locator('[data-remove-race]').click()
  check(mode+' past-race title has readable contrast',admin.locator('.sr-history-row .sr-event').evaluate('''e=>{const rgb=v=>(v.match(/[\d.]+/g)||[]).slice(0,3).map(Number),l=v=>rgb(v).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0),s=getComputedStyle(e),a=l(s.color),b=l(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5}'''))
  admin.screenshot(path=str(out/('past-race-'+mode+'.png')));admin.locator('[data-cancel-remove]').click()
 admin.locator('[data-remove-race]').click();admin.locator('[data-confirm-remove]').click();admin.wait_for_function('!document.querySelector(".sr-history-row")');check('commissioner removes a past race from the lobby',removed);check('removing a race keeps shared racer kits',len(kits)==2)
 late.evaluate('window.dispatchEvent(new Event("online"))');late.wait_for_function('document.querySelector("#view").textContent.includes("Race removed.")');check('open viewers leave a removed race cleanly')
 admin.evaluate('window.qaLeave()');watch.evaluate('window.qaLeave()');check('leaving releases viewing and portrait scroll locks',not admin.locator('.sr-orientation-gate').count() and not watch.locator('.sr-orientation-gate').count() and not watch.evaluate('document.body.classList.contains("sr-landscape-required")'));check('subscriptions cleaned up',admin.evaluate('window.qaUnsubscribed')>=1 and watch.evaluate('window.qaUnsubscribed')>=1)
 check('no browser errors',not report['errors']);browser.close()
server.shutdown()
