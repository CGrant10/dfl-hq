"""Production Home components and controllers, with isolated football fixtures only."""
import json,os,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FIXTURE=Path(os.environ.get('DFL_REVIEW_DIR',ROOT.parent/'dfl-review'))
OUT=Path(os.environ.get('DFL_RHYTHM_REVIEW_DIR','/tmp/dfl-home-rhythm-review'));OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  name=path.split('?')[0].lstrip('/');return str(FIXTURE/'index.html' if name in ['','index.html'] else ROOT/name)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
SETUP='''async ({phase,theme,defer=false})=>{
 const {mountHomeRhythm}=await import('/js/home-rhythm.js');
 const {mountHomeWeekFlow,homeWeekReceipt}=await import('/js/home-week-flow.js');
 const {homeMomentStories,createHomeMomentEdition}=await import('/js/home-moment-stories.js');
 const {homeHighlightMarkup}=await import('/js/home-highlight-ui.js');
 const {homeBroadcastDeck}=await import('/js/home-presentation.js');
 const {renderStage,startStage}=await import('/js/broadcast-stage.js');
 window.reviewStage.stop();window.reviewWeekFlow.stop();window.reviewVfx?.stop?.();
 window.reviewSetTheme(theme);
 const root=document.querySelector('#home-wrap'),week=document.querySelector('.home-week-desk');
 document.querySelector('[data-home-week-part="live"]').remove();
 const flow=document.createElement('div');flow.dataset.homeRhythmFlow='';week.before(flow);week.dataset.homeRhythmPart='week';flow.append(week);
 const highlights=document.createElement('div');highlights.dataset.homeHighlightsSlot='';highlights.dataset.homeRhythmPart='highlights';flow.append(highlights);
 const now=Date.UTC(2026,9,28,17),player={id:'wr1',name:'Justin Jefferson',position:'WR',points:31.42,state:'final'};
 const sides=(id,a,b)=>({id,sides:[{uid:'a'+id,name:'The Very Long Bayou Championship Fantasy Football Bombers',score:a,bench:[player]},{uid:'b'+id,name:'Klutch Sports Group',score:b,bench:[]}]});
 const model={season:2026,week:8,scoreStatus:'ready',checkedAt:now,completed:phase==='aftermath',live:phase==='live',events:[{state:phase==='live'?'live':phase==='aftermath'?'final':'upcoming',kickoff:phase==='pregame'?now+3600000:now-3600000}],games:[sides('close',111.04,111),sides('wide',140,80)]};
 if(phase==='pregame')for(const g of model.games)for(const t of g.sides){t.score=0;t.bench=[]}
 const edition={model};
 document.querySelector('[data-gameday-week]').textContent='Week 8';
 document.querySelector('.home-game-phase').textContent=phase==='live'?'Live':phase==='aftermath'?'Final':'Upcoming';
 highlights.innerHTML=homeHighlightMarkup([{id:'fixture',headline:'A huge catch over the middle',game_id:'g1',game_label:'MIN vs DET',duration:35,kind:'big_play',thumbnail_url:'https://a.espncdn.com/media/motion/2026/1028/fixture.jpg'}],now);
 const recap=document.querySelector('[data-home-recap-slot]');recap.innerHTML=homeWeekReceipt(edition);recap.hidden=!recap.innerHTML;
 const rhythm=mountHomeRhythm(root),weekly=mountHomeWeekFlow(week);
 const apply=e=>{const p=rhythm.update(e,now);if(p?.layoutAllowed)weekly.update(e,{phase:p});return p};
 const controller=createHomeMomentEdition({scope:'fixture',storage:{getItem:()=>null,setItem:()=>{}},now:()=>new Date(now)}),moment=controller.update({edition});
 const bank=homeMomentStories({edition,now:new Date(now)}),deck=homeBroadcastDeck(moment?[moment]:[],{now:new Date(now)});
 const host=document.querySelector('.home-broadcast');host.innerHTML=renderStage(deck,{editorial:true,wide:true});window.reviewStage=startStage(host.querySelector('[data-bx-stage]'),deck);window.reviewStage.suspend('fixture',true);
 window.rhythmReview={rhythm,weekly,apply,edition,bank,now,renderStage,startStage,homeBroadcastDeck};
 if(!defer)apply(edition);
}'''
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for mode in ['light','dark']:
  for width in [320,390,768]:
   for phase in ['pregame','live','aftermath']:
    c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,reduced_motion='no-preference',service_workers='block');pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    def route(r):
     if r.request.url.startswith(url):r.continue_()
     elif 'a.espncdn.com' in r.request.url:r.fulfill(status=200,content_type='image/webp',body=(ROOT/'assets/dfl-daily-rivalry.webp').read_bytes())
     else:r.abort()
    c.route('**/*',route);pg.goto(url);pg.wait_for_function('!!window.reviewWeekFlow');pg.evaluate(SETUP,{'phase':phase,'theme':mode});pg.wait_for_timeout(100)
    order=pg.locator('[data-home-rhythm-flow]').evaluate('e=>[...e.children].map(n=>n.dataset.homeRhythmPart)')
    assert order==(['highlights','week'] if phase=='live' else ['week','highlights']),(phase,order)
    assert pg.locator('[data-home-week-part="plan"]').evaluate('e=>e.open')==(phase=='pregame')
    assert pg.locator('.home-banter').evaluate("e=>e.previousElementSibling.hasAttribute('data-home-lore-slot')")
    # The first card stays independent; the selected event fits the existing wide composition.
    pg.locator('[data-bx-stage]').scroll_into_view_if_needed();pg.wait_for_timeout(220)
    assert pg.locator('.bx-home-feature').count()==1,pg.locator('[data-bx-stage]').inner_html()[:500]
    if phase!='pregame':
     pg.locator('[data-bx-go="1"]').evaluate('e=>e.click()');pg.wait_for_timeout(380)
    stage=pg.locator('[data-bx-stage]');stage.scroll_into_view_if_needed();pg.wait_for_timeout(80)
    metrics=stage.evaluate("""e=>{const r=e.getBoundingClientRect(),bottom=e.querySelector('.bx-controls')?.getBoundingClientRect().top??r.bottom;return{height:e.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,contentFits:[...e.querySelectorAll('.bx-layer>.bx-slide:not(.bx-leaving) .bx-kicker,.bx-layer>.bx-slide:not(.bx-leaving) .bx-head,.bx-layer>.bx-slide:not(.bx-leaving) .bx-brief-body,.bx-layer>.bx-slide:not(.bx-leaving) .bx-brief-value,.bx-layer>.bx-slide:not(.bx-leaving) .bx-brief-action')].every(n=>{const a=n.getBoundingClientRect();return a.left>=r.left-1&&a.right<=r.right+1&&a.bottom<=bottom+1&&n.scrollWidth<=n.clientWidth+1})}}""")
    assert not metrics['overflow'] and metrics['contentFits'],metrics
    if width==390:pg.screenshot(path=str(OUT/f'{mode}-{phase}-broadcast.png'))
    pg.locator('[data-home-rhythm-flow]').evaluate("e=>scrollTo({top:Math.max(0,scrollY+e.getBoundingClientRect().top-160),behavior:'instant'})");pg.wait_for_timeout(100)
    # A background phase change cannot reshuffle a visit, including after returning to top.
    before=pg.evaluate('scrollY');pg.evaluate("rhythmReview.apply({model:{...rhythmReview.edition.model,completed:true,live:false}})");pg.wait_for_timeout(80)
    assert abs(pg.evaluate('scrollY')-before)<2
    assert pg.locator('[data-home-rhythm-flow]').evaluate('e=>[...e.children].map(n=>n.dataset.homeRhythmPart)')==order
    if width==390:pg.screenshot(path=str(OUT/f'{mode}-{phase}-desk.png'))
    pg.evaluate("scrollTo({top:0,behavior:'instant'});rhythmReview.apply({model:{...rhythmReview.edition.model,completed:false,live:true,events:[{state:'live'}]}})");pg.wait_for_timeout(80)
    assert pg.locator('[data-home-rhythm-flow]').evaluate('e=>[...e.children].map(n=>n.dataset.homeRhythmPart)')==order
    # Cover every generated roast type without squeezing extra cards into production.
    if phase=='aftermath':
     for kind in ['bench','close','blowout']:
      pg.evaluate("kind=>{const r=rhythmReview,story=r.bank.find(s=>s.storySignal===kind);if(!story)throw Error('Missing story '+kind);reviewStage.stop();const host=document.querySelector('.home-broadcast'),deck=r.homeBroadcastDeck([story],{now:new Date(r.now)});host.innerHTML=r.renderStage(deck,{editorial:true,wide:true});reviewStage=r.startStage(host.querySelector('[data-bx-stage]'),deck);reviewStage.suspend('test',true);host.querySelector('[data-bx-go=\"1\"]').click()}",kind);pg.wait_for_timeout(380)
      pg.locator('[data-bx-stage]').scroll_into_view_if_needed();pg.wait_for_timeout(80)
      assert pg.locator('.bx-layer>.bx-slide:not(.bx-leaving)').evaluate('''e=>{const r=e.getBoundingClientRect(),end=e.closest('.bx-stage').querySelector('.bx-controls')?.getBoundingClientRect().top??r.bottom;return [...e.querySelectorAll('.bx-kicker,.bx-head,.bx-brief-body,.bx-brief-value,.bx-brief-action')].every(n=>{const a=n.getBoundingClientRect();return a.left>=r.left-1&&a.right<=r.right+1&&a.bottom<=end+1&&n.scrollWidth<=n.clientWidth+1})}'''),(mode,width,kind)
      assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth+1')
      if width==390:pg.locator('[data-bx-stage]').screenshot(path=str(OUT/f'{mode}-{kind}.png'))
    assert not errors,errors;checks.append({'theme':mode,'width':width,'phase':phase,'order':order,'scrollStable':True,**metrics});c.close()
 # Slow first data: a pointer action or existing scroll freezes the default order.
 for reason in ['pointer','scroll','focus']:
  c=b.new_context(viewport={'width':390,'height':844},service_workers='block');pg=c.new_page();c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url) else r.abort());pg.goto(url);pg.wait_for_function('!!window.reviewWeekFlow');pg.evaluate(SETUP,{'phase':'live','theme':'dark','defer':True})
  pg.evaluate("reason=>{if(reason==='pointer')document.querySelector('#home-wrap').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));if(reason==='scroll')scrollTo({top:600,behavior:'instant'});if(reason==='focus')document.querySelector('[data-home-week-part=plan]>summary').focus();rhythmReview.apply(rhythmReview.edition)}",reason);pg.wait_for_timeout(100)
  assert pg.locator('[data-home-rhythm-flow]').evaluate("e=>e.firstElementChild.dataset.homeRhythmPart")=='week',reason
  c.close()
 b.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps({'cases':checks,'lateDataGuards':['pointer','scroll','focus']},indent=2));print(json.dumps({'cases':len(checks),'lateDataGuards':3,'errors':0,'screenshots':str(OUT)}))
