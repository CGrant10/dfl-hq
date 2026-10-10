"""Review production page renderers with local fixtures and blocked external requests."""
import os,json,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
output=Path(os.environ.get('DFL_SECONDARY_REVIEW_DIR','/workspace/dfl-secondary-review'))
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  clean=urlparse(path).path
  return str(output/clean.removeprefix('/secondary-review/')) if clean.startswith('/secondary-review/') else str(root/clean.lstrip('/'))
 def log_message(self,*args):pass
 def do_GET(self):
  path=urlparse(self.path).path
  mocks={
   '/js/supabase.js':"export const db=()=>({from:()=>{throw Error('Unexpected DB read')},rpc:()=>{throw Error('Unexpected DB write')}});",
   '/js/members.js':"export const currentMember=()=>null;export const loadMembers=async()=>[];export const loadMemberDirectory=async()=>[];export const refreshMember=async()=>null;export const isAdmin=()=>false;export const isMasterAdmin=()=>false;export const getMemberId=()=>null;export const isAuthenticatedAdmin=()=>false;",
   '/js/team-analyzer-data.js':"import {tradeReviewFixture} from '/tools/trade-review-fixture.mjs';export async function loadAnalyzerData(){return {...tradeReviewFixture(),state:'ready',projectionSeason:2026,rosterSeason:2026,league:{playoff_teams:2},standings:[],liveWeek:5}}"
  }
  if path in mocks:
   self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(mocks[path].encode());return
  super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/secondary-review/index.html'
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('DFL_REVIEW_CHROMIUM'),args=['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server'])
 for width in [320,390,768]:
  context=browser.new_context(viewport={'width':width,'height':844},service_workers='block',reduced_motion='reduce')
  context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(f'http://127.0.0.1:{server.server_port}/') and r.request.method in ['GET','HEAD'] else r.abort())
  page=context.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print(str(e),flush=True)));page.goto(url);page.wait_for_function('window.reviewReady===true');page.evaluate('document.fonts.ready')
  def capture(name):
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),name
   page.screenshot(path=str(output/f'{width}-{name}.png'))
  for theme in ['dark','light','medicine','team:KC']:
   page.evaluate("async t=>{const {saveMode}=await import('/js/theme.js');saveMode(t)}",theme)
   for scale in ['100%','200%']:
    page.evaluate('(s)=>document.documentElement.style.fontSize=s',scale)
    page.evaluate('window.showHistory()')
    assert page.locator('.archive-season').count()==3
    assert page.locator('.archive-season.is-featured').count()==1
    assert page.locator('.archive-season.is-featured .archive-season-head strong').inner_text()=='2025'
    assert 'Unknown roster' in page.locator('.archive-season').nth(1).inner_text()
    assert 'Not recorded' in page.locator('.archive-season').nth(1).inner_text()
    assert page.locator('.archive-winner a').first.get_attribute('href')=='#/profile?id=one'
    assert page.locator('.archive-title-label').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().right<=innerWidth)')
    capture(theme.replace(':','-')+'-'+scale+'-history')
    page.evaluate('window.showProfile()');assert page.locator('.ph-team-mark i').inner_text()=='AV'
    assert page.locator('[data-photo-pick]').evaluate('e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44}')
    capture(theme.replace(':','-')+'-'+scale+'-profile')
    page.evaluate('window.showMore()');assert page.locator('#more .quicknav a').count()==15
    assert page.locator('#more .quicknav a').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44)')
    page.locator('#more .quicknav a').last.scroll_into_view_if_needed();assert page.locator('#more .quicknav a').last.is_visible();assert page.locator('#more-close').is_visible();page.locator('#more .quicknav a').first.scroll_into_view_if_needed();capture(theme.replace(':','-')+'-'+scale+'-more');page.locator('#more-close').click()
  page.evaluate("document.documentElement.style.fontSize='100%';window.showHistory(true)")
  assert page.locator('[data-name-pick]').count()==3
  page.evaluate('window.showProfile()');page.locator('[data-dfl-edit]').click();page.locator('[data-bio]').fill('Draft only');page.locator('[data-dfl-cancel]').click()
  assert page.locator('.ph-team-mark i').inner_text()=='AV';assert page.locator('[data-bio]').count()==0
  page.evaluate("window.showProfile('/missing-photo.jpg')")
  page.wait_for_function('!document.querySelector(".ph-team-mark img")');assert page.locator('.ph-team-mark i').is_visible()
  page.evaluate('window.showAnalyzer()');page.locator('.scout-summary').wait_for();assert page.locator('.scout-unit').count()==5
  select=page.locator('[data-ta-team-select]');options=select.locator('option').all();select.select_option(options[1].get_attribute('value'))
  assert page.locator('.scout-summary').count()==1
  page.locator('.scout-summary [data-ta-jump]').click();assert page.locator('#units').evaluate('e=>e.open')
  assert page.locator('#units tbody tr').count()==5
  assert page.locator('.scout-unit strong').all_text_contents()==page.locator('#units .ta-unit-grade strong').all_text_contents()
  for scale in ['100%','200%']:
   page.evaluate('(s)=>document.documentElement.style.fontSize=s',scale);page.evaluate("scrollTo({top:0,behavior:'instant'})");capture('analyzer-'+scale)
  assert not errors,errors
  results.append({'width':width,'themes':4,'textScales':2,'titleRecords':3,'allMenuRoutes':15,'brokenPhotoFallback':True,'profileCancel':True,'analyzerGradeMatch':True,'errors':errors})
  context.close()
 browser.close()
server.shutdown();(output/'review.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
