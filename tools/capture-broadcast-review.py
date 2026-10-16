"""Real observer/timer regression for below-fold broadcast reading; no league data."""
import json
import os
import re
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('DFL_REVIEW_DIR', ROOT.parent / 'dfl-review')) / 'broadcast-visibility'
OUT.mkdir(parents=True, exist_ok=True)
HTML = r'''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
STYLESHEETS
<style>html{scroll-behavior:auto!important}body{margin:0}.topbar{position:fixed;inset:0 0 auto;height:56px;background:var(--bg);z-index:100}
#tabbar{position:fixed;inset:auto 0 0;height:64px;background:var(--bg);z-index:100}
main{padding:0 16px}.spacer{height:764px}.after{height:1100px}.bx-stage{margin:0!important}</style></head>
<body><header class="topbar"></header><main id="view" class="view" data-route="home"><div id="home-wrap"><div class="spacer"></div><div class="home-frontpage"><div id="host" class="home-broadcast"></div></div><div class="after"></div></div></main><nav id="tabbar"></nav>
<script type="module">
import {renderStage,startStage} from '/js/broadcast-stage.js';
import {homeBroadcastDeck} from '/js/home-presentation.js';
import {MEDICINE_GROUND} from '/js/team-theme.js';
const deck=homeBroadcastDeck([{id:'champ',kind:'champion',treatment:'champion',headline:'The champion',kicker:'2025 DFL CHAMPION',dwell:1200}]);
// Short real clocks exercise the same controller without slowing every CI run.
deck[0].dwell=1200;
document.querySelector('#host').innerHTML=renderStage(deck,{editorial:true});
window.stage=startStage(document.querySelector('[data-bx-stage]'),deck);
window.deck=deck;
const source=await (await fetch('/js/theme.js')).text();
const modes=Function('MEDICINE_GROUND','return ('+source.match(/const MODES = (\{[\s\S]*?\n\});/)[1]+')')(MEDICINE_GROUND);
const assignments=[...source.matchAll(/s\.setProperty\("([^"]+)", m\.([a-zA-Z0-9]+)\);/g)];
window.setTheme=mode=>{document.documentElement.dataset.mode=mode;document.body.dataset.mode=mode;document.documentElement.dataset.palette=mode;document.documentElement.style.setProperty('--accent-fill',modes[mode].fill);document.documentElement.style.setProperty('--accent-2-fill',modes[mode].fill2);for(const [,property,field] of assignments)document.documentElement.style.setProperty(property,modes[mode][field])};
window.ready=true;
</script></body></html>'''

HTML = HTML.replace('STYLESHEETS', ''.join(re.findall(r'<link[^>]*rel="stylesheet"[^>]*>', (ROOT/'index.html').read_text())))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        if self.path == '/':
            body=HTML.encode();self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(body)
        else: super().do_GET()
    def log_message(self, *args): pass

server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('DFL_REVIEW_CHROMIUM') or None,args=['--no-sandbox'])
    for mode in ['dark','light']:
        page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.ready')
        page.evaluate('(mode)=>window.setTheme(mode)',mode)
        stage=page.locator('[data-bx-stage]')
        index=lambda:int(page.locator('[data-bx-go].on').get_attribute('data-bx-go'))
        # Initially only 16px are unobscured above the bottom navigation.
        page.wait_for_timeout(2700)
        assert index()==0,'Opening slide advanced below the fold'
        assert stage.evaluate("e=>e.classList.contains('is-paused')"),'A sliver incorrectly started autoplay'
        # Even a mostly visible card waits while the reader is above it.
        stage.evaluate("e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-360,behavior:'instant'})")
        page.wait_for_timeout(1500);assert index()==0,'Opener ran while reading the desk above it'
        stage.evaluate("e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-110,behavior:'instant'})")
        page.wait_for_function("!document.querySelector('[data-bx-stage]').classList.contains('is-paused')")
        page.wait_for_timeout(650)
        assert index()==0,'First read did not get its own dwell'
        # Moving away cancels that partial clock; returning gets a full read.
        page.evaluate("scrollTo({top:0,behavior:'instant'})");page.wait_for_timeout(1500)
        assert index()==0,'Offscreen time consumed the opener'
        stage.evaluate("e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-110,behavior:'instant'})")
        page.wait_for_function("!document.querySelector('[data-bx-stage]').classList.contains('is-paused')")
        page.wait_for_timeout(750);assert index()==0,'Returning inherited an almost-finished timer'
        page.wait_for_timeout(550);assert index()==1,'Readable card failed to advance'
        # Do not force the daily opener back after a manual choice and scroll.
        page.locator('[data-bx-go="1"]').evaluate('e=>e.click()')
        page.evaluate("scrollTo({top:0,behavior:'instant'})");page.wait_for_timeout(1350)
        assert index()==1,'Scrolling reset the reader to the opener'
        # A short landscape viewport still has a usable reading threshold.
        page.set_viewport_size({'width':844,'height':390})
        stage.evaluate("e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-58,behavior:'instant'})")
        page.wait_for_function("!document.querySelector('[data-bx-stage]').classList.contains('is-paused')")
        page.wait_for_timeout(1300);assert index()==0,'Tall card stalled in a short viewport'
        page.emulate_media(reduced_motion='reduce')
        page.evaluate('async()=>{window.stage.stop();const {startStage}=await import("/js/broadcast-stage.js");window.stage=startStage(document.querySelector("[data-bx-stage]"),window.deck)}')
        page.wait_for_timeout(1400);assert index()==0,'Reduced motion started autoplay'
        assert page.locator('[data-bx-pause]').get_attribute('aria-label')=='Play the broadcast'
        page.set_viewport_size({'width':390,'height':844})
        stage.evaluate("e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-110,behavior:'instant'})")
        page.screenshot(path=str(OUT/f'{mode}-reading.png'))
        page.evaluate('window.stage.stop()');page.evaluate("scrollTo({top:0,behavior:'instant'})")
        assert not errors,errors
        checks.append({'mode':mode,'belowFold':True,'fullDwell':True,'resume':True,'manualChoiceKept':True,'shortViewport':True,'reducedMotion':True,'cleanup':True})
        page.close()
    browser.close()
server.shutdown()
(OUT/'checks.json').write_text(json.dumps(checks,indent=2))
print(json.dumps(checks))
