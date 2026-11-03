"""Selected editorial broadcast: real renderers, routed fixtures and phone controls."""
"""Mobile production broadcast layouts with fixture-only league stories."""
import base64,json,os,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?',1)[0].lstrip('/');file=OUT/'index.html' if not path else ROOT/path
  if not file.is_file():self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.woff':'font/woff'}.get(file.suffix,'application/octet-stream'));self.end_headers();self.wfile.write(file.read_bytes())
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:'+str(server.server_port)+'/',wait_until='domcontentloaded');page.wait_for_function('!!window.reviewDeck');page.evaluate('document.fonts.ready')
 page.evaluate('''async()=>{
 reviewStage.stop();typeof reviewPageMotion==='function'?reviewPageMotion():reviewPageMotion?.stop?.();reviewInjuryPanel?.stop();reviewWeekFlow?.stop();reviewVfx?.stop();
 const {renderStage,startStage}=await import('./js/broadcast-stage.js');
 window.editorialDeck=[
 {id:'champion',treatment:'champion',kicker:'2025 CHAMPION',headline:'Klutch Sports Group',href:'#/history?season=2025',temporal:'historical'},
 {id:'trade',kind:'trade',kicker:'TRADE LEDGER · OCT 27, 2026',figure:63,href:'#/trade?tx=editorial-review',tradeStory:{balanceLabel:'Value balance',outcome:{displayGrade:'Value edge'},packages:[{rosterId:'9',teamName:'Bastards of the Realm',players:[{id:'2449',name:'Stefon Diggs'}]},{rosterId:'11',teamName:'Team Lafountain',players:[{id:'11635',name:'Ladd McConkey'}]}],receivedPackages:[{rosterId:'11',players:[{id:'2449',name:'Stefon Diggs'}]},{rosterId:'9',players:[{id:'11635',name:'Ladd McConkey'}]}]}},
 {id:'bench',kind:'league-story',kicker:'WEEK 8 · BENCH RECEIPT',headline:'Hell of a fucking spectator.',figure:26.3,figureLabel:'on the bench',subtitle:'Emmett Johnson · DaGrapeApes',href:'#/clubhouse?season=2026&week=8&tab=matchups'},
 {id:'chip',treatment:'champion',variant:'chip',kicker:'2025 CHIP EATER',headline:'DaNickers',href:'#/history?season=2025',temporal:'historical'}];
 document.querySelector('#view').innerHTML='<div id="home-wrap" data-home-layout="wire"><section class="home-broadcast"></section></div>';
 document.querySelector('.home-broadcast').innerHTML=renderStage(editorialDeck,{editorial:true,wide:true});
 window.editorialStage=startStage(document.querySelector('[data-bx-stage]'),editorialDeck);editorialStage.suspend('review',true);
 }''')
 for mode in ['light','dark']:
  page.evaluate('mode=>{reviewSetTheme(mode);editorialStage.update(editorialDeck)}',mode)
  for i in range(4):
   page.locator(f'[data-bx-go="{i}"]').evaluate('e=>e.click()');page.wait_for_timeout(420);page.evaluate('document.activeElement?.blur()')
   page.locator('[data-bx-stage]').screenshot(path=str(OUT/f'editorial-{mode}-{i}.png'))
   slide=page.locator('.bx-slide:not(.bx-leaving)')
   result=slide.evaluate("""e=>{const r=e.getBoundingClientRect(),image=e.querySelector('.bx-brief-art>img'),value=e.querySelector('.bx-brief-value'),head=e.querySelector('.bx-head');const within=b=>b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1;return {width:r.width,height:r.height,artContained:!image||within(image.getBoundingClientRect()),separate:!value||head.getBoundingClientRect().right<=value.getBoundingClientRect().left,headerAligned:!value||Math.abs(e.querySelector('.bx-kicker').getBoundingClientRect().left-r.left-14)<1}}""")
   assert result['artContained'] and result['separate'] and result['headerAligned'],(mode,i,result)
   assert page.locator('.bx-page-count').inner_text()==f'{i+1} / 4'
   checks.append({'mode':mode,'index':i,**result})
  height=page.locator('[data-bx-stage]').evaluate('e=>e.clientHeight')
  page.locator('.bx-story-picker>summary').click()
  assert page.locator('.bx-story-picker').get_attribute('open') is not None
  assert page.locator('[data-bx-go]').evaluate_all('ns=>ns.every(n=>n.getBoundingClientRect().width>=44&&n.getBoundingClientRect().height>=44)')
  page.locator('[data-bx-go="1"]').click()
  page.wait_for_timeout(350)
  assert page.locator('.bx-page-count').inner_text()=='2 / 4'
  assert page.locator('.bx-story-picker').get_attribute('open') is None
  assert page.locator('[data-bx-stage]').evaluate('e=>e.clientHeight')==height
  assert page.locator('.bx-slide:not(.bx-leaving)').get_attribute('href')=='#/trade?tx=editorial-review'
  assert 'Bastards of the Realm gets Ladd McConkey' in page.locator('.bx-slide:not(.bx-leaving)').get_attribute('aria-label')
  page.locator('.bx-story-picker>summary').click();page.keyboard.press('Escape')
  assert page.locator('.bx-story-picker').get_attribute('open') is None
  page.locator('[data-bx-step="1"]').click();page.wait_for_timeout(350)
  assert page.locator('.bx-page-count').inner_text()=='3 / 4'
  page.locator('[data-bx-step="-1"]').click();page.wait_for_timeout(350)
  assert page.locator('.bx-page-count').inner_text()=='2 / 4'
  page.evaluate("editorialStage.update([...editorialDeck,...Array.from({length:6},(_,i)=>({...editorialDeck[2],id:'fixture-extra-'+i}))])")
  page.locator('.bx-story-picker>summary').click()
  assert page.locator('[data-bx-go]').count()==10
  assert page.locator('.bx-dots').evaluate('e=>{const b=e.getBoundingClientRect(),s=e.closest(".bx-stage").getBoundingClientRect();return b.top>=s.top-1&&b.bottom<=s.bottom&&b.height>=132}')
  page.locator('[data-bx-stage]').screenshot(path=str(OUT/f'editorial-picker-{mode}.png'))
  page.locator('[data-bx-go="9"]').click();page.wait_for_timeout(350)
  assert page.locator('.bx-page-count').inner_text()=='10 / 10'
 # Opening the picker pauses its clock. Refreshing it must release that pause.
 page.evaluate('''async()=>{editorialStage.stop();const {renderStage,startStage}=await import('./js/broadcast-stage.js');const deck=[{id:'clock-a',kind:'news',headline:'First',dwell:300},{id:'clock-b',kind:'news',headline:'Second',dwell:300}];document.querySelector('.home-broadcast').innerHTML=renderStage(deck,{editorial:true,wide:true});window.clockStage=startStage(document.querySelector('[data-bx-stage]'),deck);window.clockDeck=deck}''')
 page.locator('.bx-story-picker>summary').click();page.mouse.move(380,800);page.wait_for_timeout(450)
 assert page.locator('.bx-page-count').inner_text()=='1 / 2','Open story picker did not pause autoplay'
 page.evaluate("clockStage.update(clockDeck.map(s=>({...s,headline:s.headline+' updated'})))")
 page.wait_for_timeout(800)
 assert page.locator('.bx-page-count').inner_text()=='2 / 2','Refreshed picker left autoplay paused'
 page.evaluate('clockStage.stop()')
 (OUT/'editorial-checks.json').write_text(json.dumps({'layouts':checks,'picker':True,'keyboardEscape':True,'previousNext':True,'routedReceipt':True,'pickerClock':True,'refreshResume':True,'errors':errors},indent=2))
 assert not errors,errors
 print(json.dumps({'errors':errors}));browser.close()
server.shutdown()
