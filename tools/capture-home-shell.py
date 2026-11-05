"""Current Home/shared chrome contracts; isolated production-renderer fixture.

The historical broad Home runner retains shared fixture helpers. Current
broadcast, Clubhouse, media and interaction runners execute separately
in home-design-review.yml; this runner covers the shared shell and Home jumps.
"""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
FIXTURE=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'))
OUT=FIXTURE/'shell';OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_GET(self):
  if self.path.split('?',1)[0] in ['/','/index.html']:
   self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write((FIXTURE/'index.html').read_bytes());return
  super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.route('https://**/*',lambda r:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()) if r.request.resource_type=='image' else r.abort())
 page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded')
 try:page.wait_for_function('!!(window.reviewStage&&window.reviewSyncNav)')
 except Exception:
  print(json.dumps({'startupErrors':errors}),flush=True);raise
 page.evaluate("reviewStage.suspend('shell-review',true)");page.evaluate('document.fonts.ready')
 for mode in ['light','dark']:
  page.evaluate('mode=>reviewSetTheme(mode)',mode)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});reference=None
   for route in ['home','clubhouse','sportsbook','trade','analyzer','wall','history','golf']:
    page.evaluate('''route=>{
     document.querySelector('#view').dataset.route=route;
     document.querySelectorAll('#tabbar .on').forEach(e=>e.classList.remove('on'));
     (document.querySelector(`#tabbar [data-route="${route}"]`)||document.querySelector('#more-btn')).classList.add('on');reviewSyncNav();
    }''',route)
    page.wait_for_function('''()=>{
     const active=document.querySelector('#tabbar .on'),marker=getComputedStyle(document.querySelector('#tabbar'),'::before');
     return active&&marker.backgroundColor===getComputedStyle(active).color&&Math.abs(new DOMMatrix(marker.transform).m41-active.offsetLeft)<1;
    }''')
    result=page.evaluate('''()=>{
     const header=document.querySelector('.topbar'),bar=document.querySelector('#tabbar'),active=bar.querySelector('.on'),marker=getComputedStyle(bar,'::before'),ink=getComputedStyle(active).color;
     return {header:header.getBoundingClientRect().height,nav:bar.getBoundingClientRect().height,headerControls:[...header.querySelectorAll('.topbar-actions>button')].map(e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,height:b.height}}),labelsFit:[...bar.querySelectorAll('a>span,.tabmore>span')].every(e=>{const a=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return b.left>=a.left-.5&&b.right<=a.right+.5}),targets:[...bar.querySelectorAll('a,.tabmore')].every(e=>e.getBoundingClientRect().height>=44),markerVisible:marker.display==='block'&&Number(marker.opacity)>0,markerMatches:marker.backgroundColor===ink,markerHeight:parseFloat(marker.height),markerWidth:parseFloat(marker.width),targetWidth:active.offsetWidth,overflow:document.documentElement.scrollWidth>innerWidth+1};
    }''')
    assert result['header']==(56 if width<=360 else 64),(mode,width,route,result)
    assert 44<=result['nav']<=(50 if width>=900 else 60),(mode,width,route,result)
    assert result['labelsFit'] and result['targets'] and not result['overflow'],(mode,width,route,result)
    assert all(c['height']>=44 and c['left']>=0 and c['right']<=width for c in result['headerControls']),result
    assert result['markerVisible'] and result['markerMatches'] and result['markerHeight']==3 and abs(result['markerWidth']-result['targetWidth'])<1,result
    dimensions={k:result[k] for k in ['header','nav','headerControls']}
    if reference is None:reference=dimensions
    assert dimensions==reference,(mode,width,route,'Shared chrome changed across routes')
    checks.append({'theme':mode,'width':width,'route':route,**result})
  page.set_viewport_size({'width':390,'height':844})
  page.evaluate("document.querySelector('#view').dataset.route='home';document.querySelectorAll('#tabbar .on').forEach(e=>e.classList.remove('on'));document.querySelector('#tabbar [data-route=home]').classList.add('on');reviewSyncNav()")
  # Native safe-area padding must reserve matching document space.
  page.locator('#tabbar').evaluate("e=>e.style.paddingBottom='34px'");page.wait_for_timeout(150)
  inset=page.evaluate("()=>({nav:document.querySelector('#tabbar').getBoundingClientRect().height,measured:parseFloat(document.documentElement.style.getPropertyValue('--season-nav-height')),padding:parseFloat(getComputedStyle(document.body).paddingBottom)})")
  assert inset['nav']==inset['measured'] and inset['padding']>=inset['nav']+19,inset
  checks.append({'theme':mode,'safeArea':inset})
  page.locator('#tabbar').evaluate("e=>e.style.removeProperty('padding-bottom')");page.emulate_media(reduced_motion='reduce')
  for section,selector in [('scores','[data-home-gameday-slot]'),('lead','.home-broadcast'),('week','.home-week-desk'),('league','.home-league-desk'),('archive','[data-home-lore-slot]')]:
   before=page.evaluate('location.hash');page.locator(f'[data-home-jump="{section}"]').click();page.wait_for_timeout(250)
   top=page.locator(selector).bounding_box()['y'];header=page.locator('.topbar').bounding_box()['height']
   assert top>=header+15 and top<240,(mode,section,top,header)
   assert page.evaluate('location.hash')==before and not page.locator('[data-home-jump][aria-current]').count()
   checks.append({'theme':mode,'sectionJump':section,'top':top,'header':header})
  page.emulate_media(reduced_motion='no-preference');page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/f'home-{mode}.png'))
 assert not errors,errors
 browser.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
print(json.dumps({'checks':len(checks),'errors':errors}))
