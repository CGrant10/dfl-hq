"""Production broadcast motion, real touch gestures and no provider writes."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
source=Path(__file__).with_name('capture-broadcast-wide.py');scope={'__file__':str(source),'__name__':'onair_review'}
exec(compile(source.read_text().split('with sync_playwright() as p:')[0],str(source),'exec'),scope)
OUT=Path(os.environ.get('DFL_ONAIR_REVIEW_DIR','/workspace/dfl-onair-review'));OUT.mkdir(parents=True,exist_ok=True);checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
  for mode in ['light','dark']:
   c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
   page.goto('http://127.0.0.1:'+str(scope['server'].server_port)+'/');page.wait_for_function('!!window.reviewDeck');page.evaluate('document.fonts.ready')
   page.evaluate('''async mode=>{
    reviewStage.stop();typeof reviewPageMotion==='function'?reviewPageMotion():reviewPageMotion?.stop?.();reviewInjuryPanel?.stop();reviewWeekFlow?.stop();reviewVfx?.stop();reviewSetTheme(mode);
    const {renderStage,startStage}=await import('./js/broadcast-stage.js');
    window.motionDeck=[{id:'news',kind:'news',headline:'League business',body:'The next week is here.',href:'#/clubhouse'},
     {id:'metric',kind:'odds',figure:'38%',figureLabel:'Playoff odds',headline:'On the playoff bubble',href:'#/stakes'},
     {id:'result',kind:'league-story',temporal:'final',headline:'Keep the receipt.',sides:[{name:'The Bayou Bombers',score:'131.22',up:true},{name:'Monday Night Mayhem',score:'120.00'}],href:'#/clubhouse?week=9'},
     {id:'champ',treatment:'champion',headline:'The Bayou Bombers',kicker:'2025 · League champion',href:'#/history'},
     {id:'chip',treatment:'champion',variant:'chip',headline:'Monday Night Mayhem',kicker:'2025 · Chip Eater',href:'#/history'}];
    document.querySelector('#view').innerHTML='<div id="home-wrap" data-home-edition="sports-desk"><div class="home-broadcast"></div></div>';
    window.motionHost=document.querySelector('.home-broadcast');motionHost.innerHTML=renderStage(motionDeck,{editorial:true,wide:true});
    window.motionStage=startStage(document.querySelector('[data-bx-stage]'),motionDeck);motionStage.suspend('motion-test',true);scrollTo(0,0);
    window.card=()=>document.querySelector('.bx-layer>.bx-slide:not(.bx-leaving):not(.bx-preview)');
    window.go=i=>document.querySelector(`[data-bx-go="${i}"]`).click();
   }''',mode)
   page.wait_for_function('document.querySelector("[data-bx-stage]").hasAttribute("data-bx-visible")');page.wait_for_timeout(400);tag=f'{width}-{mode} ';initial_hash=page.evaluate('location.hash')
   page.evaluate('go(1)');page.wait_for_function('card().querySelector(".bx-brief-value").getAnimations().some(a=>a.playState==="running")')
   check(tag+'metric moves as a panel and always shows its actual value',page.evaluate('card().querySelector(".bx-brief-value strong").textContent==="38%"&&new DOMMatrix(getComputedStyle(card().querySelector(".bx-brief-value")).transform).m41>0'))
   page.wait_for_function('!card().classList.contains("bx-in")');check(tag+'arrival releases its finished effects',page.evaluate('card().getAnimations({subtree:true}).length===0'))
   page.evaluate("window.savedCard=card();window.savedValue=card().querySelector('.bx-brief-value');motionDeck[1]={...motionDeck[1],figure:'41%'};motionStage.update(motionDeck)")
   page.wait_for_timeout(80);check(tag+'live corrections preserve the card and do not replay an entrance',page.evaluate('card()===savedCard&&card().querySelector(".bx-brief-value")===savedValue&&savedValue.textContent.includes("41%")&&card().getAnimations({subtree:true}).length===0'))
   page.evaluate('go(2)');page.wait_for_function('card().querySelector(".bx-brief-scores").getAnimations({subtree:true}).some(a=>a.playState==="running")')
   check(tag+'result keeps exact side-by-side scores throughout its entrance',page.locator('.bx-slide:not(.bx-leaving) .bx-brief-scores b').all_text_contents()==['131.22','120.00'])
   page.wait_for_function('!card().classList.contains("bx-in")');page.locator('[data-bx-stage]').screenshot(path=str(OUT/f'result-{width}-{mode}.png'))
   page.evaluate('go(3)');page.wait_for_function('card().querySelector(".bx-brief-art").getAnimations().some(a=>a.playState==="running"&&a.currentTime>15)')
   cdp=c.new_cdp_session(page);rect=page.locator('[data-bx-stage]').bounding_box();x=rect['x']+rect['width']*.75;y=rect['y']+rect['height']*.5
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-24,'y':y}]});page.wait_for_timeout(35)
   page.evaluate('''window.heldFrame=(()=>{const e=card(),a=e.querySelector('.bx-brief-art'),r=e.getBoundingClientRect(),b=a.getBoundingClientRect();return {x:b.x-r.x,y:b.y-r.y,left:r.x,time:a.getAnimations()[0]?.currentTime}})()''')
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-90,'y':y}]});page.wait_for_timeout(90)
   check(tag+'a grabbed entrance stays on its painted frame while the card follows the finger',page.evaluate('''(()=>{const e=card(),a=e.querySelector('.bx-brief-art'),r=e.getBoundingClientRect(),b=a.getBoundingClientRect();return e.classList.contains('bx-dragging')&&Math.abs((b.x-r.x)-heldFrame.x)<1&&Math.abs((b.y-r.y)-heldFrame.y)<1&&Math.abs((heldFrame.left-r.x)-66)<3&&a.getAnimations().every(x=>x.playState==='paused'&&x.currentTime===heldFrame.time)})()'''))
   cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(420)
   check(tag+'the incoming finger-driven card does not start a second entrance',page.locator('[data-bx-go="4"]').get_attribute('aria-current')=='true' and page.evaluate('card().getAnimations({subtree:true}).length===0'))
   page.evaluate('go(3)');page.wait_for_function('card().querySelector(".bx-brief-art").getAnimations().some(a=>a.playState==="running")')
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-25,'y':y}]});page.wait_for_timeout(40);cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
   page.wait_for_function('!card().classList.contains("bx-in")&&!card().classList.contains("bx-dragging")');check(tag+'canceling a swipe resumes and finishes without leaving a faded portrait',page.locator('[data-bx-go="3"]').get_attribute('aria-current')=='true' and page.locator('.bx-slide:not(.bx-leaving)>.bx-brief-art').evaluate('e=>getComputedStyle(e).opacity==="1"&&getComputedStyle(e).transform==="none"'))
   page.evaluate("motionHost.style.marginTop='1500px';scrollTo(0,0)");page.wait_for_function('!document.querySelector("[data-bx-stage]").hasAttribute("data-bx-visible")');page.evaluate('go(1)');page.wait_for_timeout(80)
   before=page.locator('.bx-slide:not(.bx-leaving)>.bx-brief-value').evaluate('e=>e.getAnimations().map(a=>({state:a.playState,time:a.currentTime}))');page.wait_for_timeout(150)
   check(tag+'offscreen panel motion pauses without advancing its clock',before and all(a['state']=='paused' for a in before) and page.locator('.bx-slide:not(.bx-leaving)>.bx-brief-value').evaluate('(e,b)=>JSON.stringify(e.getAnimations().map(a=>({state:a.playState,time:a.currentTime})))===JSON.stringify(b)',before))
   page.evaluate("motionHost.style.marginTop='';scrollTo(0,0)");page.wait_for_function('!card().classList.contains("bx-in")');page.wait_for_timeout(60)
   check(tag+'returning finishes the same entrance and removes the animation fill',page.evaluate('card().getAnimations({subtree:true}).length===0'))
   page.evaluate('go(2)');page.wait_for_function('card().getAnimations({subtree:true}).some(a=>a.playState==="running")');page.emulate_media(reduced_motion='reduce');page.wait_for_function('!card().classList.contains("bx-in")&&!card().getAnimations({subtree:true}).length')
   page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(100);check(tag+'Reduced Motion interrupts cleanly and enabling motion does not replay the card',page.evaluate('!card().classList.contains("bx-in")&&card().getAnimations({subtree:true}).length===0'))
   page.evaluate("document.documentElement.dataset.uiMotion='off';dispatchEvent(new Event('dfl:ui-motion-change'));go(3)");check(tag+'app motion off displays a complete card immediately',page.evaluate('getComputedStyle(card()).opacity==="1"&&!card().classList.contains("bx-enter")&&card().getAnimations({subtree:true}).length===0'))
   page.evaluate("document.documentElement.dataset.uiMotion='on';dispatchEvent(new Event('dfl:ui-motion-change'));go(1);go(2);go(4)");page.wait_for_timeout(450)
   check(tag+'rapid navigation lands once without leaving animation layers',page.locator('.bx-layer>.bx-slide').count()==1 and page.locator('[data-bx-go="4"]').get_attribute('aria-current')=='true' and page.evaluate('card().getAnimations({subtree:true}).length===0'))
   page.evaluate('go(3)');page.wait_for_function('card().getAnimations({subtree:true}).some(a=>a.playState==="running")');page.evaluate('motionStage.stop()');page.wait_for_timeout(120)
   check(tag+'teardown cancels current and pending entrances even with the stage still mounted',page.evaluate('card().getAnimations({subtree:true}).length===0&&!card().classList.contains("bx-enter")'))
   check(tag+'gesture navigation never follows the story link',page.evaluate('location.hash')==initial_hash);check(tag+'no page overflow or script errors',not errors and page.evaluate('document.documentElement.scrollWidth<=innerWidth'));c.close()
 b.close()
scope['server'].shutdown();print(json.dumps({'checks':len(checks),'passed':True}))
