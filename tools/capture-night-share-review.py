"""Render real share exports in an isolated browser; block all league writes."""
import base64,json,os,threading,urllib.request
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('DFL_NIGHT_SHARE_DIR','/workspace/dfl-share-1560'));OUT.mkdir(parents=True,exist_ok=True)
photo=Path(os.environ.get('DFL_SHARE_PHOTO',str(OUT/'chase.jpg')))
if not photo.exists():urllib.request.urlretrieve('https://sleepercdn.com/content/nfl/players/7564.jpg',photo)
head=(ROOT/'index.html').read_text().split('<head>',1)[1].split('</head>',1)[0]
fixture='''
import {editorialShareCanvas,openSharePreview,shareFontsReady} from '/js/share-editorial.js';
import {prepareNightGame} from '/js/share-night-game.js';
import {prepareBookSlip} from '/js/share-book-slip.js';
import {shareSealReady} from '/js/share.js';
import * as m from '/js/share-export-model.js';
import {pinMode} from '/js/theme.js';
window.reviewTheme=pinMode;
window.models=m;
window.spec=m.matchupShareSpec({season:2026,week:8,sides:[{name:'Bayou Bombers',score:136.42},{name:'Klutch Sports Group',score:121.88}],winner:{name:'Bayou Bombers'},margin:14.54,mvp:{id:'7564',name:'Ja’Marr Chase',points:28.4}});
const player=(i)=>({id:String(7564+i),name:i?'A Very Long Receiver Name With Multiple Words':'Ja’Marr Chase',points:28.4,value:72+i,meta:'WR · CIN · Healthy'});
const columns=['Bayou Bombers','Klutch Sports Group','The Very Long Third Team With A Longer Name'].map((from,i)=>({from,to:['Klutch Sports Group','The Very Long Third Team With A Longer Name','Bayou Bombers'][i],players:Array.from({length:5},(_,j)=>player(j)),total:370}));
window.specs={matchup:spec,tie:m.matchupShareSpec({season:2026,week:8,sides:[{name:'A',score:0},{name:'B',score:0}],winner:null,margin:0}),trade:m.tradeShareSpec({multi:true,columns,call:'ACCEPT',fairness:94,confidence:{label:'Limited',reasons:['Injury evidence incomplete.']},remarks:[{title:'Keep the receipt.',copy:'This is an estimate, not a promise.'}],deltas:columns.map((c,i)=>({team:c.from,delta:i?1:-2}))}),ticket:m.ticketShareSpec({title:'Ten pick parlay',season:2026,who:'Bayou Bombers',status:'open',gradingPending:true,liveResult:'lost',pendingReturn:{label:'Projected return',value:0},odds:'+1900',stake:50,ret:1000,profit:950,picks:Array.from({length:10},(_,i)=>({pick:'The Long Team Name For Pick '+(i+1),market:'Fantasy matchup · Team A vs Team B',odds:'+120',status:i===9?'lost':'won',pending:true}))}),keeper:m.keeperShareSpec({season:2026,total:12,submitted:1,rows:[{team:'Bayou Bombers',keepers:[{...player(0),round:0,tenure:{year:2,max:3}}]}],also:[{name:'Legacy keeper',round:null}]}),profile:m.profileShareSpec({who:'League Commissioner With A Very Long Name',team:'Bayou Bombers',record:'12–8',winPct:.6,points:'2,758.14',avgFinish:'3.5',seasons:10,trophyCase:[['Champion','2022'],['Champion','2023'],['Runner up','2024']],crimeScene:[['Chip eater','2016']],verdict:'Ten years. Plenty of fucking receipts.'}),recap:m.aftermathShareSpec({season:2026,week:8,title:'The week',king:{name:'Bayou Bombers',value:136.42},highlights:[{label:'High score',title:'Bayou Bombers',detail:'136.42 points'},{label:'Narrow escape',title:'Klutch Sports Group',detail:'A Sunday night comeback.'}],players:{starters:[{...player(0),owner:'Bayou Bombers'}],bench:[]},games:[{winner:{name:'Bayou Bombers',value:136.42},loser:{name:'Klutch Sports Group',value:121.88},margin:14.54}],story:'The league brought the receipts.'}),highlight:m.footballMomentShareSpec({kind:'touchdown',eventKey:'fixture',title:'Chase to the house.',text:'A 40-yard touchdown.',team:{team_name:'Bayou Bombers'},recap:{play:{yards:40,period:2,clock:'3:20',text:'Ja’Marr Chase catches a 40-yard touchdown.'},players:[{...player(0),position:'WR',nflTeam:'CIN',role:'Starter'}]}},{season:2026,week:8}),table:{kind:'Golf round',headline:'GOLF RECEIPT.',context:'2026 / Round 1',summary:'Final',table:{columns:[{label:'1',meta:'Par 4'},{label:'2',meta:'Par 3'},{label:'3',meta:'Par 5'}],rows:[{name:'Bayou Bombers',detail:'Round 1',values:['3','5','3'],marks:['birdie','double','eagle']}]},footer:'DFL Golf'}};
await Promise.all([prepareNightGame(),prepareBookSlip(),shareFontsReady,shareSealReady]);
window.photo=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='/night-review/chase.jpg'});
window.draw=(spec,options={})=>{const c=editorialShareCanvas(spec,{style:'photo',photo:window.photo,...options});document.querySelector('#art').replaceChildren(c);return c.shareLayoutFacts};
window.showPreview=spec=>openSharePreview(spec,{filename:'test.png',title:'DFL receipt',text:'Fixture receipt'});
window.shareCalls=[];Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});Object.defineProperty(navigator,'share',{value:data=>{shareCalls.push({active:navigator.userActivation.isActive,file:data.files?.[0]?.name});return Promise.resolve()},configurable:true});
window.saved=[];HTMLAnchorElement.prototype.click=function(){saved.push(this.download)};
window.draw(spec);document.querySelector('#open').onclick=()=>window.showPreview(spec);window.ready=true;
'''
html=f'<!doctype html><html lang="en"><head><base href="/"><meta charset="utf-8">{head}<style>#art canvas{{display:block;width:100%;height:auto}}</style></head><body><button id="open" class="btn">Share matchup</button><main id="art" style="max-width:540px;margin:auto"></main><script type="module">{fixture}</script></body></html>'
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  stub={'/js/supabase.js':'export const db=()=>null;', '/js/members.js':'export const currentMember=()=>null;'}.get(self.path.split('?')[0])
  if stub:
   self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(stub.encode());return
  if self.path.split('?')[0]=='/night-review/':
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(html.encode());return
  super().do_GET()
 def translate_path(self,path):
  path=path.split('?')[0]
  return str(photo) if path=='/night-review/chase.jpg' else str(ROOT/path.lstrip('/'))
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(OUT/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
def save_canvas(page,name,selector='#art canvas'):
 data=page.locator(selector).evaluate('(c)=>c.toDataURL()');(OUT/(name+'.png')).write_bytes(base64.b64decode(data.split(',')[1]))
def bounds(page,selector='#art canvas'):
 return page.locator(selector).evaluate('''c=>{const f=c.shareLayoutFacts;return f.text.every(r=>r.x>=63&&r.x+r.width<=f.width-63&&r.y>=0&&r.y+r.height<=f.height)&&f.images.every(img=>f.text.every(t=>!(t.x<img.x+img.width&&t.x+t.width>img.x&&t.y<img.y+img.height&&t.y+t.height>img.y)))}''')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
  for theme in ['light','dark']:
   c=browser.new_context(viewport={'width':width,'height':844},has_touch=True,service_workers='block');requests=[]
   def route(r):
    if 'sleepercdn.com/content/nfl/players/' in r.request.url:
     requests.append(r.request.url)
     if '/999999.jpg' in r.request.url:r.abort()
     else:r.fulfill(body=photo.read_bytes(),content_type='image/png')
    elif r.request.url.startswith('http://127.0.0.1:'):r.continue_()
    else:r.abort()
   c.route('**/*',route);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/night-review/');page.wait_for_function('window.ready');page.evaluate('mode=>reviewTheme(mode)',theme)
   tag=f'{width}-{theme}'
   page.click('#open');page.wait_for_selector('.dfl-share-preview canvas');check(tag+' defaults to chosen Night Game',page.locator('.dfl-share-preview canvas').get_attribute('data-share-style')=='photo');check(tag+' artwork/font ready and photo clear of text',bounds(page,'.dfl-share-preview canvas') and page.locator('.dfl-share-preview canvas').evaluate('c=>c.shareLayoutFacts.artwork'))

   check(tag+' no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth') and page.locator('.dfl-share-preview').evaluate('d=>d.scrollWidth<=d.clientWidth'))
   check(tag+' controls keep 44px touch height',page.locator('.dfl-share-preview').evaluate('d=>[...d.querySelectorAll("button,select")].filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=44)'))
   page.screenshot(path=str(OUT/f'preview-{tag}.png'))
   page.click('[data-share-send]');check(tag+' native share remains in the user gesture',page.evaluate('shareCalls.length===1&&shareCalls[0].active&&shareCalls[0].file.endsWith(".png")'));page.click('[data-share-save]');check(tag+' save remains available',page.evaluate('saved.length===1&&saved[0].endsWith(".png")'))
   page.click('button[data-share-style="clean"]');page.wait_for_selector('.dfl-share-preview canvas[data-share-style="clean"]');page.click('[data-share-close]');page.wait_for_selector('.dfl-share-preview',state='detached');page.click('#open');page.wait_for_selector('.dfl-share-preview canvas[data-share-style="clean"]');check(tag+' explicit Clean preference persists',page.locator('[data-share-style="clean"]').first.get_attribute('aria-pressed')=='true');page.click('[data-share-close]');page.wait_for_selector('.dfl-share-preview',state='detached')
   before=len(requests);page.evaluate('showPreview(specs.ticket)');page.wait_for_selector('.dfl-share-preview canvas');page.wait_for_selector('.dfl-share-preview canvas[data-share-style="clean"]');check(tag+' printed slip makes no player request',len(requests)==before and not page.locator('.dfl-share-player').is_visible() and not page.locator('.dfl-share-styles').is_visible());check(tag+' slip keeps the other card style preference',page.evaluate('localStorage.getItem("dfl.share.style")=="clean"'));page.select_option('#dfl-share-format','full');page.wait_for_selector('.dfl-share-preview canvas[data-share-format="full"]');check(tag+' ten-pick full export retains final miss and pending return',page.locator('.dfl-share-preview canvas').evaluate('c=>{const s=c.shareLayoutFacts.text.map(t=>t.text).join(" ");return s.includes("Pick 10")&&s.includes("MISS · PENDING")&&s.includes("0 SIN")&&/grading pending/i.test(s)}'));page.screenshot(path=str(OUT/f'ticket-preview-{tag}.png'));page.click('[data-share-close]');page.wait_for_selector('.dfl-share-preview',state='detached')
   page.evaluate('localStorage.setItem("dfl.share.style","photo")');page.evaluate('showPreview({...spec,players:[{id:"999999",name:"Unavailable photo"}]})');page.wait_for_selector('.dfl-share-status:text("Player photo unavailable.")');check(tag+' failed portrait keeps usable Night Game',page.locator('.dfl-share-preview canvas').get_attribute('data-share-style')=='photo' and page.locator('.dfl-share-preview canvas').evaluate('c=>!c.shareLayoutFacts.images.length') and page.locator('[data-share-save]').is_enabled());page.click('[data-share-close]');page.wait_for_selector('.dfl-share-preview',state='detached')
   page.evaluate('showPreview(spec);document.querySelector("[data-share-style=clean]").click()');page.wait_for_selector('.dfl-share-preview canvas[data-share-style="clean"]');page.wait_for_timeout(100);check(tag+' latest style wins over stale render',page.locator('.dfl-share-preview canvas').get_attribute('data-share-style')=='clean');page.keyboard.press('Escape');page.wait_for_selector('.dfl-share-preview',state='detached');check(tag+' close restores focus',page.locator('#open').evaluate('e=>e===document.activeElement'))
   page.evaluate('showPreview(spec);location.hash="review-route"');page.wait_for_selector('.dfl-share-preview',state='detached');check(tag+' route change tears down loading preview',page.locator('.dfl-share-preview').count()==0)
   if width==390 and theme=='dark':
    for name in ['matchup','tie','trade','ticket','keeper','profile','recap','highlight','table']:
     for fmt in ['compact','full'] if name in ['trade','ticket','recap','profile'] else ['compact']:
      page.evaluate('([name,format])=>draw(specs[name],{format,photo:specs[name].players?.length?photo:null})',[name,fmt]);check(f'{name}-{fmt} canvas bounds and image separation',bounds(page));save_canvas(page,f'{name}-{fmt}')
      if name=='table':check('wide table headers align with scores and frame stays wide',page.locator('#art canvas').evaluate('c=>{const f=c.shareLayoutFacts,h=f.text.find(t=>t.text==="1"),v=f.text.find(t=>t.text==="3"&&t.y>h.y+60);return c.width===1600&&c.height===900&&Math.abs(h.x+h.width/2-v.x-v.width/2)<1}'))
    page.evaluate('draw(spec)');save_canvas(page,'matchup-final');page.set_viewport_size({'width':1080,'height':1450});page.evaluate('document.querySelector("#art").style.cssText="width:1080px;max-width:none;margin:0"');page.locator('#art canvas').screenshot(path=str(OUT/'matchup-browser.png'))
    long=page.evaluate('''()=>draw({...spec,nightGame:{...spec.nightGame,primary:{label:'The Very Long Team Name That Should Never Be Cut Off On A Receipt',value:'1,234.56'}},context:'2026 / Week 08 / A Much Longer Context With All The Information'})''');check('long names and context reserve full space',bounds(page));save_canvas(page,'matchup-long')
   check(tag+' no uncaught errors',not errors);c.close()
 browser.close()
server.shutdown();print(f'{len(checks)} browser checks passed')
