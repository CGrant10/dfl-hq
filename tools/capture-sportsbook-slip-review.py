"""Exercise the real pick handlers, floating review bar and slip without writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_SHEET_REVIEW_DIR',ROOT.parent/'dfl-sheets-review'))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/';checks=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),args=['--no-sandbox','--no-proxy-server'])
 context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,service_workers='block')
 context.route('https://**/*',lambda r:r.fulfill(content_type='text/javascript',headers={'Access-Control-Allow-Origin':'*'},body="export function createClient(){throw Error('Fixture cannot access database')}") if '/npm/@supabase/' in r.request.url else r.abort())
 context.route('**/slip-review.html',lambda r:r.fulfill(content_type='text/html',body=(OUT/'index.html').read_text().replace('http://127.0.0.1:8765/',base)))
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'slip-review.html',wait_until='domcontentloaded');page.wait_for_function('window.reviewReady');page.evaluate('document.fonts.ready')
 for mode in ['light','dark']:
  for width in [320,390,430]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('(mode)=>{reviewTheme(mode);showReviewBoard()}',mode)
   for count in [1,2,6]:
    current=page.locator('[data-bet-outcome][aria-pressed="true"]').count()
    for n in range(current+1,count+1):page.locator(f'[data-bet-outcome="{n}"]').click()
    bar=page.locator('.sb-slipbar');button=bar.locator('[data-slip-open]')
    metrics=bar.evaluate('''e=>{const b=e.getBoundingClientRect(),go=e.querySelector('[data-slip-open]').getBoundingClientRect(),clear=e.querySelector('[data-slip-clear]').getBoundingClientRect(),nav=document.querySelector('#fixture-nav').getBoundingClientRect();return {box:b.toJSON(),nav:nav.toJSON(),inside:b.left>=11&&b.right<=innerWidth-11&&b.bottom<=nav.top-8,button:go.width>=44&&go.height>=44&&go.left>=b.left&&go.right<=b.right,clear:clear.width>=44&&clear.height>=44&&clear.right<=b.right&&clear.left>=go.right,overflow:document.documentElement.scrollWidth>innerWidth}}''')
    page.screenshot(path=str(OUT/f'slipbar-{mode}-{width}.png'))
    assert metrics['inside'] and metrics['button'] and metrics['clear'] and not metrics['overflow'],(mode,width,count,metrics)
    button.click();page.wait_for_selector('.sb-slip[open]');page.wait_for_timeout(350)
    assert page.locator('.sb-slip-pick').count()==count,(mode,width,count,'review opened wrong picks')
    assert page.locator('[data-footer-return]').inner_text()==page.locator('[data-return]').inner_text()
    assert page.locator('.sb-slip-totals').evaluate('e=>{const r=e.getBoundingClientRect(),f=e.closest("footer").getBoundingClientRect();return r.top>=f.top&&r.bottom<=f.bottom&&r.bottom<=innerHeight}')
    assert page.locator('.sb-slip-picks').evaluate('e=>e.scrollHeight<=e.clientHeight+1'), 'Nested pick scrolling returned'
    if count==6:
     page.evaluate('window.firstSlipPick=document.querySelector(".sb-slip-pick")')
     page.locator('.sb-slip input[name="stake"]').fill('75')
     assert page.evaluate('firstSlipPick===document.querySelector(".sb-slip-pick")'), 'Typing rebuilt the pick list'
     assert page.locator('[data-footer-stake]').inner_text()=='75 SIN'
     assert page.locator('[data-footer-return]').inner_text()==page.locator('[data-return]').inner_text()
     page.evaluate('document.documentElement.style.fontSize="32px"');page.wait_for_timeout(100)
     assert page.locator('.sb-slip-content').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
     assert page.locator('.sb-slip-fields input,.sb-slip-fields output,.sb-slip-totals b').evaluate_all('es=>es.every(e=>{const r=e.getBoundingClientRect(),d=e.closest("dialog").getBoundingClientRect();return r.left>=d.left&&r.right<=d.right&&e.scrollWidth<=e.clientWidth+1})')
     page.screenshot(path=str(OUT/f'slip-large-{mode}-{width}.png'))
     page.evaluate('document.documentElement.style.fontSize=""');page.wait_for_timeout(100)
    page.locator('.sb-slip-submit').click();assert 'Confirm' in page.locator('.sb-slip-submit').inner_text()
    assert page.evaluate('rpcCalls')==0,'Review placed a wager'
    if count==6:
     page.locator('.sb-slip-content').evaluate('e=>e.scrollTop=0')
     page.screenshot(path=str(OUT/f'slip-review-{mode}-{width}.png'))
    if count==6:
     page.locator('.sb-slip').evaluate('e=>e._bookBalanceChanged(50)')
     assert page.locator('[data-footer-stake]').inner_text()=='—' and page.locator('[data-footer-return]').inner_text()=='—'
     assert 'Review' in page.locator('.sb-slip-submit').inner_text()
     assert page.evaluate('rpcCalls')==0
    page.locator('.sb-slip [data-close]').click();page.wait_for_function('!document.querySelector("dialog[open]")')
    assert button.evaluate('e=>e===document.activeElement'),'Review did not restore focus'
    checks.append({'mode':mode,'width':width,'picks':count,**metrics,'reviewAndConfirm':True})
   page.evaluate('scrollTo(0,document.documentElement.scrollHeight)');page.wait_for_timeout(100)
   last=page.locator('#board-last').bounding_box();barbox=page.locator('.sb-slipbar').bounding_box()
   assert last['y']+last['height']<=barbox['y'],'Last market is hidden by slip bar'
   page.screenshot(path=str(OUT/f'slipbar-{mode}-{width}.png'))
   page.locator('[data-slip-clear]').click();assert page.locator('.sb-slipbar').count()==0
   page.locator('[data-bet-outcome="2"]').click();page.locator('[data-slip-open]').click();page.wait_for_selector('.sb-slip[open]')
   assert page.locator('.sb-slip-pick').count()==1,'Rebuilt review button lost its handler'
   page.locator('.sb-slip [data-close]').click();page.wait_for_function('!document.querySelector("dialog[open]")')
   page.evaluate('showReviewProps()');page.evaluate('document.fonts.ready')
   assert page.locator('.sb-player-props').count()==3
   assert page.locator('.sb-player-props h3 button').evaluate_all('es=>es.every(e=>getComputedStyle(e).fontFamily.includes("Inter")&&parseFloat(getComputedStyle(e).fontSize)===13&&e.getBoundingClientRect().height>=44&&e.scrollWidth<=e.clientWidth+1)')
   assert page.locator('.sb-player-line').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)')
   page.screenshot(path=str(OUT/f'props-{mode}-{width}.png'))
   quote=page.locator('.sb-player-prices .sb-price').first
   page.evaluate('window.quoteNode=document.querySelector(".sb-player-prices .sb-price");window.quoteRowHeight=quoteNode.closest(".sb-player-line").getBoundingClientRect().height')
   page.evaluate('async()=>{window.quoteUpdate=(await import("/js/sportsbook-account-motion.js")).updateBookQuote;quoteUpdate(quoteNode,"-115")}')
   assert quote.inner_text()=='-115' and page.evaluate('quoteNode===document.querySelector(".sb-player-prices .sb-price")&&quoteNode.closest(".sb-player-line").getBoundingClientRect().height===quoteRowHeight')
   page.wait_for_timeout(220);assert quote.evaluate('e=>!e.getAnimations().length')
   page.emulate_media(reduced_motion='reduce');page.evaluate('quoteUpdate(quoteNode,"+100")')
   assert quote.inner_text()=='+100' and quote.evaluate('e=>!e.getAnimations().length')
   page.emulate_media(reduced_motion='no-preference')
   page.evaluate('document.documentElement.style.fontSize="32px"');page.wait_for_timeout(100)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.evaluate('document.documentElement.style.fontSize=""')
   checks.append({'mode':mode,'width':width,'propsReading':True,'exactQuoteUpdate':True,'stableRowHeight':True,'reducedMotion':True})
 assert not errors,errors
 browser.close()
server.shutdown();(OUT/'slipbar-checks.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2));print(json.dumps({'layouts':len(checks),'errors':errors}))
