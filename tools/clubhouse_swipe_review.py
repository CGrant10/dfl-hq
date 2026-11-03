"""Real pointer gestures against the production Clubhouse with six matchups."""
def review_matchup_swipes(page,context,check,out,tag,width,mode):
 cdp=context.new_cdp_session(page)
 # Observe finite WAAPI launches rather than sampling a short animation after it
 # may already have finished on a busy runner.
 page.evaluate('''()=>{window.clubhouseLogoMotions=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){const result=animate.call(this,frames,options);if(this.matches('.dfl-team-mark')&&Array.isArray(frames)&&frames.some(k=>String(k.transform).includes('rotate')))window.clubhouseLogoMotions.push({duration:options?.duration,transformOnly:frames.every(k=>Object.keys(k).every(key=>['transform','offset'].includes(key)))});return result}}''')
 selected=lambda:page.locator('.clubhouse-matchup-strip [aria-pressed="true"]').get_attribute('data-clubhouse-game')
 def drag(direction,finish=True,delay=380,partial=False):
  pane=page.locator('[data-clubhouse-matchup]:not([hidden])').first
  target=pane.locator('.gd-lineup-pairs .gd-compare-row').first
  target.scroll_into_view_if_needed();b=target.bounding_box()
  x=b['x']+b['width']*(.82 if direction==1 else .18);end=b['x']+b['width']*(.18 if direction==1 else .82);y=b['y']+min(b['height']/2,30)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  for step in range(1,9):
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+(end-x)*step/8,'y':y}]});page.wait_for_timeout(18)
   if partial and step==5:
    check(tag+' matchup follows the finger',pane.evaluate('e=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(e).transform).m41)>20'))
    check(tag+' adjacent matchup preview is inert and contains its lineup',page.locator('.dfl-tab-preview').evaluate('e=>e.inert&&e.getAttribute("aria-hidden")==="true"&&!!e.querySelector(".gd-lineup-pairs")&&!e.querySelector("[id]")'))
    page.screenshot(path=str(out/f'{width}-{mode}-matchup-drag.png'))
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd' if finish else 'touchCancel','touchPoints':[]});page.wait_for_timeout(delay)
  if delay>=350:page.wait_for_function('!document.querySelector(".dfl-tab-preview,.dfl-tab-grab,[data-ui-swipe-settling]")',timeout=3000)
 check(tag+' all six fantasy matchups are available',page.locator('.clubhouse-matchup-strip [data-clubhouse-game]').count()==6)
 check(tag+' the matchup strip replaces the dropdown and duplicate score drawer',page.locator('[data-matchup-select],.clubhouse-all-scores').count()==0 and page.locator('.clubhouse-matchup-strip').is_visible())
 drag(1,partial=True)
 check(tag+' swiping changes matchup without changing the Clubhouse tab',selected()=='2' and page.locator('#clubhouse-tab-matchups').get_attribute('aria-selected')=='true')
 check(tag+' swipe updates the exact matchup route',page.evaluate('new URLSearchParams(location.hash.split("?")[1]).get("matchup")==="2"'))
 check(tag+' paging removes its temporary layers',page.locator('.dfl-tab-preview,.dfl-tab-grab,[data-ui-swipe-settling]').count()==0)
 check(tag+' swiping a player row does not open its player card',page.locator('.dfl-player-card[open]').count()==0)
 check(tag+' arriving logos have a short transform-only shake',page.evaluate('window.clubhouseLogoMotions.some(a=>a.duration===280&&a.transformOnly)'))
 drag(-1);check(tag+' reverse swipe returns to the first matchup',selected()=='1')
 drag(-1);check(tag+' the first edge settles without wrapping',selected()=='1')
 drag(1,finish=False);check(tag+' cancelled touches keep the selected matchup',selected()=='1' and page.locator('.dfl-tab-preview').count()==0)
 for expected in range(2,7):
  drag(1);check(tag+f' swipe reaches matchup {expected}',selected()==str(expected))
 drag(1);check(tag+' the last edge settles without wrapping',selected()=='6')
 page.wait_for_function('''()=>{const rail=document.querySelector('.clubhouse-matchup-strip'),b=rail.querySelector('[aria-pressed="true"]').getBoundingClientRect(),r=rail.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1}''')
 check(tag+' the active matchup is revealed in the strip',True)
 tile=page.locator('.clubhouse-matchup-strip [aria-pressed="true"]');tile.focus();page.keyboard.press('Home')
 check(tag+' Home selects the first tile without changing tabs',selected()=='1' and page.locator('#clubhouse-tab-matchups').get_attribute('aria-selected')=='true')
 page.keyboard.press('ArrowRight');check(tag+' arrow keys browse the visible matchup strip',selected()=='2')
 page.locator('.clubhouse-matchup-strip [data-clubhouse-game="1"]').evaluate('e=>e.click()')
 drag(1,delay=65);drag(-1)
 check(tag+' interrupting an arrival with a reverse swipe stays smooth',selected()=='1' and page.locator('.dfl-tab-preview,.dfl-tab-grab,[data-ui-swipe-settling]').count()==0)
 drag(1,delay=65);page.locator('.clubhouse-matchup-strip [data-clubhouse-game="1"]').evaluate('e=>e.click()');page.wait_for_timeout(350)
 check(tag+' tile selection interrupts a moving matchup cleanly',selected()=='1' and page.locator('.dfl-tab-preview').count()==0)
 # A vertical touch scrolls the page, never the outer Clubhouse tab or matchup.
 row=page.locator('[data-clubhouse-matchup="1"] .gd-lineup-pairs .gd-compare-row').first;row.scroll_into_view_if_needed();b=row.bounding_box();y=b['y']+min(b['height']/2,30);x=b['x']+b['width']/2
 before=page.evaluate('scrollY');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for step in range(1,7):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+3,'y':y-step*12}]});page.wait_for_timeout(20)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(250)
 check(tag+' vertical scrolling remains native',selected()=='1' and page.evaluate('scrollY')>before+20)
 before_reduced=page.evaluate('window.clubhouseLogoMotions.length');page.emulate_media(reduced_motion='reduce');drag(1)
 check(tag+' Reduced Motion retains swipe navigation without transition layers',selected()=='2' and page.locator('.dfl-tab-preview,[data-ui-swipe-settling]').count()==0)
 check(tag+' Reduced Motion disables the logo shake',page.evaluate('window.clubhouseLogoMotions.length')==before_reduced and page.locator('.clubhouse-matchup-strip .dfl-team-mark,.clubhouse-team-mark').evaluate_all('ns=>ns.every(n=>n.getAnimations().every(a=>a.playState!=="running"))'))
 page.emulate_media(reduced_motion='no-preference')
 page.screenshot(path=str(out/f'{width}-{mode}-matchup-swiped.png'))
 check(tag+' swiping never creates horizontal page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
