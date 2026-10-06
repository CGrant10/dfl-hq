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

def check_score_consistency(page):
    # The earlier review deliberately disables effects to test reduced motion.
    page.emulate_media(reduced_motion='no-preference')
    results = []
    page.evaluate("document.querySelector('.gameday-home-detail').open=true")
    for mode in ['light', 'dark']:
        page.evaluate('window.reviewSetTheme', mode)
        for width in [320, 390, 832, 1000, 1280]:
            page.set_viewport_size({'width': width, 'height': 1200})
            page.wait_for_timeout(150)
            rows = page.evaluate('''() => [...document.querySelectorAll('.home-thermal-leaders .gameday-player')].map(row=>{
                const number=row.querySelector('.gd-thermal-number'),phase=row.querySelector('[data-player-phase]'),id=phase.dataset.playerPhase;
                const tracker=document.querySelector('.gameday-home-detail [data-player-phase="'+id+'"]').parentElement.querySelector('.gd-thermal-number');
                return {right:number.getBoundingClientRect().right,phaseRight:phase.getBoundingClientRect().right,phase:phase.textContent,font:getComputedStyle(number).fontSize,trackerFont:getComputedStyle(tracker).fontSize,color:getComputedStyle(number).color,trackerColor:getComputedStyle(tracker).color};
            })''')
            assert len(rows) == 4 and all(r['phase'] == 'Final' for r in rows), rows
            assert max(r['right'] for r in rows)-min(r['right'] for r in rows)<1, rows
            assert all(abs(r['right']-r['phaseRight'])<1 and r['font']==r['trackerFont']=='18px' and r['color']==r['trackerColor'] for r in rows), rows
            results.append({'mode':mode,'width':width,'rows':rows})
    board = page.locator('.home-rankings-card > ol > li')
    assert board.first.locator('strong').text_content().strip() == 'Jack-HAMMER'
    assert board.first.locator('em').text_content().strip() == '4-0', board.first.inner_html()
    assert board.nth(1).locator('em').text_content().strip() == '3-1', board.nth(1).inner_html()
    page.set_viewport_size({'width': 1280, 'height': 1200})
    page.locator('[data-gameday-card]').scroll_into_view_if_needed()
    page.evaluate("document.querySelector('[data-gameday-card]').dataset.motion='on'")
    page.wait_for_timeout(600)
    page.evaluate('''() => {window.scoreUploads=0;const original=WebGLRenderingContext.prototype.texImage2D;window.restoreScoreUpload=()=>{WebGLRenderingContext.prototype.texImage2D=original;};WebGLRenderingContext.prototype.texImage2D=function(...args){window.scoreUploads++;return original.apply(this,args)}}''')
    toggles=[]
    for _ in range(4):
        sample=page.evaluate('''() => new Promise(resolve=>{
            const node=document.querySelector('.gameday-home-detail'),heights=[],before=window.scoreUploads;node.open=!node.open;
            function sample(){heights.push(node.offsetHeight);if(heights.length===8)resolve({heights,uploads:window.scoreUploads-before});else requestAnimationFrame(sample)}requestAnimationFrame(sample);
        })''')
        assert len(set(sample['heights']))==1 and sample['uploads']==0, sample
        toggles.append(sample)
    page.evaluate("document.querySelector('.home-thermal-leaders .gd-thermal-value').textContent='25.60'")
    page.wait_for_function('window.scoreUploads === 1')
    page.wait_for_timeout(200)
    assert page.evaluate('window.scoreUploads')==1, 'Unchanged score masks were uploaded again'
    page.evaluate("document.querySelector('.home-thermal-leaders .gd-thermal-value').textContent='24.60';window.restoreScoreUpload()")
    page.evaluate("document.querySelector('.gameday-home-detail').open=false;document.querySelector('[data-gameday-card]').dataset.motion='off'")
    return {'states':results,'toggles':toggles,'changedScoreUploads':1}

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
        const logo=document.querySelector('.home-newspaper-date').getBoundingClientRect();
        const last=document.querySelector('.home-thermal-leaders .gameday-player:last-child').getBoundingClientRect();
        const ticker=document.querySelector('#tabbar').getBoundingClientRect();
        return {logoLeft:logo.left,logoRight:logo.right,lastRowBottom:last.bottom,tickerTop:ticker.top};
    }''')
    assert metrics_visibility['logoLeft'] >= 0 and metrics_visibility['logoRight'] <= 390, 'Home date is clipped'
    print('Home gutters:', page.evaluate('[...document.querySelectorAll(".bx-slide,.home-thermal-leaders,.gameday-matchup")].map(e=>({class:e.className,padding:getComputedStyle(e).padding,left:e.getBoundingClientRect().left,gutter:getComputedStyle(e).getPropertyValue("--home-gutter")}))'), flush=True)
    metrics = {'visibility': metrics_visibility}
    for width in [390, 320, 832, 1280]:
        page.set_viewport_size({'width': width, 'height': 844})
        page.wait_for_timeout(300)
        metrics[str(width)] = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,canvas:!!document.querySelector("canvas"), sections:[...document.querySelectorAll(".topbar,.home-newspaper-masthead,.bx-stage,.gameday-matchup,.home-thermal-leaders,.tabbar")].map(e=>({class:e.className,top:e.getBoundingClientRect().top,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,height:e.getBoundingClientRect().height}))})')
        page.screenshot(path=str(OUT / f'home-{width}.png'))
        masthead = page.locator('.home-newspaper-masthead').evaluate("e=>({width:e.getBoundingClientRect().width,title:e.querySelector('h1').textContent.trim()})")
        assert masthead['title'] == 'The clubhouse' and masthead['width'] <= width, f'Masthead overflow or missing wordmark: {masthead}'
        metrics[str(width)]['masthead'] = masthead
        if width < 900:
            # The full-width banner adds natural scroll. Every player must
            # remain reachable above the persistent navigation.
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
    assert metrics['refinement']['hero'] and page.evaluate("getComputedStyle(document.querySelector('#home-wrap')).getPropertyValue('--bg').trim()===getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()"), 'Home must use the shared app palette and retain broadcast artwork'
    assert metrics['refinement']['visibleLore'] and metrics['refinement']['visibleWall'], 'DFL stories are hidden in More'
    page.locator('[data-gameday-card]').evaluate("e=>e.dataset.motion='off'")
    metrics['readingOrder'] = page.evaluate("""() => {
      const selectors=['.home-frontpage','.home-week-desk','.home-league-desk','[data-home-lore-slot]','.home-banter'];
      const root=document.querySelector('#home-wrap'),children=[...root.children];
      return selectors.map(selector=>({selector,index:children.indexOf(root.querySelector(selector))}));
    }""")
    assert all(x['index']>=0 for x in metrics['readingOrder']) and [x['index'] for x in metrics['readingOrder']] == sorted(x['index'] for x in metrics['readingOrder']), 'Home sections are out of reading order'
    assert page.evaluate("!document.querySelector('[data-home-focus-slot]').closest('details')&&!document.querySelector('[data-home-rankings-slot]').closest('details')"), 'Next actions and standings must be visible without expanding a disclosure'
    assert page.locator('.home-pickem-card').get_attribute('href') == '#/sportsbook?product=pickem', 'Home Pick’em must open the Pick’em card directly'
    assert page.locator('.home-week-desk').inner_text().lower().count('locks') == 1, 'Pick’em cutoff is missing or repeated'
    assert page.locator('[data-home-deadline-slot]').count() == 0, 'Duplicate deadline notice returned'
    metrics['mobileType'] = []
    for width in [320, 390, 768, 1280]:
        page.set_viewport_size({'width':width,'height':844})
        typography = page.evaluate('''() => {
            const type=s=>{const e=document.querySelector(s),c=getComputedStyle(e);return {size:parseFloat(c.fontSize),family:c.fontFamily,weight:Number(c.fontWeight),line:parseFloat(c.lineHeight),transform:c.textTransform}};
            const labelElements=[...document.querySelectorAll('.home-rank-head span')],labels=labelElements.map(e=>e.getBoundingClientRect());
            return {width:innerWidth,fontLoaded:document.fonts.check('600 15px "Rajdhani"'),heading:type('.home-rankings-card h2'),body:type('.home-focus-action'),name:type('.home-thermal-leaders .dfl-player-copy strong'),metadata:type('.home-thermal-leaders .dfl-player-copy small'),detail:type('[data-page-detail="home-week"] summary small'),rankLabelsFit:labelElements.every(e=>e.scrollWidth<=e.clientWidth+1)&&labels.every((r,i)=>!i||labels[i-1].right<=r.left+1),masthead:document.querySelector('.home-newspaper-masthead').offsetHeight};
        }''')
        assert typography['fontLoaded'] and all('Rajdhani' in typography[k]['family'] for k in ['heading','body','name','metadata','detail']), f'Home type did not load consistently: {typography}'
        assert typography['heading']['size'] == (18 if width < 600 else 20) and typography['body']['size'] == 14 and typography['name']['size'] == 15 and typography['metadata']['size'] == typography['detail']['size'] == 12, f'Home text scale is inconsistent: {typography}'
        assert typography['heading']['weight'] == 700 and typography['name']['weight'] == 600 and typography['heading']['transform'] == 'uppercase' and typography['name']['transform'] == 'none' and typography['rankLabelsFit'], f'Home headings or rank columns are crowded: {typography}'
        metrics['mobileType'].append(typography)
    page.set_viewport_size({'width':390,'height':844})
    assert page.locator('[data-page-detail="home-week"]').evaluate('e=>!e.open') and page.locator('[data-page-detail="home-league"]').evaluate('e=>!e.open'), 'Secondary detail should start collapsed'
    assert page.evaluate("document.querySelector('.home-banter').previousElementSibling.matches('[data-home-lore-slot]')"), 'History should lead into league conversation'
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
    metrics['sharedHeader'] = []
    for nav_mode in ['light','dark']:
        page.evaluate('mode=>window.reviewSetTheme(mode)',nav_mode)
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':844})
            reference = None
            header_reference = None
            for route in ['home','clubhouse','sportsbook','trade','analyzer','wall','history','golf']:
                page.evaluate("""route => {document.querySelector('#view').dataset.route=route;document.querySelectorAll('#tabbar .on').forEach(e=>e.classList.remove('on'));(document.querySelector(`#tabbar [data-route="${route}"]`)||document.querySelector('#more-btn')).classList.add('on')}""", route)
                page.wait_for_timeout(350)
                page.wait_for_function("""() => {const active=document.querySelector('#tabbar .on');return active && getComputedStyle(active).color === getComputedStyle(active,'::before').backgroundColor}""", timeout=5000)
                nav = page.evaluate("""() => {const bar=document.querySelector('#tabbar'),active=bar.querySelector('.on'),s=getComputedStyle(bar),a=getComputedStyle(active),i=getComputedStyle(active.querySelector('svg'));return {height:bar.getBoundingClientRect().height,background:s.backgroundColor,color:a.color,font:a.fontSize,iconWidth:i.width,filter:i.filter,icons:[...bar.querySelectorAll('use')].map(e=>e.getAttribute('href'))}}""")
                assert 44 <= nav['height'] <= 50, f'Navigation is not compact: {nav}'
                assert page.evaluate("[...document.querySelectorAll('#tabbar a,#tabbar .tabmore')].every(e=>e.getBoundingClientRect().height>=44)"), 'Navigation targets are too small'
                if reference is None: reference = nav
                assert page.evaluate("[...document.querySelectorAll('#tabbar a > span,#tabbar .tabmore > span')].every(e=>{const a=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return b.left>=a.left-.5&&b.right<=a.right+.5})"), f'Navigation labels overflow at {width}'
                assert nav == reference, f'Navigation changes on {route} at {width}: {nav}'
                metrics['navigation'].append({'mode':nav_mode,'width':width,'route':route,**nav})
                header = page.evaluate("""() => {
                    const bar=document.querySelector('.topbar'),inner=bar.querySelector('.topbar-inner');
                    return {height:bar.getBoundingClientRect().height,background:getComputedStyle(bar).backgroundColor,color:getComputedStyle(bar).color,innerHeight:inner.getBoundingClientRect().height,controls:[...bar.querySelectorAll('.topbar-actions > button')].map(e=>{const b=e.getBoundingClientRect(),c=getComputedStyle(e);return {left:b.left,right:b.right,height:b.height,font:c.fontSize,color:c.color,order:c.order}})};
                }""")
                if header_reference is None: header_reference = header
                assert header == header_reference and header['height'] == 44, f'Header changes on {route} at {width}: {header}'
                assert all(c['height'] >= 44 and c['left'] >= 0 and c['right'] <= width for c in header['controls']), header
                assert page.locator('.bottomline').count() == 0, f'Ticker returned on {route}'
                metrics['sharedHeader'].append({'mode':nav_mode,'width':width,'route':route,**header})

                if width == 390 and route in ['home','clubhouse','golf']:
                    page.locator('#tabbar').screenshot(path=str(OUT / f'nav-{route}.png'))
    page.evaluate("window.reviewSetTheme('light')")
    page.evaluate("document.querySelector('#view').dataset.route='home';document.querySelectorAll('#tabbar .on').forEach(e=>e.classList.remove('on'));document.querySelector('#tabbar [data-route=home]').classList.add('on')")
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("document.querySelector('#view').dataset.route='clubhouse'")
    page.locator('#tabbar').evaluate("e=>e.style.paddingBottom='34px'")
    page.wait_for_timeout(300)
    metrics['phoneInset'] = page.evaluate("""() => {const nav=document.querySelector('#tabbar').getBoundingClientRect();return {navHeight:nav.height,measured:parseFloat(document.documentElement.style.getPropertyValue('--season-nav-height')),paddingBottom:parseFloat(getComputedStyle(document.body).paddingBottom),tickerAbsent:!document.querySelector('.bottomline')&&!document.body.classList.contains('has-bottomline')}}""")
    print('Phone inset:', metrics['phoneInset'], flush=True)
    assert metrics['phoneInset']['navHeight'] == metrics['phoneInset']['measured'] and metrics['phoneInset']['paddingBottom'] >= metrics['phoneInset']['navHeight'] + 19 and metrics['phoneInset']['tickerAbsent'], f"Page spacing does not clear phone navigation: {metrics['phoneInset']}"
    page.locator('#tabbar').evaluate("e=>e.style.removeProperty('padding-bottom')")
    page.wait_for_timeout(300)
    page.evaluate("document.querySelector('#view').dataset.route='home'")
    metrics['slides'] = []
    count = page.evaluate('window.reviewDeck.length')
    for width in [320, 390, 768, 1000, 1280]:
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
                const crest=slide.querySelector('.bx-editorial-subject img'), copy=slide.querySelector('.bx-editorial-copy'), subject=slide.querySelector('.bx-editorial-subject'), artwork=subject?.getBoundingClientRect();
                return {width:innerWidth,treatment:window.reviewDeck[Number(stage.querySelector('[aria-current="true"]').dataset.bxGo)].treatment,stageHeight:stage.offsetHeight,gamedayTop:document.querySelector('[data-home-gameday-slot]').getBoundingClientRect().top+scrollY,
                    left:box.left,right:box.right,contentTop:box.top,contentBottom:box.bottom,
                    content:elements.map(e=>({class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,scroll:e.scrollWidth,width:e.clientWidth})),
                    crest:crest ? {complete:crest.complete,natural:crest.naturalWidth,left:artwork.left,right:artwork.right,top:artwork.top,bottom:artwork.bottom,copyRight:copy.getBoundingClientRect().right,src:crest.getAttribute('src'),artWidth:slide.querySelector('.bx-editorial-illustration').getBoundingClientRect().width,fit:getComputedStyle(crest).objectFit,imageBox:crest.getBoundingClientRect().toJSON(),opacity:Number(getComputedStyle(subject).opacity),hasSplatter:!!slide.querySelector('.bx-editorial-splatter'),stageWidth:stage.clientWidth,stageTop:stage.getBoundingClientRect().top,stageBottom:stage.getBoundingClientRect().bottom} : null,
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
                assert crest['complete'] and crest['natural'] > 0 and crest['left'] >= crest['copyRight'] and crest['right'] <= layout['right'] + 1 and crest['top'] >= crest['stageTop'] - 1 and crest['bottom'] <= crest['stageBottom'], f'Illustration overlaps copy or leaves the stage: {layout}'
            if layout['crest']:
                art = layout['crest']
                assert art['imageBox']['left']>=art['left']-1 and art['imageBox']['right']<=art['right']+1 and art['fit']=='contain', f'Art image is cropped: {art}'
                assert not art['hasSplatter'] and abs(art['artWidth']/art['stageWidth']-.5)<.01 and .5<=art['opacity']<=.8, f'Artwork must fill half the slide with transparency and no splatter: {layout}'
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
    # The renderer discards its buffer after compositing. Sample immediately
    # after a real draw, before the browser can clear the default framebuffer.
    metrics['medicineEffects'] = density_page.evaluate("""() => new Promise((resolve,reject)=>{
        const canvas=document.querySelector('canvas.gd-vfx-canvas'),gl=canvas.getContext('webgl'),original=gl.drawArrays;
        const timeout=setTimeout(()=>{gl.drawArrays=original;reject(Error('Score effects did not draw a frame'))},5000);
        gl.drawArrays=function(...args){
            original.apply(this,args);gl.drawArrays=original;
            queueMicrotask(()=>{
                clearTimeout(timeout);
                const pixels=new Uint8Array(canvas.width*canvas.height*4);
                gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
                let visible=0,blue=0;
                for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>20){visible++;if(pixels[i+2]>pixels[i]+4)blue++}}
                resolve({visible,blue});
            });
        };
    })""")
    assert metrics['medicineEffects']['visible'] > 30 and metrics['medicineEffects']['blue'] == 0, f'Score effects retain off-palette blue: {metrics["medicineEffects"]}'
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
    assert page.locator('.bx-page-count').text_content() == f'1 of {count + 1}', 'Page count did not update when the deck grew'
    assert page.evaluate("document.querySelector('.bx-home-feature')===window.reviewOpener"), 'Deck refresh replayed the opener'
    metrics['deckRefresh'] = 'passed'
    section_hash = page.evaluate('location.hash')
    for section, selector in [('scores','[data-home-gameday-slot]'), ('week','.home-week-desk'), ('league','.home-league-desk'), ('archive','[data-home-lore-slot]')]:
        page.locator(f'[data-home-jump="{section}"]').click()
        page.wait_for_timeout(800)
        assert page.locator('[data-home-jump][aria-current]').count() == 0, 'Jump buttons must not remain selected'
        assert page.evaluate('location.hash') == section_hash, 'Section navigation changed the app route'
        assert page.locator('.topbar').bounding_box()['height'] + 15 <= page.locator(selector).bounding_box()['y'] < 200, 'Section navigation is obscured by the top bar'
    page.locator('[data-page-detail="home-league"] summary').click()
    assert page.locator('[data-page-detail="home-league"]').evaluate('e=>e.open'), 'League news and activity did not open'
    page.locator('[data-page-detail="home-week"] summary').click()
    assert page.locator('[data-page-detail="home-week"]').evaluate('e=>e.open'), 'Weekly planning did not open'
    metrics['sectionNavigation'] = 'passed'
    metrics['expandedHome'] = []
    for mode in ['light','dark']:
        page.evaluate('mode=>window.reviewSetTheme(mode)', mode)
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':844})
            for panel in ['brief','picks','players','startsit']:
                page.locator(f'[data-week-tab="{panel}"]').click()
                page.wait_for_timeout(300)
                assert page.locator(f'[data-week-panel="{panel}"]').is_visible(), f'Week Ahead tab did not open: {panel}'
                assert page.locator(f'[data-week-tab="{panel}"]').get_attribute('aria-selected') == 'true'
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'Forecast overflows in {mode}/{width}/{panel}'
                if panel == 'startsit':
                    assert page.locator('.home-outlook-swaps article').count() == 2
                    assert page.locator('.home-outlook-startsit').evaluate('e=>[...e.querySelectorAll(".home-outlook-swaps,.home-outlook-alarms,.home-outlook-swaps article,.home-outlook-alarms p")].every(e=>getComputedStyle(e).backgroundColor==="rgba(0, 0, 0, 0)")'), 'Start/Sit rows regained filled boxes'
                    page.screenshot(path=str(OUT / f'startsit-{mode}-{width}.png'))
                contrast = page.evaluate('window.reviewTextContrast()')
                assert not contrast['failures'], f'Unreadable forecast in {mode}/{width}/{panel}: {contrast["failures"]}'
                metrics['expandedHome'].append({'mode':mode,'width':width,'panel':panel})
            page.locator('[data-week-tab="players"]').click()
            for position in ['QB','RB','WR','TE','K','DEF']:
                page.locator(f'[data-position-tab="{position}"]').click()
                assert page.locator(f'[data-position-panel="{position}"]').is_visible(), f'Player position did not open: {position}'
            page.locator('[data-home-rank-toggle]').click()
            assert page.locator('.home-rankings-card .is-rank-collapsed').is_visible()
            page.locator('[data-home-rank-toggle]').click()
            for feed in ['activity','news']:
                page.locator(f'[data-feed-tab="{feed}"]').click()
                page.wait_for_timeout(300)
                assert page.locator(f'[data-feed-panel="{feed}"]').is_visible()
                contrast = page.evaluate('window.reviewTextContrast()')
                assert not contrast['failures'], f'Unreadable feed in {mode}/{width}/{feed}: {contrast["failures"]}'
            page.locator('[data-week-tab="brief"]').click()
    metrics['themes'] = []
    metrics['stickyTopbar'] = []
    for mode in ['light','dark','medicine','medicine-light','fairway','team:KC']:
        page.evaluate('mode=>window.reviewSetTheme(mode)', mode)
        page.locator('.gameday-home-detail').evaluate('e=>e.open=true')
        page.locator('.home-score-tools').evaluate('e=>e.open=true')
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':844})
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
            page.wait_for_timeout(350)
            spacing = page.evaluate("""() => {const top=document.querySelector('.topbar').getBoundingClientRect(),nav=document.querySelector('#tabbar').getBoundingClientRect();const visible=document.querySelector('.home-newspaper-masthead').getBoundingClientRect();return {gap:visible.top-(innerWidth>=900?nav.bottom:top.bottom),expected:16}}""")
            assert spacing['gap'] >= spacing['expected'] - 1, f'Masthead touches fixed controls: {spacing}'
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
            page.wait_for_function("[...document.querySelectorAll('.home-banter .wall-photo')].every(e=>e.complete && e.naturalWidth>0)")
            photos=page.locator('.home-banter .wall-photo').evaluate_all("es=>es.map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return {ratio:b.width/b.height,natural:e.naturalWidth/e.naturalHeight,fit:s.objectFit,max:s.maxHeight,transform:s.transform}})")
            assert len(photos)==2 and all(abs(p['ratio']-p['natural'])<.01 and p['fit']=='contain' and p['max']=='none' and p['transform']=='none' for p in photos), f'Wall photos are cropped: {mode}/{width}: {photos}'
            assert page.locator('.home-banter .wall-photo-frame').count()==0, 'Home must show the complete upload even if the full Wall has saved framing'
            for value in ['1','12','99+']:
                page.locator('#notification-count').evaluate('(e,value)=>e.textContent=value',value)
                badge=page.locator('#notification-count').evaluate("e=>{const b=e.getBoundingClientRect(),button=e.closest('button').getBoundingClientRect(),bar=e.closest('.topbar').getBoundingClientRect();return {fits:b.top>=bar.top&&b.bottom<=bar.bottom&&b.left>=button.left&&b.right<=button.right,glyphRoom:e.clientHeight>=parseFloat(getComputedStyle(e).lineHeight)}}")
                assert badge['fits'] and badge['glyphRoom'], f'Notification badge clips in {mode}/{width}/{value}: {badge}'

            previews = page.evaluate("""() => ({
                bodies:[...document.querySelectorAll('.home-banter .wall-body:not(.hidden)')].map(e=>({height:e.clientHeight,line:parseFloat(getComputedStyle(e).lineHeight),hasThread:!!e.closest('.wall-post').querySelector('a[href^="#/wall?post="]')})),
                headingFits:(()=>{const h=document.querySelector('.home-banter .section-title');return h.scrollWidth<=h.clientWidth})(),
                actions:[...document.querySelectorAll('.home-focus-links a')].every(e=>{const b=e.getBoundingClientRect();return b.height>=44 && b.width>=44})
            })""")
            assert previews['headingFits'] and previews['actions'] and all(b['height'] <= 4*b['line']+1 and b['hasThread'] for b in previews['bodies']), f'Home previews or next actions are cramped in {mode}/{width}: {previews}'
            if mode in ['light','dark']:
                page.evaluate("window.scrollTo({top:800,behavior:'instant'})")
                sticky = page.locator('.topbar').evaluate("e=>({top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height,background:getComputedStyle(e).backgroundColor,scroll:scrollY})")
                assert sticky['scroll'] > 500 and abs(sticky['top']) < 1 and sticky['height'] == 44 and sticky['background'] != 'rgba(0, 0, 0, 0)', f'Top bar does not stay visible: {sticky}'
                metrics['stickyTopbar'].append({'mode':mode,'width':width,**sticky})
                page.screenshot(path=str(OUT / f'sticky-{mode}-{width}.png'))
                badge = page.locator('.home-newspaper-date')
                assert badge.get_attribute('alt') == 'DFL 10th anniversary' and badge.evaluate('e=>e.complete && e.naturalWidth>0')
                assert page.locator('.topbar .brand-edition').count() == 0
                assert not page.locator('.topbar .brand-lockup').is_visible()
                assert page.evaluate("[...document.querySelectorAll('.topbar-actions > button')].every(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=document.querySelector('.topbar').getBoundingClientRect().bottom+1})"), 'Status bar content is clipped'
                assert page.locator('.home-newspaper-name h1').inner_text() == 'THE CLUBHOUSE'
                assert page.locator('.home-newspaper-masthead .home-newspaper-seal').count() == 0
                composition = page.evaluate('''() => {
                    const box=s=>document.querySelector(s).getBoundingClientRect(), name=box('.home-newspaper-name h1'), ten=box('.home-newspaper-edition'), edition=box('.home-newspaper-edition > span'), stage=box('.home-broadcast'), desk=box('[data-home-gameday-slot]'), matchup=box('.gameday-matchup'), leaders=box('.home-thermal-leaders');
                    const rows=[...document.querySelectorAll('.gameday-faceoff-team')].map(e=>({portrait:e.querySelector('.gameday-faceoff-mark').getBoundingClientRect().toJSON(),name:e.querySelector('.home-team-name').getBoundingClientRect().toJSON(),fullName:e.querySelector('.home-team-name strong').scrollWidth<=e.querySelector('.home-team-name strong').clientWidth+1&&getComputedStyle(e.querySelector('.home-team-name strong')).whiteSpace==='normal',score:e.querySelector('.gd-thermal-number').getBoundingClientRect().toJSON()}));
                    return {nameLeft:name.left,tenLeft:ten.left,below:ten.top>=name.bottom,inline:Math.abs(ten.left-edition.left)<1,leadersBelow:leaders.top>=matchup.bottom-1,sideBySide:desk.left>=stage.right && Math.abs(desk.top-stage.top)<1,stacked:desk.top>=stage.bottom-1,rows};
                }''')
                assert abs(composition['nameLeft']-composition['tenLeft'])<1 and composition['below'] and composition['inline'] and composition['leadersBelow'], f'Masthead/score hierarchy broken: {composition}'
                assert composition['sideBySide'] if width>=1000 else composition['stacked'], f'Score desk grouping broken: {composition}'
                assert all(r['fullName'] for r in composition['rows']), f'Team names must wrap in full: {composition}'
                if width>=320:
                    assert all(r['portrait']['right']<=r['name']['left'] and r['name']['right']<=r['score']['left']+1 for r in composition['rows']), f'Matchup scores overlap team names: {composition}'
                metrics.setdefault('frontPageGrouping',[]).append({'mode':mode,'width':width,**composition})
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
    metrics['emptyWeek'] = page.evaluate("""() => {
      const focus=document.createElement('div'),forecast=document.createElement('div');
      focus.innerHTML=window.reviewEmptyWeek.focus;forecast.innerHTML=window.reviewEmptyWeek.forecast;
      return {focus:focus.textContent,forecast:forecast.textContent,focusLink:focus.querySelector('a')?.getAttribute('href'),forecastLink:forecast.querySelector('a')?.getAttribute('href'),statuses:focus.querySelectorAll('[role=status]').length+forecast.querySelectorAll('[role=status]').length};
    }""")
    assert 'Checking' not in metrics['emptyWeek']['focus'] and 'Building' not in metrics['emptyWeek']['forecast'] and metrics['emptyWeek']['statuses'] == 0, 'Unavailable weekly data must not remain in a loading state'
    assert metrics['emptyWeek']['focusLink'] == metrics['emptyWeek']['forecastLink'] == '#/analyzer', 'Unavailable forecasts need a usable next action'
    metrics['scoreConsistency'] = check_score_consistency(page)
    page.evaluate("window.reviewSetTheme('light')")
    metrics['consoleErrors'] = errors
    assert not errors, errors
    (OUT / 'browser-checks.json').write_text(json.dumps(metrics, indent=2))
    browser.close()
    print(json.dumps(metrics))
