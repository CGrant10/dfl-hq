"""Real Activity page, picker and injury controllers. All data and mutations are isolated fixtures."""
import json,re,threading,os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_ACTIVITY_REVIEW_DIR','/tmp/dfl-activity-review'));OUT.mkdir(parents=True,exist_ok=True)
created='2026-10-28T14:00:00Z'
rows=[{'id':1,'category':'trades','title':'Trade completed','body':'A deal is done','target_url':'#/trade?tx=123','created_at':created,'is_read':False},{'id':2,'category':'trades','title':'Three-way trade','body':'A routed deal','target_url':'#/trade?tx=456','created_at':created,'is_read':False},{'id':3,'category':'matchup_moments','title':'Justin Jefferson · TOUCHDOWN','body':'▶ Video available · A touchdown catch','target_url':'#/clubhouse?season=2026&week=8&tab=highlights&matchup=2&moment=nfl:100:200:3&nflGame=100&clip=7','created_at':created,'is_read':False},{'id':4,'category':'sportsbook','title':'Sportsbook ticket cashed','body':'A ticket won','target_url':'#/sportsbook?product=book&ticket=5','created_at':created,'is_read':True},{'id':5,'category':'sportsbook','title':'Sportsbook ticket settled','body':'A ticket lost','target_url':'#/sportsbook?product=book&ticket=6','created_at':created,'is_read':False},{'id':6,'category':'announcements','title':'The league is watching.','body':'A short league announcement with a clear next step.','target_url':'#/home','created_at':created,'is_read':True}]
trades=[]
for tx,teams in [('123',['The Very Long Championship Bayou Bombers','Klutch Sports Group']),('456',['Monday Night Mayhem','The Bayou Bombers','Dream Enders'])]:
 trades.append({'sleeper_transaction_id':tx,'teams':[{'roster_id':i+1,'team_name':name}for i,name in enumerate(teams)],'packages':[{'roster_id':i+1,'sends':[{'id':['7547','6794','2216'][i],'name':['Amon-Ra St. Brown','Justin Jefferson','Mike Evans'][i],'nfl_team':['DET','MIN','TB'][i]},{'id':'1466','name':'Travis Kelce','nfl_team':'KC'}]}for i in range(len(teams))],'result':{'fairness':84}})
fixture={'rows':rows,'trades':trades,'clips':[{'id':7,'game_id':'100','play_id':'200','headline':'Jefferson hauls in the touchdown','game_label':'MIN vs DET','thumbnail_url':'https://a.espncdn.com/media/motion/2026/1028/example.jpg','expires_at':'2027-01-01T00:00:00Z'}],'games':[{'game_id':'100','plays':[{'id':'200','players':[{'id':'6794','name':'Justin Jefferson'}]}]}],'account':{'member_id':1,'bets':[{'id':5,'status':'won','stake':20,'payout':74.5,'legs':[{},{}]},{'id':6,'status':'lost','stake':10,'payout':0,'legs':[{}]}]},'writes':[]}
base=(ROOT/'index.html').read_text();head=base[base.index('<head>')+6:base.index('</head>')]
head=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',head)
html='<!doctype html><html><head>'+head+'</head><body><main id="view" class="view" data-page-system="1" data-route="notifications"></main><section id="picker-fixture" hidden><label>Add player<select data-tb-add-anchor="send" aria-label="Players you offer"><option value="">Add player</option><option value="6794">Justin Jefferson</option><option value="2216">Mike Evans</option></select></label><button data-open-injury-report>Injury report</button></section><script>window.f='+json.dumps(fixture)+'</script><script type="module">import {render,leave} from "/js/pages/notifications.js";import {pinMode} from "/js/theme.js";import {startUiMotion,mountPageMotion} from "/js/ui-motion.js";import {mountTradePlayerPickers} from "/js/trade-player-picker.js";import {mountInjuryReport} from "/js/injury-report-ui.js";window.renderActivity=()=>render(document.querySelector("#view"));window.leaveActivity=leave;window.setTheme=pinMode;startUiMotion();await renderActivity();window.stopMotion=mountPageMotion(document.querySelector("#view"));const pool=new Map([["6794",{id:"6794",name:"Justin Jefferson",position:"WR",nflTeam:"MIN",expectedPerGame:18.5,tradeValue:80}],["2216",{id:"2216",name:"Mike Evans",position:"WR",nflTeam:"TB",expectedPerGame:15.2,tradeValue:60}]]);mountTradePlayerPickers(document.querySelector("#picker-fixture"),pool,[{team_name:"Bayou Bombers",playerIds:["6794","2216"]}]);mountInjuryReport(document.querySelector("#picker-fixture"),{getReport:()=>({checkedAt:Date.now(),rostersKnown:true,items:Array.from({length:18},(_,i)=>({id:String(i),sleeperId:"6794",name:"Justin Jefferson",position:"WR",nflTeam:"MIN",tag:"Questionable",tone:"risk",availability:"Decision pending",tier:0}))}),refresh:async()=>{}});window.ready=true;</script></body></html>'
notifications='''export const inbox=async()=>window.f.rows;export const markRead=async ids=>{window.f.writes.push({action:'read',ids});window.f.rows.forEach(r=>{if(ids.includes(r.id))r.is_read=true})};export const dismissNotifications=async ids=>{window.f.writes.push({action:'dismiss',ids});window.f.rows=window.f.rows.filter(r=>!ids.includes(r.id))};export const clearInbox=async()=>{window.f.writes.push({action:'clear'});window.f.rows=[]};export const pushCapability=()=>({supported:true});export const pushPreferences=async()=>({enabled:true,subscription:{endpoint:'fixture'},categories:['trades','sportsbook'],lastSuccessAt:'2026-10-28T13:00:00Z'});export const saveSubscription=async()=>{window.f.writes.push({action:'preferences'})};export const enablePush=async()=>{window.f.writes.push({action:'enable'})};export const disablePush=async()=>{window.f.writes.push({action:'disable'})};export const testNotification=async()=>{throw Error('Tests must not send notifications')};'''
supabase='''export const configured=true;export const edge=()=>{throw Error('No edge writes')};export const privilegedFunctionHeaders=()=>({});export const db=()=>({from:table=>({select:()=>({in:async()=>({data:table==='trade_alerts'?window.f.trades:table==='nfl_highlight_clips'?window.f.clips:table==='nfl_live_games'?window.f.games:[]})})}),rpc:async name=>{if(name!=='sportsbook_my_live_account')throw Error('Unexpected RPC '+name);return{data:window.f.account}}});'''
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?')[0]
  body=html if path=='/activity-review.html' else notifications if path=='/js/notifications.js' else supabase if path=='/js/supabase.js' else 'export const currentMember=()=>({id:1,display_name:"Grant"});export const loadMemberDirectory=async()=>[];' if path=='/js/members.js' else None
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/html'if path.endswith('.html')else'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def translate_path(self,path):return str(ROOT/path.split('?')[0].lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/';checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for mode in ['light','dark']:
  for width in [320,390,768]:
   c=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,service_workers='block');pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   c.route('**/*',lambda r:r.continue_()if r.request.url.startswith(url) else r.fulfill(status=200,content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())if'sleepercdn.com'in r.request.url or'a.espncdn.com'in r.request.url else r.abort())
   pg.goto(url+'activity-review.html#/notifications');pg.wait_for_function('window.ready===true');pg.evaluate('mode=>setTheme(mode)',mode);pg.evaluate('document.fonts.ready');pg.wait_for_timeout(100)
   assert pg.locator('.activity-item').count()==6
   pg.wait_for_timeout(150)
   assert pg.locator('.activity-card').evaluate_all('rows=>rows.every(e=>[...e.querySelectorAll(".dfl-player-portrait img")].every(img=>{const a=img.getBoundingClientRect(),b=img.parentElement.getBoundingClientRect();return a.width<=b.width+1&&a.height<=b.height+1&&a.left>=b.left-1&&a.right<=b.right+1}))'),'Portrait escaped its frame'
   assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   assert pg.locator('.notify-setup').count()==0,'Device setup still ahead of inbox'
   if width==390:pg.screenshot(path=str(OUT/f'{mode}-activity.png'),full_page=True)
   for key,count in [('trades',2),('plays',1),('book',2),('unread',4),('league',1),('all',6)]:
    pg.locator(f'[data-activity-filter="{key}"]').click();assert pg.locator('.activity-item').count()==count
   assert pg.locator('[data-activity-id="1"] .activity-card').get_attribute('href')=='#/trade?tx=123'
   assert pg.locator('[data-activity-id="3"] .activity-card').get_attribute('href').endswith('clip=7')
   assert '0 SIN' in pg.locator('[data-activity-id="5"]').inner_text()
   pg.locator('[data-activity-settings]').click();sheet=pg.locator('.notification-settings-sheet');sheet.wait_for(state='visible');pg.wait_for_timeout(250)
   assert pg.locator('.notify-categories input:checked').count()==2
   bounds=sheet.bounding_box();assert bounds['x']>=-1 and bounds['x']+bounds['width']<=width+1 and bounds['y']>=0 and bounds['y']+bounds['height']<=845,bounds
   if width==390:pg.screenshot(path=str(OUT/f'{mode}-settings.png'))
   # Escape is one press, also after rapid close/reopen and with text inputs.
   pg.keyboard.press('Escape');pg.wait_for_function('!document.querySelector(".notification-settings-sheet")');assert pg.locator('[data-activity-settings]').evaluate('e=>e===document.activeElement')
   if width==390:
    pg.locator('[data-activity-settings]').click();pg.wait_for_selector('.notification-settings-sheet[open]');pg.wait_for_timeout(250)
    # Real touch input: native body scrolling stays separate from header dismissal.
    body=pg.locator('.notification-settings-sheet [data-sheet-body]');body.evaluate('e=>e.scrollTop=180');assert pg.locator('.notification-settings-sheet').evaluate('e=>e.open')
    touch=c.new_cdp_session(pg);rect=pg.locator('.notification-settings-sheet>header').bounding_box();x=rect['x']+48;y=rect['y']+30;before=pg.evaluate('scrollY')
    touch.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    for dy in [30,80,150,190]:touch.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+dy}]})
    touch.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});pg.wait_for_function('!document.querySelector(".notification-settings-sheet")');assert abs(pg.evaluate('scrollY')-before)<2
    # A keyboard-sized visual viewport keeps the sheet above its lower edge.
    pg.evaluate('''()=>{window.actualViewport=window.visualViewport;const fake=new EventTarget();Object.assign(fake,{height:400,offsetTop:0});Object.defineProperty(window,'visualViewport',{configurable:true,value:fake})}''')
    pg.locator('[data-activity-settings]').click();pg.wait_for_selector('.notification-settings-sheet[open]');pg.wait_for_timeout(250)
    keyboard=pg.locator('.notification-settings-sheet').bounding_box();assert keyboard['y']>=0 and keyboard['y']+keyboard['height']<=401,keyboard
    pg.keyboard.press('Escape');pg.wait_for_function('!document.querySelector(".notification-settings-sheet")');pg.evaluate("Object.defineProperty(window,'visualViewport',{configurable:true,value:window.actualViewport})")
    pg.emulate_media(reduced_motion='reduce');pg.locator('[data-activity-settings]').click();pg.wait_for_selector('.notification-settings-sheet[open]');pg.wait_for_timeout(40)
    assert pg.locator('.notification-settings-sheet').evaluate('e=>e.getAnimations().filter(a=>a.playState==="running").length===0')
    pg.mouse.click(4,4);pg.wait_for_function('!document.querySelector(".notification-settings-sheet")');pg.emulate_media(reduced_motion='no-preference')
   pg.locator('[data-clear-all]').click();confirm=pg.locator('.dfl-confirm-sheet');confirm.wait_for(state='visible');confirm.locator('[data-confirm-close]').last.click();pg.wait_for_function('!document.querySelector(".dfl-confirm-sheet")');assert pg.locator('.activity-item').count()==6
   pg.locator('[data-delete-notification="6"]').click();pg.wait_for_function('document.querySelectorAll(".activity-item").length===5');pg.locator('[data-read-all]').click();pg.wait_for_function('document.querySelector("[data-activity-count]").textContent==="All caught up"')
   # Reopen the sheet and leave the route; the modal and its listeners must disappear.
   pg.locator('[data-activity-settings]').click();pg.wait_for_selector('.notification-settings-sheet[open]');pg.evaluate('leaveActivity()');assert pg.locator('dialog[open]').count()==0
   pg.evaluate('document.querySelector("#view").hidden=true;document.querySelector("#picker-fixture").hidden=false');pg.locator('[data-trade-picker]').click();picker=pg.locator('.trade-player-picker');picker.wait_for(state='visible');pg.wait_for_timeout(250)
   assert picker.get_attribute('data-sheet-ready')=='true'
   picker.locator('input').fill('Jefferson');assert picker.locator('[data-picker-player]').count()==1
   pg.keyboard.press('Escape');pg.wait_for_function('!document.querySelector(".trade-player-picker").open')
   pg.locator('[data-trade-picker]').click();picker.locator('[data-picker-player="2216"]').click();assert pg.locator('select[data-tb-add-anchor]').input_value()=='2216';assert not picker.evaluate('e=>e.open')
   pg.locator('[data-open-injury-report]').click();injury=pg.locator('.injury-dialog');injury.wait_for(state='visible');pg.wait_for_timeout(250)
   assert injury.get_attribute('data-sheet-ready')=='true';assert injury.locator('[data-sheet-body]').evaluate('e=>e.scrollHeight>e.clientHeight')
   injury.locator('[data-injury-search]').fill('Jefferson');pg.keyboard.press('Escape');pg.wait_for_function('!document.querySelector(".injury-dialog").open')
   assert not errors,errors;assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth+1');checks.append({'theme':mode,'width':width,'filters':True,'settings':True,'clearCancel':True,'readDismiss':True,'picker':True,'injury':True,'focus':True,'errors':errors});c.close()
 browser.close()
server.shutdown();(OUT/'checks.json').write_text(json.dumps(checks,indent=2));print(json.dumps({'cases':checks,'screenshots':str(OUT)}))
