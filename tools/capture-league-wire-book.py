"""Actual Sportsbook page, isolated account/markets and no remote mutations."""
import json,os,re,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_WIRE_BOOK_DIR','/tmp/dfl-wire-book'));OUT.mkdir(parents=True,exist_ok=True)
index=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',(ROOT/'index.html').read_text())
index=re.sub(r'<main id="view"[^>]*>[\s\S]*?</main>','<main id="view" class="view" data-route="sportsbook" data-page-system data-daily-desk="sportsbook"></main>',index)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  path=self.path.split('?')[0];body=None
  if path=='/wire-book.html':body=index
  elif path=='/js/supabase.js':body="export const db=()=>window.bookFixture.db;export const configured=()=>true;export const hasPermission=()=>false;export const isAdmin=()=>false;export const isMasterAdmin=()=>false;export const isCommissioner=()=>false;export const privilegedFunctionHeaders=()=>({});export const edge=()=>{throw Error('No review writes')};"
  elif path=='/js/members.js':body="export const currentMember=()=>window.bookFixture.member;export const getMemberId=()=>1;export const loadMemberDirectory=async()=>window.bookFixture.members;export const loadMembers=loadMemberDirectory;export const refreshMember=async()=>currentMember();export const memberImage=()=>null;"
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/html' if path.endswith('.html') else 'text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
fixture='''
window.bookFixture={writes:[],reads:[],wallet:{balance:420,claimable:50,claimable_days:1,next_daily_at:'2026-11-06T09:00:00Z'},claimAttempts:0};const f=window.bookFixture;
f.members=['Bayou Bombers','Klutch Sports Group','Bastards of the Realm','Monday Night Mayhem'].map((name,i)=>({id:i+1,team_name:name,display_name:'Review '+(i+1),sleeper_user_id:String(i+1),active:true}));f.member=f.members[0];
f.markets=[1,2].map((id,i)=>({id,category:'Fantasy',status:'open',source:'sleeper',auto_key:'matchup:2026:8:'+id,closes_at:'2099-11-02T23:00:00Z',title:f.members[i*2].team_name+' vs '+f.members[i*2+1].team_name}));
f.outcomes=f.members.map((m,i)=>({id:i+1,market_id:Math.floor(i/2)+1,label:m.team_name,sleeper_user_id:m.sleeper_user_id,sleeper_roster_id:i+1,odds_american:i%2?120:-110,status:'open'}));
f.db={from:table=>{let rows=table==='sportsbook_markets'?f.markets:table==='sportsbook_outcomes'?f.outcomes:table==='sleeper_leagues'?[{season:2026,sleeper_league_id:'review'}]:[];const q=new Proxy({}, {get:(_,key)=>{if(key==='then')return resolve=>resolve({data:rows,error:null});if(['insert','upsert','delete','update'].includes(key))return()=>{f.writes.push(key);throw Error('No review writes')};if(key==='eq')return(k,v)=>{rows=rows.filter(r=>r[k]===v);return q};if(key==='in')return(k,vs)=>{rows=rows.filter(r=>vs.includes(r[k]));return q};if(key==='neq')return(k,v)=>{rows=rows.filter(r=>r[k]!==v);return q};if(key==='maybeSingle'||key==='single')return async()=>({data:rows[0]||null,error:null});return()=>q;}});return q},rpc:async name=>{f.reads.push(name);if(name==='sportsbook_claim_daily'&&f.allowClaims){f.claimAttempts++;if(f.failClaim)return {data:null,error:{message:'Claim unavailable. Try again.'}};if(f.holdClaim)await new Promise(resolve=>f.releaseClaim=resolve);const credited=f.wallet.claimable;f.wallet={...f.wallet,balance:f.wallet.balance+credited,claimable:0,claimable_days:0};return {data:[{credited}],error:null}}const data=name==='sportsbook_touch_wallet'?[f.wallet]:name==='sportsbook_my_live_account'?{member_id:1,balance:f.wallet.balance,bets:[],ledger:[]}:name==='pickem_current_board'?{available:false}:name==='sportsbook_weekly_recap'?null:[];if(!['sportsbook_touch_wallet','sportsbook_my_live_account','pickem_current_board','sportsbook_weekly_recap','sportsbook_leaderboard','sportsbook_trending_picks','sportsbook_prop_index'].includes(name)){f.writes.push(name);throw Error('Unexpected review RPC '+name)}return {data,error:null}}};
'''
checks=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');c.add_init_script(fixture)
 def route(r):
  if r.request.url.startswith(base):return r.continue_()
  if '/state/nfl' in r.request.url:return r.fulfill(content_type='application/json',body='{"season":"2026","week":8}',headers={'Access-Control-Allow-Origin':'*'})
  if r.request.resource_type=='image':return r.fulfill(content_type='image/png',body=(ROOT/'tools/fixtures/player-portrait.png').read_bytes())
  return r.abort()
 c.route('**/*',route);page=c.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',str(e),flush=True)));page.goto(base+'/wire-book.html#/sportsbook',wait_until='domcontentloaded')
 page.evaluate('''async()=>{document.getElementById('welcome').classList.add('hidden');document.getElementById('splash')?.remove();document.getElementById('whoami-name').textContent='Review';(await import('/js/season-nav.js')).mountSeasonNavigation();window.bookPage=await import('/js/pages/sportsbook.js');await bookPage.render(document.getElementById('view'));}''')
 page.wait_for_selector('.sb-masthead',timeout=10000);page.evaluate('document.fonts.ready')
 for mode in ['light','dark']:
  page.evaluate("async mode=>(await import('/js/theme.js')).pinMode(mode)",mode)
  for width in [320,390,430]:
   page.set_viewport_size({'width':width,'height':844});page.evaluate('scrollTo(0,0)');page.wait_for_timeout(120)
   assert page.locator('.sb-wallet strong').inner_text()=='420'
   assert page.locator('.sb-fantasy-slate .sb-market').count()==2
   assert page.locator('#tabbar a,#tabbar button').count()==5
   assert page.locator('.sb-brand h1').evaluate('e=>getComputedStyle(e).fontFamily.includes("Inter")')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(mode,width)
   assert page.locator('[data-bet-outcome]').first.evaluate('e=>e.getBoundingClientRect().top<innerHeight-100'),(mode,width,'market hidden by setup')
   page.screenshot(path=str(OUT/f'{mode}-{width}-book.png'))
   for size in [16,32]:
    page.evaluate('size=>document.documentElement.style.fontSize=size+"px"',size);page.wait_for_timeout(80)
    claim=page.locator('#sb-claim')
    metrics=claim.evaluate('''e=>{const r=e.getBoundingClientRect(),tabs=document.querySelector('.sb-tabs').getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {fits:r.left>=0&&r.right<=innerWidth&&r.height>=44,clear:r.bottom<=tabs.top,tappable:e.contains(hit),overflow:document.documentElement.scrollWidth>innerWidth}}''')
    assert metrics['fits'] and metrics['clear'] and metrics['tappable'] and not metrics['overflow'],(mode,width,size,metrics)
    if size==32:page.screenshot(path=str(OUT/f'{mode}-{width}-claim-large.png'))
   page.evaluate('document.documentElement.style.fontSize=""')
   checks.append({'mode':mode,'width':width,'markets':2,'balance':420,'fit':True,'fiveDestinations':True})
 assert page.locator('#sportsbook-wrap>.sb-tabs [data-sb-view]').count()==3 and page.locator('.sb-product-tabs').count()==0
 page.locator('[data-sb-view="tickets"]').click();assert page.locator('#sb-tickets').is_visible() and not page.locator('#sb-markets').is_visible()
 page.keyboard.press('ArrowRight');assert page.locator('#sb-pickem-panel').is_visible() and not page.locator('.sb-book-extras').is_visible()
 page.keyboard.press('Home');assert page.locator('#sb-markets').is_visible() and not page.locator('#sb-pickem-panel').is_visible()
 page.locator('[data-market-activity="props"]').click();assert page.locator('#sb-market-panel-props').is_visible()
 page.locator('[data-market-activity="fantasy"]').click()
 assert page.locator('#sb-claim').is_visible() and page.locator('.sb-wallet-options,.sb-wallet-actions').count()==0
 page.locator('[data-bet-outcome]').first.click();page.locator('[data-slip-open]').click();page.wait_for_selector('.sb-slip[open]');assert page.locator('.sb-slip-pick').count()==1
 page.locator('.sb-slip [data-close]').click();page.wait_for_function('!document.querySelector(".sb-slip[open]")')
 page.evaluate("document.documentElement.style.fontSize='32px'");assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.evaluate("document.documentElement.style.fontSize=''")
 assert not page.evaluate('bookFixture.writes'),page.evaluate('bookFixture.writes')
 page.evaluate('bookFixture.allowClaims=true;bookFixture.failClaim=true');page.locator('#sb-claim').click()
 page.wait_for_function('document.querySelector("#sb-claim")?.disabled===false')
 assert page.locator('#sb-claim').inner_text()=='Claim 50 SIN'
 page.evaluate('bookFixture.failClaim=false;bookFixture.holdClaim=true');page.locator('#sb-claim').click()
 assert page.locator('#sb-claim').is_disabled() and page.locator('#sb-claim').inner_text()=='Claiming…'
 page.locator('#sb-claim').dispatch_event('click');assert page.evaluate('bookFixture.claimAttempts')==2
 page.evaluate('bookFixture.releaseClaim()');page.wait_for_function('document.querySelector("[data-book-balance]")?.textContent==="470"')
 assert page.locator('#sb-claim').count()==0 and 'Next 50 SIN' in page.locator('.sb-bankroll').inner_text()
 page.screenshot(path=str(OUT/'dark-claim-complete.png'))
 page.evaluate('''async()=>{bookFixture.wallet.claimable=50;bookFixture.wallet.claimable_days=1;await bookPage.render(document.getElementById('view'))}''')
 page.locator('#sb-claim').click();page.wait_for_function('bookFixture.claimAttempts===3')
 page.evaluate('''()=>{bookPage.leave();document.getElementById('view').innerHTML='<h1>Other page</h1>';bookFixture.releaseClaim()}''');page.wait_for_timeout(200)
 assert page.locator('#view h1').inner_text()=='Other page','A late claim replaced the next page'
 assert not errors,errors;b.close()
server.shutdown();result={'layouts':checks,'slip':True,'enlargedText':True,'errors':errors,'writes':[],'claimTapChecks':12,'mockClaimRetry':True,'mockClaimSingleFlight':True,'mockServerBalance':470,'lateClaimKeepsDestination':True};(OUT/'checks.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
