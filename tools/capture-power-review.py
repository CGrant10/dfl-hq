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
            route.fulfill(status=200,content_type='image/webp',body=(source_root/'assets/dfl-daily-champion.webp').read_bytes())
    source_root=Path(__file__).resolve().parents[1]
    context.route('https://sleepercdn.com/**',portrait)
    page = context.new_page()
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(scope['url'],wait_until='networkidle')
    page.wait_for_function('!!window.reviewStage')
    page.evaluate("window.reviewStage.suspend('power-review',true)")
    page.evaluate("()=>{window.powerMotionStarts=0;const original=Element.prototype.animate;Element.prototype.animate=function(...args){if(this.closest('.power-edition'))window.powerMotionStarts++;return original.apply(this,args)}}")
    page.evaluate("async()=>{const {buildPowerBoards}=await import('./js/league-power-model.js');const {currentAnalyzerRoster}=await import('./js/analyzer-league-context.js');const {powerRankingsMarkup,mountPowerRankings}=await import('./js/league-power-ui.js');window.powerReviewMount=()=>{window.reviewPowerStop?.();const root=document.querySelector('[data-home-rankings-slot]');root.innerHTML=powerRankingsMarkup(window.reviewPowerRankings);window.reviewPowerStop=mountPowerRankings(root,window.reviewPowerRankings)};const teams=Array.from({length:12},(_,i)=>({id:String(i+1),roster_id:i+1,team_name:i===8?'The Bastards of the Very Long Championship Team Name':i===0?'<script>Team One</script>':'DFL Team '+(i+1),powerForecast:{complete:true,points:120+i}}));teams.forEach((t,i)=>{const owner='review-owner-'+i,custom=i===8||i===11?'https://sleepercdn.com/uploads/broken-team.jpg':i%2?'https://sleepercdn.com/uploads/team-'+i+'.jpg':null;Object.assign(t,currentAnalyzerRoster({...t,sleeper_user_id:owner},i===11?{profile_image:'https://sleepercdn.com/uploads/dfl-profile.jpg'}:null,[{user_id:owner,metadata:{team_name:t.team_name,avatar:custom},avatar:i===10?null:i===11?'broken-owner':'owner-avatar-'+i}]))});const matchups=Array.from({length:4},(_,w)=>Array.from({length:6},(_,i)=>({season:2026,week:w+1,roster1:i+1,roster2:i+7,score1:80+i*8+(w===3?i*12:0),score2:100+i*4-(w===3?i*8:0)}))).flat();window.reviewPowerRankings={focus:{id:'9'},allTeams:teams,powerRankings:buildPowerBoards({teams,matchups,currentWeek:5,season:2026})};powerReviewMount()}")
    card=page.locator('.power-edition')
    card.scroll_into_view_if_needed();page.wait_for_timeout(800)
    assert page.locator('.power-edition>ol>li:visible [data-power-team]').count()==4
    assert page.locator('.power-edition .is-me').is_visible()
    assert page.locator('.power-edition script').count()==0
    page.wait_for_function("()=>document.querySelector('[data-power-id=\"9\"] img')?.currentSrc.endsWith('/owner-avatar-8')&&document.querySelector('[data-power-id=\"9\"] .has-photo')")
    page.wait_for_function("()=>document.querySelector('[data-power-id=\"12\"] img')?.currentSrc.endsWith('/dfl-profile.jpg')&&document.querySelector('[data-power-id=\"12\"] .has-photo')")
    assert page.locator('[data-power-id="11"] img').count()==0
    assert page.locator('[data-power-id="11"] .dfl-team-mark i').inner_text()=='DT'
    assert page.locator('[data-power-id="6"] img').get_attribute('src').endswith('/team-5.jpg')
    results.append({'photos':'current team, owner, DFL profile, initials; broken URLs fall through without loops'})
    for theme in ['light','dark']:
        page.evaluate('(theme)=>window.reviewSetTheme(theme)',theme)
        for width in [320,390,768]:
            page.set_viewport_size({'width':width,'height':900})
            card.evaluate("e=>window.scrollTo({top:scrollY+e.getBoundingClientRect().top-240,behavior:'instant'})");page.wait_for_timeout(120)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,width)
            rects=card.locator('button:visible').evaluate_all('(nodes)=>nodes.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,overflow:e.scrollWidth>e.clientWidth+1}))')
            assert all(r['w']>=44 and r['h']>=44 and not r['overflow'] for r in rects),(theme,width,rects)
            card.screenshot(path=str(out/f'power-{theme}-{width}.png'))
            page.locator('.power-edition .is-me [data-power-team]').click()
            dialog=page.locator('dialog.power-detail')
            assert dialog.is_visible()
            page.wait_for_function("()=>document.querySelector('.power-detail-face img')?.complete&&document.querySelector('.power-detail-face.has-photo')")
            assert 'The Bastards of the Very Long Championship Team Name' in dialog.text_content(), dialog.text_content()
            assert dialog.evaluate('e=>e.scrollWidth<=e.clientWidth'),(theme,width)
            assert page.evaluate('document.activeElement.matches("[data-power-close]")')
            page.keyboard.press('Tab')
            assert page.evaluate('document.activeElement.closest("dialog")!==null')
            dialog.screenshot(path=str(out/f'power-detail-{theme}-{width}.png'))
            page.keyboard.press('Escape');dialog.wait_for(state='detached')
            assert page.evaluate('document.activeElement.closest(".is-me")!==null')
            results.append({'theme':theme,'width':width,'rows':4,'detail':'focus, Escape, full name, no overflow','targets':len(rects)})
    page.locator('[data-home-rank-toggle]').click()
    assert page.locator('.power-edition>ol>li:visible [data-power-team]').count()==12
    assert page.locator('[data-home-rank-toggle]').get_attribute('aria-expanded')=='true'
    page.locator('[data-power-week="-1"]').click()
    assert page.locator('.power-edition>ol>li:visible [data-power-team]').count()==12
    assert page.locator('[data-home-rank-toggle]').get_attribute('aria-expanded')=='true'
    page.locator('[data-power-week="1"]').click()
    assert page.locator('.power-edition>ol>li:visible [data-power-team]').count()==12
    page.locator('[data-home-rank-toggle]').click()
    for _ in range(4):page.locator('[data-power-week="-1"]').click()
    assert page.locator('.power-week-nav strong').inner_text()=='Roster model'
    assert page.locator('[data-power-week="-1"]').is_disabled()
    for _ in range(4):page.locator('[data-power-week="1"]').click()
    assert page.locator('.power-week-nav strong').inner_text()=='Week 4'
    assert page.locator('[data-power-week="1"]').is_disabled()
    page.set_viewport_size({'width':320,'height':900})
    # Simulate text enlargement without reducing target sizes or hiding columns.
    page.add_style_tag(content='.power-edition strong,.power-edition small,.power-edition em,.power-edition b,.power-edition .power-rank-move{font-size:200%!important}')
    assert page.evaluate('document.querySelector(".power-edition").scrollWidth<=document.querySelector(".power-edition").clientWidth')
    page.locator('.power-edition .is-me [data-power-team]').click()
    page.evaluate('window.reviewPowerStop()')
    assert page.locator('dialog.power-detail').count()==0
    for reduced,preference in [('reduce','on'),('no-preference','off')]:
        page.emulate_media(reduced_motion=reduced)
        page.evaluate("async pref=>{const {savePageChoice}=await import('./js/page-disclosure.js');savePageChoice('gameday-motion',pref);localStorage.removeItem('dfl.power.revealed');powerReviewMount()}",preference)
        card.scroll_into_view_if_needed();page.wait_for_timeout(80)
        assert card.evaluate('e=>e.getAnimations({subtree:true}).length')==0
        results.append({'reduced':reduced,'motion':preference,'animations':0})
    page.emulate_media(reduced_motion='no-preference')
    page.evaluate("async()=>{const {savePageChoice}=await import('./js/page-disclosure.js');savePageChoice('gameday-motion','on');localStorage.removeItem('dfl.power.revealed');window.powerMotionStarts=0;powerReviewMount()}")
    card.scroll_into_view_if_needed();page.wait_for_timeout(100)
    assert page.evaluate('window.powerMotionStarts')>0
    page.wait_for_timeout(1100)
    before=page.evaluate('window.powerMotionStarts')
    page.evaluate('powerReviewMount()');page.wait_for_timeout(100)
    assert page.evaluate('window.powerMotionStarts')==before
    results.append({'expanded':12,'weekNavigation':'both boundaries','textEnlargement':'200% at 320px','cleanup':'dialog removed','reveal':'once per edition'})
    page.evaluate("()=>{const b=reviewPowerRankings.powerRankings.boards.at(-1);b.published=true;b.publishedAt='2026-10-20T17:00:00Z';powerReviewMount()}")
    assert page.locator('.power-edition-state').inner_text().lower()=='published'
    page.locator('.power-edition .is-me [data-power-team]').click()
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
