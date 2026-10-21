"""Production Trade page + isolated services. No real league writes or messages."""
import json,os,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
output=Path(os.environ.get('DFL_TRADE_REVIEW_DIR','/tmp/dfl-trade-intentions-review'))
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        name=self.path.split('?')[0]
        body="export const db=()=>{throw Error('Unexpected real database access')};export const edge=()=>{throw Error('Unexpected edge write')};export const privilegedFunctionHeaders=()=>({});" if name=='/js/supabase.js' else "export const currentMember=()=>null;export const loadMemberDirectory=async()=>[];" if name=='/js/members.js' else None
        if body is not None:
            self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(body.encode());return
        super().do_GET()
    def translate_path(self,path):
        clean=path.split('?')[0].split('#')[0]
        return str(output/clean.removeprefix('/trade-review/')) if clean.startswith('/trade-review/') else str(root/clean.lstrip('/'))
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade'
checks=[]
with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']}
    if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
    browser=p.chromium.launch(**launch)
    for width in [320,390,768]:
        for theme in ['dark','light']:
            context=browser.new_context(viewport={'width':width,'height':844},service_workers='block')
            context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
            context.route('https://sleepercdn.com/content/nfl/players/thumb/*',lambda route:route.fulfill(status=404,body='Missing player photo') if route.request.url.endswith('/1-3.jpg') else route.fulfill(content_type='image/png',body=(root/'tools/fixtures/player-portrait.png').read_bytes()))
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(url);page.wait_for_function('window.reviewReady===true')
            page.evaluate("async theme=>{localStorage.setItem('dfl.mode',theme);const t=await import('/js/theme.js');t.applyTheme();const {installTradeIntentionsReview}=await import('/tools/trade-intentions-review-fixture.mjs');installTradeIntentionsReview()}",theme)
            def check(ok,label):
                checks.append({'width':width,'theme':theme,'check':label,'pass':bool(ok)})
                if not ok:raise AssertionError(f'{width} {theme}: {label}')
            page.wait_for_function("document.querySelector('.ti-entry small')?.textContent.includes('Wants WR')")
            page.locator('[data-ti-open]').click();page.wait_for_selector('.ti-dialog[open]');page.wait_for_timeout(260)
            check(page.locator('[data-ti-player]').count()>5,'Own roster appears without expanding the page')
            page.wait_for_function("()=>[...document.querySelectorAll('.ti-player .dfl-player-portrait img')].slice(0,4).every(i=>i.complete&&i.naturalWidth>0)")
            def portraits_fit():
                return page.locator('.ti-player .dfl-player-portrait img').evaluate_all("imgs=>imgs.every(img=>{const a=img.getBoundingClientRect(),b=img.parentElement.getBoundingClientRect();return a.width<=b.width&&a.height<=b.height&&a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom})")
            check(portraits_fit(),'Loaded photos stay inside their compact frames')
            check(page.locator('.ti-player .dfl-player-portrait.has-photo i').evaluate_all("nodes=>nodes.every(i=>getComputedStyle(i).display==='none')"),'Loaded photos hide fallback initials')
            page.wait_for_function("!document.querySelector('.ti-player:first-child .dfl-player-portrait img')")
            check(page.locator('.ti-player .dfl-player-portrait i').first.evaluate("i=>{const a=i.getBoundingClientRect(),b=i.parentElement.getBoundingClientRect();return getComputedStyle(i).display==='grid'&&a.width<=b.width&&a.height<=b.height}"),'Failed photos keep centered initials inside the frame')

            check(page.locator('[data-ti-need=WR]').get_attribute('aria-pressed')=='true','Saved position selected')
            check(page.evaluate("()=>{const d=document.querySelector('.ti-dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}"),'Sheet stays inside phone edges')
            check(page.evaluate("()=>[...document.querySelectorAll('.ti-dialog button,.ti-dialog select')].filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=43.9)"),'Controls meet 44px target height')
            check(page.evaluate("getComputedStyle(document.querySelector('.ti-dialog')).animationName==='ti-enter'"),'Smooth sheet entry enabled')
            check(page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),'No horizontal page overflow')
            check(page.locator('.ti-scroll').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),'No horizontal roster overflow')
            page.screenshot(path=str(output/f'intentions-{width}-{theme}.png'))
            page.locator('[data-ti-need=RB]').click();page.locator('[data-ti-player="1-4"]').select_option('available')
            node=page.locator('[data-ti-need=RB]');handle=node.element_handle();node.click();node.click()
            check(handle.evaluate('e=>e.isConnected'),'Rapid chip changes preserve DOM and focus')
            page.evaluate("window.reviewIntentionFailure={message:'Offline. Try again.'}")
            page.locator('[data-ti-save]').click();page.wait_for_function("document.querySelector('[data-ti-error]')?.textContent.includes('Offline')")
            check(page.locator('[data-ti-player="1-4"]').input_value()=='available','Failed save preserves edits')
            page.evaluate('window.reviewIntentionDelay=400')
            page.locator('[data-ti-save]').click()
            check(page.locator('[data-ti-save]').is_disabled(),'Double saves prevented')
            check(page.locator('[data-ti-team]').is_disabled(),'Team switch disabled while saving')
            page.wait_for_selector('.ti-dialog',state='detached')
            check(page.evaluate("window.reviewIntentionRows[0].needs.includes('RB')&&window.reviewIntentionRows[0].players['1-4']==='available'"),'Successful save keeps exact labels and needs')
            check(page.locator('[data-ti-open]').evaluate('e=>e===document.activeElement'),'Close restores entry focus')
            page.locator('[data-ti-open]').click();page.wait_for_timeout(260)
            page.locator('[data-ti-team]').select_option('2');page.wait_for_timeout(220)
            check(page.locator('[data-ti-player]').count()==0,'Other managers are read only')
            page.wait_for_function("()=>[...document.querySelectorAll('.ti-player .dfl-player-portrait img')].every(i=>i.complete&&i.naturalWidth>0)")
            check(portraits_fit(),'Other managers’ loaded portraits stay within frames')
            check(page.locator('.ti-label[data-status=keeping]').count()==1,'League view includes explicit keeping label')
            page.screenshot(path=str(output/f'intentions-league-{width}-{theme}.png'))
            page.locator('[data-ti-team]').select_option('1')
            page.evaluate('window.reviewIntentionRows[0].revision++')
            page.locator('[data-ti-save]').click();page.wait_for_function("!document.querySelector('[data-ti-reload]').hidden")
            check(page.locator('[data-ti-save]').is_disabled(),'Stale device cannot overwrite newer intentions')
            page.locator('[data-ti-reload]').click();page.wait_for_function("!document.querySelector('[data-ti-save]').disabled")
            page.evaluate('window.reviewIntentionLocked=true')
            page.locator('[data-ti-save]').click();page.wait_for_selector('[data-ti-pin]:not([hidden])')
            page.locator('input[name=pin]').fill('0000');page.locator('[data-ti-save]').click()
            page.wait_for_function("document.querySelector('[data-ti-error]').textContent.includes('Wrong')")
            check(page.locator('.ti-dialog[open]').count()==1,'Wrong PIN retains editor')
            page.locator('input[name=pin]').fill('1234');page.locator('[data-ti-save]').click();page.wait_for_selector('.ti-dialog',state='detached')
            check(True,'PIN recovery saves intentions')
            page.locator('[data-ti-open]').click();page.wait_for_timeout(260)
            page.locator('[data-ti-clear]').click()
            check(page.locator('[data-ti-need][aria-pressed=true]').count()==0,'Clear resets draft needs')
            check(page.locator('[data-ti-player]').evaluate_all("els=>els.every(e=>e.value==='')"),'Clear resets draft labels')
            page.keyboard.press('Escape');page.wait_for_selector('.ti-dialog',state='detached')
            page.locator('[data-ti-open]').click();page.wait_for_timeout(260)
            check(page.locator('[data-ti-player="1-4"]').input_value()=='available','Closing unsaved draft retains saved intentions')
            page.locator('[data-ti-team]').select_option('2');page.locator('[data-ti-shop]').click()
            check(page.locator('[data-ta-shop-partner]').input_value()=='2','League intentions hand off to exact team search')
            page.emulate_media(reduced_motion='reduce')
            page.locator('[data-ti-open]').click()
            check(page.evaluate("getComputedStyle(document.querySelector('.ti-dialog')).animationName==='none'"),'Reduced motion skips sheet animation')
            page.keyboard.press('Escape');page.wait_for_selector('.ti-dialog',state='detached')
            page.emulate_media(reduced_motion='no-preference');page.evaluate("document.documentElement.dataset.uiMotion='off'")
            page.locator('[data-ti-open]').click()
            check(page.evaluate("getComputedStyle(document.querySelector('.ti-dialog')).animationName==='none'"),'App motion setting respected')
            page.keyboard.press('Escape');page.wait_for_selector('.ti-dialog',state='detached')
            page.evaluate("window.reviewLeave();window.reviewIntentionListDelay=400;window.renderReview()")
            page.locator('[data-ti-open]').click();page.wait_for_selector('.ti-dialog[open]')
            check(page.locator('[data-ti-player="1-4"]').input_value()=='available','Early open waits for synced intentions instead of an empty draft')
            page.evaluate('window.reviewLeave()');check(page.locator('.ti-dialog').count()==0,'Leaving route releases dialog and timers')
            check(not errors,'No browser exceptions')
            context.close()
    browser.close()
(output/'intentions-checks.json').write_text(json.dumps(checks,indent=2))
print(json.dumps({'checks':len(checks),'failures':sum(not r['pass'] for r in checks),'output':str(output)}))
server.shutdown()
