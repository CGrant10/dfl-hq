"""Real waiver model and Home updater; isolated rosters, no league writes."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

source=Path(__file__).with_name('capture-home-review.py')
scope={'__file__':str(source),'__name__':'next_action_review'}
exec(compile(source.read_text().split('with sync_playwright() as p:')[0],str(source),'exec'),scope)
out=scope['OUT'];results=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('DFL_REVIEW_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 context.route('**/npm/@supabase/supabase-js@*/+esm',lambda r:r.fulfill(status=200,content_type='text/javascript',body='export function createClient(){throw Error("Backend disabled in review")}'))
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(scope['url'],wait_until='networkidle');page.wait_for_function('!!window.reviewStage')
 page.evaluate("window.reviewStage.suspend('next-action-review',true)")
 page.evaluate("""async()=>{
 const {buildWaiverPlan}=await import('./js/waiver-coach.js'),{DFL_SLOTS}=await import('./js/lineup-alert-model.js'),{buildWeeklyBriefing,applyWeeklyBriefing}=await import('./js/weekly-briefing.js');
 window.actionReviewRoot=document.querySelector('[data-home-report-slot]');
 window.drawActionReview=kind=>{
  const now=Date.parse('2026-10-20T16:00:00Z'),player=(id,position,points,extra={})=>({id,name:id,position,points,team:'CHI',hasGame:true,injuryStatus:null,isOut:false,...extra});
  const starters=DFL_SLOTS.map((slot,i)=>player('Starter '+i,slot==='FLEX'?'WR':slot,10)),pool=new Map(starters.map(p=>[p.id,p]));
  const depth=player('Returning Wide Receiver With a Long Team Nickname','WR',0,{isOut:true,injuryStatus:'IR'});pool.set(depth.id,depth);
  const rosters=Array.from({length:12},(_,i)=>({roster_id:i+1,players:i?[]:[...pool.keys()],starters:i?[]:starters.map(p=>p.id),reserve:[]}));
  const league={league_id:'1337852874733936640',total_rosters:12,roster_positions:[...DFL_SLOTS,'BN']},values=new Map([[depth.id,{tradeValue:8,positionRank:99,injuryValueFactor:.86}]]),schedule=new Map([['CHI',{key:'upcoming',kickoff:'2026-10-22T20:00:00Z'}]]),outlook={week:7,startSit:{swaps:[]}};
  pool.set('Free Kicker',player('Free Kicker','K',30));let rescue=[],move=null;
  if(kind==='ir'){Object.assign(depth,{isOut:false,injuryStatus:null,points:20});rosters[0].reserve=[depth.id];}
  if(kind==='waiver'){const spare=player('Expendable Bench WR','WR',3);pool.set(spare.id,spare);rosters[0].players.push(spare.id);league.roster_positions.push('BN');values.set(spare.id,{tradeValue:8,positionRank:90});pool.set('Useful Free RB',player('Useful Free RB','RB',20));}
  if(kind==='lineup'){Object.assign(depth,{isOut:false,injuryStatus:null,points:20});rescue=[{actionable:true,severity:'out',slot:'WR',player:{name:'Injured Starter',position:'WR'},backup:depth}];}
  if(kind==='gap'){Object.assign(starters[7],{hasGame:false,scheduleKnown:true,team:'BYE',points:0,name:'Bye Kicker'});}
  if(kind==='trade'){const target=player('Target WR','WR',20);pool.set(target.id,target);rosters[1].players=[target.id];move={mine:{id:'1'},need:{position:'WR',urgent:true},trade:{player:target,team:{id:'2'}},tradeGain:10};}
  const weekly=[{week:7,pool}],plan=buildWaiverPlan({rosters,rosterId:1,weekly,schedule,values,league,now});
  window.actionReviewCoach={plan,rosters,weekly,nfl:{teams:schedule},league,rescue,checkedAt:now};
  const brief=buildWeeklyBriefing({coach:actionReviewCoach,outlook,move,meSleeperId:'u1',now:new Date(now)});applyWeeklyBriefing(actionReviewRoot,brief);window.actionReviewLast=brief;return {kind:brief.actionKind,text:brief.action,url:brief.actionUrl};
 };
 window.failActionReview=()=>applyWeeklyBriefing(actionReviewRoot,{action:'Refresh your roster advice',actionUrl:'#/analyzer?owner=u1',checkedStatus:'Roster refresh unavailable'});
 document.querySelector('details[data-page-detail="home-week"]').open=true;
 }""")
 page.locator('[data-week-tab="brief"]').click()
 expected={'hold':'hold','ir':'ir','waiver':'waiver','lineup':'lineup','gap':'waiver','trade':'trade'}
 for theme in ['light','dark']:
  page.evaluate('(theme)=>reviewSetTheme(theme)',theme)
  for width in [320,390,768]:
   page.set_viewport_size({'width':width,'height':900})
   for case,kind in expected.items():
    value=page.evaluate('(kind)=>drawActionReview(kind)',case);assert value['kind']==kind,(case,value)
    link=page.locator('[data-brief-action]');link.scroll_into_view_if_needed()
    assert 'drop Returning' not in link.inner_text()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,width,case)
    assert link.evaluate('e=>e.getBoundingClientRect().height>=44&&e.scrollWidth<=e.clientWidth'),(theme,width,case)
    if case=='waiver':assert 'Useful Free RB' in value['text'] and 'Expendable Bench WR' in value['text']
    if case=='trade':assert value['url']=='#/trade?team=1&partner=2&target=Target%20WR'
    if case in ['ir','waiver','gap','lineup']:assert link.get_attribute('target')=='_blank' and link.get_attribute('rel')=='noopener noreferrer'
    results.append({'theme':theme,'width':width,'case':case,**value})
    if width==390 and case in ['ir','waiver']:
     page.locator('[data-brief-next-move]').screenshot(path=str(out/f'next-action-{case}-{theme}.png'))
 page.evaluate("drawActionReview('waiver');window.adviceLink=document.querySelector('[data-brief-action]');adviceLink.focus();drawActionReview('waiver')")
 assert page.evaluate('document.activeElement===adviceLink')
 page.evaluate('failActionReview()')
 assert page.locator('[data-brief-action]').inner_text()=='Refresh your roster advice'
 assert page.locator('[data-brief-action]').get_attribute('target')!='_blank'
 assert page.locator('[data-brief-action-kind]').inner_text()=='NEXT MOVE'
 assert page.locator('[data-brief-checked]').inner_text()=='Roster refresh unavailable'
 assert not errors,errors
 browser.close()
scope['server'].shutdown()
(out/'next-action-checks.json').write_text(json.dumps({'cases':results,'focusRetained':True,'failedRefreshClearsAction':True,'errors':errors},indent=2)+'\n')
print('PASS',len(results),'mobile/theme action states; focus retained; failed refresh clears stale advice; no browser errors')
