"""Delayed content and live broadcast reading, with isolated local fixtures."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_READING_REVIEW_DIR',ROOT.parent/'dfl-reading-review'));OUT.mkdir(parents=True,exist_ok=True)
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'</head><body><main id="view" class="view" data-route="home"><div id="home-wrap" data-home-layout="wire"></div></main></body></html>'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  path=self.path.split('?',1)[0];code=None
  if path=='/js/supabase.js':code="export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};"
  if path=='/js/members.js':code="export const currentMember=()=>null;export const getMemberId=()=>null;"
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
checks=[]
def check(name,value):
 checks.append({'check':name,'pass':bool(value)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert value,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
  for mode in ['light','dark']:
   context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block')
   def route(r):
    if '/stable-review.html' in r.request.url:return r.fulfill(content_type='text/html',body=html)
    if r.request.url.startswith(base):return r.continue_()
    return r.abort()
   context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(base+'/stable-review.html',wait_until='domcontentloaded')
   page.evaluate('''async mode=>{
    (await import('/js/theme.js')).pinMode(mode);
    window.stable=await import('/js/stable-content.js');window.patch=(await import('/js/game-day-dom.js')).patchGameDay;
    window.fixture=()=>{document.querySelector('#home-wrap').innerHTML='<div style="height:180px"></div><section id="late" style="height:200px"></section><section id="reading" style="height:1800px"><h2>Your week</h2><button id="reading-button">Keep reading</button></section>';scrollTo(0,650)};
   }''',mode)
   tag=f'{width}px {mode}'
   for native in ['auto','none']:
    page.evaluate('(native)=>{document.body.style.overflowAnchor=native;fixture()}',native);page.wait_for_timeout(50)
    before=page.locator('#reading').evaluate('e=>e.getBoundingClientRect().top')
    page.evaluate("stable.updateStableContent(document.querySelector('#late'),()=>document.querySelector('#late').style.height='500px')");page.wait_for_timeout(80)
    check(tag+' late growth keeps reading position with anchoring '+native,abs(page.locator('#reading').evaluate('e=>e.getBoundingClientRect().top')-before)<1)
    page.evaluate("stable.updateStableContent(document.querySelector('#late'),()=>document.querySelector('#late').style.height='80px')");page.wait_for_timeout(80)
    check(tag+' late shrink keeps reading position with anchoring '+native,abs(page.locator('#reading').evaluate('e=>e.getBoundingClientRect().top')-before)<1)
   page.evaluate("fixture();document.querySelector('#late').style.height='auto';document.querySelector('#late').innerHTML='<p style=\"height:200px;margin:40px 0\">Pending</p>';scrollTo(0,750)");page.wait_for_timeout(50)
   before=page.locator('#reading').evaluate('e=>e.getBoundingClientRect().top')
   page.evaluate("stable.replaceStableContent(document.querySelector('#late'),'<p style=\"height:420px;margin:80px 0\">Ready</p>')");page.wait_for_timeout(80)
   check(tag+' collapsed child margins keep the same reading position',abs(page.locator('#reading').evaluate('e=>e.getBoundingClientRect().top')-before)<1)
   page.evaluate("fixture();scrollTo(0,0);window.wasY=scrollY;stable.updateStableContent(document.querySelector('#late'),()=>document.querySelector('#late').style.height='420px')")
   check(tag+' content still in view does not cause a manual scroll',page.evaluate('scrollY===wasY'))
   page.evaluate("fixture();document.querySelector('#late').style.height='auto';patch(document.querySelector('#late'),'<p style=\"height:200px\">Earlier score</p>');scrollTo(0,650)");page.wait_for_timeout(50)
   before=page.locator('#reading').evaluate('e=>e.getBoundingClientRect().top')
   page.evaluate("patch(document.querySelector('#late'),'<p style=\"height:480px\">Updated score</p>')");page.wait_for_timeout(80)
   check(tag+' live DOM patches preserve offscreen reading',abs(page.locator('#reading').evaluate('e=>e.getBoundingClientRect().top')-before)<1)
   page.evaluate('''async()=>{
    const {renderStage,startStage}=await import('/js/broadcast-stage.js');window.deck=[{id:'live',kind:'news',headline:'A new league story',href:'#/history',dwell:999999},{id:'two',kind:'season',headline:'Seasons',figure:10,subtitle:'2017 → 2026',href:'#/history',dwell:999999}];
    document.querySelector('#home-wrap').innerHTML='<section class="home-broadcast">'+renderStage(deck,{editorial:true,wide:true})+'</section>';window.stage=startStage(document.querySelector('[data-bx-stage]'),deck);stage.suspend('review',true);scrollTo(0,0);
   }''');page.wait_for_timeout(400)
   page.evaluate("window.card=document.querySelector('.bx-slide:not(.bx-leaving)');window.headline=card.querySelector('h2');window.pause=document.querySelector('[data-bx-pause]');pause.focus();stage.update([{...deck[0],headline:'The confirmed trade arrived',href:'#/trade?tx=fixture'},deck[1]])")
   check(tag+' live correction retains card headline and focused control',page.evaluate("card===document.querySelector('.bx-slide:not(.bx-leaving)')&&headline===card.querySelector('h2')&&document.activeElement===pause&&headline.textContent==='The confirmed trade arrived'"))
   check(tag+' correction does not replay the entrance or keep a stale destination',page.evaluate("!card.classList.contains('bx-enter')&&!document.querySelector('.bx-leaving')&&card.getAttribute('href')==='#/trade?tx=fixture'"))
   page.locator('.bx-story-picker summary').click();page.evaluate("stage.update([{...deck[0],headline:'Latest confirmed story'},deck[1],{id:'three',kind:'news',headline:'Another story',href:'#/polls'}])")
   check(tag+' story chooser stays open while refresh waits',page.locator('.bx-story-picker').evaluate('e=>e.open') and page.locator('[data-bx-go]').count()==2)
   page.locator('.bx-story-picker summary').click();page.wait_for_function('document.querySelectorAll("[data-bx-go]").length===3')
   check(tag+' closing chooser applies the latest deck without replacing the active card',page.evaluate("document.querySelector('.bx-slide:not(.bx-leaving)')===card&&card.querySelector('h2').textContent==='Latest confirmed story'"))
   check(tag+' no overflow or page errors',page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors)
   page.screenshot(path=str(OUT/f'{width}-{mode}.png'))
   page.evaluate("document.querySelector('#home-wrap').insertAdjacentHTML('beforeend','<section id=below style=\"height:1800px\"><h2>Keep reading</h2></section>');scrollTo(0,700)");page.wait_for_timeout(50)
   before=page.locator('#below').evaluate('e=>e.getBoundingClientRect().top')
   page.evaluate("stage.update([{...deck[0],body:'A confirmed league update with the full story. '.repeat(45)},deck[1]])");page.wait_for_timeout(100)
   check(tag+' expanded offscreen broadcast does not move the reader',abs(page.locator('#below').evaluate('e=>e.getBoundingClientRect().top')-before)<1)
   page.evaluate('stage.stop()');context.close()
 browser.close()
server.shutdown()
print(json.dumps({'checks':len(checks)}))
