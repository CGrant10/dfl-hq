"""Actual replay and trade controllers, isolated data and local video only."""
import json,os,threading
from datetime import datetime,timezone
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_CONNECTED_REVIEW_DIR','/tmp/dfl-connected-1502'));OUT.mkdir(parents=True,exist_ok=True)
TRADE=Path(os.environ.get('DFL_TRADE_REVIEW_DIR',ROOT.parent/'dfl-trade-review'))
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'</head><body><main id="view" class="view" data-route="home"><h1>DFL Daily</h1><div id="reel" data-home-highlights-slot></div></main><nav class="bottomnav" style="height:54px">DFL HQ</nav></body></html>'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  name=self.path.split('?')[0];code=None
  if name=='/connected-review.html':code=html
  if name=='/js/supabase.js':code="export const db=()=>{throw Error('Review database calls blocked')};export const configured=()=>false;export const edge=()=>{throw Error('Review writes blocked')};export const privilegedFunctionHeaders=()=>({});"
  if name=='/js/members.js':code="export const currentMember=()=>null;export const getMemberId=()=>null;export const loadMemberDirectory=async()=>[];"
  if code is not None:
   self.send_response(200);self.send_header('Content-Type','text/html' if name.endswith('.html') else 'text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
 def translate_path(self,path):
  name=path.split('?')[0];return str(TRADE/name.removeprefix('/trade-review/')) if name.startswith('/trade-review/') else str(ROOT/name.lstrip('/'))
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}';checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390,768]:
  for theme in ['light','dark']:
   c=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block')
   def route(r):
    if r.request.url.startswith(base):return r.continue_()
    if r.request.url.endswith('.mp4'):return r.fulfill(content_type='video/mp4',body=(ROOT/'tools/fixtures/highlight-playback.mp4').read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
    if r.request.resource_type=='image':return r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())
    return r.abort()
   c.route('**/*',route);pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.clock.install(time=datetime(2026,10,28,15,tzinfo=timezone.utc));pg.goto(base+'/connected-review.html#/home',wait_until='domcontentloaded')
   pg.evaluate('''async theme=>{
    (await import('/js/theme.js')).pinMode(theme);
    const rows=await(await fetch('/tools/fixtures/home-highlight-clips.json')).json();
    const f=window.f={rows,active:true};
    f.c=(await import('/js/home-highlights.js')).mountHomeHighlights(document.getElementById('reel'),{active:()=>f.active,load:async()=>f.rows,now:()=>Date.parse('2026-10-28T15:00:00Z')});
   }''',theme)
   tag=f'{width}px {theme}';pg.wait_for_selector('[data-home-reel-open]');pg.locator('[data-home-reel-open]').click();pg.wait_for_function('document.querySelector(".home-reel-player video")?.currentTime>.1');pg.evaluate('f.video=document.querySelector("video");f.video.pause()')
   pg.locator('[data-reel-minimize]').click();pg.wait_for_function('!document.querySelector(".home-reel-player").open')
   check(tag+' minimizes the same paused video without forcing autoplay',pg.evaluate('document.querySelector(".replay-dock video")===f.video&&f.video.paused'))
   check(tag+' dock clears the bottom navigation and stays in bounds',pg.locator('.replay-dock').evaluate('e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.bottom<innerHeight-60}'))
   pg.screenshot(path=str(OUT/f'{width}-{theme}-dock.png'))
   pg.locator('[data-dock-expand]').click();pg.wait_for_selector('.home-reel-player[open]')
   check(tag+' expands into the original studio without replacing its video',pg.evaluate('document.querySelector(".home-reel-player video")===f.video&&f.video.paused&&!document.querySelector(".replay-dock")'))
   pg.evaluate('f.video.muted=true;f.video.play()');pg.locator('[data-reel-minimize]').click();pg.wait_for_function('!document.querySelector(".home-reel-player").open');pg.locator('[data-dock-close]').click()
   pg.locator('[data-home-reel-open]').click();pg.wait_for_function('document.querySelector(".home-reel-player video")?.currentTime>.1')
   check(tag+' closing the dock leaves the original reel safe to reopen',pg.locator('.home-reel-player[open] video').count()==1)
   pg.evaluate('f.video=document.querySelector(".home-reel-player video");f.time=f.video.currentTime;f.src=f.video.src');pg.locator('[data-reel-minimize]').click();pg.wait_for_function('!document.querySelector(".home-reel-player").open')
   pg.evaluate('''()=>{f.active=false;location.hash='#/trade';f.c.stop();document.getElementById('view').innerHTML='<h1>Trade Board</h1><button>Find offers</button>'}''')
   check(tag+' route teardown keeps the dock and its original playback source',pg.evaluate('document.querySelector(".replay-dock video")===f.video&&f.video.src===f.src&&f.video.currentTime>=f.time'))
   pg.locator('[data-dock-expand]').click();pg.wait_for_selector('.replay-dock-expanded[open]')
   check(tag+' a departed page expands into an independent accessible viewer',pg.evaluate('document.querySelector(".replay-dock-expanded video")===f.video&&document.querySelector(".replay-dock-expanded").contains(document.activeElement)'))
   pg.wait_for_timeout(300);pg.screenshot(path=str(OUT/f'{width}-{theme}-expanded.png'))
   pg.keyboard.press('Escape');pg.wait_for_function('!document.querySelector(".replay-dock-expanded").open');check(tag+' Escape returns to the dock without stopping the video',pg.evaluate('document.querySelector(".replay-dock video")===f.video'))
   pg.emulate_media(reduced_motion='reduce');pg.locator('[data-dock-expand]').click();pg.locator('[data-dock-minimize]').click();check(tag+' reduced motion does not leave running decoration',pg.locator('.replay-dock').evaluate('e=>e.getAnimations().length===0'))
   pg.locator('[data-dock-close]').click();check(tag+' closing after navigation releases media and removes both surfaces',pg.locator('.replay-dock,.replay-dock-expanded').count()==0 and pg.evaluate('!f.video.hasAttribute("src")'))
   pg.evaluate('''async()=>{
    const root=document.getElementById('view');root.innerHTML='<div id="clubhouse-panel-recap"><div data-personal-postgame></div></div>';
    const p=(id,name,position,points,slotType=position)=>({id,name,position,points,slotType});
    f.model={leagueId:'fixture',season:2026,week:7,completed:true,games:[{id:'1',sides:[{roster:'1',memberId:12,name:'Bastards of the Realm',score:126.34,lineup:[p('wr','Amon-Ra St. Brown','WR',28.2),p('rb','Bijan Robinson','RB',18.4),p('te','Juwan Johnson','TE',4,'FLEX')],bench:[p('bench','Chris Olave','WR',25.1)]},{roster:'2',memberId:13,name:'The Bayou Bombers',score:123.10,lineup:[],bench:[]}]}]};
    f.recap=(await import('/js/personal-postgame.js')).mountPersonalPostgame(root,{getModel:()=>f.model,member:()=>12,loadMoments:async()=>({items:[]}),loadClips:async()=>[]});scrollTo(0,0);
   }''')
   pg.wait_for_selector('.personal-postgame');check(tag+' personal final uses actual scores and a legal bench comparison',pg.locator('.postgame-score').inner_text().find('126.34')>=0 and '+21.10' in pg.locator('.personal-postgame').inner_text())
   check(tag+' no unsupported video or turning point appears',pg.locator('.postgame-play,.postgame-swing').count()==0)
   check(tag+' recap fits without horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   pg.screenshot(path=str(OUT/f'{width}-{theme}-postgame.png'));pg.evaluate('f.recap.stop()')
   pg.goto(base+'/trade-review/index.html#/trade');pg.wait_for_function('window.reviewReady===true');pg.evaluate('''async theme=>{(await import('/js/theme.js')).pinMode(theme)}''',theme)
   pg.evaluate("history.replaceState({dflRouteVisit:{id:'trade-visit',index:0}},'');reviewLeave();renderReview()");pg.wait_for_selector('.tb-offer');pg.wait_for_function('document.querySelector(".tb-intent-options [data-tb-intent-count]").textContent!=="(…)"')
   first=pg.locator('.tb-offer').first;key=first.get_attribute('data-offer-key');pg.evaluate('(key)=>window.passedKey=key',key);first.locator('[data-tb-pass]').click()
   check(tag+' Pass removes that exact package from this search',pg.locator('.tb-offer').evaluate_all('es=>es.every(e=>e.dataset.offerKey!==window.passedKey)'))
   pg.locator('[data-tb-undo-pass]').click();check(tag+' Undo restores the exact package',pg.locator('.tb-offer').evaluate_all('es=>es.some(e=>e.dataset.offerKey===window.passedKey)'))
   pg.locator('.tb-offer [data-tb-save]').first.click();check(tag+' saves without opening a giant trade ticket',pg.locator('[data-td-load-proposal]').count()==1 and pg.locator('.td-custom').evaluate('e=>!e.open'))
   first=pg.locator('.tb-offer:not(.tb-multi-offer)').first;first.locator('.tb-offer-pin summary').click();pin=first.locator('[data-tb-pin]').last;pid=pin.get_attribute('data-tb-pin');side=pin.get_attribute('data-pin-side');pg.evaluate('([id,side])=>{window.pinnedId=id;window.pinSide=side}',[pid,side]);pin.click();pg.wait_for_function('document.querySelector(".tb-offers-card")?.getAttribute("aria-busy")==="false"')
   check(tag+' build-around retains the chosen player on the correct side',pg.locator('.tb-offer [data-td-load-offer]').evaluate_all('es=>es.every(e=>(e.dataset[window.pinSide==="send"?"sendA":"sendB"]||"").split(",").includes(window.pinnedId))'))
   pg.locator('[data-tb-intent="aggressive"]').click();pg.wait_for_function('document.querySelector(".tb-offers-card")?.getAttribute("aria-busy")==="false"');pg.evaluate('scrollTo(0,0)')
   pg.locator('.tb-offer').first.scroll_into_view_if_needed();pg.wait_for_timeout(200);pg.screenshot(path=str(OUT/f'{width}-{theme}-offers.png'))
   targets=pg.locator('.tb-offer button:visible,.tb-offer-pin summary:visible').evaluate_all('es=>es.map(e=>({text:e.textContent,height:e.getBoundingClientRect().height,min:getComputedStyle(e).minHeight}))');(OUT/f'{width}-{theme}-targets.json').write_text(json.dumps(targets,indent=2))
   check(tag+' all new trade controls retain 44px phone targets',pg.locator('.tb-offer button:visible,.tb-offer-pin summary:visible').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44)'))
   check(tag+' new offer controls fit the screen',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   if width==390 and theme=='dark':
    pg.evaluate("reviewLeave();location.hash='#/home'");pg.wait_for_function("location.hash==='#/home'");pg.go_back();pg.wait_for_function("location.hash==='#/trade'")
    pg.evaluate("document.getElementById('view').dataset.routeReturning='true';renderReview()");pg.wait_for_selector('.tb-offer');pg.wait_for_function('document.querySelector(".tb-offers-card")?.getAttribute("aria-busy")==="false"')
    check('Back restores the exact trade tier and pinned player',pg.locator('[data-tb-intent="aggressive"]').get_attribute('aria-pressed')=='true' and pg.locator('.tb-offer [data-td-load-offer]').evaluate_all('es=>es.length>0&&es.every(e=>(e.dataset[window.pinSide==="send"?"sendA":"sendB"]||"").split(",").includes(window.pinnedId))'))
    pg.evaluate("reviewLeave();document.getElementById('view').dataset.routeReturning='false';renderReview()")
    check('a fresh Trade visit still defaults to all league teams',pg.locator('[data-ta-shop-partner]').input_value()=='all' and pg.locator('[data-tb-intent="fair"]').get_attribute('aria-pressed')=='true')
   check(tag+' no uncaught errors or database mutations',not errors);c.close()
 browser.close()
server.shutdown()
