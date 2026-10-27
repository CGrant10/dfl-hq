"""Production weekend-reel controller with public metadata fixtures; no backend writes."""
import json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_HOME_HIGHLIGHTS_REVIEW_DIR',ROOT.parent/'dfl-highlight-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_GET(self):
  path=self.path.split('?')[0];code=None
  if path=='/js/supabase.js':code="export const db=()=>({});export const edge=()=>{throw Error('Review writes blocked')};"
  if path=='/js/members.js':code="export const currentMember=()=>null;export const getMemberId=()=>null;"
  if code is not None:self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(code.encode());return
  super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
head=(ROOT/'index.html').read_text().split('<head>')[1].split('</head>')[0]
html='<!doctype html><html lang="en"><head>'+head+'</head><body><main id="view" class="view" data-route="home"><div id="home-wrap"><h1>DFL Daily</h1><div id="reel" data-home-highlights-slot></div></div></main></body></html>'
checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
  for theme in ['light','dark']:
   context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block')
   held_media={'on':False,'requests':[]}
   def route(r):
    if '/highlight-review.html' in r.request.url:return r.fulfill(content_type='text/html',body=html)
    if r.request.url.startswith(base):return r.continue_()
    if r.request.url.endswith('.mp4'):
     if held_media['on']:held_media['requests'].append(r);return
     return r.fulfill(content_type='video/mp4',body=(ROOT/'tools/fixtures/highlight-playback.mp4').read_bytes(),headers={'Access-Control-Allow-Origin':'*','Accept-Ranges':'bytes'})
    if r.request.resource_type=='image':
     photo=OUT/'poster-0.jpg';photo=photo if photo.exists() else ROOT/'tools/fixtures/player-portrait.png'
     return r.fulfill(content_type='image/jpeg' if photo.suffix=='.jpg' else 'image/png',body=photo.read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
    return r.abort()
   context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/highlight-review.html',wait_until='domcontentloaded')
   page.evaluate('''async theme=>{
    const {pinMode}=await import('/js/theme.js');pinMode(theme);
    const {mountHomeHighlights}=await import('/js/home-highlights.js');const rows=await(await fetch('/tools/fixtures/home-highlight-clips.json')).json();
    const f=window.f={base:Date.parse('2026-10-25T22:00:00Z'),wall:Date.now(),rows,loads:0,fail:false,hold:false,active:true};f.now=()=>f.base+Date.now()-f.wall;f.time=at=>{f.base=at;f.wall=Date.now()};
    for(let i=0;i<2;i++)f.rows.push({...rows[0],id:'95000'+i,source_url:'https://www.espn.com/video/clip/_/id/95000'+i,published_at:new Date(f.base-60000+i).toISOString(),headline:'Fixture late-day big play '+i});
    f.rows.sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
    f.roster=[{id:'qb',name:'Tyler Shough',position:'QB',nflTeam:'NO'},{id:'wr',name:'DK Metcalf',position:'WR',nflTeam:'PIT'},{id:'te',name:'Darnell Washington',position:'TE',nflTeam:'PIT'}];f.root=document.getElementById('reel');f.mount=()=>mountHomeHighlights(f.root,{getPlayers:()=>f.roster,now:f.now,active:()=>f.active,load:async()=>{f.loads++;if(f.hold)await new Promise(r=>f.release=r);if(f.fail)throw Error('Fixture unavailable');return [...f.rows].reverse()}});f.c=f.mount();
   }''',theme)
   tag=f'{width}px {theme}';page.wait_for_selector('[data-home-reel-open]');page.evaluate('document.fonts.ready')
   check(tag+' shows the first eight clips and the complete ten-clip reel',page.locator('[data-home-reel-clip]').count()==8 and '10 clips' in page.locator('.home-reel-total').inner_text())
   check(tag+' Home previews start with the newest published clip',page.evaluate('document.querySelector("[data-home-reel-clip]").dataset.homeReelClip===f.rows[0].id'))
   check(tag+' keeps the first Home load free of embedded players',page.locator('iframe,video').count()==0 and page.evaluate('f.loads===1'))
   check(tag+' cards fit the phone with a clear next-card peek',page.locator('.home-reel-cards').evaluate('e=>e.scrollWidth>e.clientWidth&&e.getBoundingClientRect().right<=innerWidth') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.locator('.home-reel-cards img').first.evaluate('e=>e.dispatchEvent(new Event("error"))')
   check(tag+' poster service failures fall back to the validated publisher image',page.locator('.home-reel-cards img').first.evaluate('e=>e.dataset.posterFallback==="1"&&e.src.startsWith("https://espnmedia-cdn.akamaized.net/")'))
   check(tag+' primary actions retain 44px touch targets',page.locator('[data-home-reel-open],[data-home-reel-clip]').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44)'))
   contrast=page.locator('.home-highlight-reel').evaluate("""root=>{
    const ctx=document.createElement('canvas').getContext('2d');const rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
    const lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    return Math.min(...[...root.querySelectorAll('header small,.home-reel-kind,.home-reel-matchup,.home-reel-total,.home-reel-duration')].map(e=>{let p=e,bg;while(p){bg=rgb(getComputedStyle(p).backgroundColor);if(bg[3]===255)break;p=p.parentElement}const a=lum(rgb(getComputedStyle(e).color)),b=lum(bg||[255,255,255,255]);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}));
   }""")
   check(tag+' secondary labels and duration meet 4.5:1 contrast',contrast>=4.5)
   check(tag+' weekend heading is visible',page.locator('#home-reel-title').text_content()=='Weekend highlights.' and 'WEEKEND REEL' in page.locator('.home-highlight-reel header').inner_text())
   page.locator('#reel [data-reel-player-filter="wr"]').click()
   check(tag+' Home player chips filter clips before opening a video',page.locator('[data-home-reel-clip]').count()==1 and 'Metcalf' in page.locator('.home-reel-cards').inner_text() and page.locator('video').count()==0)
   page.locator('#reel [data-reel-player-filter=""]').click()
   page.screenshot(path=str(OUT/f'{width}-{theme}-home.png'))
   page.locator('[data-home-reel-open]').click();sheet=page.locator('.home-reel-player');page.wait_for_selector('.home-reel-player[open]')
   def browse():
    if sheet.get_attribute('data-reel-snap')=='watch':sheet.locator('[data-reel-layout="browse"]').click();page.wait_for_timeout(300)
   def people():
    browse()
    if not sheet.locator('.reel-people-picker').evaluate('e=>e.open'):sheet.locator('.reel-people-picker>summary').click()
   check(tag+' opens the complete newest-first reel',sheet.locator('[data-reel-choose]').count()==10 and sheet.locator('[data-reel-count]').inner_text()=='1 / 10')
   page.wait_for_function('document.querySelector(".home-reel-player video")?.currentTime>0.1')
   check(tag+' plays a native inline video with controls and a safe publisher source',sheet.locator('video').evaluate('e=>e.playsInline&&e.controls&&e.videoWidth>0&&e.src.startsWith("https://espnmedia-cdn.akamaized.net/espn/media/")') and sheet.locator('iframe').count()==0)
   if width==390 and theme=='dark':
    held_media['on']=True;sheet.locator('h2').focus();page.keyboard.press('ArrowRight');page.wait_for_timeout(80)
    check('a pending clip keeps its poster over the player until a frame is ready',sheet.locator('.reel-frame-cover').count()==1 and sheet.locator('[data-reel-screen]').get_attribute('aria-busy')=='true')
    page.keyboard.press('ArrowRight');page.wait_for_timeout(80);held_media['on']=False
    for pending in held_media['requests']:
     try:pending.fulfill(content_type='video/mp4',body=(ROOT/'tools/fixtures/highlight-playback.mp4').read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
     except Exception:pass
    page.wait_for_function('document.querySelector(".home-reel-player video")?.readyState>=2&&!document.querySelector(".reel-frame-cover")')
    check('a stale media completion cannot replace the newly selected clip',sheet.locator('[data-reel-count]').inner_text()=='3 / 10' and sheet.locator('video').get_attribute('aria-label')==page.evaluate('f.rows[2].headline'))
    page.keyboard.press('ArrowLeft');page.keyboard.press('ArrowLeft');page.wait_for_function('document.querySelector(".home-reel-player video")?.currentTime>0.1')
   check(tag+' retains a safe explicit publisher fallback',sheet.locator('[data-reel-source]').evaluate('e=>e.href.startsWith("https://www.espn.com/video/clip/_/id/")&&e.target==="_blank"&&e.rel.includes("noopener")'))
   check(tag+' player sheet stays inside mobile edges',sheet.evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1}'))
   page.evaluate('f.layoutVideo=document.querySelector(".home-reel-player video")')
   stage=sheet.locator('.home-reel-stage');queue=sheet.locator('[data-reel-queue]');grip=sheet.locator('[data-reel-resize]')
   initial_stage=stage.evaluate('e=>e.clientHeight')
   check(tag+' Watch uses a natural video frame without tall empty letterboxing',sheet.locator('[data-reel-screen]').evaluate('e=>Math.abs(e.clientHeight-e.clientWidth*9/16)<28'))
   check(tag+' clip navigation sits outside the footage',sheet.locator('.home-reel-player-controls').evaluate('e=>e.getBoundingClientRect().top>=e.closest(".home-reel-stage").querySelector("video").getBoundingClientRect().bottom-1'))
   sheet.locator('[data-reel-layout="browse"]').click();page.wait_for_timeout(260)
   browse_height=queue.evaluate('e=>e.clientHeight')
   check(tag+' Browse reveals filters without replacing video',stage.evaluate('e=>e.clientHeight')<initial_stage and page.evaluate('f.layoutVideo===document.querySelector(".home-reel-player video")'))
   check(tag+' clip picker uses a compact two-column grid',queue.evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length===2') and sheet.locator('.reel-list-poster').first.evaluate('e=>e.clientWidth>=100&&e.clientWidth<200'))
   page.screenshot(path=str(OUT/f'{width}-{theme}-browse.png'))
   sheet.locator('[data-reel-layout="watch"]').click();page.wait_for_timeout(260)
   check(tag+' Watch restores the larger video frame',stage.evaluate('e=>e.clientHeight')>=initial_stage-2)
   check(tag+' Watch keeps a usable clip list below the controls',queue.evaluate('e=>e.clientHeight>=160') and sheet.locator('.reel-list-poster').first.evaluate('e=>e.clientHeight>=64'))
   page.screenshot(path=str(OUT/f'{width}-{theme}-watch.png'))
   grip.focus();grip.press('Enter');page.wait_for_timeout(260);before=stage.evaluate('e=>e.clientHeight');grip.press('ArrowUp');page.wait_for_timeout(260)
   check(tag+' splitter supports keyboard resizing',stage.evaluate('e=>e.clientHeight')<before and int(grip.get_attribute('aria-valuenow'))<50)
   grip.press('Enter');page.wait_for_timeout(260);box=grip.bounding_box();before=queue.evaluate('e=>e.clientHeight')
   page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2-220,steps=8);page.mouse.up();page.wait_for_timeout(50)
   check(tag+' dragging continuously resizes the panes without recreating playback',queue.evaluate('e=>e.clientHeight')>before and page.evaluate('f.layoutVideo===document.querySelector(".home-reel-player video")') and not sheet.evaluate('e=>e.hasAttribute("data-reel-resizing")'))
   grip.press('Enter');page.wait_for_timeout(260)
   browse()
   sheet.locator('.home-reel-stage').dispatch_event('pointerdown');sheet.locator('[data-reel-next]').click();check(tag+' next/back move one clip with a selected clip list item',sheet.locator('[data-reel-count]').inner_text()=='2 / 10' and sheet.locator('[data-reel-choose][aria-pressed="true"]').count()==1)
   sheet.locator('[data-reel-previous]').click();page.evaluate('f.kept=document.querySelector(".home-reel-player video");f.selected=document.querySelector("[data-reel-choose][aria-pressed=true]").dataset.reelChoose;f.rows.push({...f.rows.find(row=>row.headline.includes("Tyler Shough")),id:"960001",source_url:"https://www.espn.com/video/clip/_/id/960001",published_at:new Date(f.now()-1000).toISOString()})');page.evaluate('f.c.refresh()');page.wait_for_function('document.querySelector("[data-reel-count]").textContent==="2 / 11"')
   check(tag+' new highlights preserve the open clip instead of interrupting it',page.evaluate('f.kept===document.querySelector(".home-reel-player video")&&f.selected===document.querySelector("[data-reel-choose][aria-pressed=true]").dataset.reelChoose'))
   check(tag+' readable clip rows include the headline and game',sheet.locator('[data-reel-choose]').evaluate_all('es=>es.every(e=>e.querySelector("strong")?.textContent.length>5&&e.querySelector("small")?.textContent.includes("·"))'))
   people()
   page.screenshot(path=str(OUT/f'{width}-{theme}-players.png'))
   check(tag+' player gallery uses larger portraits and accessible targets',sheet.locator('[data-reel-players] .dfl-player-portrait').evaluate_all('es=>es.every(e=>e.clientWidth>=36)') and sheet.locator('[data-reel-players] button').evaluate_all('es=>es.every(e=>e.clientHeight>=44)'))
   grip.focus();grip.press('End');page.wait_for_timeout(280)
   check(tag+' returning to Watch closes the gallery and restores the list',not sheet.locator('.reel-people-picker').evaluate('e=>e.open') and queue.evaluate('e=>e.clientHeight>=160'))
   people()
   check(tag+' player chips show available clip counts',sheet.locator('[data-reel-players] [data-reel-player-filter="qb"]').count()==1 and sheet.locator('[data-reel-players] [data-reel-player-filter="qb"] b').inner_text()=='3')
   page.evaluate('f.searchVideo=document.querySelector(".home-reel-player video")')
   browse()
   search=sheet.locator('[data-reel-search]');search.fill('Metcalf');check(tag+' search finds that player without replacing the video',sheet.locator('[data-reel-choose]').count()==1 and 'Metcalf' in sheet.locator('[data-reel-choose] strong').inner_text() and page.evaluate('f.searchVideo===document.querySelector(".home-reel-player video")'))
   search.fill('nobody matches this');check(tag+' empty search offers a clear recovery',sheet.locator('[data-reel-choose]').count()==0 and sheet.locator('.reel-search-empty').is_visible())
   browse()
   sheet.locator('.reel-search-row [data-reel-clear]').click();check(tag+' clearing search restores the queue without restarting the clip',sheet.locator('[data-reel-choose]').count()==11 and page.evaluate('f.searchVideo===document.querySelector(".home-reel-player video")'))
   people()
   sheet.locator('[data-reel-players] [data-reel-player-filter="qb"]').click();check(tag+' a player filter starts their first clip in order',sheet.locator('[data-reel-choose]').count()==3 and sheet.locator('[data-reel-count]').inner_text()=='1 / 3')
   sheet.locator('.reel-search-row [data-reel-clear]').click()
   browser_contrast=sheet.evaluate('''root=>{
    const ctx=document.createElement('canvas').getContext('2d'),rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]},lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    return Math.min(...[...root.querySelectorAll('.reel-list-copy strong,.reel-list-copy small,.reel-list-number,.reel-person span,.reel-person b,[data-reel-search]')].map(e=>{let p=e,bg;while(p){bg=rgb(getComputedStyle(p).backgroundColor);if(bg[3]===255)break;p=p.parentElement}const color=e.matches('input')?getComputedStyle(e,'::placeholder').color:getComputedStyle(e).color,a=lum(rgb(color)),b=lum(bg||[255,255,255,255]);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}));
   }''')
   check(tag+' clip names, counts and search placeholders meet 4.5:1 contrast',browser_contrast>=4.5)
   check(tag+' grid has room for several complete previews',sheet.locator('[data-reel-queue]').evaluate('e=>e.clientHeight>=220') and sheet.locator('.reel-list-poster').first.evaluate('e=>e.getBoundingClientRect().width>=112&&getComputedStyle(e.querySelector("img")).objectFit==="contain"'))
   sheet.locator('[data-reel-queue]').evaluate('e=>e.scrollTop=0')
   check(tag+' at least four clip images are visible together',queue.evaluate('e=>{const q=e.getBoundingClientRect();return [...e.querySelectorAll(".reel-list-poster")].filter(p=>{const r=p.getBoundingClientRect();return r.top>=q.top&&r.bottom<=q.bottom}).length>=4}'))
   check(tag+' selected clip has one visible Playing badge',sheet.locator('.reel-playing').count()==1)
   check(tag+' first preview image is fully visible in the lower list',sheet.locator('.reel-list-poster').first.evaluate('e=>{const p=e.getBoundingClientRect(),q=e.closest("ol").getBoundingClientRect();return p.top>=q.top&&p.bottom<=q.bottom}'))
   check(tag+' browser actions have 44px touch targets',sheet.locator('button,input,a').evaluate_all('es=>es.filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=44)'))
   page.screenshot(path=str(OUT/f'{width}-{theme}-reel.png'))
   if width==390 and theme=='dark':
    for review_width,review_height in [(320,568),(844,390),(1280,800)]:
     page.set_viewport_size({'width':review_width,'height':review_height});page.wait_for_timeout(80)
     sheet.locator('[data-reel-queue]').evaluate('e=>e.scrollTop=0')
     check(f'{review_width}x{review_height} keeps a full preview image visible',sheet.locator('.reel-list-poster').first.evaluate('e=>{const p=e.getBoundingClientRect(),q=e.closest("ol").getBoundingClientRect();return p.top>=q.top&&p.bottom<=q.bottom}'))
     page.screenshot(path=str(OUT/f'browser-{review_width}x{review_height}.png'))
     if review_width==320:
      sheet.locator('[data-reel-layout="watch"]').click();page.wait_for_timeout(280)
      check('short portrait Watch keeps the video at its natural proportions',sheet.locator('[data-reel-screen]').evaluate('e=>Math.abs(e.clientHeight-e.clientWidth*9/16)<28'))
      page.screenshot(path=str(OUT/'short-portrait-watch.png'));sheet.locator('[data-reel-layout="browse"]').click();page.wait_for_timeout(280)
     if sheet.locator('[data-reel-queue]').evaluate('e=>e.clientHeight<78'):print('LAYOUT',page.evaluate('()=>[...document.querySelectorAll("dialog[open],.home-reel-stage,.home-reel-browser,.reel-clip-browser,.reel-game-label,.reel-search-row,[data-reel-players],[data-reel-queue]")].map(e=>[e.className,e.clientHeight,getComputedStyle(e).flex])'),flush=True)
     check(f'{review_width}x{review_height} clip browser stays usable',sheet.locator('[data-reel-queue]').evaluate('e=>e.clientHeight>=78') and sheet.locator('[data-reel-search]').is_visible() and sheet.evaluate('e=>e.scrollWidth<=e.clientWidth&&e.getBoundingClientRect().right<=innerWidth') and sheet.locator('[data-reel-next]').evaluate('e=>e.getBoundingClientRect().bottom<=e.closest("dialog").getBoundingClientRect().bottom'))
     page.screenshot(path=str(OUT/f'browser-{review_width}x{review_height}.png'))
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(80)
    browse()
    sheet.evaluate('e=>{e.style.setProperty("--dialog-viewport-height","360px");e.style.setProperty("--dialog-viewport-top","100px");e.style.setProperty("--dialog-viewport-bottom","384px")}');sheet.locator('[data-reel-search]').focus();page.wait_for_timeout(40)
    check('small visible viewport prioritizes search and readable results',sheet.locator('[data-reel-queue]').evaluate('e=>e.clientHeight>=78') and not sheet.locator('.home-reel-stage').is_visible() and sheet.evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=100&&r.bottom<=460}'))
    sheet.locator('h2').focus();sheet.evaluate('e=>["height","top","bottom"].forEach(key=>e.style.removeProperty("--dialog-viewport-"+key))');page.wait_for_timeout(40)
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".home-reel-player").open')
   check(tag+' closing stops playback and releases the source',page.evaluate('f.kept.paused&&!f.kept.hasAttribute("src")'))
   check(tag+' close restores the originating Home control',page.evaluate('document.activeElement===document.querySelector("[data-home-reel-open]")'))
   page.locator('[data-home-reel-clip]').first.click();check(tag+' a card opens that specific clip',page.evaluate('document.querySelector("[data-reel-choose][aria-pressed=true]").dataset.reelChoose===document.querySelector("[data-home-reel-clip]").dataset.homeReelClip'))
   check(tag+' first Home card starts at clip one with Previous disabled',sheet.locator('[data-reel-count]').inner_text()=='1 / 11' and sheet.locator('[data-reel-previous]').is_disabled())
   people()
   sheet.locator('[data-reel-players] [data-reel-player-filter="wr"]').click();page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".home-reel-player").open')
   check(tag+' changing player then closing restores a visible Home control',page.evaluate('document.activeElement===document.querySelector("[data-home-reel-open]")'))
   page.locator('#reel [data-reel-player-filter=""]').click();page.locator('[data-home-reel-clip]').first.click()
   browse()
   sheet.locator('[data-reel-choose]').first.click();page.evaluate('document.querySelector(".home-reel-player video").dispatchEvent(new Event("ended"))')
   check(tag+' playback advances to the next clip on ended',sheet.locator('[data-reel-count]').inner_text()=='2 / 11')
   browse()
   sheet.locator('[data-reel-choose]').last.click();browse();page.wait_for_function('document.querySelector("[data-reel-queue]").scrollTop>0')
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".home-reel-player").open');page.locator('[data-home-reel-open]').click()
   check(tag+' reopening the reel resets playback and the clip list to the start',sheet.locator('[data-reel-count]').inner_text()=='1 / 11' and sheet.locator('[data-reel-previous]').is_disabled() and sheet.locator('[data-reel-queue]').evaluate('e=>e.scrollTop===0'))
   if width==390 and theme=='dark':
    sheet.locator('[data-reel-close]').click();page.wait_for_timeout(40)
    check('dismissal pauses immediately and preserves the video frame until the exit completes',sheet.locator('video').evaluate('e=>e.paused&&e.hasAttribute("src")'))
    page.evaluate('f.c.openClip(f.rows[1].id)');page.wait_for_timeout(350)
    check('reopening during dismissal cancels the old exit without stopping the new clip',sheet.evaluate('e=>e.open') and sheet.locator('[data-reel-choose][aria-pressed="true"]').get_attribute('data-reel-choose')==page.evaluate('f.rows[1].id') and sheet.locator('video').evaluate('e=>!e.paused&&e.hasAttribute("src")'))
    page.evaluate('f.c.close();f.c.openClip(f.rows[0].id)');page.wait_for_timeout(150)
    check('a queued native close event cannot stop a freshly reopened clip',sheet.evaluate('e=>e.open') and sheet.locator('video').evaluate('e=>!e.paused&&e.hasAttribute("src")'))
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".home-reel-player").open');page.evaluate('f.fail=true;f.c.refresh()');page.wait_for_timeout(100)
   check(tag+' a failed refresh retains current unexpired clips',page.locator('[data-home-reel-clip]').count()==8)
   page.locator('[data-home-reel-open]').click();page.evaluate('document.querySelector(".home-reel-player video").dispatchEvent(new Event("error"))')
   check(tag+' playback errors show the source fallback without breaking the reel',sheet.locator('[data-reel-error]').is_visible() and sheet.locator('[data-reel-source]').is_visible())
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".home-reel-player").open')
   page.evaluate('f.playableRows=f.rows;f.rows=f.rows.map(row=>({...row,video_url:null}));f.fail=false;f.c.refresh()');page.wait_for_timeout(100);page.locator('[data-home-reel-open]').click()
   check(tag+' missing video metadata still opens the exact source clip',sheet.locator('.home-reel-source-play').count()==1 and sheet.locator('video').count()==0)
   page.keyboard.press('Escape');page.wait_for_function('!document.querySelector(".home-reel-player").open')
   page.evaluate('f.rows=f.playableRows;f.c.refresh()');page.wait_for_timeout(100)
   page.emulate_media(reduced_motion='reduce');page.locator('[data-home-reel-open]').click();check(tag+' reduced motion opens directly without running entrance effects',sheet.evaluate('e=>!e.getAnimations().length'))
   for at in ['2026-10-27T11:00:00Z','2026-10-28T22:00:00Z','2026-10-29T10:59:00Z']:
    page.evaluate('at=>{f.time(Date.parse(at));f.c.refresh()}',at);page.wait_for_timeout(100)
    check(tag+' retains the open reel and playback source at '+at,sheet.evaluate('e=>e.open') and sheet.locator('video').evaluate('e=>e.hasAttribute("src")') and page.locator('[data-home-reel-clip]').count()==8)
   page.evaluate('f.expiringVideo=document.querySelector(".home-reel-player video");f.fail=false;f.time(Date.parse(f.rows[0].expires_at)-100);f.c.refresh()');page.wait_for_function('!document.querySelector("[data-home-reel-open]")&&!document.querySelector(".home-reel-player").open')
   check(tag+' Thursday morning expiry removes the Home reel and closes an open clip',page.locator('[data-home-reel-clip]').count()==0 and page.evaluate('f.expiringVideo.paused&&!f.expiringVideo.hasAttribute("src")'))
   page.evaluate('f.c.refresh()');page.wait_for_timeout(100);check(tag+' expired cached clips cannot reappear after refresh',page.locator('[data-home-reel-open]').count()==0)
   page.evaluate('f.c.stop();f.time(Date.parse("2026-10-25T22:00:00Z"));f.hold=true;f.c=f.mount()');page.wait_for_function('typeof f.release==="function"');page.evaluate('f.c.stop();f.active=false;f.release()');page.wait_for_timeout(100)
   check(tag+' late responses do not revive a stopped Home reel',page.locator('[data-home-reel-open]').count()==0 and page.locator('.home-reel-player').count()==0)
   check(tag+' no page errors or unauthorized writes',not errors);context.close()
 browser.close()
server.shutdown()
