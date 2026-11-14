"""Production trade handlers and Home decisions; isolated providers, no writes."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
source=Path(__file__).with_name('capture-trade-review.py')
scope={'__file__':str(source),'__name__':'everyday_review'}
exec(compile(source.read_text().split('with sync_playwright() as p:')[0],str(source),'exec'),scope)
OUT=Path(os.environ.get('DFL_EVERYDAY_REVIEW_DIR','/workspace/dfl-everyday-review'));OUT.mkdir(parents=True,exist_ok=True);checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
  for mode in ['light','dark']:
   c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(content_type='image/png',body=(scope['root']/'tools/fixtures/player-portrait.png').read_bytes()) if r.request.resource_type=='image' else r.abort())
   page.goto(scope['url']);page.wait_for_function('window.reviewReady');page.evaluate('document.fonts.ready');page.evaluate("async mode=>(await import('/js/theme.js')).pinMode(mode)",mode);tag=f'{width}-{mode} '
   page.evaluate("async()=>{const m=await import('/js/ui-motion.js');m.startUiMotion();window.stopEverydayMotion=m.mountPageMotion(document.querySelector('#view'))}")
   page.locator('.trade-watch>summary').click();page.locator('.trade-watch>summary').evaluate('e=>{e.click();e.click()}');page.wait_for_timeout(350)
   check(tag+'rapid disclosure reversals settle once without leftover height motion',page.locator('.trade-watch').evaluate('e=>e.open&&e.getAnimations().length===0'))
   name=page.evaluate("reviewData.pool.get('2-3').name")
   page.locator('[data-tw-search]').fill(name);page.locator('[data-tw-results] [data-tw-add="2-3"]').click()
   check(tag+'real search saves a target and leaves the search usable',page.locator('.trade-watch-list [data-tw-shop="2-3"]').count()==1 and page.locator('[data-tw-search]').evaluate('e=>e===document.activeElement'))
   page.locator('.tb-setup').evaluate('e=>e.open=true');page.locator('[data-tb-receive-preset="flex-skill"]').click()
   page.reload();page.wait_for_function('window.reviewReady');page.evaluate("async mode=>(await import('/js/theme.js')).pinMode(mode)",mode);page.locator('.tb-setup').evaluate('e=>e.open=true')
   check(tag+'new visits remember positions while searching every team',page.locator('[data-tb-receive-position]:checked').evaluate_all('es=>es.map(e=>e.value)')==['RB','WR'] and page.locator('[data-ta-shop-partner]').input_value()=='all')
   page.locator('.trade-watch').evaluate('e=>e.open=true');check(tag+'target survives a fresh visit',page.locator('[data-tw-shop="2-3"]').count()==1)
   page.locator('.trade-watch').evaluate('e=>scrollBy(0,e.getBoundingClientRect().top-70)')
   page.wait_for_function("!document.getAnimations().some(a=>a.constructor.name==='CSSTransition'&&/color/.test(a.transitionProperty))")
   contrast=page.evaluate("async()=>{const{reviewTextContrast}=await import('/tools/home-review-contrast.js');return reviewTextContrast(document.querySelector('.trade-watch'))}");check(tag+'target text keeps theme contrast',not contrast['failures'])
   page.screenshot(path=str(OUT/f'targets-{width}-{mode}.png'))
   check(tag+'targets have usable phone controls and no overflow',page.locator('.trade-watch button').evaluate_all('es=>es.filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=44&&e.getBoundingClientRect().width>=44)') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.locator('[data-tw-shop="2-3"]').click();check(tag+'find offers uses the actual owner and selected target',page.locator('[data-ta-shop-partner]').input_value()=='2' and page.locator('[data-tb-remove-anchor="receive"][data-player-id="2-3"]').count()==1)
   # Save a real generated package, then alter its actual player availability.
   page.locator('[data-tb-remove-anchor="receive"]').first.click();page.locator('[data-ta-shop-partner]').select_option('all');page.wait_for_selector('.tb-offer [data-tb-save]',timeout=30000);page.locator('.tb-offer [data-tb-save]').first.click()
   check(tag+'offer saves a durable comparison baseline',page.evaluate("JSON.parse(localStorage.getItem('dfl.trade.proposals.v1.trade-review.2026'))[0].baseline.players!=null"))
   page.evaluate("const row=JSON.parse(localStorage.getItem('dfl.trade.proposals.v1.trade-review.2026'))[0];reviewData.pool.get(row.sends[1][0]).injuryStatus='IR';renderReview()")
   page.locator('[data-td-compare]').click();check(tag+'saved offer flags changed availability',page.locator('.td-saved-changes').inner_text().find('availability changed')>=0)
   page.screenshot(path=str(OUT/f'saved-{width}-{mode}.png'))
   page.locator('.trade-watch').evaluate('e=>e.open=true');page.locator('[data-tw-remove="2-3"]').click();check(tag+'remove persists and restores search focus',page.locator('[data-tw-remove="2-3"]').count()==0 and page.locator('[data-tw-search]').evaluate('e=>e===document.activeElement'))
   page.evaluate('''async()=>{
    window.stopEverydayMotion?.();
    const m=await import('/js/home-daily-desk.js');window.daily=m;window.dailyInput={outlook:{week:7},now:new Date('2026-10-20T18:00Z'),briefing:{actionKind:'waiver',action:'Add the useful receiver · keep your depth',actionUrl:'#/analyzer'}};
    const view=document.querySelector('#view');view.dataset.route='home';view.innerHTML='<div id="home-wrap" data-home-layout="wire"><div data-home-focus-slot></div><div style="height:1000px"></div></div>';
    window.dailyHost=view.querySelector('[data-home-focus-slot]');dailyHost.innerHTML=m.homeDailyDeskMarkup(dailyInput);scrollTo(0,0);
   }''')
   page.locator('[data-home-primary]').focus();page.evaluate("dailyInput.briefing={actionKind:'hold',action:'Hold your depth · no worthwhile upgrade',actionUrl:'#/analyzer?owner=1'};daily.updateHomeDailyDesk(dailyHost,dailyInput)")
   check(tag+'Home advice refresh keeps the focused control',page.locator('[data-home-primary]').evaluate("e=>e===document.activeElement&&e.textContent.includes('Hold your depth')"))
   check(tag+'Home daily action uses a real league day and compact readable controls',page.locator('.home-daily-focus h2').text_content()=='Waiver day' and page.locator('[data-home-primary]').evaluate('e=>e.getBoundingClientRect().height>=44&&e.scrollWidth<=e.clientWidth') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.screenshot(path=str(OUT/f'home-{width}-{mode}.png'))
   page.evaluate("document.documentElement.style.fontSize='32px'");check(tag+'200 percent text reflows without clipping',page.evaluate('document.documentElement.scrollWidth<=innerWidth') and page.locator('[data-home-primary]').evaluate('e=>e.scrollWidth<=e.clientWidth'));page.screenshot(path=str(OUT/f'home-large-{width}-{mode}.png'));page.evaluate("document.documentElement.style.fontSize='16px'")
   page.emulate_media(reduced_motion='reduce');page.evaluate("dailyInput.briefing.action='Start the healthy bench receiver';daily.updateHomeDailyDesk(dailyHost,dailyInput)")
   check(tag+'reduced-motion advice refresh has no entrance or score animation',page.locator('.home-daily-focus').evaluate('e=>e.getAnimations({subtree:true}).length===0'))
   page.evaluate("async()=>{const {errorBox}=await import('/js/ui.js');document.querySelector('#view').innerHTML=errorBox(Error('League data unavailable'))}")
   check(tag+'shared errors always provide recovery with phone-size controls',page.locator('[data-retry-page]').evaluate('e=>e.getBoundingClientRect().height>=44') and page.locator('a[href="#/home"]').count()==1)
   page.screenshot(path=str(OUT/f'error-{width}-{mode}.png'));check(tag+'no browser errors',not errors);c.close()
 b.close()
scope['server'].shutdown();print(json.dumps({'checks':len(checks),'passed':True}))
