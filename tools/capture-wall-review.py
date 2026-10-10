"""Isolated Wall UI with production renderers; league writes are unavailable."""
import json,os,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
output=Path(os.environ.get('DFL_WALL_REVIEW_DIR','/workspace/dfl-wall-trade-1358/wall'));output.mkdir(parents=True,exist_ok=True)
head=(root/'index.html').read_text().split('<head>',1)[1].split('</head>',1)[0]
html='''<!doctype html><html lang="en" data-theme="dark"><head><base href="/">'''+head+'''</head><body><header class="topbar" style="height:44px">DFL HQ · Wall review</header><main id="view" class="view" data-route="wall" data-page-system></main><script type="module">
import {wallCard,wireWall} from '/js/member-wall.js';
import {startUiMotion} from '/js/ui-motion.js';
import {savePageChoice} from '/js/page-disclosure.js';
import {setImageValue} from '/js/image-field.js';
const rows=[{id:11,member_id:'friend',body:'Receipts are in. Your bench outscored your starters.',image:'/assets/home-broadcast-stadium.webp',created_at:new Date().toISOString(),members:{display_name:'The boys',team_name:'The Bayou Bombers'}},{id:12,member_id:'friend',body:'Full photo, full shame.',image:'/assets/dfl-daily-champion.webp',image_fit:'cover',image_position_x:45,image_position_y:60,image_zoom:1.3,created_at:new Date().toISOString(),members:{display_name:'League champ'}},{id:13,member_id:'friend',body:'Broken upload test',image:'/missing-review-photo.webp',created_at:new Date().toISOString(),members:{display_name:'Friend'}}];
window.reviewRender=(compact=false)=>{const root=document.querySelector('#view');root.dataset.route=compact?'home':'wall';root.innerHTML=wallCard(rows,{compact});wireWall(root);};
window.reviewSetPhoto=value=>setImageValue(document.querySelector('[data-wall-form]'),'image',value);
window.reviewMotion=mode=>{savePageChoice('gameday-motion',mode);window.dispatchEvent(new Event('dfl:route-performance'))};
window.motionLog=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){window.motionLog.push({class:this.className,frames,options});return original.call(this,frames,options)};
const theme=await import('/js/theme.js');theme.initTheme();startUiMotion();window.reviewRender();window.reviewReady=true;
</script></body></html>'''
# Mock only the data boundary: full Wall render, draft, mention, crop, reply,
# reaction and photo controllers are the production modules.
members="""const member={id:'wall-review',display_name:'UI Review'};export const currentMember=()=>member,loadMemberDirectory=async()=>[member,{id:'friend',display_name:'The boys'}],refreshMember=async()=>member;"""
supabase="""export const isAdmin=()=>false;export function db(){const chain=new Proxy({}, {get(_target,key){if(key==='then')return resolve=>resolve({data:[],error:null});if(['insert','update','delete','upsert'].includes(key))return ()=>{throw Error('Review writes are blocked')};return ()=>chain;}});return chain;}"""
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        name=self.path.split('?')[0]
        body=html if name=='/wall-review' else members if name=='/js/members.js' else supabase if name=='/js/supabase.js' else None
        if body is not None:
            self.send_response(200);self.send_header('Content-Type','text/html' if name=='/wall-review' else 'text/javascript');self.end_headers();self.wfile.write(body.encode());return
        super().do_GET()
    def translate_path(self,path):return str(root/path.split('?')[0].lstrip('/'))
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/wall-review'
report=[]
with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']}
    if os.environ.get('DFL_REVIEW_CHROMIUM'):launch['executable_path']=os.environ['DFL_REVIEW_CHROMIUM']
    browser=p.chromium.launch(**launch)
    for width in [320,390,768]:
        context=browser.new_context(viewport={'width':width,'height':844},service_workers='block')
        context.route('**/*',lambda route:route.continue_() if route.request.url.startswith('http://127.0.0.1:') and route.request.method in ['GET','HEAD'] else route.abort())
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url);page.wait_for_function('window.reviewReady');page.evaluate('document.fonts.ready');page.wait_for_timeout(300)
        form=page.locator('[data-wall-form]');area=form.locator('[data-wall-body]');tools=form.locator('[data-wall-photo-tools]');toggle=form.locator('[data-wall-photo-toggle]')
        assert tools.is_hidden();assert form.bounding_box()['height']<90
        assert page.locator('.wall-mention-control').is_hidden()
        page.screenshot(path=str(output/f'01-wall-{width}.png'))
        area.fill('Saved roast draft');page.locator('[data-mention-picker]').select_option('The boys');assert '@{The boys}' in area.input_value()
        toggle.click();assert tools.is_visible();assert toggle.get_attribute('aria-expanded')=='true'
        page.evaluate("window.reviewSetPhoto('/assets/home-broadcast-stadium.webp')")
        assert toggle.evaluate('e=>e.classList.contains("has-photo")')
        before=page.locator('[data-imgf-value][name="image"]').input_value();toggle.click();assert tools.is_hidden();assert page.locator('[data-imgf-value][name="image"]').input_value()==before
        toggle.click();page.screenshot(path=str(output/f'02-composer-{width}.png'))
        page.reload();page.wait_for_function('window.reviewReady');assert 'Saved roast draft' in page.locator('[data-wall-body]').input_value();assert page.locator('[data-wall-form]').evaluate('e=>e.classList.contains("is-writing")')
        # Photo views keep the original upload, not its feed crop.
        for post in [11,12]:
            button=page.locator(f'[data-wall-post="{post}"] [data-wall-photo-open]');button.click()
            viewer=page.locator('.wall-photo-viewer[open]');viewer.locator('[data-photo-zoom]:not([disabled])').wait_for();page.wait_for_timeout(320)
            img=viewer.locator('img');bounds=img.bounding_box();stage=viewer.locator('.wall-photo-stage').bounding_box()
            assert bounds['x']>=stage['x'] and bounds['y']>=stage['y'] and bounds['x']+bounds['width']<=stage['x']+stage['width']+1 and bounds['y']+bounds['height']<=stage['y']+stage['height']+1
            assert img.evaluate('e=>Math.abs(e.width/e.height-e.naturalWidth/e.naturalHeight)<.02')
            page.screenshot(path=str(output/f'03-photo-{width}-{post}.png'))
            viewer.locator('[data-photo-zoom]').click();page.wait_for_timeout(260);assert img.bounding_box()['width']>bounds['width']*1.9
            assert viewer.locator('[data-photo-zoom]').get_attribute('aria-pressed')=='true'
            viewer.locator('[data-photo-zoom]').click();page.wait_for_timeout(260)
            page.keyboard.press('Escape');page.wait_for_timeout(200);assert button.evaluate('e=>e===document.activeElement')
        # Reply access and the same viewer also work in Home's existing preview.
        page.evaluate('window.reviewRender(true)');assert page.locator('[data-wall-form]').count()==0
        page.locator('[data-wall-thread="11"] > summary').click();page.wait_for_selector('.wall-reply-form');assert page.locator('.wall-reply-form').is_visible()
        page.locator('[data-wall-post="11"] [data-wall-photo-open]').click();page.wait_for_selector('.wall-photo-viewer[open] [data-photo-zoom]:not([disabled])')
        page.evaluate("location.hash='#/other'");page.wait_for_function('!document.querySelector(".wall-photo-viewer").open')
        page.locator('[data-wall-post="13"] [data-wall-photo-open]').click();page.wait_for_function('document.querySelector("[data-photo-status]").textContent.includes("unavailable")');page.locator('[data-photo-close]').click();page.wait_for_timeout(200)
        for mode in ['off','on']:
            page.evaluate('(mode)=>window.reviewMotion(mode)',mode)
            page.emulate_media(reduced_motion='reduce' if mode=='on' else 'no-preference');page.evaluate('window.motionLog=[]')
            page.locator('[data-wall-post="11"] [data-wall-photo-open]').click();page.wait_for_selector('.wall-photo-viewer[open] [data-photo-zoom]:not([disabled])');page.wait_for_timeout(320)
            assert page.evaluate('window.motionLog.length')==0
            page.keyboard.press('Escape');assert page.locator('.wall-photo-viewer[open]').count()==0
        page.emulate_media(reduced_motion='no-preference');page.evaluate("window.reviewMotion('on');document.documentElement.style.fontSize='200%'");page.evaluate('window.reviewRender()')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.locator('[data-wall-post="11"] [data-wall-photo-open]').click();page.wait_for_selector('.wall-photo-viewer[open] [data-photo-zoom]:not([disabled])');page.wait_for_timeout(350)
        page.screenshot(path=str(output/f'04-large-photo-{width}.png'))
        assert page.locator('[data-photo-close]').bounding_box()['x']>=0
        page.keyboard.press('Escape');page.wait_for_timeout(200)
        for mode in ['dark','light','team:KC']:
            page.evaluate("async mode=>{const theme=await import('/js/theme.js');theme.saveMode(mode)}",mode)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.locator('[data-wall-form]').scroll_into_view_if_needed()
            page.screenshot(path=str(output/f'05-wall-{width}-{mode.replace(":","-")}.png'))
        # Primary actions remain readable in every supported palette. This uses
        # the real composer and theme engine, with league writes blocked above.
        page.evaluate("document.documentElement.style.fontSize='100%'")
        colors=page.evaluate('''async()=>{
            const {saveMode}=await import('/js/theme.js');
            const {nflTeams}=await import('/js/nfl-teams.js');
            const {contrast}=await import('/js/team-theme.js');
            const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
            const ctx=canvas.getContext('2d');
            const hex=color=>{ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return '#'+[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('')};
            const modes=['dark','light','medicine','medicine-light','fairway',...nflTeams().map(t=>'team:'+t.code)];
            return modes.map(mode=>{saveMode(mode);const e=document.querySelector('.wall-send'),s=getComputedStyle(e),r=e.getBoundingClientRect();return {mode,ratio:contrast(hex(s.color),hex(s.backgroundColor)),gradient:s.backgroundImage,height:r.height}});
        }''')
        assert all(c['ratio']>=4.5 and c['gradient']=='none' and c['height']>=44 for c in colors),colors
        assert page.locator('[data-wall-reaction]').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44)')
        assert page.locator('[data-wall-reaction]:not(:hover)').first.evaluate("e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'")
        page.locator('[data-wall-reaction]').first.evaluate("e=>e.setAttribute('aria-pressed','true')")
        assert page.locator('[data-wall-reaction]').first.evaluate('e=>getComputedStyle(e).backgroundColor!==getComputedStyle(e.parentElement).backgroundColor')
        page.screenshot(path=str(output/f'06-controls-{width}.png'))
        assert not errors,errors
        report.append({'width':width,'draftAndMentionPreserved':True,'attachedPhotoSurvivesCollapse':True,'fullUncroppedImages':True,'zoom':True,'focusReturn':True,'homePreviewAndReplies':True,'offAndReducedMotion':True,'largeText':True,'primaryContrast':colors,'reactionTargets':True,'errors':errors})
        print('PASS Wall '+str(width),flush=True);context.close()
    browser.close()
server.shutdown();(output/'wall-review.json').write_text(json.dumps(report,indent=2));print(json.dumps([{**r,'primaryContrast':{'palettes':len(r['primaryContrast']),'minimum':min(c['ratio'] for c in r['primaryContrast'])}} for r in report],indent=2))
