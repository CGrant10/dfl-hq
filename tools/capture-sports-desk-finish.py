"""Real Book ordering, reversible early disclosure and ticket reveal. No league writes."""
from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('DFL_SPORTS_DESK_DIR',root.parent/'dfl-sports-desk-finish'));out.mkdir(parents=True,exist_ok=True);os.environ['DFL_WIRE_BOOK_DIR']=str(out)
p=root/'tools/capture-league-wire-book.py';s=p.read_text();ns={'__file__':str(p)};exec(compile(s[:s.index('with sync_playwright()')],str(p),'exec'),ns)
fixture=ns['fixture']+'''
f.markets.filter(m=>m.category==='Fantasy').forEach(m=>m.status='locked');
f.markets.push({id:3,category:'Fantasy',status:'open',source:'sleeper',auto_key:'matchup:2026:9:1',closes_at:'2099-11-02T23:00:00Z',title:'Early A vs Early B'});
f.outcomes.push({id:5,market_id:3,label:'Early A',odds_american:120},{id:6,market_id:3,label:'Early B',odds_american:-145});
f.bets=[{id:921,status:'open',stake:25,odds_american:120,potential_payout:55,created_at:'2026-11-08T12:00:00Z',legs:[{market_id:1,outcome_id:1,label:'Bayou Bombers',market:'Bayou Bombers vs Klutch Sports Group',odds_american:120,status:'open'}]}];
window.ticketTrace=[];const nativeAnimate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('[data-ticket-preview]'))ticketTrace.push({frames,options});return nativeAnimate.call(this,frames,options)};
'''
checks=[]
def check(name,yes):checks.append({'check':name,'pass':bool(yes)});assert yes,name
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
 for mode in ['light','dark']:
  for width in [320,390]:
   c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block');c.add_init_script(fixture)
   def route(r):
    if r.request.url.startswith(ns['base']):return r.continue_()
    if '/state/nfl' in r.request.url:return r.fulfill(content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body='{"season":"2026","week":8}')
    r.abort()
   c.route('**/*',route);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(ns['base']+'/wire-book.html#/sportsbook',wait_until='domcontentloaded')
   page.evaluate('''async mode=>{document.getElementById('welcome').classList.add('hidden');document.getElementById('splash')?.remove();(await import('/js/theme.js')).pinMode(mode);const motion=await import('/js/ui-motion.js');motion.startUiMotion();motion.mountPageMotion(document.getElementById('view'));window.bookPage=await import('/js/pages/sportsbook.js');await bookPage.render(document.getElementById('view'));}''',mode)
   tag=f'{width}-{mode}';early=page.locator('.sb-early-lines');check(tag+' locked current ahead of closed early',page.locator('[data-fantasy-period=current]').is_visible() and not early.evaluate('e=>e.open') and not early.locator('[data-bet-outcome]').first.is_visible() and page.locator('[data-fantasy-period=current]').bounding_box()['y']<early.bounding_box()['y'])
   page.screenshot(path=str(out/f'{tag}-current.png'));early.locator('summary').click();page.wait_for_timeout(320);check(tag+' early expands and prices selectable',early.locator('[data-bet-outcome="5"]').is_visible());early.locator('[data-bet-outcome="5"]').click();early.locator('summary').click();page.wait_for_timeout(320);check(tag+' early closes without dropping draft',not early.evaluate('e=>e.open') and page.locator('[data-slip-open]').count()==1);page.locator('[data-slip-clear]').click()
   early.locator('summary').focus();page.keyboard.press('Enter');page.wait_for_timeout(320);check(tag+' keyboard expands early',early.evaluate('e=>e.open'));early.locator('summary').click();page.wait_for_timeout(60);early.locator('summary').click();page.wait_for_timeout(320);check(tag+' interrupted disclosure settles',early.evaluate('e=>e.open') and not early.evaluate('e=>e.getAnimations().length'))
   page.locator('[data-sb-view=tickets]').click();page.wait_for_timeout(350)
   for pref in ['on','off','reduce']:
    page.emulate_media(reduced_motion='reduce' if pref=='reduce' else 'no-preference');page.evaluate('pref=>{document.documentElement.dataset.uiMotion=pref;ticketTrace.length=0}', 'off' if pref=='off' else 'on')
    button=page.locator('[data-share-ticket="921"]');button.scroll_into_view_if_needed();page.wait_for_timeout(100);sy=page.evaluate('scrollY');button.click();dialog=page.locator('.dfl-share-preview');dialog.wait_for();page.wait_for_selector('[data-share-send]:not(:disabled)');page.wait_for_timeout(350)
    check(tag+' '+pref+' printed receipt opens',dialog.locator('h2').inner_text()=='Bet slip' and dialog.locator('canvas').get_attribute('data-share-template')=='ticket')
    check(tag+' '+pref+' motion preference honored',page.evaluate('ticketTrace.length>0') if pref=='on' else page.evaluate('ticketTrace.length===0'))
    check(tag+' '+pref+' no overflow',not dialog.evaluate('e=>e.scrollWidth>e.clientWidth+1'))
    if pref=='on':page.screenshot(path=str(out/f'{tag}-ticket.png'))
    page.keyboard.press('Escape');page.keyboard.press('Escape');page.wait_for_selector('.dfl-share-preview',state='detached');facts={'focus':button.evaluate('e=>e===document.activeElement'),'before':sy,'after':page.evaluate('scrollY')};print(tag,pref,facts,flush=True);check(tag+' '+pref+' close returns focus and scroll',facts['focus'] and abs(facts['after']-sy)<2)
   page.emulate_media(reduced_motion='no-preference');page.evaluate('document.documentElement.dataset.uiMotion="on"')
   page.locator('[data-share-ticket="921"]').click();page.wait_for_selector('.dfl-share-preview');page.keyboard.press('Escape');page.wait_for_selector('.dfl-share-preview',state='detached');page.wait_for_timeout(250);check(tag+' immediate dismissal stays closed',not page.locator('.dfl-share-preview').count())
   page.locator('[data-share-ticket="921"]').click();page.wait_for_selector('.dfl-share-preview');page.evaluate('location.hash="#/review-route"');page.wait_for_selector('.dfl-share-preview',state='detached');check(tag+' route clears ticket motion',not page.evaluate('document.getAnimations().some(a=>a.effect?.target?.matches?.("[data-ticket-preview]"))'))
   check(tag+' no errors or writes',not errors and not page.evaluate('bookFixture.writes.length'));c.close()
 b.close()
ns['server'].shutdown();(out/'checks.json').write_text(json.dumps(checks,indent=2));print(str(len(checks))+' interaction checks passed')
