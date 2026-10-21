"""Review production award compositions at phone widths without live league data."""
import json,os,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_GET(self):
  if self.path=='/':
   body=(OUT/'index.html').read_bytes();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(body)
  else:super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('DFL_REVIEW_CHROMIUM') or None,args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 c.add_init_script('window.reviewHoldInitialStage=true')
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('!!window.reviewStage');page.evaluate('document.fonts.ready')
 for mode in ['light','dark']:
  page.evaluate('mode=>window.reviewSetTheme(mode)',mode)
  for width in [320,390,430,832]:
   page.set_viewport_size({'width':width,'height':844})
   for index in [2,3,4]:
    page.locator(f'[data-bx-go="{index}"]').evaluate('e=>e.click()');page.wait_for_timeout(650)
    page.locator('.bx-stage').evaluate('e=>{const top=(parseFloat(getComputedStyle(document.querySelector("#view")).getPropertyValue("--dfl-scroll-top"))||44)+(document.querySelector(".home-score-dock")?.offsetHeight||0)+16;scrollTo({top:scrollY+e.getBoundingClientRect().top-top,behavior:"instant"})}')
    page.wait_for_function("(()=>{const s=document.querySelector('.bx-slide:not(.bx-leaving) .bx-editorial-subject');return s&&Number(getComputedStyle(s).opacity)>.5})()",timeout=5000)
    result=page.evaluate('''()=>{const slide=document.querySelector('.bx-slide:not(.bx-leaving)'),copy=slide.querySelector('.bx-award-copy'),art=slide.querySelector('.bx-editorial-illustration'),image=art.querySelector('img'),box=slide.getBoundingClientRect(),i=image.getBoundingClientRect(),c=copy.getBoundingClientRect(),h=slide.querySelector('.bx-award-heading').getBoundingClientRect(),footer=slide.querySelector('.bx-story-action').getBoundingClientRect(),a=art.getBoundingClientRect();return {height:box.height,kind:slide.classList.contains('bx-award-chip')?'chip':'champion',copyWidth:c.width/box.width,artWidth:i.width/box.width,contained:getComputedStyle(image).objectFit==='contain'&&i.left>=box.left-1&&i.right<=box.right+1&&i.bottom<=box.bottom+1,separated:(c.right<=a.left-8||a.right<=c.left-8)&&h.bottom<=Math.min(a.top,c.top)-8&&footer.top>=Math.max(c.bottom,a.bottom)+8,headlineSize:parseFloat(getComputedStyle(slide.querySelector('.bx-award-heading')).fontSize),masked:getComputedStyle(art).maskImage!=='none',noStickerShadow:!getComputedStyle(image).filter.includes('drop-shadow'),opacity:Number(getComputedStyle(image.parentElement).opacity),imageLoaded:image.complete&&image.naturalWidth>0,textFits:[...copy.children,slide.querySelector('.bx-award-heading'),slide.querySelector('.bx-story-action')].every(e=>e.scrollWidth<=e.clientWidth+1&&e.getBoundingClientRect().bottom<=box.bottom+1),overflow:document.documentElement.scrollWidth>innerWidth,contrast:window.reviewTextContrast().failures}}''')
    assert result['copyWidth']>.3 and result['artWidth']>.5 and result['headlineSize']>=28,result
    assert result['opacity']>=.99 and result['separated'],result
    assert result['contained'] and not result['masked'] and result['noStickerShadow'] and result['imageLoaded'] and result['textFits'] and not result['overflow'] and not result['contrast'],result
    checks.append({'mode':mode,'width':width,'index':index,**result})
    if width in [320,390]:page.locator('.bx-stage').screenshot(path=str(OUT/f'award-{mode}-{width}-{index}.png'))
 assert not errors,errors
 b.close()
server.shutdown();(OUT/'award-checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2));print(f'{len(checks)} award compositions passed')
