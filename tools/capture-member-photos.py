"""Real portrait/profile controllers with isolated member, photo and save fixtures."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=Path(os.environ.get('DFL_PHOTO_REVIEW_DIR',root/'docs/member-photos'));out.mkdir(parents=True,exist_ok=True)
source=root/'tools/capture-secondary-review.py'
scope={'__file__':str(source),'__name__':'photo_review_server'}
exec(compile(source.read_text().split('with sync_playwright() as p:')[0],str(source),'exec'),scope)
results=[]
print('Portrait fixture server ready',flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 print('Browser ready',flush=True)
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 def boundary(route):
  path=route.request.url.split('?')[0]
  if path.endswith('/js/members.js'):
   body="export const currentMember=()=>window.photoMember;export const getMemberId=()=>window.selectedPhotoMember||window.photoMember?.id;export const loadMembers=async()=>[window.photoMember];export const loadMemberDirectory=async()=>[window.photoMember];export const refreshMember=async()=>{window.photoRefreshes++;return window.photoMember};"
  elif path.endswith('/js/supabase.js'):
   body="""export const db=()=>({from:()=>{const q={select:()=>q,eq:()=>q,order:()=>q,then:r=>Promise.resolve({data:[]}).then(r)};return q},rpc:async(name,args)=>{if(name!=='dfl_save_profile')throw Error('Unexpected write');window.photoCalls.push(args);if(window.photoFailure){const error=window.photoFailure;window.photoFailure=null;return {error}}if(window.lockPhoto&&args.p_pin!=='1234')return {error:{code:'42501',message:'Enter your profile PIN to save.'}};Object.assign(window.photoMember,{bio:args.p_bio,profile_photo_source:args.p_clear_image?'sleeper':args.p_source,...args.p_clear_image?{profile_image:null}:args.p_image?{profile_image:args.p_image}:{}});return {data:1}}});"""
  elif path.endswith('/js/member-lock.js'):body="export const verifiedPin=()=>null;export const markMemberUnlocked=()=>{};"
  elif path.endswith('/js/team-analyzer-data.js'):body="export const loadAnalyzerData=async()=>({state:'empty'});export const clearAnalyzerDataCache=()=>{window.photoInvalidations++};"
  else:route.continue_();return
  route.fulfill(status=200,content_type='text/javascript',body=body)
 context.route('**/js/*.js',boundary)
 def photo(route):
  if 'broken' in route.request.url:route.fulfill(status=404,body='missing')
  else:route.fulfill(status=200,content_type='image/webp',body=(root/'assets/dfl-daily-champion.webp').read_bytes())
 context.route('https://sleepercdn.com/**',photo)
 context.route('https://photo.example/**',photo)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR:',e,flush=True)))
 page.on('console',lambda m:print('CONSOLE:',m.type,m.text,flush=True) if m.type=='error' else None)
 page.on('requestfailed',lambda r:print('FAILED:',r.url,r.failure,flush=True))
 print('Opening isolated profile fixture',scope['url'],flush=True)
 page.goto(scope['url'],wait_until='domcontentloaded');print('Profile document loaded',flush=True);page.wait_for_function('window.reviewReady===true',timeout=12000)
 page.evaluate("""async()=>{const {wireDflPage}=await import('/js/pages/profile-dfl.js');window.photoMember={id:'one',display_name:'Owner One',team_name:'Bastards of the Realm',profile_image:'https://photo.example/dfl.jpg',sleeper_team_image:'https://sleepercdn.com/uploads/team.jpg',sleeper_profile_image:'https://sleepercdn.com/avatars/thumbs/owner'};window.photoCalls=[];window.photoRefreshes=0;window.photoInvalidations=0;window.profileEvents=0;addEventListener('dfl:profile-updated',()=>window.profileEvents++);window.mountPhotoProfile=()=>{const view=document.querySelector('#view');view.dataset.route='profile';view.innerHTML='<div data-dfl-host></div>';wireDflPage(view,window.photoMember,true,window.mountPhotoProfile,{currentTeam:photoMember.team_name})};mountPhotoProfile()}""")
 def current_source():return page.locator('.ph-team-mark img').get_attribute('src')
 assert current_source().endswith('/team.jpg')
 for theme in ['light','dark']:
  page.evaluate("async t=>{const {saveMode}=await import('/js/theme.js');saveMode(t)}",theme)
  for width in [320,390,768]:
   page.set_viewport_size({'width':width,'height':844});page.locator('[data-dfl-edit]').click()
   assert page.locator('[data-photo-source="sleeper"]').is_checked()
   page.locator('[data-identity-team]').select_option('nfl:CHI')
   assert page.locator('.ph-photo-option').evaluate_all('(es)=>es.every(e=>e.getBoundingClientRect().height>=44)')
   page.locator('.ph-photo-option').nth(1).click();assert current_source().endswith('/dfl.jpg')
   assert page.locator('[data-photo-source="dfl"]').is_checked()
   assert page.locator('[data-identity-team]').input_value()=='nfl:CHI'
   page.locator('[data-photo-source="dfl"]').focus();page.keyboard.press('ArrowLeft')
   assert page.locator('[data-photo-source="sleeper"]').is_checked()
   page.locator('.ph-photo-option').nth(1).click()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.wait_for_function("()=>[...document.querySelectorAll('.profile-head img')].every(i=>i.complete&&i.naturalWidth>0)")
   page.screenshot(path=str(out/f'profile-{theme}-{width}.png'))
   page.locator('[data-dfl-cancel]').click();assert current_source().endswith('/team.jpg')
   results.append({'theme':theme,'width':width,'preview':'both sources, cancel, arrow keys, 44px, no overflow'})
 # Source save preserves the upload, invalidates shared models and survives remount.
 page.locator('[data-dfl-edit]').click();page.locator('.ph-photo-option').nth(1).click();page.locator('[data-dfl-save]').click()
 page.wait_for_function('window.photoInvalidations===1');assert current_source().endswith('/dfl.jpg')
 page.locator('[data-dfl-edit]').click();page.locator('.ph-photo-option').first.click();page.locator('[data-dfl-save]').click()
 page.wait_for_function('window.photoInvalidations===2');assert current_source().endswith('/team.jpg')
 assert page.evaluate('photoMember.profile_image')=='https://photo.example/dfl.jpg'
 # Member changes and network errors never claim a successful save or lose the draft.
 page.locator('[data-dfl-edit]').click();page.evaluate("window.selectedPhotoMember='other'");before=page.evaluate('photoCalls.length');page.locator('[data-dfl-save]').click()
 assert page.evaluate('photoCalls.length')==before;assert page.locator('[data-dfl-save]').is_enabled()
 page.evaluate("window.selectedPhotoMember=null;window.photoFailure={message:'Network failed'}")
 page.locator('[data-dfl-save]').click();page.wait_for_function("document.querySelector('#toast').textContent.includes('Network failed')")
 assert page.locator('[data-dfl-save]').is_enabled()
 page.evaluate('window.lockPhoto=true');page.locator('[data-dfl-save]').click();page.locator('[data-photo-pin]').wait_for()
 assert page.locator('[data-photo-pin]').evaluate('e=>e===document.activeElement');page.locator('[data-photo-pin]').fill('1234');page.locator('[data-dfl-save]').click()
 page.wait_for_function('window.photoInvalidations===3')
 # File upload automatically chooses the DFL source; removing it returns to Sleeper.
 page.evaluate('window.lockPhoto=false');page.locator('[data-photo-file]').set_input_files(str(root/'assets/dfl-daily-champion.webp'))
 page.wait_for_function("document.querySelector('[data-photo-source=dfl]')?.checked")
 assert current_source().startswith('data:image/');page.locator('[data-dfl-save]').click();page.wait_for_function('window.photoInvalidations===4')
 page.locator('[data-dfl-edit]').click();page.locator('[data-photo-clear]').click();page.locator('[data-dfl-save]').click()
 page.wait_for_function('window.photoInvalidations===5');assert page.evaluate('photoMember.profile_image===null');assert current_source().endswith('/team.jpg')
 page.locator('[data-dfl-edit]').click();assert page.locator('[data-photo-source="dfl"]').is_disabled();assert page.locator('[data-photo-source="sleeper"]').is_checked();page.locator('[data-dfl-cancel]').click()
 results.append({'save':'source preference, upload preservation, new upload auto-selects, removal, remount, model invalidation, own member only, network retry, PIN retry'})
 # Shared portrait rendering is identical on every identity-only surface.
 page.evaluate("""async()=>{const {teamPortrait}=await import('/js/team-presentation.js');const view=document.querySelector('#view');view.innerHTML='<section class="card">'+['sleeper','dfl'].map(source=>teamPortrait({...photoMember,profile_image:'https://photo.example/dfl.jpg',profile_photo_source:source})).join('')+teamPortrait({...photoMember,sleeper_team_image:'https://sleepercdn.com/broken-team',sleeper_profile_image:'https://sleepercdn.com/broken-owner',profile_image:'https://photo.example/dfl.jpg'})+teamPortrait({team_name:'No Photo',profile_image:'https://photo.example/broken'})+'</section>'}""")
 page.wait_for_function("document.querySelectorAll('.dfl-team-mark')[2].querySelector('img')?.currentSrc==='https://photo.example/dfl.jpg'")
 page.wait_for_function("!document.querySelectorAll('.dfl-team-mark')[3].querySelector('img')")
 assert page.locator('.dfl-team-mark').nth(3).inner_text()=='NP'
 results.append({'fallbacks':'Sleeper team → owner → saved upload → initials; no broken image loops'})
 assert not errors,errors
 context.close();browser.close()
(out/'checks.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
