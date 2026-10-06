"""Capture the production-component review without changing league data."""
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import urlopen
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('DFL_REVIEW_DIR', ROOT.parent / 'dfl-review'))

class ReviewHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?', 1)[0].lstrip('/')
        file = OUT / 'index.html' if path in ['', 'index.html'] else ROOT / path
        types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp'}
        if file.is_file():
            body = file.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', types.get(file.suffix, 'application/octet-stream'))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_error(404)
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), ReviewHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/'
with urlopen(url) as response:
    print('Review document:', response.status, response.headers.get('Content-Type'), len(response.read()), flush=True)

with sync_playwright() as p:
    executable = os.environ.get('DFL_REVIEW_CHROMIUM')
    browser = p.chromium.launch(executable_path=executable, headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    html = (OUT / 'index.html').read_text().replace('<head>', f'<head><base href="{url}">', 1)
    page.set_content(html, wait_until='domcontentloaded')
    page.wait_for_function('!!window.reviewVfx', timeout=15000)
    page.locator('.bx-pause').click()
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(1600)
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    page.screenshot(path=str(OUT / 'home-390.png'))
    metrics_visibility = page.evaluate('''() => {
        const logo=document.querySelector('.home-newspaper-seal').getBoundingClientRect();
        const last=document.querySelector('.home-thermal-leaders .gameday-player:last-child').getBoundingClientRect();
        const ticker=document.querySelector('#tabbar').getBoundingClientRect();
        return {logoLeft:logo.left,logoRight:logo.right,lastRowBottom:last.bottom,tickerTop:ticker.top};
    }''')
    assert metrics_visibility['logoLeft'] >= 0 and metrics_visibility['logoRight'] <= 390, 'League seal is clipped'
    print('Home gutters:', page.evaluate('[...document.querySelectorAll(".bx-slide,.home-thermal-leaders,.gameday-matchup")].map(e=>({class:e.className,padding:getComputedStyle(e).padding,left:e.getBoundingClientRect().left,gutter:getComputedStyle(e).getPropertyValue("--home-gutter")}))'), flush=True)
    metrics = {'visibility': metrics_visibility}
    for width in [390, 320, 832, 1280]:
        page.set_viewport_size({'width': width, 'height': 844})
        page.wait_for_timeout(300)
        metrics[str(width)] = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,canvas:!!document.querySelector("canvas"), sections:[...document.querySelectorAll(".topbar,.home-newspaper-masthead,.bx-stage,.gameday-matchup,.home-thermal-leaders,.tabbar")].map(e=>({class:e.className,top:e.getBoundingClientRect().top,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,height:e.getBoundingClientRect().height}))})')
        page.screenshot(path=str(OUT / f'home-{width}.png'))
        masthead = page.locator('.home-newspaper-masthead').evaluate("e=>({width:e.getBoundingClientRect().width,wordmark:e.querySelector('.home-newspaper-name img').complete})")
        assert masthead['wordmark'] and masthead['width'] <= width, f'Masthead overflow or missing wordmark: {masthead}'
        metrics[str(width)]['masthead'] = masthead
        if width < 900:
            # The full-width banner adds natural scroll. Every player must
            # remain reachable above the persistent ticker and navigation.
            page.evaluate("window.scrollTo({top:Math.max(0,scrollY+document.querySelector('.home-thermal-leaders .gameday-player:last-child').getBoundingClientRect().bottom-document.querySelector('#tabbar').getBoundingClientRect().top+20),behavior:'instant'})")
            visible = page.evaluate("""() => {const row=document.querySelector('.home-thermal-leaders .gameday-player:last-child').getBoundingClientRect();return {top:row.top,bottom:row.bottom,headerBottom:document.querySelector('.topbar').getBoundingClientRect().bottom,tickerTop:document.querySelector('#tabbar').getBoundingClientRect().top}}""")
            assert visible['top'] > visible['headerBottom'] and visible['bottom'] < visible['tickerTop'] - 1, f'Last player cannot be reached above persistent controls: {visible}'
            metrics[str(width)]['scrolledPlayer'] = visible
            page.screenshot(path=str(OUT / f'home-{width}-leaders.png'))
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('.bx-next').click()
    page.wait_for_timeout(350)
    assert page.locator('[data-bx-go="1"]').get_attribute('aria-current') == 'true', 'Next slide did not advance'
    page.locator('.bx-prev').click()
    page.wait_for_timeout(350)
    assert page.locator('[data-bx-go="0"]').get_attribute('aria-current') == 'true', 'Previous slide did not return'
    assert all(page.locator(f'#tabbar [data-route="{route}"] svg use').get_attribute('href').startswith('#dfl-nav-') for route in ['home','clubhouse','sportsbook','trade','analyzer'])
    assert page.evaluate('document.querySelector("#dfl-nav-house").namespaceURI') == 'http://www.w3.org/2000/svg'
    assert metrics['390']['sections'][4]['height'] < 240, 'Leader preview is not compact'
    metrics['pause'] = page.locator('.bx-pause').get_attribute('aria-label')
    assert metrics['pause'] == 'Play the broadcast'
    assert all(metrics[str(w)]['scroll'] <= w for w in [390, 320, 832, 1280]), 'Horizontal overflow'
    assert all(-0.5 <= section['left'] and section['right'] <= width + 0.5 for width in [390,320,832,1280] for section in metrics[str(width)]['sections']), 'A primary section is clipped at the viewport edge'
    assert page.locator('.home-thermal-leaders [data-score-temperature="hot"]').count() == 2
    assert page.locator('.home-thermal-leaders [data-score-temperature="cold"]').count() == 2
    page.locator('[data-gameday-card]').evaluate("e=>e.dataset.motion='on'")
    page.wait_for_timeout(300)
    metrics['renderer'] = page.locator('canvas.gd-vfx-canvas').get_attribute('data-renderer')
    assert metrics['renderer'] == 'webgl', 'Animated score renderer did not start'
    metrics['fonts'] = page.evaluate('({headline:getComputedStyle(document.querySelector(".bx-home-title")).fontFamily,score:getComputedStyle(document.querySelector(".gd-thermal-value")).fontFamily,stroke:getComputedStyle(document.querySelector(".gd-thermal-value")).webkitTextStrokeWidth,loaded:document.fonts.check("30px Anton")})')
    assert metrics['fonts']['loaded'] and 'Anton' in metrics['fonts']['headline'] and 'DFL Broadcast' not in metrics['fonts']['score'], 'Pixel display font is still active'
    assert metrics['fonts']['stroke'] == '0px', 'Synthetic score stroke is still active'
    metrics['refinement'] = page.evaluate("""() => ({playerFont:parseFloat(getComputedStyle(document.querySelector('.home-thermal-leaders .gd-thermal-number')).fontSize),paper:getComputedStyle(document.querySelector('#home-wrap')).getPropertyValue('--bg').trim(),hero:document.querySelector('.bx-home-art').complete,visibleLore:!document.querySelector('[data-home-lore-slot]').closest('details'),visibleWall:!document.querySelector('[data-wall-slot]').closest('details')})""")
    assert metrics['refinement']['paper'] == '#efebe1' and metrics['refinement']['hero'], 'Selected newspaper presentation is missing'
    assert metrics['refinement']['visibleLore'] and metrics['refinement']['visibleWall'], 'DFL stories are hidden in More'
    page.locator('[data-gameday-card]').evaluate("e=>e.dataset.motion='off'")
    assert page.evaluate("document.querySelector('.home-banter').previousElementSibling.matches('[data-page-detail=home-league]')"), 'Wall must follow More from the league'
    metrics['cleanup'] = page.evaluate("""() => ({stories:[...document.querySelectorAll('.home-league-story')].map(e=>({border:getComputedStyle(e).borderLeftWidth,background:getComputedStyle(e).backgroundColor,decoration:getComputedStyle(e).textDecorationLine})),actions:[...document.querySelectorAll('.home-section-action')].map(e=>({label:e.getAttribute('aria-label'),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),storyLinks:document.querySelectorAll('.home-league-file > nav').length})""")
    assert all(s['border'] == '0px' and s['background'] == 'rgba(0, 0, 0, 0)' and s['decoration'] == 'none' for s in metrics['cleanup']['stories']), 'Archive stories still use boxed cards or underlined links'
    assert all(a['label'] and a['width'] >= 44 and a['height'] >= 44 for a in metrics['cleanup']['actions']), 'Section controls need accessible names and phone-sized targets'
    assert metrics['cleanup']['storyLinks'] == 0, 'Redundant story link strip is still present'
    page.locator('.home-league-file > header .home-section-action').focus()
    page.keyboard.press('Shift+Tab')
    page.keyboard.press('Tab')
    assert page.locator('.home-league-file > header .home-section-action').evaluate("e=>getComputedStyle(e).outlineStyle") != 'none', 'Keyboard focus is not visible'
    page.evaluate('document.activeElement.blur();window.scrollTo(0,0)')
    page.evaluate("document.querySelectorAll('#tabbar,.bottomline').forEach(e=>e.style.visibility='hidden')")
    page.screenshot(path=str(OUT / 'home-390-full.png'), full_page=True)
    page.evaluate("document.querySelectorAll('#tabbar,.bottomline').forEach(e=>e.style.removeProperty('visibility'))")
    page.evaluate("window.scrollTo(0,document.querySelector('.home-league-file').getBoundingClientRect().top+scrollY-64)")
    page.screenshot(path=str(OUT / 'home-390-stories.png'))
    page.evaluate('window.scrollTo(0,0)')
    metrics['navigation'] = []
    for nav_mode in ['light','dark']:
        page.evaluate('mode=>window.reviewSetTheme(mode)',nav_mode)
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':844})
            reference = None
            for route in ['home','clubhouse','sportsbook','trade','analyzer','wall','history','golf']:
                page.evaluate("""route => {document.querySelector('#view').dataset.route=route;document.querySelectorAll('#tabbar .on').forEach(e=>e.classList.remove('on'));(document.querySelector(`#tabbar [data-route="${route}"]`)||document.querySelector('#more-btn')).classList.add('on')}""", route)
                page.wait_for_timeout(350)
                nav = page.evaluate("""() => {const bar=document.querySelector('#tabbar'),active=bar.querySelector('.on'),s=getComputedStyle(bar),a=getComputedStyle(active),i=getComputedStyle(active.querySelector('svg'));return {height:bar.getBoundingClientRect().height,background:s.backgroundColor,color:a.color,font:a.fontSize,iconWidth:i.width,filter:i.filter,icons:[...bar.querySelectorAll('use')].map(e=>e.getAttribute('href'))}}""")
                assert 44 <= nav['height'] <= 50, f'Navigation is not compact: {nav}'
                assert page.evaluate("[...document.querySelectorAll('#tabbar a,#tabbar .tabmore')].every(e=>e.getBoundingClientRect().height>=44)"), 'Navigation targets are too small'
                if reference is None: reference = nav
                assert page.evaluate("[...document.querySelectorAll('#tabbar a > span,#tabbar .tabmore > span')].every(e=>{const a=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return b.left>=a.left-.5&&b.right<=a.right+.5})"), f'Navigation labels overflow at {width}'
                assert nav == reference, f'Navigation changes on {route} at {width}: {nav}'
                metrics['navigation'].append({'mode':nav_mode,'width':width,'route':route,**nav})
                if width == 390 and route in ['home','clubhouse','golf']:
                    page.locator('#tabbar').screenshot(path=str(OUT / f'nav-{route}.png'))
    page.evaluate("window.reviewSetTheme('light')")
    page.evaluate("document.querySelector('#view').dataset.route='home';document.querySelectorAll('#tabbar .on').forEach(e=>e.classList.remove('on'));document.querySelector('#tabbar [data-route=home]').classList.add('on')")
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("document.querySelector('#view').dataset.route='clubhouse'")
    page.locator('#tabbar').evaluate("e=>e.style.paddingBottom='34px'")
    page.wait_for_timeout(300)
    metrics['phoneInset'] = page.evaluate("""() => {const nav=document.querySelector('#tabbar').getBoundingClientRect(),ticker=document.querySelector('.bottomline').getBoundingClientRect();return {navHeight:nav.height,measured:parseFloat(document.documentElement.style.getPropertyValue('--season-nav-height')),navTop:nav.top,tickerBottom:ticker.bottom}}""")
    print('Phone inset:', metrics['phoneInset'], flush=True)
    assert metrics['phoneInset']['navHeight'] == metrics['phoneInset']['measured'] and abs(metrics['phoneInset']['navTop'] - metrics['phoneInset']['tickerBottom']) < 1, f"Ticker and navigation disagree on phone inset height: {metrics['phoneInset']}"
    page.locator('#tabbar').evaluate("e=>e.style.removeProperty('padding-bottom')")
    page.wait_for_timeout(300)
    page.evaluate("document.querySelector('#view').dataset.route='home'")
    metrics['slides'] = []
    count = page.evaluate('window.reviewDeck.length')
    for width in [320, 390, 768, 1280]:
        page.set_viewport_size({'width': width, 'height': 844})
        stage_height = None
        gameday_top = None
        for index in range(count):
            page.locator(f'[data-bx-go="{index}"]').focus()
            page.locator(f'[data-bx-go="{index}"]').press('Enter')
            page.wait_for_timeout(650)
            layout = page.evaluate('''() => {
                const stage=document.querySelector('.bx-stage'), slide=stage.querySelector('.bx-slide:not(.bx-leaving)'), box=slide.getBoundingClientRect();
                const elements=[...slide.children,...slide.querySelectorAll('.bx-editorial-copy > *')].filter(e=>getComputedStyle(e).position!=='absolute');
                const crest=slide.querySelector('.bx-editorial-crest'), copy=slide.querySelector('.bx-editorial-copy'), artwork=crest?.getBoundingClientRect();
                return {width:innerWidth,treatment:window.reviewDeck[Number(stage.querySelector('[aria-current="true"]').dataset.bxGo)].treatment,stageHeight:stage.offsetHeight,gamedayTop:document.querySelector('[data-home-gameday-slot]').getBoundingClientRect().top+scrollY,
                    left:box.left,right:box.right,contentTop:box.top,contentBottom:box.bottom,
                    content:elements.map(e=>({class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,scroll:e.scrollWidth,width:e.clientWidth})),
                    crest:crest ? {complete:crest.complete,natural:crest.naturalWidth,left:artwork.left,right:artwork.right,top:artwork.top,bottom:artwork.bottom,copyRight:copy.getBoundingClientRect().right} : null,
                    controlsTop:Math.min(...[...stage.querySelectorAll('.bx-controls,.bx-arrow')].map(e=>e.getBoundingClientRect().top)),
                    scroll:document.documentElement.scrollWidth};
            }''')
            if stage_height is None:
                stage_height, gameday_top = layout['stageHeight'], layout['gamedayTop']
            assert layout['stageHeight'] == stage_height and abs(layout['gamedayTop'] - gameday_top) < 1, f'Broadcast rotation moves the page: {layout}'
            assert layout['scroll'] <= width, f'Slide overflow: {layout}'
            assert all(c['left'] >= layout['left'] - 1 and c['right'] <= layout['right'] + 1 and c['top'] >= layout['contentTop'] - 1 and c['bottom'] <= layout['contentBottom'] + 1 and c['scroll'] <= c['width'] + 1 for c in layout['content']), f'Slide does not fit its content area: {layout}'
            if layout['crest']:
                crest = layout['crest']
                assert crest['complete'] and crest['natural'] > 0 and crest['left'] >= crest['copyRight'] and crest['right'] <= layout['right'] + 1 and crest['top'] >= layout['contentTop'] and crest['bottom'] <= layout['contentBottom'], f'Crest overlaps broadcast copy or controls: {layout}'
            page.evaluate("window.scrollTo({top:document.querySelector('.bx-stage').getBoundingClientRect().top+scrollY-115,behavior:'instant'})")
            contrast = page.evaluate('window.reviewTextContrast()')
            assert not contrast['failures'], f'Unreadable broadcast text: {contrast["failures"]}'
            metrics['slides'].append(layout)
            if width == 390:
                page.locator('.bx-stage').screenshot(path=str(OUT / f'slide-{index}-{layout["treatment"]}.png'))
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('[data-bx-go="0"]').focus()
    page.locator('[data-bx-go="0"]').press('Enter')
    page.wait_for_timeout(650)
    density_context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3)
    density_page = density_context.new_page()
    density_page.set_content(html, wait_until='domcontentloaded')
    density_page.wait_for_function('!!window.reviewVfx', timeout=15000)
    density_page.locator('[data-gameday-card]').evaluate("e=>e.dataset.motion='on'")
    density_page.wait_for_function('document.querySelector("canvas.gd-vfx-canvas")?.dataset.running === "true"', timeout=15000)
    density_page.evaluate('document.fonts.ready')
    density_page.wait_for_timeout(650)
    metrics['phoneDensity'] = density_page.locator('canvas.gd-vfx-canvas').evaluate('(e)=>({pixels:e.width,css:e.clientWidth,ratio:e.width/e.clientWidth})')
    assert metrics['phoneDensity']['ratio'] >= 2.9, 'Score effects are below phone screen resolution'
    density_page.screenshot(path=str(OUT / 'home-390@3x.png'))
    density_context.close()
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(200)
    metrics['reducedMotion'] = page.locator('canvas.gd-vfx-canvas').evaluate('(e)=>e.dataset.running')
    assert metrics['reducedMotion'] == 'false', 'Reduced motion did not stop score effects'
    assert page.locator('.bx-home-feature').get_attribute('href') == '#/clubhouse'
    page.evaluate("""() => {
        const stage=document.querySelector('[data-bx-stage]');
        window.reviewOpener=stage.querySelector('.bx-home-feature');
        window.reviewStage.update([...window.reviewDeck, {id:'fixture:late',treatment:'announcement',headline:'Late league update',body:'A new edition from the league wire.',temporal:'recent'}]);
    }""")
    page.wait_for_timeout(200)
    assert page.locator('.bx-page-count').text_content() == '1 of 13', 'Page count did not update when the deck grew'
    assert page.evaluate("document.querySelector('.bx-home-feature')===window.reviewOpener"), 'Deck refresh replayed the opener'
    metrics['deckRefresh'] = 'passed'
    section_hash = page.evaluate('location.hash')
    for section, selector in [('scores','[data-home-gameday-slot]'), ('archive','[data-home-lore-slot]')]:
        page.locator(f'[data-home-jump="{section}"]').click()
        page.wait_for_timeout(800)
        assert page.locator(f'[data-home-jump="{section}"]').get_attribute('aria-current') == 'location'
        assert page.evaluate('location.hash') == section_hash, 'Section navigation changed the app route'
        assert 0 <= page.locator(selector).bounding_box()['y'] < 200, 'Section navigation did not reach its content'
    page.locator('[data-page-detail="home-league"] summary').click()
    assert page.locator('[data-page-detail="home-league"]').evaluate('e=>e.open'), 'More from the league did not open'
    metrics['sectionNavigation'] = 'passed'
    metrics['themes'] = []
    for mode in ['light','dark','medicine','medicine-light','fairway','team:KC']:
        page.evaluate('mode=>window.reviewSetTheme(mode)', mode)
        page.locator('.gameday-home-detail').evaluate('e=>e.open=true')
        page.locator('.home-score-tools').evaluate('e=>e.open=true')
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':844})
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
            page.wait_for_timeout(350)
            nav = page.evaluate("""() => {
                const bar=document.querySelector('#tabbar'),link=bar.querySelector('.on'),s=getComputedStyle(link),marker=getComputedStyle(link,'::before');
                return {height:bar.getBoundingClientRect().height,color:s.color,icon:getComputedStyle(link.querySelector('svg')).color,markerDisplay:marker.display,markerColor:marker.backgroundColor,markerHeight:marker.height,extraMarker:getComputedStyle(bar,'::before').display};
            }""")
            assert 44 <= nav['height'] <= 50 and nav['icon'] == nav['color'], f'Navigation presentation differs in {mode}: {nav}'
            assert nav['markerDisplay'] == 'block' and nav['markerColor'] == nav['color'] and nav['markerHeight'] == '3px' and nav['extraMarker'] == 'none', f'Active navigation indicator is missing or duplicated: {nav}'
            assert page.evaluate("[...document.querySelectorAll('#tabbar a,#tabbar .tabmore')].every(e=>e.getBoundingClientRect().height>=44)"), 'Navigation targets are too small'
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth"), f'Theme overflows at {mode}/{width}'
            page.locator('.home-banter').scroll_into_view_if_needed()
            page.wait_for_timeout(300)
            letters = page.evaluate("""() => {
                const posts=[...document.querySelectorAll('.wall-post')];
                return {columns:getComputedStyle(document.querySelector('.wall-posts')).gridTemplateColumns.split(' ').length,
                    fits:posts.every(post=>{const b=post.getBoundingClientRect(),head=post.querySelector('.wall-head').getBoundingClientRect(),body=post.querySelector('.wall-body').getBoundingClientRect();return head.bottom<=body.top+1 && [...post.querySelectorAll('.wall-head,.identity-byline,.wall-body,.wall-photo,.wall-reaction-buttons')].every(e=>{const c=e.getBoundingClientRect();return c.left>=b.left-1 && c.right<=b.right+1})}),
                    targets:[...document.querySelectorAll('.wall-reaction-buttons button')].every(e=>{const b=e.getBoundingClientRect();return b.width>=44 && b.height>=44})};
            }""")
            assert letters['fits'] and letters['targets'] and letters['columns'] == (1 if width < 768 else 3), f'Letters are cramped in {mode}/{width}: {letters}'
            checks = []
            # Scroll every region into view: deferred Wall content and CSS
            # transitions are evaluated after the browser actually paints them.
            height = page.evaluate('document.scrollingElement.scrollHeight')
            for top in range(0,height,600):
                page.evaluate("top=>window.scrollTo({top,behavior:'instant'})",top)
                page.wait_for_timeout(300)
                checks.extend(page.evaluate('window.reviewTextContrast()')['checks'])
            page.locator('#more').evaluate("e=>e.classList.remove('hidden')")
            page.wait_for_timeout(300)
            checks.extend(page.evaluate('window.reviewTextContrast()')['checks'])
            page.locator('#more').evaluate("e=>e.classList.add('hidden')")
            failures = [c for c in checks if c['ratio']+.01<c['required']]
            assert not failures, f'Unreadable text in {mode}/{width}: {failures}'
            metrics['themes'].append({'mode':mode,'width':width,'textChecks':len(checks),'minimumContrast':min(c['ratio'] for c in checks),'nav':nav,'letters':letters})
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
            if width in [390,1280]:
                page.screenshot(path=str(OUT / f'theme-{mode.replace(":","-")}-{width}.png'))
                page.locator('#tabbar').screenshot(path=str(OUT / f'nav-{mode.replace(":","-")}-{width}.png'))
                page.evaluate("document.querySelector('#tabbar').style.visibility='hidden'")
                page.screenshot(path=str(OUT / f'theme-{mode.replace(":","-")}-{width}-full.png'),full_page=True)
                page.evaluate("document.querySelector('#tabbar').style.removeProperty('visibility')")
    page.evaluate("window.reviewSetTheme('light')")
    metrics['consoleErrors'] = errors
    assert not errors, errors
    (OUT / 'browser-checks.json').write_text(json.dumps(metrics, indent=2))
    browser.close()
    print(json.dumps(metrics))
