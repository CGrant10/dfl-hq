"""Exercise the shipped rankings controller in the production Home fixture."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

fixture = Path(__file__).with_name('capture-home-review.py')
scope = {'__file__':str(fixture),'__name__':'power_review_server'}
exec(compile(fixture.read_text().split('with sync_playwright() as p:')[0],str(fixture),'exec'),scope)
out = scope['OUT']
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    context.route('**/npm/@supabase/supabase-js@*/+esm',lambda r:r.fulfill(status=200,content_type='text/javascript',body='export function createClient(){throw Error("Backend disabled in review")}'))
    # Exercise actual CDN URL selection/failure behavior without a network dependency.
    def portrait(route):
        if 'broken' in route.request.url:
            route.fulfill(status=404,body='Missing portrait')
        else:
            route.fulfill(status=200,content_type='image/png',body=(source_root/'tools/fixtures/player-portrait.png').read_bytes())
    source_root=Path(__file__).resolve().parents[1]
    context.route('https://sleepercdn.com/**',portrait)
    page = context.new_page()
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(scope['url'],wait_until='networkidle')
    page.wait_for_function('!!window.reviewStage')
    page.evaluate("window.reviewStage.suspend('power-review',true)")
    page.evaluate("()=>{window.powerMotionStarts=0;const original=Element.prototype.animate;Element.prototype.animate=function(...args){if(this.closest('.power-edition'))window.powerMotionStarts++;return original.apply(this,args)}}")
    page.evaluate("async()=>{const {buildPowerBoards}=await import('./js/league-power-model.js');const {currentAnalyzerRoster}=await import('./js/analyzer-league-context.js');const {powerRankingsMarkup,mountPowerRankings}=await import('./js/league-power-ui.js');window.powerReviewMount=()=>{window.reviewPowerStop?.();const root=document.querySelector('[data-home-rankings-slot]');root.innerHTML=powerRankingsMarkup(window.reviewPowerRankings);window.reviewPowerStop=mountPowerRankings(root,window.reviewPowerRankings)};const teams=Array.from({length:12},(_,i)=>({id:String(i+1),roster_id:i+1,team_name:i===8?'The Bastards of the Very Long Championship Team Name':i===0?'<script>Team One</script>':'DFL Team '+(i+1),powerForecast:{complete:true,points:120+i}}));teams.forEach((t,i)=>{const owner='review-owner-'+i,custom=i===8||i===11?'https://sleepercdn.com/uploads/broken-team.jpg':i%2?'https://sleepercdn.com/uploads/team-'+i+'.jpg':null;Object.assign(t,currentAnalyzerRoster({...t,sleeper_user_id:owner},i===11?{profile_image:'https://sleepercdn.com/uploads/dfl-profile.jpg'}:null,[{user_id:owner,metadata:{team_name:t.team_name,avatar:custom},avatar:i===10?null:i===11?'broken-owner':'owner-avatar-'+i}]))});const matchups=Array.from({length:4},(_,w)=>Array.from({length:6},(_,i)=>({season:2026,week:w+1,roster1:i+1,roster2:i+7,score1:80+i*8+(w===3?i*12:0),score2:100+i*4-(w===3?i*8:0)}))).flat();window.reviewPowerRankings={focus:{id:'9'},allTeams:teams,powerRankings:buildPowerBoards({teams,matchups,currentWeek:5,season:2026})};powerReviewMount()}")
    page.evaluate("document.addEventListener('click',e=>{(window.powerClicks||=[]).push({target:e.target.outerHTML.slice(0,200),inert:!!e.target.closest('[inert]')})},true)")
    def open_report(programmatic=False):
        row=page.locator('.power-edition .is-me')
        expand=row.locator('[data-power-expand]')
        if expand.get_attribute('aria-expanded')!='true':expand.evaluate('e=>e.click()')
        action=row.locator('[data-power-team]')
        if programmatic:action.evaluate('e=>e.click()')
        else:action.click()
        if not page.locator('dialog.power-detail').count():
            page.screenshot(path=str(out/'power-report-failure.png'))
            raise AssertionError({'errors':errors,'clicks':page.evaluate('window.powerClicks.slice(-5)'), 'state':row.evaluate('e=>({class:e.className,preview:e.querySelector("[data-power-preview]").outerHTML.slice(0,250)})')})
    card=page.locator('.power-edition')
    card.scroll_into_view_if_needed();page.wait_for_timeout(800)
    assert page.locator('.power-edition>ol>li:visible .power-team-link').count()==4
    assert page.locator('.power-edition .is-me').is_visible()
    assert page.locator('.power-edition script').count()==0
    page.wait_for_function("()=>document.querySelector('[data-power-id=\"9\"] img')?.currentSrc.endsWith('/owner-avatar-8')&&document.querySelector('[data-power-id=\"9\"] .has-photo')")
    page.wait_for_function("()=>document.querySelector('[data-power-id=\"12\"] img')?.currentSrc.endsWith('/dfl-profile.jpg')&&document.querySelector('[data-power-id=\"12\"] .has-photo')")
    assert page.locator('[data-power-id="11"] img').count()==0
    assert page.locator('[data-power-id="11"] .dfl-team-mark i').inner_text()=='DT'
    assert page.locator('[data-power-id="6"] img').get_attribute('src').endswith('/team-5.jpg')
    results.append({'photos':'current team, owner, DFL profile, initials; broken URLs fall through without loops'})
    # The new snapshot is an intrinsic, reversible disclosure with one open row.
    for theme in ['light','dark']:
        page.evaluate('(theme)=>window.reviewSetTheme(theme)',theme)
        for width in [320,390]:
            page.set_viewport_size({'width':width,'height':900})
            mine=card.locator('.is-me');expand=mine.locator('[data-power-expand]');panel=mine.locator('[data-power-preview]')
            mine.scroll_into_view_if_needed();folded=mine.bounding_box()['height']
            expand.evaluate('e=>e.click()');page.wait_for_timeout(85);mid=mine.bounding_box()['height'];page.wait_for_timeout(230);full=mine.bounding_box()['height']
            assert folded+2<mid<full-2,(theme,width,folded,mid,full)
            assert expand.get_attribute('aria-expanded')=='true' and not panel.evaluate('e=>e.inert')
            assert panel.locator('.power-preview-form [role=listitem]').count()==3
            assert not page.evaluate('window.reviewTextContrast(document.querySelector(".is-me")).failures'),(theme,width,'snapshot contrast')
            card.screenshot(path=str(out/f'power-snapshot-{theme}-{width}.png'))
            panel.locator('[data-power-team]').focus();expand.evaluate('e=>e.click()')
            assert panel.evaluate('e=>e.inert') and expand.evaluate('e=>e===document.activeElement')
            page.wait_for_timeout(85);reversal=mine.evaluate('e=>{const before=e.getBoundingClientRect().height;e.querySelector("[data-power-expand]").click();return {before,after:e.getBoundingClientRect().height}}')
            assert abs(reversal['before']-reversal['after'])<2,(theme,width,'snapshot reversal jumped',reversal)
            page.wait_for_timeout(300);assert abs(mine.bounding_box()['height']-full)<2
            other=card.locator('[data-power-expand]').first;other.evaluate('e=>e.click()')
            assert panel.evaluate('e=>e.inert') and card.locator('.is-snapshot-open').count()==1
            other.evaluate('e=>e.click()');page.wait_for_timeout(300)
            assert abs(mine.bounding_box()['height']-folded)<2
            assert mine.locator('.power-team-link').get_attribute('href')=='#/clubhouse?tab=matchups&roster=9'
            results.append({'theme':theme,'width':width,'snapshot':'finite expansion; continuous reversal; one open row; immediate inert/focus; full report; correct Clubhouse roster','contrast':True})
    for theme in ['light','dark']:
        page.evaluate('(theme)=>window.reviewSetTheme(theme)',theme)
        for width in [320,390,768]:
            page.set_viewport_size({'width':width,'height':900})
            card.evaluate("e=>window.scrollTo({top:scrollY+e.getBoundingClientRect().top-240,behavior:'instant'})");page.wait_for_timeout(120)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,width)
            rects=card.locator('button:visible,a:visible').evaluate_all('(nodes)=>nodes.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,overflow:e.scrollWidth>e.clientWidth+1}))')
            assert all(r['w']>=44 and r['h']>=44 and not r['overflow'] for r in rects),(theme,width,rects)
            card.screenshot(path=str(out/f'power-{theme}-{width}.png'))
            open_report()
            dialog=page.locator('dialog.power-detail')
            dialog.wait_for(state='visible')
            assert dialog.is_visible(),(theme,width,errors,page.locator('.is-me [data-power-expand]').get_attribute('aria-expanded'),page.locator('dialog.power-detail').count())
            page.wait_for_function("()=>document.querySelector('.power-detail-face img')?.complete&&document.querySelector('.power-detail-face.has-photo')")
            assert 'The Bastards of the Very Long Championship Team Name' in dialog.text_content(), dialog.text_content()
            assert dialog.evaluate('e=>e.scrollWidth<=e.clientWidth'),(theme,width)
            assert page.evaluate('document.activeElement.matches("[data-power-close]")')
            page.keyboard.press('Tab')
            assert page.evaluate('document.activeElement.closest("dialog")!==null')
            dialog.screenshot(path=str(out/f'power-detail-{theme}-{width}.png'))
            page.keyboard.press('Escape');dialog.wait_for(state='detached')
            assert page.evaluate('document.activeElement.closest(".is-me")!==null')
            page.locator('.power-edition .is-me [data-power-expand]').evaluate('e=>e.click()');page.wait_for_timeout(280)
            results.append({'theme':theme,'width':width,'rows':4,'detail':'focus, Escape, full name, no overflow','targets':len(rects)})
    # The actual team mark connects both ways, including an interrupted opening.
    page.set_viewport_size({'width':390,'height':844})
    for theme in ['light','dark']:
        page.evaluate('(theme)=>window.reviewSetTheme(theme)',theme)
        card.evaluate("e=>window.scrollTo({top:scrollY+e.getBoundingClientRect().top-180,behavior:'instant'})");page.wait_for_timeout(150)
        open_report(True)
        origin=page.wait_for_function("""()=>{const e=document.querySelector('.dfl-connected-artwork'),a=e?.getAnimations()[0];if(!a)return false;a.pause();a.currentTime=140;return e.getBoundingClientRect().toJSON()}""").json_value()
        assert page.locator('.dfl-connected-artwork img').evaluate('e=>e.complete&&e.naturalWidth>0')
        page.screenshot(path=str(out/f'power-connected-{theme}.png'))
        returned=page.evaluate("""()=>{document.querySelector('[data-power-close]').click();const e=document.querySelector('.dfl-connected-artwork'),a=e.getAnimations()[0],sheet=document.querySelector('.power-detail'),exit=sheet.getAnimations()[0];a.pause();a.currentTime=0;const box=e.getBoundingClientRect().toJSON(),end=new DOMMatrixReadOnly(exit.effect.getKeyframes().at(-1).transform).m42;a.play();return {box,end,duration:exit.effect.getTiming().duration}}""")
        assert all(abs(origin[k]-returned['box'][k])<1 for k in ['x','y','width','height']),(origin,returned)
        assert abs(returned['end'])<=8 and returned['duration']==280,returned
        page.wait_for_function('!document.querySelector(".power-detail,.dfl-connected-artwork")')
        assert page.locator('.power-edition .is-me .dfl-team-mark').evaluate("e=>e.style.visibility!=='hidden'")
        results.append({'theme':theme,'teamMotion':'loaded photo; continuous reversal; synchronized quiet close; no hidden source'})
    open_report(True)
    page.wait_for_selector('.dfl-connected-artwork')
    page.evaluate('window.reviewPowerStop()')
    assert page.locator('.power-detail,.dfl-connected-artwork').count()==0
    page.evaluate('powerReviewMount()')
    results.append({'teamMotionCleanup':'page teardown cancels in-flight copy and removes modal'})
    # Exercise the actual CSS tracks, not just the final class/row count.
    page.set_viewport_size({'width':390,'height':900})
    card.scroll_into_view_if_needed()
    folded=card.locator(':scope>ol').evaluate('e=>e.getBoundingClientRect().height')
    page.locator('[data-home-rank-toggle]').evaluate('e=>e.click()')
    page.wait_for_timeout(90)
    opening=card.locator(':scope>ol').evaluate('e=>e.getBoundingClientRect().height')
    page.wait_for_timeout(350)
    full=card.locator(':scope>ol').evaluate('e=>e.getBoundingClientRect().height')
    assert folded+5<opening<full-5,(folded,opening,full)
    page.locator('[data-home-rank-toggle]').evaluate('e=>e.click()')
    page.wait_for_timeout(90)
    closing=card.locator(':scope>ol').evaluate('e=>e.getBoundingClientRect().height')
    assert folded+5<closing<full-5,(folded,closing,full)
    assert card.locator('.is-rank-collapsed:not([inert])').count()==0
    # Reverse during collapse: it must continue from the visible height.
    reversal=card.evaluate('e=>{const list=e.querySelector(":scope>ol"),before=list.getBoundingClientRect().height;e.querySelector("[data-home-rank-toggle]").click();return {before,after:list.getBoundingClientRect().height}}')
    assert abs(reversal['before']-reversal['after'])<2,reversal
    page.wait_for_timeout(380)
    assert abs(card.locator(':scope>ol').evaluate('e=>e.getBoundingClientRect().height')-full)<2
    # Resize and change week mid-transition; no stale callback can undo it.
    page.locator('[data-home-rank-toggle]').evaluate('e=>e.click()')
    page.wait_for_timeout(50)
    page.set_viewport_size({'width':320,'height':900})
    page.locator('[data-power-week="-1"]').evaluate('e=>e.click()')
    page.wait_for_timeout(380)
    assert page.locator('[data-home-rank-toggle]').get_attribute('aria-expanded')=='false'
    assert card.locator(':scope>ol').evaluate('e=>!e.style.height')
    assert card.locator('.is-rank-collapsed').evaluate_all('(rows)=>rows.every(r=>r.inert&&r.getBoundingClientRect().height<1)')
    page.locator('[data-power-week="1"]').click()
    results.append({'expansion':'intermediate heights in both directions, continuous reversal, resize and week switch','heights':[folded,opening,full,closing]})
    # The ranking details use the existing mobile sheet gesture.
    open_report()
    dialog=page.locator('dialog.power-detail')
    page.wait_for_timeout(260)
    box=dialog.locator('header').bounding_box();x=box['x']+20;y=box['y']+16
    touch=context.new_cdp_session(page)
    touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    for step in range(1,5):
        touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+150*step/4}]})
        page.wait_for_timeout(40)
    touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    dialog.wait_for(state='detached')
    assert page.evaluate('document.activeElement.closest(".is-me")!==null')
    results.append({'detailSheet':'touch dismissal, removed dialog and focus restored'})
    page.locator('[data-home-rank-toggle]').click()
    page.wait_for_timeout(380)
    assert page.locator('.power-edition>ol>li:visible .power-team-link').count()==12
    assert page.locator('[data-home-rank-toggle]').get_attribute('aria-expanded')=='true'
    page.locator('[data-power-week="-1"]').click()
    assert page.locator('.power-edition>ol>li:visible .power-team-link').count()==12
    assert page.locator('[data-home-rank-toggle]').get_attribute('aria-expanded')=='true'
    page.locator('[data-power-week="1"]').click()
    assert page.locator('.power-edition>ol>li:visible .power-team-link').count()==12
    page.locator('[data-home-rank-toggle]').click()
    for _ in range(4):page.locator('[data-power-week="-1"]').click()
    assert page.locator('.power-week-nav strong').inner_text()=='Roster model'
    assert page.locator('[data-power-week="-1"]').is_disabled()
    for _ in range(4):page.locator('[data-power-week="1"]').click()
    assert page.locator('.power-week-nav strong').inner_text()=='Week 4'
    assert page.locator('[data-power-week="1"]').is_disabled()
    page.set_viewport_size({'width':320,'height':900})
    for theme in ['light','dark']:
        page.evaluate('(theme)=>window.reviewSetTheme(theme)',theme)
        page.evaluate("document.documentElement.style.fontSize='32px';powerReviewMount()")
        mine=card.locator('.is-me');mine.scroll_into_view_if_needed();mine.locator('[data-power-expand]').click();page.wait_for_timeout(300)
        assert card.evaluate('e=>e.scrollWidth<=e.clientWidth')
        assert mine.locator('.power-team-copy>strong').evaluate('e=>e.scrollWidth<=e.clientWidth')
        assert mine.locator('.power-expand').evaluate('e=>e.scrollWidth<=e.clientWidth')
        assert mine.locator('[data-power-preview]').evaluate('e=>e.scrollWidth<=e.clientWidth')
        card.screenshot(path=str(out/f'power-large-text-{theme}-320.png'))
        page.evaluate("document.documentElement.style.fontSize='';powerReviewMount()")
        results.append({'theme':theme,'systemText':'200% at 320px; full team names, rating and snapshot reflow'})
    # Simulate text enlargement without reducing target sizes or hiding columns.
    page.add_style_tag(content='.power-edition strong,.power-edition small,.power-edition em,.power-edition b,.power-edition .power-rank-move{font-size:200%!important}')
    assert page.evaluate('document.querySelector(".power-edition").scrollWidth<=document.querySelector(".power-edition").clientWidth')
    open_report()
    page.evaluate('window.reviewPowerStop()')
    assert page.locator('dialog.power-detail').count()==0
    for reduced,preference in [('reduce','on'),('no-preference','off')]:
        page.emulate_media(reduced_motion=reduced)
        page.evaluate("async pref=>{const {savePageChoice}=await import('./js/page-disclosure.js');savePageChoice('gameday-motion',pref);dispatchEvent(new Event('dfl:route-performance'));localStorage.removeItem('dfl.power.revealed');powerReviewMount()}",preference)
        card.scroll_into_view_if_needed();page.wait_for_timeout(80)
        assert card.evaluate('e=>e.getAnimations({subtree:true}).length')==0
        page.locator('[data-home-rank-toggle]').evaluate('e=>e.click()')
        assert card.evaluate('e=>e.getAnimations({subtree:true}).length')==0
        assert card.locator('.is-rank-collapsed').evaluate_all('(rows)=>rows.every(r=>!r.inert&&r.getBoundingClientRect().height>=44)')
        page.locator('[data-home-rank-toggle]').evaluate('e=>e.click()')
        results.append({'reduced':reduced,'motion':preference,'animations':0})
    page.emulate_media(reduced_motion='no-preference')
    page.evaluate("async()=>{const {savePageChoice}=await import('./js/page-disclosure.js');savePageChoice('gameday-motion','on');dispatchEvent(new Event('dfl:route-performance'));localStorage.removeItem('dfl.power.revealed');window.powerMotionStarts=0;powerReviewMount()}")
    card.scroll_into_view_if_needed();page.wait_for_timeout(100)
    assert page.evaluate('window.powerMotionStarts')>0
    page.wait_for_timeout(1100)
    before=page.evaluate('window.powerMotionStarts')
    page.evaluate('powerReviewMount()');page.wait_for_timeout(100)
    assert page.evaluate('window.powerMotionStarts')==before
    results.append({'expanded':12,'weekNavigation':'both boundaries','textEnlargement':'200% at 320px','cleanup':'dialog removed','reveal':'once per edition'})
    page.evaluate("()=>{const b=reviewPowerRankings.powerRankings.boards.at(-1);b.published=true;b.publishedAt='2026-10-20T17:00:00Z';powerReviewMount()}")
    assert page.locator('.power-edition-state').inner_text().lower()=='published'
    open_report()
    assert 'Published lineup' in page.locator('dialog.power-detail').text_content()
    page.keyboard.press('Escape')
    page.evaluate("()=>{reviewPowerRankings.powerRankings.boards.at(-1).reconstructed=true;powerReviewMount()}")
    assert page.locator('.power-edition-state').inner_text().lower()=='rebuilt'
    results.append({'sources':['Preview','Published','Rebuilt','Roster model']})
    page.locator('[data-power-id="9"]').scroll_into_view_if_needed()
    page.locator('[data-power-id="9"] img').evaluate("e=>{e.dataset.photoFallbacks='[]';e.src='https://sleepercdn.com/uploads/broken-final.jpg'}")
    page.wait_for_function("()=>!document.querySelector('[data-power-id=\"9\"] img')&&!document.querySelector('[data-power-id=\"9\"] .has-photo')")
    assert page.locator('[data-power-id="9"] .dfl-team-mark i').is_visible()
    results.append({'failedLastImage':'initials visible; no stale has-photo state'})
    assert not errors,errors
    results.append({'browserErrors':errors,'expandedWeekNavigation':'preserved'})
    browser.close()
scope['server'].shutdown()
(out/'power-review.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
