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
create_error=None;presence={};broadcasts=[];removed=False;kits={};kit_saves=[];results=[];commands=[];base=time.time()*1000;elapsed=0;started=time.time();freeze=False;lock=threading.RLock()
def server_ms():return time.time()*1000
def shared_elapsed():return elapsed+(0 if freeze else (time.time()-started)*1000)
def set_elapsed(value,paused=False):
 global elapsed,started,freeze
 with lock:
  elapsed=value;started=time.time();freeze=paused
  event['bc_state']='paused' if paused else 'running';event['bc_offset_ms']=value if paused else 0;event['bc_started_at']=datetime.fromtimestamp((server_ms()-value)/1000,timezone.utc).isoformat();event['race_revision']+=1
  if not event['race_manifest']:event['race_manifest']={'engine':'stadium-v1','presentation_version':2,'seed':2407,'order':[str(m['id']) for m in members][::-1],'story_duration_ms':60000,'run_id':'fixture-run'}
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
  global elapsed,freeze,started,participants,results,removed,create_error
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
    elif action=='create':
     if create_error:error=create_error;create_error=None
     elif len(body.get('p_member_ids') or [])<2:error={'code':'22023','message':'Choose at least two racers.'}
     else:
      event.update(name=body['p_name'],race_duration_ms=body['p_duration_seconds']*1000,race_revision=1,race_manifest=None,status='setup',bc_state='idle',bc_offset_ms=0,bc_started_at=None)
      participants=[{'member_id':id,'sort_order':i,'number':i+1} for i,id in enumerate(body['p_member_ids'])];results=[];removed=False;elapsed=0;freeze=True
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
 if not condition:
  (out/'browser-checks.json').write_text(json.dumps(report,indent=2));print('FAIL',name,'ERRORS',report['errors'],flush=True)
 assert condition,name
 report['checks'].append(name);print('PASS',name,flush=True);(out/'browser-checks.json').write_text(json.dumps(report,indent=2))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server'])
 def context(role='spectator',width=844,reduced='no-preference',height=390,keep_expanded=False):
  c=browser.new_context(viewport={'width':width,'height':height},service_workers='block',reduced_motion=reduced,has_touch=True)
  c.add_init_script("localStorage.setItem('qaRole',"+json.dumps(role)+");localStorage.setItem('qaMember',"+json.dumps('1' if role=='commissioner' else '2')+")")
  c.add_init_script("""(()=>{const original=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(source?.src?.includes('/assets/stadium-arena/stadium.webp')&&args.length===8){window.qaDepthOffsets??={};qaDepthOffsets[args[5]===0?'far':'near']=args[4];}return original.call(this,source,...args)}})()""")
  c.add_init_script("""(()=>{const p=CanvasRenderingContext2D.prototype,set=p.setTransform,draw=p.drawImage,fill=p.fillText,bounds=new WeakMap(),numbers=new WeakMap();p.fillText=function(value,...args){if(this.canvas.dataset?.racerCharacter==='true'&&/^[0-9]{1,2}$/.test(String(value)))numbers.set(this.canvas,String(value));if(this.canvas.matches('.sr-watch-surface canvas')&&this.textBaseline==='middle'&&/^[0-9]{1,2}$/.test(String(value)))(window.qaBadges??=[]).push({number:String(value),font:parseFloat(this.font.split(' ')[1])});return fill.call(this,value,...args)};p.setTransform=function(...args){if(this.canvas.matches('.sr-watch-surface canvas')){window.qaBodies=[];window.qaBadges=[];}return set.apply(this,args)};p.drawImage=function(source,...args){if(this.canvas.matches('.sr-watch-surface canvas')&&source?.dataset?.racerCharacter==='true'&&args.length===8&&args[4]===-36&&args[5]===-72){let frames=bounds.get(source);if(!frames){frames=new Map();bounds.set(source,frames)}let ink=frames.get(args[0]);if(!ink){const pixels=source.getContext('2d').getImageData(args[0],0,args[2],args[3]).data;let l=args[2],t=args[3],r=0,b=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>32){const x=(i/4)%args[2],y=Math.floor(i/4/args[2]);l=Math.min(l,x);r=Math.max(r,x+1);t=Math.min(t,y);b=Math.max(b,y+1)}ink={l,t,r,b};frames.set(args[0],ink)}const m=this.getTransform(),d=Math.min(2,devicePixelRatio||1),points=[[ink.l,ink.t],[ink.r,ink.t],[ink.l,ink.b],[ink.r,ink.b]].map(([x,y])=>[args[4]+x/args[2]*args[6],args[5]+y/args[3]*args[7]]).map(([x,y])=>({x:(m.a*x+m.c*y+m.e)/d,y:(m.b*x+m.d*y+m.f)/d}));(window.qaBodies??=[]).push({jersey:numbers.get(source),left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))});}return draw.call(this,source,...args)}})()""")
  c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{server.server_port}') else r.abort());page=c.new_page();page.on('pageerror',lambda e:(report['errors'].append(str(e)),print('BROWSER ERROR',str(e),flush=True)));page.goto(url)
  try:page.wait_for_function('window.qaReady===true',timeout=60000)
  except Exception:
   print('LOAD ERROR',json.dumps({'errors':report['errors'],'body':page.locator('body').inner_text()[:700]}),flush=True);raise
  page.evaluate('document.fonts.ready');page.evaluate("window.qaStartedExpanded=document.querySelector('.sr-stage').classList.contains('sr-expanded')");
  if page.evaluate('qaStartedExpanded'):
   check('immersive stage fits the animated app shell',page.locator('.sr-stage').evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=-1&&r.left>=-1&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1}'));page.screenshot(path=str(out/'landscape-immersive-ready.png'));page.locator('.sr-stage').evaluate("e=>{e.style.setProperty('--sr-safe-left','32px');e.style.setProperty('--sr-safe-right','32px')}");check('immersive canvas and scoreboard clear landscape safe areas',page.locator('.sr-stage').evaluate("e=>{const c=e.querySelector('canvas').getBoundingClientRect(),s=e.querySelector('.sr-stage-score').getBoundingClientRect();return c.left>=32&&c.right<=innerWidth-32&&s.left>=32&&s.right<=innerWidth-32}"));page.locator('.sr-stage').evaluate("e=>{e.style.removeProperty('--sr-safe-left');e.style.removeProperty('--sr-safe-right')}");
   if not keep_expanded:page.locator('[data-expand]').click()
  return c,page
 def all_visible(page,count):
  return page.evaluate("""count=>{const s=document.querySelector('.sr-stage'),canvas=s.querySelector('canvas'),w=canvas.getBoundingClientRect().width,top=parseFloat(s.style.getPropertyValue('--sr-field-top')),height=parseFloat(s.style.getPropertyValue('--sr-field-height'));return s.dataset.fieldOverview==='true'&&window.qaBodies?.length===count&&qaBodies.every(b=>b.left>=-1&&b.right<=w+1&&b.top>=top-1&&b.bottom<=top+height+1)}""",count)
 # Exercise new-race setup with the real fixed navigation, including an empty
 # lobby. The normal race fixture below keeps its original lightweight shell.
 saved_event=copy.deepcopy(event);saved_participants=copy.deepcopy(participants);saved_html=html;saved_stub=stub
 index=(root/'index.html').read_text();nav_start=index.index('<nav class="tabbar"');nav=index[nav_start:index.index('</nav>',nav_start)+6]
 html=html.replace('<nav class="bottomnav" style="height:54px"><b>DFL</b><span>Home</span><span>GameDay</span><span>Clubhouse</span></nav>',nav)
 stub=stub.replace('resolve({data:value.event?[value.event]:[],error:null})','resolve({data:[],error:null})')
 for width,height in [(320,700),(390,844),(844,390)]:
  for theme in ['dark','light']:
   create_context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,reduced_motion='reduce',service_workers='block')
   create_context.add_init_script("localStorage.setItem('qaRole','commissioner');localStorage.setItem('qaMember','1')")
   create_context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{server.server_port}') else r.abort())
   setup=create_context.new_page();setup.on('pageerror',lambda e:report['errors'].append(str(e)))
   setup.goto(url.split('#')[0]+'#/arena');setup.wait_for_function('window.qaReady===true');setup.evaluate('window.qaTheme',theme);setup.evaluate('document.fonts.ready')
   setup.locator('[data-new]').click()
   check(f'{width}px {theme} new race opens without a software-keyboard focus',setup.locator('.sr-editor h2').evaluate('e=>e===document.activeElement'))
   def visible_create():
    return setup.locator('.sr-editor [type=submit]').evaluate("e=>{const r=e.getBoundingClientRect(),nav=document.querySelector('#tabbar').getBoundingClientRect();return r.top>=document.querySelector('.topbar').getBoundingClientRect().bottom&&r.bottom<=Math.min(innerHeight,nav.top)&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}")
   check(f'{width}px {theme} Create clears the fixed bottom navigation',visible_create())
   setup.locator('.sr-editor [type=submit]').tap()
   check(f'{width}px {theme} racer validation is beside the visible Create button',setup.locator('.sr-form-error').is_visible() and visible_create())
   for racer in ['1','2','5']:setup.locator(f'[name=racer][value="{racer}"]').check()
   check(f'{width}px {theme} valid racer selection clears the old validation message',not setup.locator('.sr-form-error').is_visible())
   setup.locator('.sr-editor-body').evaluate('e=>e.scrollTop=e.scrollHeight')
   check(f'{width}px {theme} scrolling racers keeps Create on screen',visible_create())
   if width==390:setup.screenshot(path=str(out/f'create-{theme}-390.png'))
   create_error={'code':'NETWORK','message':'Connection lost. Try again.'};before_creates=len(commands);pending_states=[]
   def creating(route):
    pending_states.append(setup.locator('.sr-editor').evaluate("e=>e.getAttribute('aria-busy')==='true'&&e.querySelector('[type=submit]').disabled&&e.querySelector('[type=submit]').textContent==='Creating…'"))
    setup.locator('.sr-editor').evaluate('e=>e.requestSubmit()')
    route.continue_()
   setup.route('**/qa/arena_stadium_command',creating)
   setup.locator('.sr-editor [type=submit]').tap();setup.wait_for_function("document.querySelector('.sr-form-error')?.textContent==='Connection lost. Try again.'")
   check(f'{width}px {theme} failed create keeps selection and supports retry',setup.locator('[name=racer]:checked').count()==3 and setup.locator('.sr-form-error').is_visible() and setup.locator('[type=submit]').inner_text()=='Create race' and visible_create())
   setup.locator('[type=submit]').tap();setup.wait_for_function("location.hash==='#/arena?id=999'")
   check(f'{width}px {theme} create is submitted once per tap with visible progress',len(commands)==before_creates+2 and len(pending_states)==2 and all(pending_states))
   check(f'{width}px {theme} create sends exactly the selected racers',commands[-1]['p_action']=='create' and commands[-1]['p_revision']==0 and commands[-1]['p_member_ids']==[1,2,5])
   setup.evaluate('qaRefresh()');setup.wait_for_selector('.sr-room')
   check(f'{width}px {theme} created race opens the selected starting grid',setup.locator('.sr-position').count()==3 and setup.locator('[data-name]').text_content()=='DFL Stadium Dash')
   create_context.close()
 html=saved_html;stub=saved_stub;event.clear();event.update(saved_event);participants[:]=saved_participants;results=[];removed=False;elapsed=0;freeze=False;started=time.time();commands.clear();presence.clear();broadcasts.clear()
 c,admin=context('commissioner');d,watch=context()
 check('commissioner opens with accessible controls instead of forced fullscreen',not admin.evaluate('qaStartedExpanded') and admin.locator('[data-edit]').is_visible())
 admin.locator('[data-expand]').click();admin.wait_for_function('document.fullscreenElement===document.querySelector(".sr-stage")||document.querySelector(".sr-stage").classList.contains("sr-expanded")')
 check('fullscreen shows everyone without close-up controls',admin.locator('[data-racer-highlight]').is_visible() and admin.locator('[data-camera],[data-follow-select]').count()==0)
 print('FULLSCREEN LAYOUT',admin.evaluate("()=>({h:innerHeight,native:!!document.fullscreenElement,rows:[...document.querySelectorAll('.sr-stage,.sr-watch-toolbar,.sr-watch-surface,canvas,.sr-moment,.sr-controls')].map(e=>({c:e.className,h:e.getBoundingClientRect().height,css:getComputedStyle(e).height,flex:getComputedStyle(e).flex}))})"),flush=True)
 admin.screenshot(path=str(out/'fullscreen-layout.png'))
 check('compact fullscreen toolbar gives most height to the race',admin.locator('.sr-watch-surface canvas').evaluate('e=>e.getBoundingClientRect().height>=innerHeight*.55'))
 check('stadium heading uses at most 44px',admin.locator('.sr-stage').evaluate('e=>parseFloat(e.style.getPropertyValue("--sr-field-top"))<=44'))
 for mode in ['dark','light']:
  admin.evaluate('m=>qaTheme(m)',mode);admin.screenshot(path=str(out/('fullscreen-'+mode+'.png')))
 admin.locator('[data-expand]').click();admin.wait_for_function('!document.fullscreenElement&&!document.querySelector(".sr-stage").classList.contains("sr-expanded")')

 admin.set_viewport_size({'width':390,'height':844});admin.wait_for_function('document.querySelector(".sr-stage").dataset.portrait==="true"')
 check('portrait shows a wide race with accessible controls',admin.locator('.sr-watch-surface canvas').is_visible() and admin.locator('[data-edit]').is_enabled() and not admin.locator('.sr-orientation-gate').count())
 admin.locator('[data-edit]').click();admin.wait_for_selector('.sr-editor input[name=name]');admin.locator('[name=name]').fill('Portrait edit draft');check('commissioner can edit in portrait',admin.locator('[name=name]').input_value()=='Portrait edit draft');admin.wait_for_timeout(700);admin.screenshot(path=str(out/'commissioner-portrait-editor.png'));
 for mode in ['light','dark']:
  admin.evaluate('window.qaTheme',mode);admin.wait_for_timeout(100);admin.screenshot(path=str(out/f'commissioner-{mode}-editor.png'));check(mode+' commissioner form follows the app palette',admin.locator('.sr-editor').evaluate('e=>{const probe=document.createElement("i");probe.style.backgroundColor="var(--bg-2)";e.append(probe);const same=getComputedStyle(e).backgroundColor===getComputedStyle(probe).backgroundColor;probe.remove();return same&&e.scrollWidth<=e.clientWidth&&parseFloat(getComputedStyle(e.querySelector("input")).fontSize)>=16}'))
 check('preset duration keeps custom seconds out of the way',not admin.locator('.sr-custom-duration').evaluate('e=>e.open'))
 admin.locator('.sr-custom-duration summary').click();admin.locator('[name=duration]').fill('75');check('custom duration clears preset selection',admin.locator('[data-duration][aria-pressed=true]').count()==0);admin.locator('[data-duration="60"]').click()
 check('save action has a separate surface below scrolling race fields',admin.locator('.sr-editor').evaluate('e=>e.querySelector(".sr-editor-body").getBoundingClientRect().bottom<=e.querySelector(".sr-editor-save").getBoundingClientRect().top'))
 admin.locator('[data-cancel]').click()
 admin.set_viewport_size({'width':844,'height':390});admin.wait_for_function('document.querySelector(".sr-stage").dataset.portrait==="false"')
 admin.evaluate("()=>{document.querySelector('.sr-stage').requestFullscreen=undefined}");admin.locator('[data-expand]').click()
 check('expanded stage contains commissioner controls',admin.locator('.sr-stage [data-edit]').is_visible() and admin.locator('.sr-stage [data-command=start]').is_visible())
 admin.locator('[data-edit]').click();check('edit exits watch mode and opens the race editor',not admin.locator('.sr-stage').evaluate('e=>e.classList.contains("sr-expanded")') and admin.locator('[name=name]').is_visible());admin.locator('[data-cancel]').click();admin.evaluate("()=>{delete document.querySelector('.sr-stage').requestFullscreen}")

 check('landscape keeps every racer number legible in screen pixels',admin.evaluate('window.qaBadges?.length===12&&qaBadges.every(b=>b.font>=11)&&new Set(qaBadges.map(b=>b.number)).size===12'))
 check('landscape numbered roster matches all twelve race badges',admin.locator('[data-watch-racer] b').all_text_contents()==[str(i+1) for i in range(12)])
 admin.locator('[data-watch-racer="12"]').click()
 check('number key highlights a racer without leaving the full field',admin.locator('[data-watch-racer="12"]').get_attribute('aria-pressed')=='true' and admin.locator('[data-racer-highlight]').input_value()=='12' and all_visible(admin,12))
 check('touch landscape opens immersive viewing',watch.evaluate('qaStartedExpanded'))
 watch.set_viewport_size({'width':390,'height':844});watch.wait_for_function('document.querySelector(".sr-stage").dataset.portrait==="true"')
 check('portrait watches inline without a rotate gate',watch.locator('.sr-watch-surface canvas').is_visible() and not watch.locator('.sr-orientation-gate').count() and not watch.evaluate('document.body.classList.contains("sr-stadium-expanded")'))
 check('portrait uses a wide race window with the number key underneath',watch.locator('.sr-watch-surface canvas').evaluate('e=>{const r=e.getBoundingClientRect(),key=document.querySelector(".sr-watch-roster").getBoundingClientRect();return r.width>r.height&&key.top>=r.bottom-1}') and watch.locator('[data-watch-racer]').count()==12)
 watch.screenshot(path=str(out/'portrait-theater-ready.png'))
 watch.evaluate("()=>{document.querySelector('.sr-stage').requestFullscreen=()=>Promise.reject(new Error('Unsupported fullscreen'))}");watch.locator('[data-expand]').click();watch.wait_for_function('document.querySelector(".sr-stage").classList.contains("sr-expanded")')
 check('unsupported fullscreen still opens portrait theater',watch.locator('.sr-watch-surface canvas').is_visible() and watch.locator('.sr-watch-surface canvas').evaluate('e=>{const r=e.getBoundingClientRect();return r.height>=184&&r.width>r.height}'))
 check('expanded portrait controls fit inside the viewport',watch.locator('.sr-stage').evaluate('e=>[...e.querySelectorAll("[data-expand],.sr-crowd-menu summary")].every(b=>{const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&r.height>=44})'))
 watch.screenshot(path=str(out/'portrait-theater-expanded.png'));watch.locator('[data-expand]').click()
 check('portrait fallback closes and restores scrolling',not watch.evaluate('document.body.classList.contains("sr-stadium-expanded")') and watch.locator('[data-expand]').evaluate('e=>e===document.activeElement'))
 watch.evaluate("""()=>{const stage=document.querySelector('.sr-stage');window.qaOrientationLocks=[];stage.requestFullscreen=async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:stage});document.dispatchEvent(new Event('fullscreenchange'))};screen.orientation.lock=async mode=>qaOrientationLocks.push(mode);document.exitFullscreen=async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});document.dispatchEvent(new Event('fullscreenchange'))}}""")
 watch.locator('[data-expand]').click();watch.wait_for_function('!!document.fullscreenElement')
 check('portrait fullscreen never forces an orientation lock',watch.evaluate('qaOrientationLocks.length===0') and watch.locator('.sr-watch-surface canvas').is_visible())
 watch.set_viewport_size({'width':844,'height':390});watch.wait_for_timeout(100);check('rotation keeps explicit fullscreen and camera controls',watch.evaluate('!!document.fullscreenElement') and watch.locator('[data-expand]').is_visible())
 watch.locator('[data-expand]').click();watch.wait_for_function('!document.fullscreenElement');watch.evaluate("()=>{delete document.fullscreenElement;delete document.exitFullscreen;delete document.querySelector('.sr-stage').requestFullscreen;delete screen.orientation.lock}")
 watch.evaluate('dispatchEvent(new Event("resize"))');check('fullscreen exit stays closed after resize',not watch.locator('.sr-stage').evaluate('e=>e.classList.contains("sr-expanded")'))
 admin.evaluate("""()=>{const stage=document.querySelector('.sr-stage');stage.requestFullscreen=()=>new Promise(resolve=>window.qaFinishFullscreen=()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:stage});document.dispatchEvent(new Event('fullscreenchange'));resolve()});document.exitFullscreen=async()=>{Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null});document.dispatchEvent(new Event('fullscreenchange'))}}""")
 admin.locator('[data-expand]').click();admin.wait_for_function('!!window.qaFinishFullscreen');admin.locator('[data-expand]').click();admin.evaluate('qaFinishFullscreen()');admin.wait_for_function('!document.fullscreenElement');check('closing cancels a late fullscreen request',not admin.locator('.sr-stage').evaluate('e=>e.classList.contains("sr-expanded")'));admin.evaluate("()=>{delete document.fullscreenElement;delete document.exitFullscreen;delete document.querySelector('.sr-stage').requestFullscreen}")
 check('spectator has no race controls',watch.locator('.sr-controls button').count()==0)
 check('all 12 racers visible in the board',watch.locator('.sr-position').count()==12)
 check('starting grid contains readiness without a duplicate roster',watch.locator('.sr-position [data-ready-racer]').count()==12 and watch.locator('.sr-ready-racers').count()==0)
 check('starting grid is reachable in the first phone scroll',watch.locator('.sr-staging').evaluate('e=>e.getBoundingClientRect().height<70'))
 admin.locator('[data-stadium-staging] [data-crowd-ready]').click()
 watch.wait_for_function('[...document.querySelectorAll("[data-ready-racer]")].find(e=>e.dataset.readyRacer==="1").dataset.ready==="true"')
 check('ready status reaches another viewer without affecting the draw',not event['race_manifest'] and len(commands)==0);check('ready status belongs to the same named grid racer',watch.locator('[data-highlight-racer="1"] [data-ready-racer="1"]').inner_text()=='Ready ✓')
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
 admin.locator('[data-my-racer]').click();admin.wait_for_selector('.sr-kit-dialog[open]');editor=admin.locator('.sr-kit-dialog');editor.locator('[data-kit-group="NFL"]').click();check('all 32 NFL teams available',editor.locator('[name=preset] option').count()==33);editor.locator('[name=preset]').select_option('nfl:BUF');editor.locator('[data-kit-skin]').last.click();editor.locator('[name=helmetStyle]').select_option('visor');editor.locator('[name=number]').fill('17');editor.locator('[data-kit-part="jersey"]').click();editor.locator('[data-kit-color="#ffb612"]').click();check('palette updates only selected uniform part',editor.locator('[name=jersey]').input_value()=='#ffb612' and editor.locator('[name=helmet]').input_value()=='#ffffff');editor.locator('[data-kit-part="pants"]').click();editor.locator('[name=uniformColor]').evaluate("e=>{e.value='#26303b';e.dispatchEvent(new Event('input',{bubbles:true}))}");check('custom color applies to selected pants',editor.locator('[name=pants]').input_value()=='#26303b' and editor.locator('[name=jersey]').input_value()=='#ffb612');check('custom color control has active part label',editor.locator('[data-kit-custom-label]').inner_text()=='Custom pants color');check('sticky editor surfaces follow the app theme',editor.locator('header,footer').evaluate_all("es=>es.every(e=>{const probe=document.createElement('i');probe.style.backgroundColor='var(--bg-2)';e.append(probe);const same=getComputedStyle(e).backgroundColor===getComputedStyle(probe).backgroundColor;probe.remove();return same})"));admin.wait_for_timeout(500);admin.screenshot(path=str(out/'racer-nfl.png'));editor.locator('[type=submit]').click();admin.wait_for_function('!document.querySelector(".sr-kit-dialog")');check('kit saves to selected member',kits[1]['kit']['preset']=='nfl:BUF' and kits[1]['kit']['number']==17 and kits[1]['kit']['helmetStyle']=='visor');check('saved kit leaves the race draw unchanged',event['race_manifest'] is None)
 admin.locator('[data-my-racer]').click();admin.wait_for_selector('.sr-kit-dialog[open]');editor=admin.locator('.sr-kit-dialog');check('racer persists when editor reopens',editor.locator('[name=number]').input_value()=='17');editor.locator('[data-kit-group="Pokémon"]').click();editor.locator('[name=preset]').select_option('pokemon:pikachu');admin.wait_for_timeout(300);admin.screenshot(path=str(out/'racer-pokemon.png'));editor.locator('[data-kit-group="Anime"]').click();editor.locator('[name=preset]').select_option('anime:naruto');admin.wait_for_timeout(300);admin.screenshot(path=str(out/'racer-anime.png'));admin.keyboard.press('Escape');admin.wait_for_function('!document.querySelector(".sr-kit-dialog")');check('cancel keeps saved kit',kits[1]['kit']['preset']=='nfl:BUF')
 watch.locator('[data-my-racer]').click();watch.wait_for_selector('.sr-kit-dialog[open]');second=watch.locator('.sr-kit-dialog');second.locator('[data-kit-group="Pokémon"]').click();second.locator('[name=preset]').select_option('pokemon:pikachu');second.locator('[name=number]').fill('25');second.locator('[type=submit]').click();watch.wait_for_function('!document.querySelector(".sr-kit-dialog")');check('members save independent racers',kits[1]['kit']['preset']=='nfl:BUF' and kits[2]['kit']['preset']=='pokemon:pikachu');shared=watch.evaluate('async()=>{const {loadStadiumRace}=await import("/js/arena/stadium-data.js");return (await loadStadiumRace(999)).racer_kits}');check('spectators receive both saved looks',len(shared)==2)
 check('full field is always selected',admin.locator('.sr-stage').get_attribute('data-field-overview')=='true');admin.screenshot(path=str(out/'arena-full-field.png'));admin.locator('[data-highlight-racer="5"]').click();check('tap highlights a racer without a close-up',admin.locator('[data-highlight-racer="5"]').get_attribute('aria-pressed')=='true' and admin.locator('.sr-stage').get_attribute('data-field-overview')=='true')
 admin.wait_for_function("window.qaBodies?.[1]?.jersey==='25'")
 before_commands=len(commands);admin.locator('[data-racer-highlight]').select_option('2');admin.wait_for_function('document.querySelector("[data-highlight-name]").textContent==="Kirk Franklin"')
 check('watch selector connects fixed race number, name and standings',admin.locator('[data-highlight-number] .sr-jersey').inner_text()=='2' and admin.locator('[data-highlight-racer="2"]').get_attribute('aria-pressed')=='true' and admin.locator('[data-highlight-racer="2"] .sr-jersey').inner_text()=='2')
 check('changing highlighted racer never changes the draw or framing',len(commands)==before_commands and all_visible(admin,12));admin.locator('[data-racer-highlight]').select_option('1')
 admin.locator('[data-edit]').click();check('commissioner can choose racers',admin.locator('[name=racer]').count()==12)
 admin.locator('[data-all]').click();admin.locator('[type=submit]').click();check('requires at least two selected racers with a visible message beside Save',admin.locator('.sr-form-error').is_visible() and admin.locator('.sr-form-error').evaluate('e=>{const r=e.getBoundingClientRect(),save=e.closest(".sr-editor-save").getBoundingClientRect();return r.top>=save.top&&r.bottom<=save.bottom&&r.top>=0&&r.bottom<=innerHeight}'));admin.locator('[data-all]').click();admin.locator('[name=name]').fill('The Boys • Draft Order');admin.locator('[data-duration="90"]').click();admin.locator('[type=submit]').click();admin.wait_for_function('document.querySelector("[data-name]").textContent.includes("The Boys")')
 check('saved duration displayed',admin.locator('[data-duration-label]').inner_text()=='1:30');check('race editor closes',not admin.locator('.sr-editor-host').is_visible())
 admin.locator('[data-command=start]').click();admin.wait_for_selector('[data-command=pause]');watch.wait_for_function('document.querySelector("[data-state-label]").textContent==="Live"');check('both viewers receive shared start')
 admin.locator('[data-reset]').click();admin.locator('[data-cancel-reset]').click();check('cancel reset keeps the live draw',event['bc_state']=='running')
 before=len(commands);admin.locator('[data-reset]').click();admin.locator('[data-confirm]').click();admin.wait_for_selector('[data-command=start]');check('running reset is one maintenance command',len(commands)==before+1 and commands[-1]['p_action']=='reset');check('reset clears the draw and keeps racers',event['race_manifest'] is None and len(participants)==12)
 admin.locator('[data-command=start]').click();admin.wait_for_selector('[data-command=pause]')
 admin.wait_for_function('Number(document.querySelector(".sr-stage").dataset.count)>0');admin.set_viewport_size({'width':390,'height':844});admin.evaluate('scrollTo({top:0,behavior:"instant"})');admin.wait_for_timeout(120);admin.screenshot(path=str(out/'stadium-countdown.png'));check('live countdown has three stadium start lights',admin.locator('.sr-start-lights i').count()==3 and admin.locator('.sr-start-lights').is_visible());admin.set_viewport_size({'width':844,'height':390})
 admin.locator('[data-command=pause]').click();admin.wait_for_selector('[data-command=resume]');watch.wait_for_function('document.querySelector(".sr-stage").dataset.raceState==="paused"');positions=watch.locator('.sr-position').evaluate_all('es=>es.map(e=>({id:e.dataset.racerId,top:e.offsetTop}))');watch.wait_for_timeout(900);check('pause status stays outside the field',watch.locator('.sr-stage-overlay').is_hidden() and watch.locator('[data-moment-title]').inner_text()=='RACE PAUSED');check('paused positions do not advance',positions==watch.locator('.sr-position').evaluate_all('es=>es.map(e=>({id:e.dataset.racerId,top:e.offsetTop}))'))
 admin.locator('[data-command=resume]').click();admin.wait_for_selector('[data-command=pause]');set_elapsed(36000);admin.wait_for_timeout(2400)
 admin.evaluate('scrollTo({top:0,behavior:"instant"})');admin.wait_for_function('document.querySelector(".sr-stage").dataset.fieldOverview==="true"');admin.screenshot(path=str(out/'arena-full-field-racing.png'))
 set_elapsed(16300,True);watch.evaluate('qaRefresh()');watch.wait_for_function('document.querySelector(".sr-stage").dataset.raceState==="paused"');watch.wait_for_timeout(300)
 frozen=watch.locator('.sr-watch-surface canvas').evaluate('e=>e.toDataURL()');watch.wait_for_timeout(900);check('pause freezes the full-field race',watch.locator('.sr-watch-surface canvas').evaluate('e=>e.toDataURL()')==frozen)
 set_elapsed(16300);still_c,still=context(width=390,height=844,reduced='reduce');still.wait_for_timeout(200)
 check('reduced motion keeps the same full field',still.locator('.sr-stage').get_attribute('data-field-overview')=='true' and still.locator('[data-camera]').count()==0)
 still.evaluate('qaLeave()');still.wait_for_timeout(100);still_c.close()
 set_elapsed(36000);admin.evaluate('qaRefresh()');watch.evaluate('qaRefresh()');admin.wait_for_timeout(300)
 # Reordered live rows keep the keyboard user's current control focused.
 admin.locator('[data-highlight-racer="1"]').focus();focused_order=admin.locator('.sr-board').get_attribute('data-order')
 set_elapsed(42000);admin.wait_for_function('previous=>document.querySelector(".sr-board").dataset.order!==previous',arg=focused_order)
 check('live position changes preserve keyboard focus',admin.locator('[data-highlight-racer="1"]').evaluate('e=>e===document.activeElement'))
 set_elapsed(36000);admin.evaluate('qaRefresh()')
 # A live kit refresh must not put compact natural-flow rows back into grid order.
 kits[1]['kit']['number']=18;kits[1]['revision']+=1;kits[2]['kit']['number']=18;kits[2]['revision']+=1;admin.locator('.sr-stage').scroll_into_view_if_needed();admin.locator('[data-watch-racer="1"]').focus();admin.evaluate('window.qaKitFocus=document.activeElement')
 admin.wait_for_function("window.qaBodies?.[0]?.jersey==='18'&&window.qaBodies?.[1]?.jersey==='18'");admin.wait_for_timeout(150)
 check('duplicate custom jerseys still have twelve unique race numbers',admin.locator('[data-watch-racer] b').all_text_contents()==[str(i+1) for i in range(12)] and admin.evaluate('qaBadges.length===12&&new Set(qaBadges.map(b=>b.number)).size===12'))
 check('a saved uniform update preserves the focused number-key button',admin.evaluate('document.activeElement===window.qaKitFocus'))
 check('saved jersey changes never change the unique race number',admin.locator('[data-watch-racer="1"] b').inner_text()=='1' and admin.locator('[data-highlight-racer="1"] .sr-jersey').inner_text()=='1')
 check('live kit updates retain the current standings order',admin.locator('.sr-rank').evaluate_all('es=>es.map(e=>Number(e.textContent))')==list(range(1,13)))
 kits[1]['kit']['number']=17;kits[1]['revision']+=1;kits[2]['kit']['number']=25;kits[2]['revision']+=1
 admin.wait_for_function("window.qaBodies?.[0]?.jersey==='17'&&window.qaBodies?.[1]?.jersey==='25'")
 # Review live portrait layouts in both app themes, not just the lobby.
 for width in [320,390,768]:
  admin.set_viewport_size({'width':width,'height':1024 if width==768 else 844})
  for theme in ['light','dark']:
   admin.evaluate('m=>qaTheme(m)',theme)
   check(f'{width}px {theme} race status has readable text contrast',admin.locator('.sr-room-title .sr-state').evaluate(r"""e=>{const rgb=v=>(v.match(/[\d.]+/g)||[]).slice(0,3).map(Number),l=v=>rgb(v).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0),probe=document.createElement('i');probe.style.background='var(--bg)';e.append(probe);const a=l(getComputedStyle(e).color),b=l(getComputedStyle(probe).backgroundColor);probe.remove();return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5}"""))
   admin.evaluate('scrollTo({top:0,behavior:"instant"})');admin.wait_for_timeout(150);admin.screenshot(path=str(out/f'full-field-{width}-{theme}.png'))
   check(f'{width}px {theme} race uses a wide TV window without page overflow',admin.locator('.sr-watch-surface canvas').evaluate('e=>{const r=e.getBoundingClientRect();return r.height>=184&&r.width>r.height}') and admin.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   check(f'{width}px {theme} draws all 12 racers inside the field',all_visible(admin,12))
   size=admin.evaluate('Math.min(...qaBodies.map(r=>r.bottom-r.top))')
   check(f'{width}px {theme} all twelve on-field number badges stay legible',admin.evaluate('qaBadges.length===12&&qaBadges.every(b=>b.font>=11)'))
   check(f'{width}px {theme} every racer has a readable number key',admin.locator('[data-watch-racer]').count()==12 and admin.locator('.sr-watch-racer-number').evaluate_all('es=>es.every(e=>parseFloat(getComputedStyle(e).fontSize)>=13)'))
   report.setdefault('playerSizes',[]).append({'width':width,'theme':theme,'minimumInkHeight':size})
   check(f'{width}px {theme} has no close-up or split-screen controls',admin.locator('[data-camera],[data-follow-select],.sr-showdown,.sr-camera-identities').count()==0)
   admin.wait_for_timeout(450)
   check(f'{width}px {theme} compact standings keep full team names inside their rows',admin.locator('.sr-follow-row').evaluate_all('es=>es.every(e=>{const row=e.getBoundingClientRect(),name=e.querySelector(".sr-racer-name").getBoundingClientRect();return row.height>=44&&name.top>=row.top&&name.bottom<=row.bottom&&name.right<=row.right})') and admin.locator('.sr-board').evaluate('e=>e.getBoundingClientRect().height<12*76'))
   check(f'{width}px {theme} crowd button stays below the field',admin.locator('.sr-crowd-menu summary').evaluate('e=>e.getBoundingClientRect().top>=document.querySelector("canvas").getBoundingClientRect().bottom-1'))
 admin.locator('[data-expand]').click();admin.set_viewport_size({'width':844,'height':390});admin.wait_for_timeout(200)
 check('expanded live race shows every racer without a close-up panel',all_visible(admin,12) and admin.locator('[data-camera],.sr-showdown').count()==0)
 admin.screenshot(path=str(out/'full-field-expanded.png'));admin.locator('[data-expand]').click()
 portrait_c,portrait=context(width=390,height=844,keep_expanded=True)
 check('a direct watch link opens a live race in portrait',portrait.evaluate('qaStartedExpanded') and portrait.locator('.sr-watch-surface canvas').is_visible() and portrait.locator('[data-overlay]').inner_text()=='')
 check('portrait number key includes a larger matching racer portrait',portrait.locator('.sr-watch-racer-art').evaluate_all('es=>es.length===12&&es.every(e=>{const r=e.getBoundingClientRect();return r.width>=40&&r.height>=48&&e.getContext("2d").getImageData(0,0,e.width,e.height).data.some((v,i)=>i%4===3&&v>0)})'))
 before_commands=len(commands);portrait_clock=portrait.locator('[data-clock]').inner_text();portrait_pixels=portrait.locator('.sr-watch-surface canvas').evaluate('e=>e.toDataURL()');portrait.wait_for_timeout(1250)
 check('portrait clock and animated race continue without commissioner writes',portrait.locator('[data-clock]').inner_text()!=portrait_clock and portrait.locator('.sr-watch-surface canvas').evaluate('e=>e.toDataURL()')!=portrait_pixels and len(commands)==before_commands)
 portrait.set_viewport_size({'width':844,'height':390});portrait.wait_for_function('document.querySelector(".sr-stage").classList.contains("sr-expanded")');check('rotating a portrait spectator keeps the stadium expanded')
 portrait.set_viewport_size({'width':390,'height':844});portrait.wait_for_function('document.querySelector(".sr-stage").classList.contains("sr-expanded")');check('rotating back preserves the spacious portrait field',portrait.evaluate('document.body.classList.contains("sr-stadium-expanded")'));check('portrait theater keeps all twelve bodies and numbered identities visible',all_visible(portrait,12) and portrait.locator('[data-watch-racer]').evaluate_all('es=>es.length===12&&es.every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.height>=44})'));portrait.screenshot(path=str(out/'portrait-live-immersive.png'));portrait.locator('[data-expand]').click();portrait.set_viewport_size({'width':844,'height':390});portrait.wait_for_timeout(100);check('explicit portrait Close stays closed after rotation',not portrait.evaluate('document.body.classList.contains("sr-stadium-expanded")'))

 for review_width,review_height in [(320,700),(390,844),(768,1024),(844,390)]:
  portrait.set_viewport_size({'width':review_width,'height':review_height});portrait.wait_for_timeout(100)
  portrait.locator('[data-expand]').click();portrait.wait_for_function('document.querySelector(".sr-stage").classList.contains("sr-expanded")||!!document.fullscreenElement')
  check(f'{review_width}x{review_height} expanded number key fits every 44px target',portrait.locator('[data-watch-racer]').evaluate_all('es=>es.length===12&&es.every(e=>{const r=e.getBoundingClientRect(),name=e.querySelector(".sr-watch-racer-name").getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.width>=44&&r.height>=44&&name.left>=r.left&&name.right<=r.right&&name.bottom<=r.bottom})'))
  if review_width==320:check('compact portrait full names use at most two lines',portrait.locator('.sr-watch-racer-full').evaluate_all('es=>es.every(e=>e.getClientRects().length<=2)'))
  portrait.locator('[data-watch-racer="3"]').focus();before_focus=portrait.locator('[data-watch-racer="3"]').evaluate('e=>{window.qaFocusedWatchRacer=e;return e===document.activeElement}');portrait.evaluate('dispatchEvent(new Event("online"))');portrait.wait_for_timeout(450)
  check(f'{review_width}x{review_height} a live refresh preserves roster keyboard focus',before_focus and portrait.locator('[data-watch-racer="3"]').evaluate('e=>e===window.qaFocusedWatchRacer&&e===document.activeElement'))
  for theme in ['light','dark']:
   portrait.evaluate('window.qaTheme',theme);portrait.screenshot(path=str(out/f'number-key-{review_width}-{theme}.png'))
  portrait.locator('[data-expand]').click()
 portrait.evaluate('window.qaLeave()');portrait_c.close()
 admin.set_viewport_size({'width':844,'height':390})
 check('callout never covers the running field',admin.locator('.sr-stage').evaluate('e=>e.querySelector(".sr-moment").getBoundingClientRect().top>=e.querySelector("canvas").getBoundingClientRect().bottom-1'))
 check('rank order is live rather than future official order',watch.locator('.sr-position').evaluate_all('es=>es.map(e=>[e.dataset.racerId,e.querySelector(".sr-rank").textContent])')!=[[str(i+1),str(12-i)] for i in range(12)])
 admin.locator('[data-command=pause]').click();admin.wait_for_selector('[data-command=resume]');admin.locator('[data-edit]').click();check('racers locked during a paused draw',admin.locator('[name=racer]:disabled').count()==12);admin.locator('[data-duration="120"]').click();admin.locator('[type=submit]').click();admin.wait_for_function('document.querySelector("[data-duration-label]").textContent==="2:00"');check('paused duration edit works')
 admin.locator('[data-command=resume]').click();admin.wait_for_selector('[data-command=pause]');set_elapsed(111000);admin.wait_for_timeout(2300);admin.screenshot(path=str(out/'arena-390-final-sprint.png'))
 # New late joiners see current positions, not another countdown.
 late_c,late=context();check('late joiner catches the shared race',late.locator('[data-overlay]').inner_text()=='');check('late joiner sees same duration',late.locator('[data-duration-label]').inner_text()=='2:00')
 set_elapsed(120500);watch.wait_for_function('document.querySelector(".sr-final").hidden===false');check('official winner follows sealed draw',watch.locator('.sr-podium-place[data-place="1"] strong').inner_text()=='Jesse Peterson');check('entire finishing order shown',watch.locator('.sr-position').evaluate_all('es=>es.map(e=>[e.dataset.racerId,Number(e.querySelector(".sr-rank").textContent)]).sort((a,b)=>a[1]-b[1]).map(e=>e[0])')==[str(i) for i in range(12,0,-1)])
 check('expanded finish names the official winner and shows their saved runner',watch.locator('.sr-stage').get_attribute('data-official-winner')=='true' and watch.locator('[data-moment-name]').inner_text()=='Jesse Peterson' and watch.locator('.sr-winner-art').evaluate('e=>{const r=e.getBoundingClientRect(),pixels=e.getContext("2d").getImageData(0,0,e.width,e.height).data;return r.height>=44&&r.width<=64&&pixels.some((v,i)=>i%4===3&&v>0)}'))
 check('podium keeps the same race number as the field and roster',watch.locator('.sr-podium-place[data-place="1"] .sr-jersey').inner_text()=='12')
 watch.screenshot(path=str(out/'arena-390-finished.png'));before_podium=len(commands);watch.locator('[data-show-podium]').click();watch.wait_for_function('document.activeElement.matches(".sr-final")');check('podium action exits expanded viewing and focuses the official result',not watch.locator('.sr-stage').evaluate('e=>e.classList.contains("sr-expanded")') and watch.locator('.sr-podium-place').count()==3);check('podium action never changes a race',len(commands)==before_podium);check('spectator can replay',watch.locator('[data-replay]').is_visible());watch.locator('[data-replay]').click();watch.wait_for_function('document.querySelector("[data-overlay]").textContent==="3"');check('replay never writes race controls',commands[-1]['p_action']=='resume');check('replay hides the official winner reveal',watch.locator('.sr-winner-art').is_hidden() and watch.locator('.sr-stage').get_attribute('data-official-winner')=='false');watch.set_viewport_size({'width':390,'height':844});watch.wait_for_function('document.querySelector(".sr-stage").dataset.portrait==="true"');check('replay stays visible after rotating to portrait',watch.locator('.sr-watch-surface canvas').is_visible());watch.set_viewport_size({'width':844,'height':390})
 event['race_duration_ms']=60000;event['race_manifest']['story_duration_ms']=60000
 for result in results:result['finish_ms']=round(60000*(.975+.025*(result['place']-1)/(len(results)-1)))
 watch.evaluate('qaRefresh()');watch.wait_for_selector('[data-photo-finish]:not([hidden])');watch.locator('[data-photo-finish]').click()
 watch.wait_for_function('document.querySelector("[data-moment-title]").textContent.includes("0.25×")')
 check('goal-line replay is local and keeps official order',len(results)==12 and results[0]['member_id']==12)
 check('goal-line replay keeps every racer visible',all_visible(watch,12));watch.screenshot(path=str(out/'photo-finish-replay.png'))
 watch.locator('[data-stop-replay]').click();check('photo finish can return directly to the result',watch.locator('[data-stop-replay]').is_hidden())
 for width in [320,390,768]:
  admin.set_viewport_size({'width':width,'height':844});admin.wait_for_timeout(400);check(f'{width}px finished race stays visible in the tall portrait field',admin.locator('.sr-watch-surface canvas').is_visible() and admin.locator('.sr-watch-surface canvas').evaluate('e=>{const r=e.getBoundingClientRect();return r.height>=184&&r.width>r.height}'));check(f'{width}px has no horizontal overflow',admin.evaluate('document.documentElement.scrollWidth<=innerWidth'));admin.screenshot(path=str(out/f'arena-{width}-final.png'))
  admin.evaluate('async()=>{location.hash="#/arena";await qaRefresh()}');check(f'{width}px lobby remains usable in portrait',not admin.locator('.sr-orientation-gate').count());admin.locator('[data-my-racer]').click();admin.wait_for_selector('.sr-kit-dialog[open]');check(f'{width}px editor has no overflow',admin.locator('.sr-kit-dialog').evaluate('e=>e.scrollWidth<=e.clientWidth+1'));admin.locator('.sr-kit-dialog').evaluate('e=>e.scrollTop=e.scrollHeight');admin.wait_for_function('''()=>{const e=document.querySelector('.sr-kit-mini');if(!e)return false;const p=e.getBoundingClientRect(),h=e.closest('form').querySelector('header').getBoundingClientRect();return getComputedStyle(e).opacity!=='0'&&p.top>=h.top&&p.bottom<=h.bottom+1}''',timeout=2000);check(f'{width}px compact header preview stays visible',admin.locator('.sr-kit-mini').evaluate('e=>{const p=e.getBoundingClientRect(),h=e.closest("form").querySelector("header").getBoundingClientRect();return getComputedStyle(e).opacity!=="0"&&p.top>=h.top&&p.bottom<=h.bottom+1}'));admin.screenshot(path=str(out/f'racer-{width}-scrolled.png'))
  for gear_theme in ['light','dark']:
   admin.evaluate('m=>qaTheme(m)',gear_theme);admin.wait_for_timeout(150)
   check(f'{width}px {gear_theme} gear header follows the app surface',admin.locator('.sr-kit-panel header').evaluate('e=>{const p=document.createElement("i");p.style.background="var(--bg-2)";e.append(p);const same=getComputedStyle(e).backgroundColor===getComputedStyle(p).backgroundColor;p.remove();return same}'))
   check(f'{width}px {gear_theme} large preview never covers phone form controls',admin.locator('.sr-kit-preview').evaluate('e=>getComputedStyle(e).position!=="sticky"'))
   admin.screenshot(path=str(out/f'gear-{width}-{gear_theme}.png'))
  admin.keyboard.press('Escape');admin.wait_for_function('!document.querySelector(".sr-kit-dialog")');check(f'{width}px editor restores focus',admin.locator('[data-my-racer]').evaluate('e=>e===document.activeElement'));admin.evaluate('async()=>{location.hash="#/arena?id=999";await qaRefresh()}')
 admin.set_viewport_size({'width':844,'height':390});admin.wait_for_timeout(200);check('landscape has no overflow',admin.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 if admin.locator('.sr-stage').evaluate("e=>e.classList.contains('sr-expanded')"):admin.locator('[data-expand]').click()
 reduced_c,reduced=context(reduced='reduce');check('reduced motion respected',reduced.locator('.sr-room').get_attribute('data-motion')=='off');reduced.locator('[data-my-racer]').click();reduced.wait_for_selector('.sr-kit-dialog[open]');check('uniform preview updates immediately with reduced motion',reduced.evaluate("""()=>{const d=document.querySelector('.sr-kit-dialog'),c=d.querySelector('.sr-kit-preview canvas'),sum=()=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.reduce((a,v,i)=>a+(i%4===3?0:v),0);d.querySelector('[data-kit-part=jersey]').click();d.querySelector('[data-kit-color="#bb2038"]').click();const red=sum();d.querySelector('[data-kit-color="#ffffff"]').click();return sum()>red&&d.querySelector('[name=jersey]').value==='#ffffff'}"""));reduced.keyboard.press('Escape');reduced.wait_for_function('!document.querySelector(".sr-kit-dialog")');admin.locator('button[data-motion]').click();check('motion toggle stored',admin.evaluate("localStorage.getItem('dfl.reduceRaceMotion')==='1'"))
 admin.set_viewport_size({'width':390,'height':844});admin.evaluate('async()=>{location.hash="#/arena";await qaRefresh()}');watch.evaluate('async()=>{location.hash="#/arena";await qaRefresh()}');check('spectators cannot remove past races',watch.locator('[data-remove-race]').count()==0)
 denied=watch.evaluate('async()=>{const {db}=await import("/js/supabase.js");return (await db().rpc("arena_stadium_command",{p_event_id:999,p_action:"remove",p_revision:'+str(event['race_revision'])+'})).error?.code}')
 check('unauthorized deletion is rejected by server fixture',denied=='42501')
 admin.locator('[data-remove-race]').click();admin.locator('[data-cancel-remove]').click();check('cancel removal keeps official results',not removed and len(results)==12)
 admin.locator('[data-remove-race]').click();event['race_revision']+=1;admin.locator('[data-confirm-remove]').click();admin.wait_for_selector('.sr-remove-confirm [role=alert]:not([hidden])');check('stale removal keeps the past race',not removed)
 admin.evaluate('async()=>{await qaRefresh()}')
 for mode in ['dark','light']:
  admin.evaluate('m=>qaTheme(m)',mode);admin.locator('[data-remove-race]').click()
  check(mode+' past-race title has readable contrast',admin.locator('.sr-history-row .sr-event').evaluate(r'''e=>{const rgb=v=>(v.match(/[\d.]+/g)||[]).slice(0,3).map(Number),l=v=>rgb(v).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0),s=getComputedStyle(e),a=l(s.color),b=l(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5}'''))
  admin.screenshot(path=str(out/('past-race-'+mode+'.png')));admin.locator('[data-cancel-remove]').click()
 admin.locator('[data-remove-race]').click();admin.locator('[data-confirm-remove]').click();admin.wait_for_function('!document.querySelector(".sr-history-row")');check('commissioner removes a past race from the lobby',removed);check('removing a race keeps shared racer kits',len(kits)==2)
 late.evaluate('window.dispatchEvent(new Event("online"))');late.wait_for_function('document.querySelector("#view").textContent.includes("Race removed.")');check('open viewers leave a removed race cleanly')
 admin.evaluate('window.qaLeave()');watch.evaluate('window.qaLeave()');check('leaving releases viewing and portrait scroll locks',not admin.locator('.sr-orientation-gate').count() and not watch.locator('.sr-orientation-gate').count() and not watch.evaluate('document.body.classList.contains("sr-landscape-required")'));check('subscriptions cleaned up',admin.evaluate('window.qaUnsubscribed')>=1 and watch.evaluate('window.qaUnsubscribed')>=1)
 # Stress the two edge lanes and wide desktop viewing with real renderer calls.
 late.evaluate('qaLeave()');reduced.evaluate('qaLeave()');removed=False
 for size in [2,32]:
  members[:]=[{'id':i+1,'display_name':('Cody Grant' if i==0 else f'Long Racer Name {i+1}'),'team_name':'The Bayou Bombers','active':True,'profile_image':'','accent_color':''} for i in range(size)]
  participants[:]=[{'member_id':m['id'],'sort_order':i,'number':i+1} for i,m in enumerate(members)]
  event['race_manifest']=None;event['race_duration_ms']=90000;results=[];set_elapsed(36000,True)
  for width in [320,390,1440]:
   frame_c,framed=context(role='commissioner',width=width,height=900 if width==1440 else 844)
   for racer in ['1',str(size)]:
    framed.locator(f'[data-highlight-racer="{racer}"]').click();framed.wait_for_timeout(100)
    check(f'{size} racers {width}px can highlight racer {racer}',framed.locator(f'[data-highlight-racer="{racer}"]').get_attribute('aria-pressed')=='true')
    check(f'{size} racers {width}px highlighting keeps everyone visible',all_visible(framed,size))
   for elapsed_ms in [500,45000,89900]:
    set_elapsed(elapsed_ms,True);framed.evaluate('qaRefresh()');framed.wait_for_timeout(100)
    check(f'{size} racers {width}px all racers visible at {elapsed_ms}ms',all_visible(framed,size))
   for theme in ['dark','light']:
    framed.evaluate('m=>qaTheme(m)',theme);framed.evaluate('scrollTo({top:0,behavior:"instant"})');framed.screenshot(path=str(out/f'edge-{size}-{width}-{theme}.png'))
   framed.evaluate('qaLeave()');framed.wait_for_timeout(100);frame_c.close()
 check('no browser errors',not report['errors']);browser.close()
server.shutdown()
