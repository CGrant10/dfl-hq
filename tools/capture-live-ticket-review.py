"""Real compact-ticket UI with isolated stats/account updates and no league writes."""
from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('DFL_LIVE_TICKET_DIR',root.parent/'dfl-live-ticket-review'));out.mkdir(parents=True,exist_ok=True);os.environ['DFL_WIRE_BOOK_DIR']=str(out)
p=root/'tools/capture-league-wire-book.py';s=p.read_text();ns={'__file__':str(p)};exec(compile(s[:s.index('with sync_playwright()')],str(p),'exec'),ns)
fixture=ns['fixture']+'''
const prop=(name,score,side='over')=>({market_id:10,outcome_id:100,label:name,market:side+' 82.5 receiving yards',accepted_line:82.5,provider_line:85.5,provider_score:score,provider_side:side,odds_american:-110,market_status:'locked',category:'Player Props',status:'open'});
const sourceRpc=f.db.rpc;f.db.rpc=async(...args)=>structuredClone(await sourceRpc(...args));
f.bets=[{id:921,status:'open',stake:25,potential_payout:105,odds_american:320,legs:[prop('Ja’Marr Chase',63),prop('Mike Evans',35,'under')]},{id:922,status:'open',stake:25,potential_payout:105,odds_american:320,legs:Array.from({length:6},(_,i)=>({...prop('Selected player '+(i+1),null),status:i===5?'lost':'won'}))},{id:923,status:'open',stake:10,potential_payout:20,odds_american:100,legs:[prop('Waiting player',null)]}];
'''
checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(out/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
 for theme in ['light','dark']:
  for width in [320,390]:
   c=b.new_context(viewport={'width':width,'height':844},has_touch=True,is_mobile=True,service_workers='block');c.add_init_script(fixture)
   def route(r):
    if r.request.url.startswith(ns['base']):return r.continue_()
    if '/state/nfl' in r.request.url:return r.fulfill(content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body='{"season":"2026","week":8}')
    r.abort()
   c.route('**/*',route);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(ns['base']+'/wire-book.html#/sportsbook',wait_until='domcontentloaded')
   page.evaluate('''async theme=>{document.getElementById('welcome').classList.add('hidden');document.getElementById('splash')?.remove();(await import('/js/theme.js')).pinMode(theme);const m=await import('/js/ui-motion.js');m.startUiMotion();m.mountPageMotion(document.querySelector('#view'));window.bookPage=await import('/js/pages/sportsbook.js');await bookPage.render(document.querySelector('#view'));}''',theme);page.locator('[data-sb-view=tickets]').click();page.wait_for_timeout(350)
   tag=f'{width}-{theme}';card=page.locator('#sb-ticket-921');bar=card.locator('[role=progressbar]').first
   check(tag+' accepted line and real stat readable','63 / 82.5' in card.inner_text() and bar.get_attribute('aria-valuemax')=='82.5')
   check(tag+' under has correct winning state',card.locator('[data-leg-index="1"]').get_attribute('data-leg-tone')=='winning')
   check(tag+' no fake progress for unknown stat',page.locator('#sb-ticket-923 [role=progressbar]').count()==0)
   risk=page.locator('#sb-ticket-922');check(tag+' six-pick miss is in bounded preview',risk.locator('.sb-leg').count()==2 and 'Selected player 6' in risk.inner_text() and 'View all 6' in risk.inner_text())
   check(tag+' provisional payout remains estimated','MISS · PENDING' in risk.inner_text() and 'Est. return' in risk.inner_text() and '0' in risk.locator('.sb-ticket-return').inner_text() and page.locator('[data-book-balance]').inner_text()=='420')
   contrast=card.evaluate('async e=>(await import("/tools/home-review-contrast.js")).reviewTextContrast(e)');check(tag+' live labels contrast',not contrast['failures']);page.screenshot(path=str(out/f'{tag}-tickets.png'));check(tag+' no page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.evaluate('window.sameFill=document.querySelector("#sb-ticket-921 [role=progressbar]>span");bookFixture.bets[0].legs[0].provider_score=90;dispatchEvent(new Event("focus"))');page.wait_for_function('document.querySelector("#sb-ticket-921").innerText.includes("90 / 82.5")')
   check(tag+' live patch preserves accepted target and keyed fill',bar.get_attribute('aria-valuemax')=='82.5' and page.evaluate('sameFill===document.querySelector("#sb-ticket-921 [role=progressbar]>span")'))
   page.emulate_media(reduced_motion='reduce');check(tag+' reduced motion disables progress transition',bar.locator('span').evaluate('e=>getComputedStyle(e).transitionDuration==="0s"'))
   page.evaluate('document.documentElement.style.fontSize="32px"');page.wait_for_timeout(150);page.screenshot(path=str(out/f'{tag}-large.png'));check(tag+' enlarged text remains within ticket bounds',page.evaluate('document.documentElement.scrollWidth<=innerWidth') and page.locator('.sb-ticket').evaluate_all('es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'));page.evaluate('document.documentElement.style.fontSize=""')
   risk.locator('[data-share-ticket]').click();page.wait_for_selector('.dfl-share-preview canvas');check(tag+' full receipt keeps all six accepted picks',page.locator('.dfl-share-preview canvas').evaluate('c=>{const t=c.shareLayoutFacts.text.map(v=>v.text).join(" ");return t.includes("Selected player 1")&&t.includes("Selected player 6")&&t.includes("0 SIN")}'));page.keyboard.press('Escape');page.wait_for_selector('.dfl-share-preview',state='detached')
   check(tag+' no errors or league writes',not errors and not page.evaluate('bookFixture.writes.length'));c.close()
 b.close()
ns['server'].shutdown();print(str(len(checks))+' live-ticket checks passed')
