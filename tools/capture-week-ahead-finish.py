"""Production Home weekly markup and tab controllers; isolated league data."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FIXTURE=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'))
OUT=Path(os.environ.get('DFL_WEEK_FINISH_DIR','/tmp/dfl-week-finish'));OUT.mkdir(parents=True,exist_ok=True)
BASELINE=bool(os.environ.get('DFL_WEEK_BASELINE'))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_GET(self):
  if self.path.split('?')[0]=='/week-finish.html':
   self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write((FIXTURE/'index.html').read_bytes());return
  super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}';checks=[];errors=[]
def check(label,ok):
 checks.append({'check':label,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,label;print('PASS '+label,flush=True)
def align(page):
 page.evaluate('''()=>{const s=document.querySelector('[data-home-week-part="plan"]'),dock=document.querySelector('.home-score-dock'),top=Math.max(44,document.querySelector('.topbar').getBoundingClientRect().bottom)+(dock?.offsetHeight||0);scrollTo({top:s.getBoundingClientRect().top+scrollY-top-12,behavior:'instant'})}''');page.wait_for_timeout(120)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(base) else r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()) if r.request.resource_type=='image' else r.abort())
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/week-finish.html',wait_until='domcontentloaded');page.wait_for_function('window.reviewWeekFlow');page.evaluate('document.fonts.ready')
 page.evaluate('''()=>{reviewStage.suspend('week-finish',true);reviewWeekFlow.stop();document.querySelector('[data-home-week-part="plan"]').open=true}''')
 for mode in ['light','dark']:
  for width in [320,390,768]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('mode=>reviewSetTheme(mode)',mode);page.wait_for_timeout(200)
   for name in ['brief','picks','players','startsit']:
    page.evaluate('document.activeElement?.blur()')
    page.locator(f'[data-week-tab="{name}"]').evaluate('e=>e.click()');page.wait_for_timeout(350);align(page)
    panel=page.locator(f'[data-week-panel="{name}"]');tag=f'{mode}/{width}/{name}'
    check(tag+' only the selected panel is exposed',panel.is_visible() and page.locator('[data-week-panel]:not([hidden])').count()==1 and page.locator(f'[data-week-tab="{name}"]').get_attribute('aria-selected')=='true')
    check(tag+' no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and panel.evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
    contrast=panel.evaluate('e=>reviewTextContrast(e)');check(tag+' text contrast '+json.dumps(contrast['failures']),not contrast['failures'])
    if not BASELINE:
     check(tag+' one compact section header',page.locator('[data-home-week-part="plan"] summary strong').inner_text()=='Week ahead' and page.locator('.home-weekly-digest > header').count()==0)
     check(tag+' week remains visible beside its accessible heading',page.get_by_role('heading',name='Week ahead',exact=True).count()==1 and page.locator('[data-home-week-label]').is_visible() and page.locator('[data-home-week-label]').inner_text()=='Week 5')
    if width==390:page.screenshot(path=str(OUT/f'{mode}-{name}.png'))
    if name=='brief':
     metrics=page.evaluate('''()=>{const s=document.querySelector('[data-home-week-part="plan"]>summary').getBoundingClientRect(),n=document.querySelector('.home-week-tabs').getBoundingClientRect(),h=document.querySelector('.home-brief-headline').getBoundingClientRect();return {headerToTabs:n.top-s.top,headerToLead:h.top-s.top,summaryHeight:s.height}}''')
     (OUT/f'{mode}-{width}-spacing.json').write_text(json.dumps(metrics,indent=2))
     if not BASELINE:check(tag+' useful content follows the header without a second title',metrics['headerToTabs']<=70 and metrics['headerToLead']<=140)
     if not BASELINE:check(tag+' main brief has a clear type hierarchy',panel.locator('.home-brief-headline').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)>=20'))
   page.locator('[data-week-tab="startsit"]').focus();page.keyboard.press('ArrowRight');check(f'{mode}/{width} keyboard wraps to Briefing',page.locator('[data-week-tab="brief"]').get_attribute('aria-selected')=='true')
   page.keyboard.press('End');check(f'{mode}/{width} End selects Start / Sit',page.locator('[data-week-tab="startsit"]').get_attribute('tabindex')=='0')
 if not BASELINE:
  page.evaluate('reviewMountWeek(reviewWeekCases.long)');page.wait_for_timeout(150)
  for mode in ['light','dark']:
   for width in [320,390]:
    page.set_viewport_size({'width':width,'height':844});page.evaluate('mode=>reviewSetTheme(mode)',mode);page.wait_for_timeout(200)
    for size in [16,32]:
     page.evaluate('size=>document.documentElement.style.fontSize=size+"px"',size)
     for name in ['brief','picks','players','startsit']:
      page.evaluate('document.activeElement?.blur()');page.locator(f'[data-week-tab="{name}"]').evaluate('e=>e.click()');page.wait_for_timeout(350);align(page)
      panel=page.locator(f'[data-week-panel="{name}"]');tag=f'{mode}/{width}/{size}px/{name}'
      check(tag+' long names and enlarged text fit',panel.evaluate('e=>e.scrollWidth<=e.clientWidth+1') and page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
      check(tag+' selected tab clears the rail edge cues',page.locator(f'[data-week-tab="{name}"]').evaluate('''e=>{const n=e.parentElement,b=e.getBoundingClientRect(),s=n.getBoundingClientRect(),start=n.scrollLeft>1?18:0,end=n.scrollWidth-n.clientWidth-n.scrollLeft>1?18:0;return b.left>=s.left+start-1&&b.right<=s.right-end+1}'''))
      if name=='picks':
       teams=panel.locator('.home-week-prediction.is-lead .home-prediction-teams>div')
       check(tag+' names stay paired with their exact forecasts',teams.locator('strong').all_text_contents()==['The Very Long Bayou Championship Bombers','Monday Night Mayhem'] and teams.locator('b').all_text_contents()==['124.8','118.2'])
       check(tag+' forecast rows have no filled box',panel.locator('.home-week-prediction').evaluate_all('ns=>ns.every(n=>getComputedStyle(n).backgroundColor==="rgba(0, 0, 0, 0)")'))
       more=panel.locator('.home-outlook-more');more.locator('summary').evaluate('e=>e.click()');check(tag+' all six predictions remain available',panel.locator('.home-week-prediction:visible').count()==6);more.locator('summary').evaluate('e=>e.click()')
      if name=='players':
       for position in ['QB','RB','WR','TE','K','DEF']:
        panel.locator(f'[data-position-tab="{position}"]').evaluate('e=>e.click()');page.wait_for_timeout(80)
        check(tag+'/'+position+' keeps all three ranks and actual/projected labels',panel.locator(f'[data-position-panel="{position}"] li').count()==3 and 'Actual pts' in panel.locator(f'[data-position-panel="{position}"]').inner_text() and 'Projected pts' in panel.locator(f'[data-position-panel="{position}"]').inner_text())
        check(tag+'/'+position+' names and scores never overlap',panel.locator(f'[data-position-panel="{position}"] .home-outlook-player-main').evaluate_all('''nodes=>nodes.every(n=>{const a=n.querySelector('.dfl-player').getBoundingClientRect(),b=n.querySelector('em').getBoundingClientRect();return a.right<=b.left+1||a.bottom<=b.top+1})'''))
      if size==32 and width==320:page.screenshot(path=str(OUT/f'{mode}-large-{name}.png'))
    page.evaluate("document.documentElement.style.fontSize=''")
  for mode in ['light','dark']:
   page.set_viewport_size({'width':390,'height':844});page.evaluate('mode=>reviewSetTheme(mode)',mode);page.evaluate('document.documentElement.dataset.readability="comfortable"');page.wait_for_timeout(200)
   for name in ['brief','players','startsit']:
    page.locator(f'[data-week-tab="{name}"]').evaluate('e=>e.click()');page.wait_for_timeout(350);align(page);panel=page.locator(f'[data-week-panel="{name}"]')
    check(mode+'/'+name+' Comfortable text fits',panel.evaluate('e=>e.scrollWidth<=e.clientWidth+1') and page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    contrast=panel.evaluate('e=>reviewTextContrast(e)');check(mode+'/'+name+' Comfortable contrast '+json.dumps(contrast['failures']),not contrast['failures'])
    if name=='players':check(mode+' Comfortable player detail remains enlarged',panel.locator('[data-position-panel]:not([hidden]) .dfl-player-copy>small').first.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)>=14'))
   page.evaluate('document.documentElement.dataset.readability="compact"')
  for state in ['empty','loading','unavailable']:
   page.evaluate('state=>reviewMountWeek(reviewWeekCases[state])',state);page.wait_for_timeout(100)
   if state=='empty':
    page.locator('[data-week-tab="picks"]').evaluate('e=>e.click()');check('Empty slate has no invented predictions',page.locator('.home-week-prediction').count()==0)
    page.locator('[data-week-tab="startsit"]').evaluate('e=>e.click()');check('A set lineup without swaps remains a hold', page.locator('[data-week-panel="startsit"]').inner_text().count('Hold your lineup')==1)
   else:check(state+' has a compact honest state',page.locator('.home-weekly-digest').evaluate('e=>e.offsetHeight<160') and page.locator('.home-weekly-digest [role="status"]').count()==(1 if state=='loading' else 0))
 check('No browser errors or production writes',not errors);browser.close()
server.shutdown()
