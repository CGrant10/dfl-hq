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
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[];finish=[];glows=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://**/*',lambda r:r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes()) if 'sleepercdn.com/' in r.request.url else r.abort())
 page.goto('http://127.0.0.1:'+str(server.server_port)+'/',wait_until='domcontentloaded');page.wait_for_function('!!window.reviewDeck');page.evaluate('document.fonts.ready')
 page.evaluate('''async()=>{
  reviewStage.stop();typeof reviewPageMotion==='function'?reviewPageMotion():reviewPageMotion?.stop?.();reviewInjuryPanel?.stop();reviewWeekFlow?.stop();reviewVfx?.stop();
  const {renderStage,startStage}=await import('./js/broadcast-stage.js');
  const {weeklyHeadlineSlide}=await import('./js/home-slides.js');
  const spotlight=weeklyHeadlineSlide({final:true,season:2026,week:5,games:[{winner:{uid:'a',name:'Bayou Bombers',value:131.22},loser:{uid:'b',name:'Monday Night Mayhem',value:120}}]},{season:2026,week:6});
  const original=reviewDeck,champ=original.find(s=>s.treatment==='champion'&&s.variant!=='chip'),chip=original.find(s=>s.treatment==='champion'&&s.variant==='chip'),injury=original.find(s=>s.treatment==='injuries');
  const packages=[{teamName:'The Very Long Championship Bayou Bombers',players:[{id:'7547',name:'Amon-Ra St. Brown',position:'WR',nflTeam:'DET'},{id:'1466',name:'Travis Kelce',position:'TE',nflTeam:'KC'}]},{teamName:'Klutch Sports Group',players:[{id:'3198',name:'Derrick Henry',position:'RB',nflTeam:'BAL'},{id:'8137',name:'George Pickens',position:'WR',nflTeam:'DAL'},{id:'2449',name:'Stefon Diggs',position:'WR',nflTeam:'WAS'}]},{teamName:'Monday Night Mayhem',players:[{id:'2216',name:'Mike Evans',position:'WR',nflTeam:'SF'},{id:'12527',name:'Ashton Jeanty',position:'RB',nflTeam:'LV'}]}];
  const trade={id:'review-deal',key:'review-deal',kind:'trade',treatment:'stat',kicker:'2026 · WEEK 6',figure:78,href:'#/trade?tx=review',tradeStory:{packages,outcome:{displayGrade:'Value edge'},balanceLabel:'group balance'}};
  window.artDeck=[{...champ,key:'champ',headline:'The Bayou Bombers',image:'https://example.invalid/member-profile.jpg'},{...chip,key:'chip',headline:'Monday Night Mayhem'},injury,trade,{...trade,key:'two-team',tradeStory:{...trade.tradeStory,packages:packages.slice(0,2)}},{key:'rivalry',kind:'fact',treatment:'announcement',storyKind:'rivalry',headline:'The rematch',kicker:'DFL RIVALRIES',figure:12,storyNames:['The Bayou Bombers','Klutch Sports Group'],storySeries:'7–5',href:'#/history'},{...spotlight,key:'spotlight'},{key:'percent',kind:'odds',treatment:'stat',kicker:'PLAYOFF PICTURE',figure:'72%',headline:'Still in the fucking fight.',subtitle:'The next matchup sets the tone.'}];
  artDeck.unshift(reviewDeck[0]);artDeck.push(reviewDeck.find(s=>s.id==='fixture:archive-record'),reviewDeck.find(s=>s.generator==='nextMove'),reviewDeck.find(s=>s.id==='fixture:golf'),{...champ,key:'long',headline:'The Bastards of the Very Long Championship Team Name'},{key:'news',kind:'news',treatment:'announcement',kicker:'LEAGUE NEWS',headline:'The league gets the last word.',body:'Weekly awards, matchup conversations and the stories everyone will be talking about.',href:'#/clubhouse'},{key:'season',kind:'season',figure:10,headline:'Seasons',subtitle:'2017 → 2026',href:'#/history'});
  const view=document.querySelector('#view');view.innerHTML='<div id="home-wrap"><div class="home-frontpage"><div class="home-broadcast"></div></div></div>';
  document.querySelector('.home-broadcast').innerHTML=renderStage(artDeck,{editorial:true,wide:true});
  window.artStage=startStage(document.querySelector('[data-bx-stage]'),artDeck);artStage.suspend('art-review',true);scrollTo(0,0);
 }''')
 for mode in ['light','dark']:
  for width in ([] if os.environ.get('DFL_REVIEW_ENLARGED_ONLY') else [320,390,768]):
   page.set_viewport_size({'width':width,'height':844});page.evaluate('mode=>reviewSetTheme(mode)',mode)
   count=page.locator('[data-bx-go]').count();height=None
   for i in range(count):
    page.locator(f'[data-bx-go="{i}"]').evaluate('e=>e.click()');page.wait_for_timeout(450)
    slide=page.locator('.bx-layer>.bx-slide:not(.bx-leaving)');stage=page.locator('[data-bx-stage]')
    metrics=slide.evaluate('''e=>{
     const r=e.getBoundingClientRect(),s=e.closest('.bx-stage'),transport=s.querySelector('.bx-controls').getBoundingClientRect(),art=e.querySelector('.bx-brief-art,.bx-brief-number,.bx-brief-value')?.getBoundingClientRect();
     const children=[...e.children].filter(n=>n.getClientRects().length&&!n.matches('.bx-home-art,.bx-home-shade')),copy=[...e.querySelectorAll(':scope>.bx-kicker,:scope>.bx-head,:scope>.bx-brief-body,:scope>.bx-brief-action')];
     return {children:children.map(n=>({class:n.className,rect:n.getBoundingClientRect().toJSON(),scroll:[n.scrollWidth,n.scrollHeight],client:[n.clientWidth,n.clientHeight]})),bounds:r.toJSON(),transport:transport.top,headline:e.querySelector('h2')?.textContent,height:s.clientHeight,cardWidth:r.width,cardHeight:r.height,overflow:document.documentElement.scrollWidth>innerWidth+1,within:children.every(n=>{const b=n.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=Math.min(r.bottom,transport.top)+1&&n.scrollWidth<=n.clientWidth+1}),separated:!art||copy.every(n=>{const b=n.getBoundingClientRect();return b.right<=art.left+1||b.left>=art.right-1||b.bottom<=art.top+1||b.top>=art.bottom-1}),artContained:[...e.querySelectorAll('.bx-brief-art>img')].every(n=>n.complete&&n.naturalWidth>0&&getComputedStyle(n).objectFit==='contain'),headFont:parseFloat(getComputedStyle(e.querySelector('h2')).fontSize)};
    }''')
    page.screenshot(path=str(OUT/f'wide-{mode}-{width}-{i}.png'))
    assert metrics['within'] and metrics['separated'] and metrics['artContained'] and not metrics['overflow'],(mode,width,i,metrics)
    assert metrics['headFont']>=18,(mode,width,i,'headline too small',metrics)
    assert slide.locator('.bx-brief-art .dfl-player-portrait').evaluate_all('''nodes=>nodes.every(n=>getComputedStyle(n).borderTopWidth==='0px'&&getComputedStyle(n).backgroundImage==='none'&&[...n.querySelectorAll('img')].every(img=>getComputedStyle(img).backgroundImage==='none'))'''),(mode,width,i,'portrait inherited an unrelated plate')
    targets=stage.locator('[data-bx-step],[data-bx-pause],[data-bx-go]').evaluate_all('nodes=>nodes.every(n=>n.getBoundingClientRect().width>=43.5&&n.getBoundingClientRect().height>=43.5)')
    assert targets,(mode,width,i,'small transport target')
    assert stage.locator('[aria-current="true"]').evaluate('''n=>{const a=n.getBoundingClientRect(),r=n.parentElement.getBoundingClientRect();return a.left>=r.left-1&&a.right<=r.right+1}'''),(mode,width,i,'active segment hidden in rail')
    assert metrics['height']<=(290 if width<700 else 350),(mode,width,i,'too tall',metrics)
    if i:assert metrics['cardWidth']>metrics['cardHeight']*1.3,(mode,width,i,'not wide',metrics)
    if height is None:height=metrics['height']
    assert metrics['height']==height,'Rotation moved the page'
    contrast=page.evaluate('reviewTextContrast()');assert not contrast['failures'],(mode,width,i,contrast['failures'])
    if width==390:
     contrast=slide.evaluate("async e=>(await import('./tools/home-review-contrast.js')).reviewTextContrast(e)")
     targets=stage.locator('button').evaluate_all('ns=>ns.filter(n=>n.getClientRects().length).every(n=>n.getBoundingClientRect().height>=43.5&&n.getBoundingClientRect().width>=43.5)')
     assert not contrast['failures'] and targets,(mode,i,contrast['failures'],targets)
     finish.append({'mode':mode,'index':i,'textContrast':True,'targets44':True})
     if i==9:
      value=slide.locator('.bx-brief-value strong');assert value.inner_text()=='0.04' and value.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)>=32'),(mode,'rounded archive metric too small')
     if slide.evaluate("e=>e.matches('.bx-brief-award,.bx-brief-scout')"):
      visibility=slide.evaluate("e=>[...e.children].map(n=>{const v=n.style.visibility;n.style.visibility='hidden';return v})")
      raw=slide.screenshot(path=str(OUT/f'glow-{mode}-{i}.png'))
      sample=page.evaluate('''async encoded=>{
       const im=new Image();im.src='data:image/png;base64,'+encoded;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;
       const at=(x,y)=>[...d.slice((y*c.width+x)*4,(y*c.width+x)*4+3)],base=at(3,Math.floor(c.height/2));let step=0,edge=0;
       for(const f of [.2,.4,.6,.8]){const y=Math.floor(c.height*f),x=Math.floor(c.width*f);for(let col=10;col<c.width-10;col++)step=Math.max(step,...at(col,y).map((v,k)=>Math.abs(v-at(col-1,y)[k])));for(const p of [at(3,y),at(c.width-4,y),at(x,3),at(x,c.height-4)])edge=Math.max(edge,...p.map((v,k)=>Math.abs(v-base[k])))}
       return {maxAdjacentChannelStep:step,maxEdgeChannelDifference:edge};
      }''',base64.b64encode(raw).decode())
      slide.evaluate("(e,values)=>[...e.children].forEach((n,i)=>n.style.visibility=values[i])",visibility)
      assert sample['maxAdjacentChannelStep']<=2 and sample['maxEdgeChannelDifference']<=1,(mode,i,'hard glow edge',sample)
      glows.append({'mode':mode,'index':i,**sample})
    checks.append({'mode':mode,'width':width,'index':i,**metrics});(OUT/'wide-checks.json').write_text(json.dumps(checks,indent=2))
 # Enlarged type must reflow every composition, not just grow a short title.
 enlarged=[]
 for mode in ['light','dark']:
  page.set_viewport_size({'width':320,'height':844});page.evaluate('mode=>reviewSetTheme(mode)',mode)
  for font_size in [20,32]:
   page.evaluate('size=>document.documentElement.style.fontSize=size+"px"',font_size)
   enlarged_height=None
   for i in range(1,page.locator('[data-bx-go]').count()):
    page.locator(f'[data-bx-go="{i}"]').evaluate('e=>e.click()');page.wait_for_timeout(350)
    result=page.locator('.bx-layer>.bx-slide:not(.bx-leaving)').evaluate('''e=>{
     const r=e.getBoundingClientRect(),art=e.querySelector('.bx-brief-art,.bx-brief-number,.bx-brief-value')?.getBoundingClientRect();
     const copy=[...e.querySelectorAll(':scope>.bx-kicker,:scope>.bx-head,:scope>.bx-brief-body,:scope>.bx-brief-action')];
     const within=[...e.children].every(n=>{const b=n.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1&&n.scrollWidth<=n.clientWidth+1});
     const separate=!art||copy.every(n=>{const b=n.getBoundingClientRect();return b.right<=art.left+1||b.left>=art.right-1||b.bottom<=art.top+1||b.top>=art.bottom-1});
     const series=e.querySelector('.bx-brief-series')?.getBoundingClientRect(),names=[...e.querySelectorAll('.bx-brief-rivals strong')];
     return {children:[...e.children].map(n=>({class:n.className,rect:n.getBoundingClientRect().toJSON(),scroll:[n.scrollWidth,n.scrollHeight],client:[n.clientWidth,n.clientHeight]})),bounds:r.toJSON(),within,separate,seriesSeparate:!series||names.every(n=>n.getBoundingClientRect().bottom<=series.top+1),overflow:document.documentElement.scrollWidth>innerWidth+1};
    }''')
    if not result['within'] or not result['separate']:page.screenshot(path=str(OUT/'enlarged-failure.png'))
    assert result['within'] and result['separate'] and result['seriesSeparate'] and not result['overflow'],(mode,font_size,i,result)
    if font_size==32 and i in [1,4,6,12]:page.screenshot(path=str(OUT/f'wide-{mode}-200pct-{i}.png'))
    current_height=page.locator('[data-bx-stage]').evaluate('e=>e.clientHeight')
    if enlarged_height is None:enlarged_height=current_height
    assert current_height==enlarged_height,'Enlarged text rotation moved the page'
    enlarged.append({'mode':mode,'fontSize':font_size,'index':i,**result})
 (OUT/'finish-checks.json').write_text(json.dumps({'slides':finish,'glows':glows},indent=2))
 page.evaluate("document.documentElement.style.fontSize=''")
 (OUT/'wide-enlarged-checks.json').write_text(json.dumps(enlarged,indent=2))
 page.set_viewport_size({'width':320,'height':844});page.evaluate("document.documentElement.style.fontSize='20px'");page.locator('[data-bx-go=\"1\"]').evaluate('e=>e.click()');page.wait_for_timeout(450)
 assert page.locator('.bx-brief h2').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)>=23'),'Larger text preference did not scale the headline'
 page.evaluate("document.documentElement.style.fontSize=''")
 page.set_viewport_size({'width':390,'height':844});page.locator('[data-bx-go="0"]').evaluate('e=>e.click()');page.wait_for_timeout(450)
 cdp=page.context.new_cdp_session(page);index=0;initial_hash=page.evaluate('location.hash')
 for direction in [1,1,1,-1,-1]:
  rect=page.locator('[data-bx-stage]').bounding_box();start=rect['x']+rect['width']*(.82 if direction==1 else .18);end=rect['x']+rect['width']*(.18 if direction==1 else .82);y=rect['y']+rect['height']*.5
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':start,'y':y}]})
  for step in range(1,7):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':start+(end-start)*step/6,'y':y}]});page.wait_for_timeout(18)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(400);index=(index+direction)%page.locator('[data-bx-go]').count()
  assert page.locator(f'[data-bx-go="{index}"]').get_attribute('aria-current')=='true','Wide swipe lost its place'
 assert page.evaluate('location.hash')==initial_hash,'Swiping followed a story link'
 page.evaluate('''async()=>{artStage.stop();const {renderStage,startStage}=await import('./js/broadcast-stage.js');const host=document.querySelector('.home-broadcast'),deck=[{id:'one',kind:'news',headline:'First story',dwell:120},{id:'two',kind:'news',headline:'Second story',dwell:120}];host.innerHTML=renderStage(deck,{editorial:true,wide:true});window.onceStage=startStage(host.querySelector('[data-bx-stage]'),deck);scrollTo(0,0)}''')
 page.wait_for_timeout(800)
 assert page.locator('[data-bx-go="1"]').get_attribute('aria-current')=='true','Did not complete the first pass'
 assert page.locator('[data-bx-pause]').get_attribute('aria-label')=='Play the broadcast','Wide broadcast kept looping'
 page.wait_for_timeout(400);assert page.locator('[data-bx-go="1"]').get_attribute('aria-current')=='true','Repeated a finished edition'
 page.locator('[data-bx-step="-1"]').evaluate('e=>e.click()');assert page.locator('[data-bx-go="0"]').get_attribute('aria-current')=='true','Manual navigation stopped after one pass'
 page.locator('[data-bx-step="1"]').evaluate('e=>e.click()');page.locator('[data-bx-pause]').evaluate('e=>e.click()');assert page.locator('[data-bx-go="0"]').get_attribute('aria-current')=='true','Explicit replay did not start from the beginning'
 page.wait_for_timeout(600)
 page.evaluate('''async()=>{onceStage.stop();const {renderStage,startStage}=await import('./js/broadcast-stage.js');const host=document.querySelector('.home-broadcast'),deck=[{id:'one',kind:'news',headline:'First story',dwell:120},{id:'two',kind:'news',headline:'Second story',dwell:120}];host.innerHTML=renderStage(deck,{editorial:true,wide:true});window.returnStage=startStage(host.querySelector('[data-bx-stage]'),deck)}''')
 assert page.locator('[data-bx-pause]').get_attribute('aria-label')=='Play the broadcast','Returning restarted a finished edition'
 page.evaluate('returnStage.update([{id:"one",kind:"news",headline:"A new trade happened",dwell:120},{id:"two",kind:"news",headline:"Second story",dwell:120}])')
 assert page.locator('[data-bx-pause]').get_attribute('aria-label')=='Pause the broadcast','New activity stayed marked as already seen'
 page.evaluate('returnStage.stop()')
 page.emulate_media(reduced_motion='reduce')
 page.evaluate('''async()=>{const {renderStage,startStage}=await import('./js/broadcast-stage.js');const host=document.querySelector('.home-broadcast'),deck=[artDeck[1],artDeck[2]];host.innerHTML=renderStage(deck,{editorial:true,wide:true});window.reducedStage=startStage(host.querySelector('[data-bx-stage]'),deck)}''')
 assert page.locator('[data-bx-pause]').get_attribute('aria-label')=='Play the broadcast'
 assert page.locator('.bx-layer').evaluate('e=>e.getAnimations({subtree:true}).filter(a=>a.playState==="running").length')==0
 page.evaluate('reducedStage.stop()');assert not errors,errors
 browser.close()
server.shutdown();print(json.dumps({'layouts':len(checks),'enlargedLayouts':len(enlarged),'onePass':True,'manualReplay':True,'reducedMotion':True,'errors':errors}))
