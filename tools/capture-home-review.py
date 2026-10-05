"""Capture the production-component review without changing league data."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'dfl-review'

def route(request_route):
    path = request_route.request.url.split('dfl.local/', 1)[-1].split('?', 1)[0]
    file = OUT / 'index.html' if path in ['', 'index.html'] else ROOT / path
    types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp'}
    if file.is_file():
        request_route.fulfill(body=file.read_bytes(), content_type=types.get(file.suffix, 'application/octet-stream'))
    else:
        request_route.fulfill(status=404, body='Missing review asset')

with sync_playwright() as p:
    executable = os.environ.get('DFL_REVIEW_CHROMIUM')
    if not executable and Path('/usr/bin/chromium').exists():
        executable = '/usr/bin/chromium'
    browser = p.chromium.launch(executable_path=executable, headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-crashpad-for-testing', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    context.route('http://dfl.local/**', route)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://dfl.local/')
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(1600)
    page.screenshot(path=str(OUT / 'home-390.png'))
    metrics = {}
    for width in [390, 320, 1280]:
        page.set_viewport_size({'width': width, 'height': 844})
        page.wait_for_timeout(300)
        metrics[str(width)] = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,canvas:!!document.querySelector("canvas"), sections:[...document.querySelectorAll(".topbar,.dfl-anniv,.bx-stage,.gameday-matchup,.home-thermal-leaders,.tabbar")].map(e=>({class:e.className,top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height}))})')
        page.screenshot(path=str(OUT / f'home-{width}.png'))
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('.bx-next').click()
    page.wait_for_timeout(350)
    assert page.locator('[data-bx-go="1"]').get_attribute('aria-current') == 'true', 'Next slide did not advance'
    page.locator('.bx-prev').click()
    page.wait_for_timeout(350)
    assert page.locator('[data-bx-go="0"]').get_attribute('aria-current') == 'true', 'Previous slide did not return'
    page.locator('.bx-pause').click()
    metrics['pause'] = page.locator('.bx-pause').get_attribute('aria-label')
    assert metrics['pause'] == 'Play the broadcast'
    assert all(metrics[str(w)]['scroll'] <= w for w in [390, 320, 1280]), 'Horizontal overflow'
    assert page.locator('[data-score-temperature="hot"]').count() == 2
    assert page.locator('[data-score-temperature="cold"]').count() == 2
    metrics['renderer'] = page.locator('canvas.gd-vfx-canvas').get_attribute('data-renderer')
    assert metrics['renderer'] == 'webgl', 'Animated score renderer did not start'
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
