"""Real result controller/loader and share canvas. No real account or league writes."""
import base64,json,os,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('DFL_BOOK_RESULTS_DIR','/workspace/dfl-book-results-review'));EVIDENCE=Path(os.environ.get('DFL_BOOK_RESULTS_EVIDENCE',OUT/'evidence'));EVIDENCE.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?')[0]
  body={
   '/js/supabase.js':"export const db=()=>window.reviewDb;export const edge=()=>{throw Error('No writes')};export const privilegedFunctionHeaders=()=>({});export const hasPermission=()=>false;",
   '/js/members.js':"export const currentMember=()=>({id:1});export const loadMemberDirectory=async()=>[];",
   '/js/sleeper.js':"export const loadPlayers=async()=>window.reviewPlayers;",
   '/js/weekly-clubhouse-data.js':"export const loadWeeklyRosters=async()=>{resultReads++;if(feedFails)throw Error('Scores unavailable');return window.reviewRows};",
   '/js/nfl-game-day.js':"export const loadNflGameDay=async()=>{if(feedFails)throw Error('NFL unavailable');return{fetchedAt:Date.now(),teams:new Map([['BUF',{key:'final'}],['DAL',{key:mondayFinal?'final':'upcoming'}]])}};"
  }.get(path)
  if body is not None:self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(body.encode());return
  super().do_GET()
 def translate_path(self,path):
  path=path.split('?')[0];return str(OUT/path.removeprefix('/results-review/')) if path.startswith('/results-review/') else str(ROOT/path.lstrip('/'))
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(name,ok):
 checks.append({'check':name,'pass':bool(ok)});(EVIDENCE/'checks.json').write_text(json.dumps(checks,indent=2));assert ok,name;print('PASS '+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,390]:
  for theme in ['light','dark']:
   c=browser.new_context(viewport={'width':width,'height':844},has_touch=True,service_workers='block');c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());page=c.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print(str(e),flush=True)));page.goto(f'http://127.0.0.1:{server.server_port}/results-review/index.html');page.wait_for_function('window.reviewReady');page.evaluate('mode=>reviewTheme(mode)',theme);page.evaluate('document.fonts.ready');page.wait_for_selector('#sb-ticket-1 [data-leg-result="won"]')
   tag=f'{width}px {theme}'
   check(tag+' finished Sunday matchup marks both winning and losing picks',page.locator('#sb-ticket-1 [data-leg-result="won"]').count()==1 and page.locator('#sb-ticket-2 [data-leg-result="lost"]').count()==1)
   check(tag+' Monday starter keeps its leg open while completed parlay legs show hits',page.locator('#sb-ticket-3 [data-leg-result="won"]').count()==1 and page.locator('#sb-ticket-3 [data-leg-result="open"]').count()==1)
   check(tag+' ties show a neutral mark',page.locator('#sb-ticket-4 [data-leg-result="void"] .sb-leg-mark').inner_text()=='—')
   check(tag+' actual bankroll and official bet status remain unchanged',page.locator('[data-review-wallet]').inner_text()=='420 SIN' and page.locator('#sb-ticket-1').get_attribute('data-ticket-status')=='open' and 'To return' in page.locator('#sb-ticket-1').text_content())
   check(tag+' book board shows hit/miss and actual final scores',page.locator('[data-fantasy-result="won"]').count()==1 and page.locator('[data-fantasy-result="lost"]').count()==1 and '120.50 pts' in page.locator('[data-review-board]').inner_text())
   check(tag+' no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   page.screenshot(path=str(EVIDENCE/f'book-{width}-{theme}.png'));page.locator('#sb-ticket-3').scroll_into_view_if_needed();page.screenshot(path=str(EVIDENCE/f'tickets-{width}-{theme}.png'))
   before=page.evaluate('resultReads');page.evaluate('mondayFinal=true;dispatchEvent(new Event("focus"))');page.wait_for_function('(before)=>resultReads>before',arg=before);page.wait_for_function('document.querySelectorAll("#sb-ticket-3 [data-leg-result=won]").length===2')
   check(tag+' foreground refresh marks a newly finished matchup without reloading the page',page.locator('#sb-ticket-3 .pill').inner_text()=='HIT' and page.locator('[data-review-wallet]').inner_text()=='420 SIN')
   if width==390:
    for style in ['clean','photo']:
     share=page.evaluate('async style=>reviewShare(5,style)',style);(EVIDENCE/f'share-{theme}-{style}.png').write_bytes(base64.b64decode(share['data'].split(',')[1]));check(tag+f' {style} share includes the losing sixth leg and pending grading',len(share['ticket']['picks'])==6 and share['ticket']['picks'][5]['status']=='lost' and 'official grading and payout pending' in share['text'] and share['ticket']['status']=='open')
   page.evaluate('feedFails=true;reviewRefresh()');page.wait_for_selector('#sb-ticket-1 [data-leg-result="open"]')
   check(tag+' unavailable evidence clears provisional marks',page.locator('[data-fantasy-result]').count()==0 and page.locator('#sb-ticket-1 [data-leg-result="won"]').count()==0)
   check(tag+' no uncaught errors',not errors);page.evaluate('reviewStop()');c.close()
 browser.close()
server.shutdown()
