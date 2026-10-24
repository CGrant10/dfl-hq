"""Production Trade page + isolated services. No real league writes or messages."""
import json,os,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
output=Path(os.environ.get('DFL_TRADE_REVIEW_DIR','/tmp/dfl-trade-room-review'))
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
            context=browser.new_context(viewport={'width':width,'height':844},service_workers='block',reduced_motion='reduce')
            context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(url);page.wait_for_function('window.reviewReady===true')
            page.evaluate("async theme=>{localStorage.setItem('dfl.mode',theme);const t=await import('/js/theme.js');t.applyTheme();const {installTradeRoomReview}=await import('/tools/trade-room-review-fixture.mjs');installTradeRoomReview()}",theme)
            page.wait_for_selector('.tr-offer')
            def click(s):page.locator(s).first.click()
            def check(ok,label):
                assert ok,label
                checks.append(f'{width}-{theme}: {label}')
            def open_room(id):
                click(f'[data-tr-action="open"][data-tr-id="{id}"]');page.wait_for_selector('.tr-detail')
            check(page.locator('.tr-offer').count()==3,'Open inbox has sent offers and own draft')
            check(not page.locator('.td-custom').is_visible(),'Room keeps builder tucked away')
            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Inbox has no horizontal overflow')
            check(page.locator('.tr-open').evaluate_all('es=>es.every(e=>e.offsetHeight>=44)'),'Offer opening targets meet 44px')
            page.screenshot(path=str(output/f'room-{width}-{theme}.png'))
            open_room(2)
            check(page.locator('.tr-detail .tr-package section').count()==3,'Three-way shows every team')
            check('The Bayou Bombers' in page.locator('.tr-detail').inner_text(),'Full team names and recipients visible')
            click('[data-tr-action="accept"]');page.wait_for_function("window.reviewRooms.find(r=>r.id===2).accepted_ids.includes(1)")
            check(page.locator('.tr-detail-status').inner_text().startswith('Waiting'),'Three-way still waits for remaining manager')
            check(page.locator('[data-tr-action="accept"]').count()==0,'No duplicate agreement action')
            click('[data-tr-action="back"]');open_room(1)
            click('[data-tr-action="counter"]')
            check(page.locator('[data-td-team]').input_value()=='1','Counter orients builder to viewing manager')
            check(page.locator('[data-td-selected="0"]').inner_text().find('Amon-Ra')>=0,'Counter restores exact outgoing package')
            # Replace one player, keeping the opponent and routing intact.
            if not page.locator('[data-td-roster="0"]').evaluate('e=>e.open'):click('[data-td-roster="0"] > summary')
            page.locator('[data-td-pick="0"][value="1-4"]').uncheck()
            page.locator('[data-td-pick="0"][value="1-3"]').check()
            click('[data-td-negotiate]');page.wait_for_selector('.tr-compose[open]')
            check(page.locator('.tr-compose .tr-package li').count()==2,'Counter review stays compact and complete')
            check(page.locator('.tr-compose').evaluate('e=>e.scrollWidth<=e.clientWidth'),'Composer has no horizontal overflow')
            check(page.locator('.tr-compose').evaluate("e=>getComputedStyle(e).animationName==='none'"),'Reduced motion respected')
            page.screenshot(path=str(output/f'counter-{width}-{theme}.png'))
            click('.tr-compose button[value="counter"]');page.wait_for_function('!document.querySelector(".tr-compose")')
            check(page.evaluate('window.reviewRoomCommands.at(-1).proposal.sends[0][0]')=='1-3','Counter sends updated terms')
            click('.tr-history > summary')
            check('Counteroffer' in page.locator('.tr-history').inner_text(),'Counter history records new revision')
            check('Justin Jefferson' in page.locator('.tr-history').inner_text(),'History identifies added player')
            check('Amon-Ra' in page.locator('.tr-history').inner_text(),'History identifies removed player')
            page.screenshot(path=str(output/f'history-{width}-{theme}.png'))
            # A stale response must refresh, not submit against changed terms.
            click('[data-tr-action="back"]');open_room(2)
            page.evaluate('window.reviewRooms.find(r=>r.id===2).revision++')
            click('[data-tr-action="decline"]')
            page.wait_for_function('!document.querySelector("[data-tr-action=refresh]")?.disabled')
            check(page.evaluate('window.reviewRooms.find(r=>r.id===2).status')=='pending','Stale response cannot overwrite latest version')
            click('[data-tr-action="back"]');click('[data-tr-action="closed"]');open_room(4)
            check(page.locator('.tr-detail a[href="https://sleeperbot.app.link/esEa7TDlJN"]').count()==1,'Agreed terms offer Sleeper handoff')
            check('Complete the trade in Sleeper' in page.locator('.tr-handoff').inner_text(),'Agreement clearly separate from execution')
            page.screenshot(path=str(output/f'agreed-{width}-{theme}.png'))
            click('[data-tr-action="back"]');click('[data-tr-action="active"]');open_room(3)
            click('[data-tr-action="send"]');page.wait_for_selector('.tr-compose[open]');click('.tr-compose button[value="send"]');page.wait_for_function('!document.querySelector(".tr-compose")')
            check(page.evaluate('window.reviewRooms.find(r=>r.id===3).status')=='pending','Saved draft can be sent')
            # New drafts survive a failed request with the same idempotency key.
            click('[data-td-mode="manual"]');click('[data-td-negotiate]');page.wait_for_selector('.tr-compose[open]')
            page.evaluate("window.reviewRoomFailure={message:'Connection lost',code:'NETWORK'}")
            click('.tr-compose button[value="save"]');page.wait_for_selector('.tr-compose-error:not([hidden])')
            check('Connection lost' in page.locator('.tr-compose-error').inner_text(),'Failed save keeps review and retry available')
            click('.tr-compose button[value="save"]');page.wait_for_function('!document.querySelector(".tr-compose")')
            check(page.evaluate('window.reviewRoomCommands.at(-1).action')=='save','Retried draft saved successfully')
            check(page.evaluate('!!window.reviewRoomCommands.at(-1).requestId'),'New offer has retry identity')
            click('[data-tr-action="remove"]');page.wait_for_selector('.tr-offer')
            check(page.locator('.tr-detail').count()==0,'Own draft can be removed')
            # Trusted-device profile still asks for a PIN when opening protected offers.
            page.evaluate("window.reviewLeave();window.reviewRoomLocked=true;window.renderReview()")
            page.wait_for_selector('.tr-unlock input');page.locator('.tr-unlock input').fill('0000');click('.tr-unlock button')
            page.wait_for_function("document.querySelector('.tr-unlock [role=alert]')?.textContent.includes('Wrong')")
            page.locator('.tr-unlock input').fill('1234');click('.tr-unlock button');page.wait_for_selector('.tr-offer')
            check(page.locator('.tr-unlock').count()==0,'PIN recovery opens protected offers')
            check(not errors,'No browser exceptions')
            page.evaluate('window.reviewLeave()');context.close()
    browser.close()
server.shutdown();(output/'room-checks.json').write_text(json.dumps({'checks':checks,'errors':[]},indent=2));print(f'{len(checks)} Trade room browser checks passed')
