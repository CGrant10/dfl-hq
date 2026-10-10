"""Production trade handlers with fixture data; no league database connection."""
import json,os,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
output=Path(os.environ.get('DFL_TRADE_REVIEW_DIR','/workspace/dfl-trade-review'))
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Theme rendering uses the real palette module with an isolated data
        # boundary, just like the Trade page's roster and sharing fixtures.
        name=self.path.split('?')[0]
        body="export const db=()=>{throw Error('Review database writes are blocked')};" if name=='/js/supabase.js' else "export const currentMember=()=>null;" if name=='/js/members.js' else None
        if body is not None:
            self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(body.encode());return
        super().do_GET()
    def translate_path(self,path):
        clean=path.split('?')[0].split('#')[0]
        return str(output/clean.removeprefix('/trade-review/')) if clean.startswith('/trade-review/') else str(root/clean.lstrip('/'))
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/trade-review/index.html#/trade'
results=[]
with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']}
    if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
    browser=p.chromium.launch(**launch)
    for width in [320,390,768]:
        context=browser.new_context(viewport={'width':width,'height':844},service_workers='block',reduced_motion='reduce')
        context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') else route.abort())
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url);page.wait_for_function('window.reviewReady===true');page.evaluate('document.fonts.ready')
        def click(selector):
            node=page.locator(selector).first
            node.evaluate("e=>{const r=e.getBoundingClientRect();window.scrollBy({top:r.top-innerHeight/3,behavior:'instant'})}")
            node.click()
        def pick(side,pid):
            summary=f'[data-td-roster="{side}"]'
            if not page.locator(summary).evaluate('e=>e.open'):click(summary+' > summary')
            click(f'[data-td-pick="{side}"][value="{pid}"]')
        def select(selector,value):
            node=page.locator(selector)
            if node.get_attribute('hidden') is not None:
                trigger=node.locator('xpath=preceding-sibling::button[1]')
                trigger.click()
                sheet=page.locator('.trade-player-picker[open]')
                sheet.locator('input').fill(value if value.startswith('unknown') else page.evaluate('(id)=>window.reviewData.pool.get(id)?.name||id',value))
                sheet.locator(f'[data-picker-player="{value}"]').click()
                page.wait_for_function('!document.querySelector(".trade-player-picker")?.open')
            else:node.select_option(value)
        assert page.locator('[data-tb-tier="fair"]').evaluate('e=>e.open')
        # Primary player selectors stay visible with advanced preferences closed.
        assert not page.locator('.tb-refine').evaluate('e=>e.open')
        assert page.locator('[data-trade-picker="send"]').is_visible()
        assert page.locator('[data-trade-picker="receive"]').is_visible()
        # Real sheet controls: search, position, keyboard and cancellation.
        click('[data-trade-picker="send"]')
        sheet=page.locator('.trade-player-picker[open]')
        assert sheet.locator('h2').evaluate('e=>e===document.activeElement')
        page.keyboard.press('Tab');assert sheet.locator('[data-picker-close]').evaluate('e=>e===document.activeElement')
        page.keyboard.press('Tab');assert sheet.locator('input').evaluate('e=>e===document.activeElement')
        sheet.locator('[data-picker-position="QB"]').click()
        assert sheet.locator('[data-picker-player]').count()==1
        sheet.locator('input').fill('Jefferson');assert sheet.locator('[data-picker-player]').count()==0
        assert 'No matching' in sheet.locator('[data-picker-list]').inner_text()
        sheet.locator('[data-picker-position="all"]').click();assert sheet.locator('[data-picker-player]').count()==1
        sheet.locator('input').fill('st brown');assert sheet.locator('[data-picker-player="1-4"]').count()==1
        assert sheet.locator('.dfl-player-portrait').first.evaluate('e=>e.offsetWidth===44&&e.offsetHeight===54')
        assert sheet.locator('.dfl-player-copy').first.evaluate('e=>{const a=e.querySelector("strong").getBoundingClientRect(),b=e.querySelector("small").getBoundingClientRect();return a.bottom<=b.top+1}')
        page.screenshot(path=str(output/f'trade-{width}-search-sheet.png'))
        page.keyboard.press('Escape');page.wait_for_function('selector=>document.querySelector(selector)===document.activeElement',arg='[data-trade-picker="send"]')
        assert page.locator('[data-tb-remove-anchor="send"]').count()==0
        select('[data-tb-add-anchor="send"]','1-4')
        click('[data-trade-picker="send"]');assert page.locator('.trade-player-picker[open] [data-picker-player="1-4"]').count()==0
        page.keyboard.press('Escape')
        select('[data-ta-shop-partner]','all')
        assert page.locator('[data-trade-picker="league"]').is_visible()
        select('[data-tb-league-target]','3-3')
        assert page.locator('[data-ta-shop-partner]').input_value()=='3'
        assert page.locator('[data-tb-remove-anchor="send"][data-player-id="1-4"]').count()==1
        assert page.locator('[data-tb-remove-anchor="receive"][data-player-id="3-3"]').count()==1
        assert not page.locator('.tb-refine').evaluate('e=>e.open')
        assert page.locator('[data-trade-picker="receive"]').evaluate('e=>e===document.activeElement')
        click('[data-tb-intent="fair"]')
        page.wait_for_function("document.querySelector('[data-tb-tier]')?.dataset.tbTier==='fair'")
        packages=page.locator('[data-td-load-offer]').evaluate_all('(cards)=>cards.map(card=>({send:card.dataset.sendA.split(","),receive:card.dataset.sendB.split(",")}))')
        assert packages
        assert all('1-4' in package['send'] and '3-3' in package['receive'] for package in packages),packages
        page.locator('.tb-player-pickers').scroll_into_view_if_needed()
        page.screenshot(path=str(output/f'trade-{width}-player-pickers.png'))
        click('[data-td-load-offer]')
        assert page.locator('.td-ticket').count(),f'{width}: Analyze offer did not open a ticket'
        page.evaluate('sessionStorage.clear();localStorage.clear()');page.reload();page.wait_for_function('window.reviewReady===true')

        page.screenshot(path=str(output/f'trade-{width}-offers.png'))
        click('[data-td-mode="manual"]');assert page.locator('.td-custom').evaluate('e=>e.open')
        assert page.locator('.td-roster[open]').count()==0
        click('[data-td-add-member]');assert page.locator('[data-td-member]').count()==2
        for side,pid in [(0,'1-4'),(0,'1-3'),(1,'2-6'),(2,'3-3')]:pick(side,pid)
        select('[data-td-destination="1-3"]','3');select('[data-td-destination="2-6"]','1')
        assert page.locator('.td-reasoning,.td-reason').count()==0
        assert page.locator('.td-top-take').count()==1
        assert page.locator('.td-total b').evaluate_all('es=>es.every(e=>{const r=document.createRange();r.selectNodeContents(e);return r.getClientRects().length===1})'),f'{width}: package value wrapped'
        assert page.locator('.td-confidence p,.td-confidence > small').count()==0
        assert page.locator('.td-player-evidence article dl').count()==4
        assert 'Projected ROS points / game' in page.locator('.td-player-evidence').text_content()
        assert all('Player values reflect' not in text and 'Forecast source:' not in text for text in page.locator('.td-data-context').evaluate_all('es=>es.map(e=>e.textContent)'))
        assert '1 QB' in page.locator('[data-trade-league-format]').text_content()
        assert not page.locator('[data-td-share]').is_disabled()
        page.locator('.td-ticket').evaluate("e=>e.scrollIntoView({block:'start',behavior:'instant'})")
        page.screenshot(path=str(output/f'trade-{width}-ticket.png'))
        click('[data-td-share]')
        shared=page.evaluate('({routes:window.reviewSharedDeal.destinations,incoming:window.reviewSharedDeal.receives})')
        assert shared['routes']=={'1-4':'2','1-3':'3','2-6':'1','3-3':'1'},shared
        assert shared['incoming']==[['2-6','3-3'],['1-4'],['1-3']],shared
        click('[data-td-save-proposal]');assert page.locator('.td-proposal-grid article').count()==1
        select('[data-td-destination="1-4"]','3');select('[data-td-destination="1-3"]','2')
        click('[data-td-save-proposal]');assert page.locator('.td-proposal-grid article').count()==2
        pick(1,'2-7');select('[data-td-destination="2-7"]','1');click('[data-td-save-proposal]')
        assert page.locator('.td-proposal-grid article').count()==3
        pick(1,'2-9');select('[data-td-destination="2-9"]','1');click('[data-td-save-proposal]')
        assert page.locator('.td-proposal-grid article').count()==3
        click('[data-td-remove-pick="1"][data-player-id="2-9"]')
        click('.td-lineup-preview > summary');click('.td-bench-preview > summary')
        page.locator('.td-lineup-preview').evaluate("e=>e.scrollIntoView({block:'start',behavior:'instant'})")
        page.screenshot(path=str(output/f'trade-{width}-lineups.png'))
        assert page.locator('.td-lineup-slot').count()==21
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'{width}: overflow'
        page.reload();page.wait_for_function('window.reviewReady===true')
        assert page.locator('[data-td-destination="1-4"]').input_value()=='3'
        assert page.locator('.td-proposal-grid article').count()==3
        click('[data-td-compare]')
        click('[data-td-load-proposal="'+page.locator('[data-td-load-proposal]').first.get_attribute('data-td-load-proposal')+'"]')
        click('.td-proposals > summary')
        click('[data-td-remove-member="1"]')
        assert not page.locator('.td-proposals').evaluate('e=>e.open')
        assert page.locator('[data-td-destination]').count()==0
        if page.locator('[data-td-remove-pick="0"][data-player-id="1-3"]').count():click('[data-td-remove-pick="0"][data-player-id="1-3"]')
        if page.locator('[data-td-remove-pick="1"][data-player-id="2-7"]').count():click('[data-td-remove-pick="1"][data-player-id="2-7"]')
        if page.locator('.td-deal-evidence > summary').count():
            click('.td-deal-evidence > summary')
            assert 'Expert ranks · FantasyPros · not connected' in page.locator('.td-deal-evidence').inner_text()
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),f'{width}: expanded evidence overflow'
        click('[data-td-find-counter]');page.locator('[data-td-use-counter]').first.wait_for()
        click('[data-td-use-counter]');assert page.locator('[data-td-remove-pick="1"]').count()==2
        page.locator('[data-td-verdict]').evaluate("e=>e.scrollIntoView({block:'start',behavior:'instant'})")
        assert page.locator('.td-total b').evaluate_all('es=>es.every(e=>{const r=document.createRange();r.selectNodeContents(e);return r.getClientRects().length===1})'),f'{width}: bilateral value wrapped'
        page.screenshot(path=str(output/f'trade-{width}-verdict.png'))
        label=page.locator('.td-balance-label').bounding_box();ticket=page.locator('.td-ticket').bounding_box()
        assert label['x']>=ticket['x'] and label['x']+label['width']<=ticket['x']+ticket['width']
        click('[data-td-add-member]');click('[data-td-add-member]')
        select('[data-td-destination="1-4"]','4')
        click('[data-td-remove-member="2"]')
        assert page.locator('[data-td-destination="1-4"]').input_value()==''
        assert page.locator('[data-td-share]').is_disabled()
        # Restoring stale saved ownership must give a clear unavailable state.
        page.evaluate("window.reviewData.teams[0].playerIds=window.reviewData.teams[0].playerIds.filter(id=>id!=='1-4');window.renderReview()")
        click('[data-td-compare]');assert 'Rosters changed' in page.locator('.td-proposals').inner_text()
        click('[data-td-delete-proposal]');assert page.locator('.td-proposal-grid article').count()==2
        # Offer anchors must survive adding a member, with their actual owners.
        page.evaluate('sessionStorage.clear();localStorage.clear()');page.reload();page.wait_for_function('window.reviewReady===true')
        # Force a control change in the same task as opening the disclosure.
        # Its native toggle event has not fired yet; a redraw must keep it open.
        page.evaluate('''()=>{const section=document.querySelector('.tb-refine');section.open=true;const input=document.querySelector('[data-tb-add-anchor="send"]');input.value='1-4';input.dispatchEvent(new Event('change',{bubbles:true}));}''')
        assert page.locator('.tb-refine').evaluate('e=>e.open')
        select('[data-tb-add-anchor="receive"]','2-6')
        click('[data-tb-add-member]')
        assert page.locator('[data-td-remove-pick="0"][data-player-id="1-4"]').count()==1
        assert page.locator('[data-td-remove-pick="1"][data-player-id="2-6"]').count()==1
        assert page.locator('[data-td-destination="2-6"]').input_value()=='1'
        page.goto(url+'?partner=2&target=2-6');page.reload();page.wait_for_function('window.reviewReady===true')
        assert page.locator('.tb-refine').evaluate('e=>e.open')
        assert page.locator('[data-tb-remove-anchor="receive"][data-player-id="2-6"]').count()==1
        assert not page.locator('.td-custom').is_visible()
        # A choice that disappears while the sheet is open cannot be applied.
        anchor_count=page.locator('[data-tb-remove-anchor="send"]').count()
        click('[data-trade-picker="send"]')
        candidate=page.locator('.trade-player-picker[open] [data-picker-player]').first
        invalid=candidate.get_attribute('data-picker-player')
        page.evaluate("(id)=>{const select=document.querySelector('[data-tb-add-anchor=\"send\"]');[...select.options].find(o=>o.value===id).remove()}",invalid)
        candidate.click();page.wait_for_function('!document.querySelector(".trade-player-picker").open')
        assert page.locator('[data-tb-remove-anchor="send"]').count()==anchor_count
        # Both motion preferences suppress sheet animations; changing the
        # preference during dismissal still closes the sheet once.
        page.evaluate("async()=>{const {startUiMotion}=await import('/js/ui-motion.js');startUiMotion();window.pickerAnimations=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.classList.contains('trade-player-picker'))window.pickerAnimations.push(frames);return original.call(this,frames,options)};}")
        for preference,reduced in [('off','no-preference'),('on','reduce')]:
            page.emulate_media(reduced_motion=reduced)
            page.evaluate("async preference=>{const {savePageChoice}=await import('/js/page-disclosure.js');savePageChoice('gameday-motion',preference);window.dispatchEvent(new Event('dfl:route-performance'));window.pickerAnimations=[]}",preference)
            click('[data-trade-picker="send"]');assert page.evaluate('window.pickerAnimations.length')==0
            page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".trade-player-picker").open')
        page.emulate_media(reduced_motion='no-preference');page.evaluate("async()=>{const {savePageChoice}=await import('/js/page-disclosure.js');savePageChoice('gameday-motion','on');window.dispatchEvent(new Event('dfl:route-performance'));window.pickerAnimations=[]}")
        click('[data-trade-picker="send"]');assert page.evaluate('window.pickerAnimations.length')>0
        page.locator('[data-picker-close]').click()
        page.evaluate("async()=>{const {savePageChoice}=await import('/js/page-disclosure.js');savePageChoice('gameday-motion','off');window.dispatchEvent(new Event('dfl:route-performance'))}");page.wait_for_function('!document.querySelector(".trade-player-picker").open')
        # Balanced estimates with mixed expert support remain discoverable,
        # and the offer visibly asks for review before it reaches the desk.
        page.evaluate("""()=>{sessionStorage.clear();localStorage.clear();history.replaceState(null,'',location.pathname+'#/trade');for(const player of window.reviewData.pool.values()){player.expertFeedStatus='Fresh';player.expert={rank:12};player.expertDisagreement=true}window.renderReview()}""")
        click('[data-tb-intent="fair"]')
        page.locator('[data-tb-tier="fair"] .tb-offer').first.wait_for()
        assert page.locator('[data-tb-tier="fair"] .tb-offer').count()>0
        assert page.locator('[data-tb-tier="fair"] .tb-offer > header > b').evaluate_all("es=>es.every(e=>e.textContent.includes('REVIEW DATA'))")
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.locator('[data-tb-tier="fair"]').evaluate("e=>e.scrollIntoView({block:'start',behavior:'instant'})")
        page.screenshot(path=str(output/f'trade-{width}-fair-review.png'))
        click('[data-tb-intent="aggressive"]')
        page.wait_for_function("document.querySelector('[data-tb-tier]')?.dataset.tbTier==='aggressive'")
        page.reload();page.wait_for_function('window.reviewReady===true')
        assert page.locator('[data-tb-tier="aggressive"]').evaluate('e=>e.open')
        # Reflow at enlarged type and themes; closing keeps package state.
        page.evaluate("document.documentElement.style.fontSize='200%'")
        for mode in ['dark','light','team:KC']:
            page.evaluate("async mode=>{const theme=await import('/js/theme.js');theme.saveMode(mode)}",mode)
            click('[data-trade-picker="send"]')
            modal=page.locator('.trade-player-picker[open]')
            assert modal.evaluate('e=>e.scrollWidth<=e.clientWidth+1')
            assert modal.locator('[data-picker-close]').is_visible()
            assert modal.locator('[data-picker-list]').evaluate('e=>e.clientHeight>60')
            page.screenshot(path=str(output/f'trade-{width}-large-{mode.replace(":","-")}.png'))
            page.keyboard.press('Escape')
        assert not errors,errors
        results.append({'width':width,'actualRouting':shared,'savedComparisonLimit':3,'reloadPreservedRoutes':True,'counterofferApplied':True,'removedRecipientNeedsChoice':True,'staleOwnershipRejected':True,'pageErrors':errors,'overflow':False})
        context.close()
    browser.close()
server.shutdown()
(output/'trade-review.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
