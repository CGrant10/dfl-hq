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
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(1600)
    page.screenshot(path=str(OUT / 'home-390.png'))
    metrics_visibility = page.evaluate('''() => {
        const logo=document.querySelector('.brand-mark').getBoundingClientRect();
        const last=document.querySelector('.home-thermal-leaders .gameday-player:last-child').getBoundingClientRect();
        const ticker=document.querySelector('.bottomline').getBoundingClientRect();
        return {logoLeft:logo.left,logoRight:logo.right,lastRowBottom:last.bottom,tickerTop:ticker.top};
    }''')
    assert metrics_visibility['logoLeft'] >= 0 and metrics_visibility['logoRight'] <= 390, 'League seal is clipped'
    assert metrics_visibility['lastRowBottom'] <= metrics_visibility['tickerTop'] - 1, 'Ticker covers the fourth player row at the reference viewport'
    print('Home gutters:', page.evaluate('[...document.querySelectorAll(".bx-slide,.home-thermal-leaders,.gameday-matchup")].map(e=>({class:e.className,padding:getComputedStyle(e).padding,left:e.getBoundingClientRect().left,gutter:getComputedStyle(e).getPropertyValue("--home-gutter")}))'), flush=True)
    metrics = {'visibility': metrics_visibility}
    for width in [390, 320, 1280]:
        page.set_viewport_size({'width': width, 'height': 844})
        page.wait_for_timeout(300)
        metrics[str(width)] = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,canvas:!!document.querySelector("canvas"), sections:[...document.querySelectorAll(".topbar,.dfl-anniv,.bx-stage,.gameday-matchup,.home-thermal-leaders,.tabbar")].map(e=>({class:e.className,top:e.getBoundingClientRect().top,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,height:e.getBoundingClientRect().height}))})')
        page.screenshot(path=str(OUT / f'home-{width}.png'))
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('.bx-next').click()
    page.wait_for_timeout(350)
    assert page.locator('[data-bx-go="1"]').get_attribute('aria-current') == 'true', 'Next slide did not advance'
    page.locator('.bx-prev').click()
    page.wait_for_timeout(350)
    assert page.locator('[data-bx-go="0"]').get_attribute('aria-current') == 'true', 'Previous slide did not return'
    page.locator('.bx-pause').click()
    assert all(page.locator(f'#tabbar [data-route="{route}"] svg use').get_attribute('href').startswith('#home-ui-') for route in ['home','clubhouse','sportsbook','trade','analyzer'])
    assert page.evaluate('document.querySelector("#home-ui-house").namespaceURI') == 'http://www.w3.org/2000/svg'
    assert metrics['390']['sections'][4]['height'] < 240, 'Leader preview is not compact'
    metrics['pause'] = page.locator('.bx-pause').get_attribute('aria-label')
    assert metrics['pause'] == 'Play the broadcast'
    assert all(metrics[str(w)]['scroll'] <= w for w in [390, 320, 1280]), 'Horizontal overflow'
    assert all(-0.5 <= section['left'] and section['right'] <= width + 0.5 for width in [390,320,1280] for section in metrics[str(width)]['sections']), 'A primary section is clipped at the viewport edge'
    assert page.locator('[data-score-temperature="hot"]').count() == 2
    assert page.locator('[data-score-temperature="cold"]').count() == 2
    metrics['renderer'] = page.locator('canvas.gd-vfx-canvas').get_attribute('data-renderer')
    assert metrics['renderer'] == 'webgl', 'Animated score renderer did not start'
    metrics['fonts'] = page.evaluate('({headline:getComputedStyle(document.querySelector(".bx-home-title")).fontFamily,score:getComputedStyle(document.querySelector(".gd-thermal-value")).fontFamily,stroke:getComputedStyle(document.querySelector(".gd-thermal-value")).webkitTextStrokeWidth,loaded:document.fonts.check("30px Anton")})')
    assert metrics['fonts']['loaded'] and 'Anton' in metrics['fonts']['headline'] and 'DFL Broadcast' not in metrics['fonts']['score'], 'Pixel display font is still active'
    assert metrics['fonts']['stroke'] == '0px', 'Synthetic score stroke is still active'
    metrics['slides'] = []
    count = page.evaluate('window.reviewDeck.length')
    for width in [320, 390, 768, 1280]:
        page.set_viewport_size({'width': width, 'height': 844})
        for index in range(count):
            page.locator(f'[data-bx-go="{index}"]').click()
            page.wait_for_timeout(650)
            layout = page.evaluate('''() => {
                const stage=document.querySelector('.bx-stage'), slide=stage.querySelector('.bx-slide:not(.bx-leaving)'), box=slide.getBoundingClientRect();
                const elements=[...slide.children].filter(e=>!e.classList.contains('bx-editorial-art'));
                return {width:innerWidth,treatment:window.reviewDeck[Number(stage.querySelector('[aria-current="true"]').dataset.bxGo)].treatment,stageHeight:stage.offsetHeight,
                    left:box.left,right:box.right,contentTop:box.top,contentBottom:box.bottom,
                    content:elements.map(e=>({class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,scroll:e.scrollWidth,width:e.clientWidth})),
                    controlsTop:Math.min(...[...stage.querySelectorAll('.bx-controls,.bx-arrow')].map(e=>e.getBoundingClientRect().top)),
                    scroll:document.documentElement.scrollWidth};
            }''')
            assert layout['scroll'] <= width, f'Slide overflow: {layout}'
            assert all(c['left'] >= layout['left'] - 1 and c['right'] <= layout['right'] + 1 and c['top'] >= layout['contentTop'] - 1 and c['bottom'] <= layout['controlsTop'] - 3 and c['scroll'] <= c['width'] + 1 for c in layout['content']), f'Slide does not fit its content area: {layout}'
            metrics['slides'].append(layout)
            if width == 390:
                page.locator('.bx-stage').screenshot(path=str(OUT / f'slide-{index}-{layout["treatment"]}.png'))
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('[data-bx-go="0"]').click()
    page.wait_for_timeout(650)
    density_context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3)
    density_page = density_context.new_page()
    density_page.set_content(html, wait_until='domcontentloaded')
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
    metrics['consoleErrors'] = errors
    assert not errors, errors
    (OUT / 'browser-checks.json').write_text(json.dumps(metrics, indent=2))
    browser.close()
    print(json.dumps(metrics))
