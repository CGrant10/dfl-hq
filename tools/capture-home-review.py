"""Capture the production-component review without changing league data."""
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import urlopen
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('DFL_REVIEW_DIR', ROOT.parent / 'dfl-review'))

class ReviewHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?', 1)[0].lstrip('/')
        file = OUT / 'index.html' if path in ['', 'index.html'] else ROOT / path
        types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp'}
        if file.is_file():
            body = file.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', types.get(file.suffix, 'application/octet-stream'))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_error(404)
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), ReviewHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/'
with urlopen(url) as response:
    print('Review document:', response.status, response.headers.get('Content-Type'), len(response.read()), flush=True)

def check_player_form(page):
    """Production form widget and sheet styles; fixture is explicitly labeled."""
    page.evaluate("""async()=>{
      const {playerFormHtml}=await import('./js/player-form.js'),{playerIdentity}=await import('./js/player-presentation.js');
      const dialog=document.createElement('dialog');dialog.className='gameday-spotlight dfl-player-card';
      dialog.innerHTML=`<header><h2>Demo player form</h2><button type="button">Close</button></header><div data-player-card-body><section class="player-card-hero"><span class="sr-only">Simulated stats</span>${playerIdentity({name:'Amon-Ra St. Brown',id:'demo-form',position:'WR',nflTeam:'DET'})}<div class="player-card-owner"><small>DFL ROSTER</small><strong>The Very Long Championship Bayou Bombers</strong></div></section>${playerFormHtml({season:2099,week:5,state:'live',recent:[{week:3,points:-2.5},{week:4,points:0},{week:5,points:24.62}]})}</div>`;
      document.body.append(dialog);dialog.showModal();window.formReviewDialog=dialog;
    }""")
    results=[]
    try:
        for mode in ['light','dark','medicine','medicine-light','fairway','team:KC']:
            page.evaluate('window.reviewSetTheme',mode)
            for width in [320,390,768]:
                page.set_viewport_size({'width':width,'height':844})
                for size in ['100%','200%']:
                    page.evaluate('size=>document.documentElement.style.fontSize=size',size)
                    result=page.evaluate("""()=>{
                      const d=window.formReviewDialog,body=d.querySelector('[data-player-card-body]'),chart=d.querySelector('svg'),b=d.getBoundingClientRect(),values=[...d.querySelectorAll('dd')];
                      return {fits:b.left>=-1&&b.right<=innerWidth+1&&b.top>=-1&&b.bottom<=innerHeight+1,contentFits:body.scrollWidth<=body.clientWidth+1,valuesFit:values.every(e=>e.scrollWidth<=e.clientWidth+1),values:values.map(e=>e.childNodes[0].textContent),decorative:chart.getAttribute('aria-hidden')==='true',close:d.querySelector('button').offsetHeight};
                    }""")
                    assert result['fits'] and result['contentFits'] and result['valuesFit'] and result['decorative'] and result['close']>=44,result
                    assert result['values']==['-2.50','0.00','24.62'],result
                    results.append({'theme':mode,'width':width,'text':size,**result})
                page.evaluate("document.documentElement.style.fontSize='100%'")
            if mode in ['light','medicine']:
                page.set_viewport_size({'width':390,'height':844})
                page.screenshot(path=str(OUT/f'player-form-demo-{mode}-390.png'))
    finally:
        page.evaluate("window.formReviewDialog.close();window.formReviewDialog.remove();delete window.formReviewDialog;document.documentElement.style.fontSize='100%';window.reviewSetTheme('light')")
    return results

def check_score_consistency(page):
    # The earlier review deliberately disables effects to test reduced motion.
    page.emulate_media(reduced_motion='no-preference')
    results = []
    page.evaluate("document.querySelector('.gameday-home-detail').open=true")
    for mode in ['light', 'dark']:
        page.evaluate('window.reviewSetTheme', mode)
        for width in [320, 390, 832, 1000, 1280]:
            page.set_viewport_size({'width': width, 'height': 1200})
            page.wait_for_timeout(150)
            rows = page.evaluate('''() => [...document.querySelectorAll('.home-thermal-leaders .gameday-player')].map(row=>{
                const number=row.querySelector('.gd-thermal-number'),phase=row.querySelector('[data-player-phase]'),id=phase.dataset.playerPhase;
                const tracker=document.querySelector('.gameday-home-detail [data-player-phase="'+id+'"]').parentElement.querySelector('.gd-thermal-number');
                return {right:number.getBoundingClientRect().right,phaseRight:phase.getBoundingClientRect().right,phase:phase.textContent,font:getComputedStyle(number).fontSize,trackerFont:getComputedStyle(tracker).fontSize,color:getComputedStyle(number).color,trackerColor:getComputedStyle(tracker).color};
            })''')
            assert len(rows) == 4 and all(r['phase'] == 'Final' for r in rows), rows
            assert max(r['right'] for r in rows)-min(r['right'] for r in rows)<1, rows
            assert all(abs(r['right']-r['phaseRight'])<1 and r['font']==r['trackerFont']=='18px' and r['color']==r['trackerColor'] for r in rows), rows
            results.append({'mode':mode,'width':width,'rows':rows})
    board = page.locator('.home-rankings-card > ol > li')
    assert board.first.locator('strong').text_content().strip() == 'Jack-HAMMER'
    assert board.first.locator('em').text_content().strip() == '4-0', board.first.inner_html()
    assert board.nth(1).locator('em').text_content().strip() == '3-1', board.nth(1).inner_html()
    page.set_viewport_size({'width': 1280, 'height': 1200})
    page.locator('[data-home-live-slot]').scroll_into_view_if_needed()
    page.evaluate("document.querySelector('[data-home-live-slot]').dataset.motion='on'")
    page.wait_for_timeout(600)
    page.evaluate('''() => {window.scoreUploads=0;const original=WebGLRenderingContext.prototype.texImage2D;window.restoreScoreUpload=()=>{WebGLRenderingContext.prototype.texImage2D=original;};WebGLRenderingContext.prototype.texImage2D=function(...args){window.scoreUploads++;return original.apply(this,args)}}''')
    toggles=[]
    for _ in range(4):
        sample=page.evaluate('''() => new Promise(resolve=>{
            const node=document.querySelector('.gameday-home-detail'),heights=[],before=window.scoreUploads;node.open=!node.open;
            function sample(){heights.push(node.offsetHeight);if(heights.length===8)resolve({heights,uploads:window.scoreUploads-before});else requestAnimationFrame(sample)}requestAnimationFrame(sample);
        })''')
        assert len(set(sample['heights']))==1 and sample['uploads']==0, sample
        toggles.append(sample)
    page.evaluate("document.querySelector('.home-thermal-leaders .gd-thermal-value').textContent='25.60'")
    page.wait_for_function('window.scoreUploads === 1')
    page.wait_for_timeout(200)
    assert page.evaluate('window.scoreUploads')==1, 'Unchanged score masks were uploaded again'
    page.evaluate("document.querySelector('.home-thermal-leaders .gd-thermal-value').textContent='24.60';window.restoreScoreUpload()")
    page.evaluate("document.querySelector('.gameday-home-detail').open=false;document.querySelector('[data-home-live-slot]').dataset.motion='off'")
    return {'states':results,'toggles':toggles,'changedScoreUploads':1}

def check_game_day_scope(page):
    """Verify the real mount function after moving controls below the broadcast."""
    source = (ROOT / 'js/game-day.js').read_text()
    source = source[source.index('const score='):].replace('export function', 'function')
    return page.evaluate('''async source => {
      const helpers = Object.assign({}, ...await Promise.all([
        import('./js/home-presentation.js'), import('./js/game-day-dom.js'),
        import('./js/game-day-model.js'), import('./js/game-day-player-rows.js'),
        import('./js/game-day-score-motion.js'), import('./js/matchup-chirp-ui.js'), import('./js/matchup-banter.js'),
        import('./js/page-disclosure.js'), import('./js/game-day-disclosure.js'), import('./js/identity-rules.js'), import('./js/ui.js')
      ]));
      const check=(condition,message)=>{if(!condition)throw Error(message)};
      const region=document.createElement('div');region.innerHTML='<div></div><div></div>';document.body.append(region);
      const root=region.firstElementChild,detailsRoot=region.lastElementChild;
      const members=[{id:'scope-a',sleeper_user_id:'a',team_name:'Scope A'},{id:'scope-b',sleeper_user_id:'b',team_name:'Scope B'}];
      const week={leagueId:'fixture',season:2026,week:5,completed:false,games:[{matchup_id:1,user1:'a',roster1:1,user2:'b',roster2:2}]};
      let refreshes=0,opens=0,resolveWeekly,fail=false,points=0,state='upcoming',openingState='pre',currentWeek=5;const weekly=new Promise(resolve=>resolveWeekly=resolve),noop=()=>{};
      const providers={
        loadLeagueState:async()=>({season:2026,currentWeek}),
        loadClubhouseIndex:async()=>{refreshes++;return [{season:2026,week:5}]},loadClubhouseWeek:async()=>week,
        loadWeeklyRosters:async()=>{if(fail)throw Error('Fixture unavailable');return [1,2].map(n=>({roster_id:n,points:n===1?points:0,starters:[String(n)],players:[String(n)],players_points:{[n]:n===1?points:0}}))},
        loadPlayers:async()=>({'1':{n:'Scope One',p:'QB',t:'KC'},'2':{n:'Scope Two',p:'QB',t:'NO'}}),
        loadNflGameDay:async(season,week)=>({teams:new Map(['KC','NO'].map(t=>[t,{key:state}])),payload:{events:[{id:`opening-${week}`,date:'2099-10-09T00:15:00Z',status:{type:{state:week===5?openingState:'pre'}}}]}}),
        sleeper:{league:async()=>({roster_positions:['QB']})},loadLore:async()=>({matchups:[]}),
        reconcileLeagueResults:()=>({standings:[]}),loadLatestLeagueResults:async()=>null,
        matchupReceiptData:()=>null,shareMatchupReceipt:async()=>{},
        loadGameDayMoments:async()=>({items:[]}),animateScoreChanges:()=>noop,mountScoreVfx:()=>({stop:noop}),
        mountPlayerSpotlight:()=>({update:noop,setMotion:noop,stop:noop}),
        mountGameDayWatch:()=>({open:()=>opens++,update:noop,redraw:noop,setMotion:noop,wantsMoments:()=>false,stop:noop}),
      };
      helpers.savePageChoice('gameday-motion','on');helpers.savePageChoice('gameday-tab','mine');
      const deps={...helpers,...providers};
      const mount=Function(...Object.keys(deps),source+';return mountGameDay')(...Object.values(deps));
      const until=async condition=>{for(let i=0;i<50&&!condition();i++)await new Promise(resolve=>setTimeout(resolve,10));check(condition(),'Game-day fixture did not settle')};
      let stop=mount(root,{members,member:members[0],active:()=>true,weekly,detailsRoot});
      try{
        check(root.querySelector('.home-matchup-loading').children.length===2&&root.querySelector('[data-gameday-content]').getAttribute('aria-busy')==='true','Loading must reserve a two-team matchup');
        await until(()=>!!root.querySelector('.gameday-matchup'));check(root.textContent.includes('Actual'),'Missing forecast must show actual scores');
        check(!detailsRoot.querySelector('.home-live-details').open,'Player leaders must start collapsed before kickoff');
        resolveWeekly({season:2026,week:5,teams:[{sleeper_user_id:'a',projection:124.8,lineupIsSet:true},{sleeper_user_id:'b',projection:118.2,lineupIsSet:true}]});
        await until(()=>!!root.querySelector('.home-projected-total'));check(root.textContent.includes('124.8'),'Forecast did not reach the matchup');
        check(!!root.querySelector('[data-gameday-chirp] .dfl-chirp')&&!root.querySelector('[data-gameday-chirp]').closest('details'),'DFL chirp must stay beside the scores');
        check(!root.querySelector('[data-gameday-refresh]')&&!!detailsRoot.querySelector('[data-gameday-refresh]'),'Details stayed in the hero');
        detailsRoot.querySelector('.home-live-details').open=true;detailsRoot.querySelector('.gameday-home-detail').open=true;
        detailsRoot.querySelector('[data-gameday-tab="opponent"]').click();
        check(detailsRoot.querySelector('#gameday-player-panel').textContent.includes('Scope Two'),'Opponent tab lost its handler');
        const tab=detailsRoot.querySelector('[data-gameday-tab="mine"]');tab.click();tab.focus();tab.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
        check(detailsRoot.querySelector('[data-gameday-tab="opponent"]').getAttribute('aria-selected')==='true','Keyboard tabs stopped working');
        check(detailsRoot.dataset.motion==='on'&&detailsRoot.querySelector('[data-gameday-motion]').getAttribute('aria-pressed')==='true','Game-day motion must start on');
        detailsRoot.querySelector('[data-gameday-motion]').click();check(detailsRoot.dataset.motion==='off','Moved effects missed the off choice');
        detailsRoot.querySelector('[data-gameday-motion]').click();check(detailsRoot.dataset.motion==='on','Moved effects missed the on choice');
        detailsRoot.querySelector('[data-gameday-board]').click();root.querySelector('[data-gameday-watch]').click();check(opens===2,'Watch entries stopped working');
        detailsRoot.querySelector('[data-gameday-refresh]').click();await until(()=>refreshes===2&&!detailsRoot.querySelector('[data-gameday-refresh]').disabled);
        check(root.querySelector('[data-gameday-recovery]').hidden&&detailsRoot.querySelector('[data-gameday-freshness]').textContent.startsWith('Checked'),'Successful refresh did not clear busy/error state');
        check(detailsRoot.querySelector('.gameday-home-detail').open,'Refresh closed the player details');
        fail=true;detailsRoot.querySelector('[data-gameday-refresh]').click();
        check(detailsRoot.querySelector('[data-gameday-refresh]').getAttribute('aria-busy')==='true'&&detailsRoot.querySelector('[data-gameday-refresh]').textContent==='Refreshing…','Manual refresh lacks busy feedback');
        await until(()=>!root.querySelector('[data-gameday-recovery]').hidden&&!root.querySelector('[data-gameday-retry]').disabled);
        check(!!root.querySelector('.home-projected-total'),'Failed refresh discarded the last matchup');
        detailsRoot.querySelector('.home-live-details').open=false;await new Promise(resolve=>setTimeout(resolve,10));
        fail=false;state='live';openingState='in';points=15.8;root.querySelector('[data-gameday-retry]').focus();root.querySelector('[data-gameday-retry]').click();
        await until(()=>root.querySelector('[data-gameday-recovery]').hidden&&!root.querySelector('[data-gameday-retry]').disabled);
        check(detailsRoot.querySelector('.home-live-details').open,'First kickoff must open player leaders even after a pregame collapse');
        check(!root.querySelector('.home-projected-total')&&root.querySelector('.home-matchup-entry').textContent.includes('You lead by 15.80'),'Retry failed to restore actual live scores');
        check(document.activeElement===root.querySelector('.gameday-matchup'),'Retry hid the focused control without a destination');
        check(root.querySelector('.home-matchup-entry strong').textContent.includes('Matchup details'),'Matchup detail entry is missing');
        openingState='post';detailsRoot.querySelector('[data-gameday-refresh]').click();await until(()=>!detailsRoot.querySelector('[data-gameday-refresh]').disabled);
        check(detailsRoot.querySelector('.home-live-details').open,'Thursday final must keep player leaders open between games');
        currentWeek=6;detailsRoot.querySelector('[data-gameday-refresh]').click();await until(()=>!detailsRoot.querySelector('[data-gameday-refresh]').disabled);
        check(!detailsRoot.querySelector('.home-live-details').open,'Last week’s final must not open the new week before kickoff');
        stop();detailsRoot.replaceChildren();fail=true;stop=mount(root,{members,member:members[0],active:()=>true,detailsRoot});
        await until(()=>!root.querySelector('[data-gameday-recovery]').hidden&&!root.querySelector('[data-gameday-retry]').disabled);
        check(!root.querySelector('.home-matchup-loading'),'Failed initial load left a loading skeleton');
        fail=false;root.querySelector('[data-gameday-retry]').click();await until(()=>!!root.querySelector('.gameday-matchup')&&root.querySelector('[data-gameday-recovery]').hidden);
        return {forecast:true,externalRefresh:true,mouseTabs:true,keyboardTabs:true,motion:true,watchEntries:opens,openDetailsPreserved:true,failedRefreshPreserved:true,retryRecovered:true,initialLoadRetry:true,kickoffOpens:true,betweenGamesOpen:true,activeWeekResets:true};
      }finally{stop();region.remove()}
    }''', source)

def check_matchup_interactions(page):
    """Exercise the real score refresh loop using isolated read-only providers."""
    source=(ROOT/'js/clubhouse-matchup-live.js').read_text()
    source=source[source.index('let stopCurrent='):].replace('export function','function')
    page.emulate_media(reduced_motion='reduce')
    result=page.evaluate('''async source=>{
      const helpers=Object.assign({},...await Promise.all([import('./js/clubhouse-matchup-model.js'),import('./js/clubhouse-matchup-cards.js'),import('./js/matchup-chirp-ui.js'),import('./js/game-day-score-motion.js'),import('./js/page-disclosure.js'),import('./js/ui.js')]));
      const check=(ok,message)=>{if(!ok)throw Error(message)};
      const until=async condition=>{for(let i=0;i<100&&!condition();i++)await new Promise(r=>setTimeout(r,10));check(condition(),'Matchup refresh did not settle')};
      const model={season:2026,week:5,leagueId:'fixture',completed:false,members:[],games:[{matchup_id:1,left:{roster:1,name:'The Very Long Bayou Championship Fantasy Football Bombers',score:0},right:{roster:2,name:'The Boys',score:0}}]};
      const region=document.createElement('section');region.className='view';region.dataset.route='clubhouse';
      region.innerHTML=`<div class="clubhouse-page"><div class="clubhouse-matchup-toolbar"><span data-matchup-freshness role="status">Checking scores…</span><button type="button" class="btn ghost small" data-matchup-refresh>Refresh scores</button></div>${helpers.matchupCardHtml(model.games[0],model,new Map([['1',91]]))}</div>`;
      document.querySelector('#view').append(region);
      let fail=false,points=0,active=true,release=null,calls=0,reply=null,replyCount=0,previewError=false;
      const threads=new Map([['1',91]]);
      const fixtureDb=()=>({from:table=>({select:()=>{
        if(table==='member_wall_reply_counts')return {in:async()=>({data:[{post_id:91,reply_count:replyCount}]})};
        return {eq:()=>({order(){return this},limit:async()=>({data:reply?[reply]:[],error:previewError?Error('Fixture offline'):null})})};
      }})});
      const providers={db:fixtureDb,loadPlayers:async()=>({'1':{n:'David Montgomery',p:'RB',t:'DET'},'2':{n:'Amon-Ra St. Brown',p:'WR',t:'DET'}}),loadWeeklyRosters:async()=>{calls++;if(release)await new Promise(r=>release=r);if(fail)throw Error('Fixture offline');return [1,2].map(n=>({roster_id:n,points:n===1?points:0,starters:[String(n)],players_points:{[n]:n===1?points:0}}))},loadNflGameDay:async()=>({teams:new Map(['DET'].map(t=>[t,{key:'live'}]))})};
      const deps={...helpers,...providers};const mount=Function(...Object.keys(deps),source+';return mountMatchupLive')(...Object.values(deps));
      helpers.savePageChoice('gameday-motion','on');
      const stop=mount(region,model,threads,()=>active),button=region.querySelector('[data-matchup-refresh]'),value=region.querySelector('[data-score-left] [data-matchup-score-value]');
      try{
        await until(()=>!button.disabled);check(value.textContent==='0.00'&&!region.querySelector('.gd-score-delta'),'Initial scores manufactured a gain');
        points=6.2;button.click();check(button.disabled&&button.getAttribute('aria-busy')==='true'&&button.textContent==='Refreshing…','Busy feedback missing');
        await until(()=>!button.disabled);check(value.textContent==='6.20'&&region.querySelector('.gd-score-delta').textContent==='+6.20','Actual team-score gain missing');const gain=region.querySelector('.gd-score-delta').getBoundingClientRect(),number=value.getBoundingClientRect();check(gain.bottom<=number.top,'Clubhouse score feedback overlaps the total');
        check([...region.querySelectorAll('[data-gameday-total-key]')].every(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length===0),'Reduced motion still animates scores');
        check(region.querySelector('[data-matchup-summary]').textContent.includes('leads by 6.20'),'Live lead summary missing');
        check(region.querySelector('[data-matchup-phase]').dataset.state==='live','Live badge missing');
        points=5.8;button.click();await until(()=>!button.disabled);check(region.querySelector('.gd-score-delta').textContent==='−0.40','Stat correction mislabeled');
        fail=true;button.click();await until(()=>!button.disabled);check(value.textContent==='5.80'&&region.querySelector('[data-matchup-freshness]').textContent.includes('last scores'),'Failure discarded the last score');
        fail=false;points=10;button.click();await until(()=>!button.disabled);check(value.textContent==='10.00'&&button.textContent==='Refresh scores'&&!button.hasAttribute('aria-busy'),'Retry did not recover');
        const preview=region.querySelector('[data-chat-preview]');await until(()=>preview.dataset.talkState==='empty');check(preview.textContent.includes('No replies yet.')&&!preview.textContent.includes('0 REPLIES'),'Quiet conversation is noisy');
        reply={body:'<img src=x onerror=alert(1)> '+('Long reply '.repeat(24)),members:{display_name:'<b>The Boys</b>'}};replyCount=2;button.click();await until(()=>!button.disabled&&preview.dataset.talkState==='active');check(!preview.querySelector('img,b')&&preview.querySelector('.clubhouse-talk-author').textContent==='<b>The Boys</b>'&&preview.querySelector('.clubhouse-talk-body span').textContent.endsWith('…')&&preview.textContent.includes('2 REPLIES'),'Reply preview lost safe content or metadata');window.reviewActiveTalkHTML=region.innerHTML;
        previewError=true;button.click();await until(()=>!button.disabled&&preview.dataset.talkState==='error');check(preview.textContent.includes('Preview unavailable.'),'Unavailable preview masquerades as empty');
        previewError=false;reply=null;replyCount=0;button.click();await until(()=>!button.disabled&&preview.dataset.talkState==='empty');check(!preview.querySelector('.clubhouse-talk-author')&&!preview.textContent.includes('REPLIES'),'Recovered empty preview keeps stale reply');
        stop();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));check(!region.querySelector('.gd-score-delta')&&[...region.querySelectorAll('[data-gameday-total-key]')].every(e=>e.getAnimations({subtree:true}).filter(a=>a.constructor===Animation&&a.playState==='running').length===0),'Stopping left score feedback alive: '+JSON.stringify({badges:region.querySelectorAll('.gd-score-delta').length,animations:[...region.querySelectorAll('[data-gameday-total-key]')].flatMap(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').map(a=>({type:a.constructor.name,name:a.animationName,property:a.transitionProperty,target:a.effect?.target?.className,timing:a.effect?.getTiming()})))}));
        const count=calls;button.click();await new Promise(r=>setTimeout(r,30));check(calls===count,'Stopped refresh listener still ran');
        window.reviewMatchupCardHTML=region.innerHTML;return {initialLoad:true,actualGain:true,scoreCorrection:true,reducedMotion:true,liveSummary:true,busyState:true,failurePreservesScores:true,retryRecovery:true,cleanup:true,quietConversation:true,safeReply:true,previewRecovery:true};
      }finally{active=false;stop();region.remove();helpers.savePageChoice('gameday-motion','off')}
    }''',source)
    thread_source=(ROOT/'js/weekly-clubhouse-ui.js').read_text()
    thread_source=thread_source[thread_source.index('export function wireMatchupThreads'):thread_source.index('export function memberWeeklyAwardsHtml')].replace('export function','function')
    result['conversationStart']=page.evaluate('''async source=>{
      const {matchupCardHtml}=await import('./js/clubhouse-matchup-cards.js');
      const root=document.createElement('div');root.innerHTML=matchupCardHtml({matchup_id:1,left:{name:'The Boys'},right:{name:'League Champs'}},{week:5,members:[]},new Map());document.body.append(root);
      let member=null,calls=0,notices=0;const wire=Function('db','currentMember','toast',source+';return wireMatchupThreads')(()=>({rpc:async()=>{calls++;return {error:Error('Fixture offline')}}}),()=>member,()=>notices++);
      try{wire(root,2026,5);const button=root.querySelector('[data-matchup-thread]'),status=root.querySelector('[data-matchup-status]');button.click();if(calls!==0||notices!==1||button.disabled)throw Error('Profile-less conversation mutated league data');member={id:1};button.click();if(!button.disabled||button.getAttribute('aria-busy')!=='true')throw Error('Conversation start has no busy state');await new Promise(r=>setTimeout(r,0));if(calls!==1||button.disabled||button.hasAttribute('aria-busy')||!status.textContent.includes('Try again.'))throw Error('Conversation failure lost feedback');button.click();if(status.textContent)throw Error('Retry retains stale conversation error');await new Promise(r=>setTimeout(r,0));if(calls!==2||button.disabled)throw Error('Conversation retry failed');return {profileRequired:true,busyState:true,accessibleFailure:true,retry:true};}finally{root.remove()}
    }''',thread_source)
    page.evaluate("""() => {const node=document.createElement('section');node.className='view';node.dataset.route='clubhouse';node.innerHTML=window.reviewMatchupCardHTML;document.querySelector('#view').append(node);window.reviewClubhouseCard=node;}""")
    result['responsiveCards']=[]
    result['conversationLayouts']=[]
    try:
        for mode in ['light','dark','medicine']:
            page.evaluate('window.reviewSetTheme',mode)
            for width in [320,390,1280]:
                page.set_viewport_size({'width':width,'height':900})
                page.locator('[data-route="clubhouse"] .clubhouse-matchup-card').scroll_into_view_if_needed()
                layout=page.evaluate("""() => {const n=window.reviewClubhouseCard,names=[...n.querySelectorAll('.clubhouse-matchup-name')],scores=[...n.querySelectorAll('[data-matchup-score-value]')],summary=n.querySelector('[data-matchup-summary]');return {aligned:Math.abs(scores[0].getBoundingClientRect().top-scores[1].getBoundingClientRect().top)<1,namesFit:names.every(e=>e.scrollWidth<=e.clientWidth+1&&getComputedStyle(e.querySelector('strong')).whiteSpace==='normal'),summaryFits:summary.scrollWidth<=summary.clientWidth+1,contained:[...n.querySelectorAll('.clubhouse-game-side')].every(e=>{const b=e.getBoundingClientRect();return [...e.children].every(c=>{const r=c.getBoundingClientRect();return r.top>=b.top-1&&r.bottom<=b.bottom+1&&r.left>=b.left-1&&r.right<=b.right+1})}),scoresBelowNames:scores.every((e,i)=>e.getBoundingClientRect().top>=names[i].getBoundingClientRect().bottom-1),buttons:[...n.querySelectorAll('button')].map(e=>({height:e.offsetHeight,width:e.offsetWidth})),overflow:document.documentElement.scrollWidth>innerWidth};}""")
                assert layout['aligned'] and layout['namesFit'] and layout['summaryFits'] and layout['contained'] and layout['scoresBelowNames'] and not layout['overflow'] and all(b['height']>=44 and b['width']>=44 for b in layout['buttons']),f'Matchup card layout: {mode}/{width}: {layout}'
                result['responsiveCards'].append({'mode':mode,'width':width,**layout})
                players=page.evaluate('''()=>[...window.reviewClubhouseCard.querySelectorAll('.player-card-trigger')].map(e=>{const lines=new Map(),walk=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let text;while(text=walk.nextNode())for(let i=0;i<text.length;i++){const r=document.createRange();r.setStart(text,i);r.setEnd(text,i+1);const b=r.getBoundingClientRect(),key=Math.round(b.top);lines.set(key,(lines.get(key)||'')+text.textContent[i]);}return {name:e.textContent,lines:[...lines.values()].map(s=>s.trim()).filter(Boolean),size:parseFloat(getComputedStyle(e).fontSize),fits:e.scrollWidth<=e.clientWidth+1}})''')
                assert all(p['fits'] and p['size']>=14 and all(len(line)>1 for line in p['lines']) for p in players),f'Player surname breaks into a fragment: {mode}/{width}: {players}'
                result['responsiveCards'][-1]['players']=players
                quiet=page.locator('[data-route="clubhouse"] .clubhouse-matchup-talk').evaluate('e=>({height:e.offsetHeight,border:getComputedStyle(e.querySelector(".clubhouse-chat-preview")).borderTopWidth,buttonHeight:e.querySelector(".btn").offsetHeight})')
                page.evaluate('window.reviewClubhouseCard.innerHTML=window.reviewActiveTalkHTML')
                active=page.locator('[data-route="clubhouse"] .clubhouse-matchup-talk').evaluate('e=>({height:e.offsetHeight,bodyFits:e.querySelector(".clubhouse-talk-body").scrollWidth<=e.querySelector(".clubhouse-talk-body").clientWidth+1,buttonFits:e.querySelector(".btn").getBoundingClientRect().right<=e.getBoundingClientRect().right+1})')
                assert quiet['height']<100 and quiet['border']=='0px' and quiet['buttonHeight']>=44 and active['bodyFits'] and active['buttonFits'],f'Conversation layout: {mode}/{width}: {quiet}/{active}'
                result['conversationLayouts'].append({'mode':mode,'width':width,'quiet':quiet,'active':active})
                page.evaluate('window.reviewClubhouseCard.innerHTML=window.reviewMatchupCardHTML')

                if width==390:
                    page.locator('[data-route="clubhouse"] .clubhouse-page').screenshot(path=str(OUT/f'matchup-{mode}-390.png'))
    finally:
        page.evaluate('window.reviewClubhouseCard.remove();delete window.reviewClubhouseCard;delete window.reviewMatchupCardHTML;delete window.reviewActiveTalkHTML')
    result['homeTotalFeedback']=[]
    for width in [320,390,1280]:
        page.set_viewport_size({'width':width,'height':900})
        feedback=page.evaluate("""async()=>{const {animateScoreChanges}=await import('./js/game-day-score-motion.js');const stop=animateScoreChanges(document.querySelector('[data-home-gameday-slot]'),{previous:{totals:{'1':118.6,'2':118.2}},model:{snapshot:{totals:{'1':124.8,'2':118.2},points:{}},games:[]},motion:false,feedback:true});const host=document.querySelector('[data-gameday-total-key="1"]'),value=host.querySelector('.gd-thermal-value').getBoundingClientRect(),badge=host.querySelector('.gd-score-delta').getBoundingClientRect(),box=host.getBoundingClientRect();const result={separate:badge.bottom<=value.top,contained:badge.left>=box.left&&badge.right<=box.right,label:host.querySelector('.gd-score-delta').textContent};stop();return result;}""")
        assert feedback['separate'] and feedback['contained'] and feedback['label']=='+6.20',f'Score feedback obscures the total: {width}/{feedback}'
        result['homeTotalFeedback'].append({'width':width,**feedback})
    # Verify painted score updates retain their geometry when animation is enabled.
    page.emulate_media(reduced_motion='no-preference')
    result['animatedTotals']=page.evaluate('''async()=>{
      const {animateScoreChanges}=await import('./js/game-day-score-motion.js');
      const root=document.createElement('div');root.innerHTML='<span data-gameday-total-key="team"><span class="gd-thermal-value">10.00</span></span>';document.body.append(root);
      const value=root.querySelector('.gd-thermal-value'),before=value.getBoundingClientRect().toJSON();
      const stop=animateScoreChanges(root,{previous:{totals:{team:3.8}},model:{snapshot:{totals:{team:10},points:{}},games:[]},motion:true,feedback:true});
      const after=value.getBoundingClientRect().toJSON(),ok=root.querySelector('.gd-score-delta')?.textContent==='+6.20'&&value.getAnimations().length===1&&before.width===after.width&&before.height===after.height;
      stop();const cleaned=!root.querySelector('.gd-score-delta')&&value.getAnimations().length===0;root.remove();if(!ok||!cleaned)throw Error('Animated total changed score geometry or failed cleanup');return true;
    }''')
    return result

def check_game_day_moments(page):
    """Preview genuine update triggers with clearly labeled, isolated demo scores."""
    page.emulate_media(reduced_motion='no-preference')
    setup=page.evaluate("""async()=>{
      const {homeGameDayMatchup,homeThermalBoard}=await import('./js/home-presentation.js');
      const {animateScoreChanges}=await import('./js/game-day-score-motion.js');
      const original=document.querySelector('#home-wrap');original.hidden=true;original.id='inactive-home';
      const root=document.createElement('div');root.id='home-wrap';root.className='gameday-card';root.dataset.motion='on';root.style.position='relative';
      const players=[{id:'7547',name:'Amon-Ra St. Brown',position:'WR',nflTeam:'DET',roster:'1',slot:'WR',state:'live',points:20.5},{id:'6786',name:'CeeDee Lamb',position:'WR',nflTeam:'DAL',roster:'2',slot:'WR',state:'live',points:30.5},{id:'8137',name:'Garrett Wilson',position:'WR',nflTeam:'NYJ',roster:'1',slot:'WR',state:'live',points:16}];
      const sides=[{roster:'1',uid:'a',memberId:1,name:'The Bayou Bombers',identity:{team_name:'The Bayou Bombers',accent_color:'#c8102e'},score:100.5,live:1,known:true,remaining:2,starters:[players[0]],lineup:[players[0]]},{roster:'2',uid:'b',memberId:2,name:'The Rivals',identity:{team_name:'The Rivals',accent_color:'#efc94c'},score:97,live:1,known:true,remaining:2,starters:[players[1]],lineup:[players[1]]}];
      const model={season:2099,week:5,memberId:1,completed:false,starters:players,games:[{id:'1',isMine:true,leader:'1',sides}],snapshot:{totals:{'1':100.5,'2':97},points:{'1:7547':20.5,'2:6786':30.5,'1:8137':16}}};
      const previous={leaders:{'1':'2'},totals:{'1':94,'2':97},points:{'1:7547':14,'2:6786':29,'1:8137':10}};
      root.innerHTML='<p>Animation preview · Demo scores</p>'+homeGameDayMatchup(model)+homeThermalBoard(model);
      document.querySelector('#view').append(root);root.scrollIntoView({block:'start'});
      const measure=()=>[...root.querySelectorAll('.gd-thermal-value')].map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,x:r.x,y:r.y,width:r.width,height:r.height}});
      const before=measure();let stop=animateScoreChanges(root,{previous,model,motion:true,feedback:true});
      const after=measure(),labels=[...root.querySelectorAll('.gd-moment-caption')].map(e=>e.textContent);
      if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Moment animation moved score glyphs');
      if(root.querySelectorAll('.gd-moment-clip').length!==4||!['New lead','20-point game','30-point game','Score surge'].every(s=>labels.includes(s)))throw Error('Missing lead/player stings: '+JSON.stringify(labels));
      window.momentFixture={root,model,previous,stop,measure,before,original,animateScoreChanges};
      return {glyphGeometryStable:true,leadChange:true,milestones:true,scoreSurge:true,labels};
    }""")
    page.wait_for_timeout(300)
    page.evaluate("""()=>{for(const a of document.querySelector('#home-wrap').getAnimations({subtree:true}).filter(a=>a.constructor===Animation)){a.pause();a.currentTime=Math.min(650,Number(a.effect.getTiming().duration)||650)}}""")
    page.screenshot(path=str(OUT/'gameday-moment-demo.png'))
    checks=page.evaluate("""()=>{
      const f=window.momentFixture,check=(value,message)=>{if(!value)throw Error(message)};
      check([...f.root.querySelectorAll('.gd-moment-caption')].every(e=>e.scrollWidth<=e.clientWidth+1),'Moment caption is clipped');
      check(document.documentElement.scrollWidth<=innerWidth,'Moment effect overflows the viewport');
      f.stop();check(!f.root.querySelector('.gd-moment-clip,.gd-moment-caption'),'Moment cleanup left decorations');
      const run=(model=f.model,previous=f.previous,motion=true)=>{const stop=f.animateScoreChanges(f.root,{previous,model,motion,feedback:true});const count=f.root.querySelectorAll('.gd-moment-clip').length;stop();return count};
      check(run(f.model,null)===0,'Initial load manufactured a moment');
      check(run({...f.model,completed:true})===0,'Final stat correction celebrated a moment');
      check(run(f.model,f.previous,false)===0,'Motion off played a moment');
      check(run(f.model,{...f.previous,leaders:{'1':'1'},points:f.model.snapshot.points})===0,'Unchanged refresh replayed a moment');
      check(run({...f.model,starters:f.model.starters.map(p=>({...p,state:'final'})),games:[]})===0,'Finished-player correction played a moment');
      f.root.hidden=true;check(run()===0,'Hidden rows played a moment');f.root.hidden=false;
      const modal=document.createElement('dialog');document.body.append(modal);modal.showModal();check(run()===0,'Covered Home played a moment');modal.close();modal.remove();
      f.root.style.left='200vw';check(run()===0,'Offscreen rows played a moment');f.root.style.left='';
      f.stop=f.animateScoreChanges(f.root,{previous:f.previous,model:f.model,motion:true,feedback:true});
      return {captionsFit:true,noOverflow:true,cleanup:true,noInitialOrRepeat:true,noFinalCorrection:true,motionOff:true,hiddenPaused:true,coveredPaused:true,offscreenPaused:true};
    }""")
    page.wait_for_timeout(4300)
    assert page.evaluate("!window.momentFixture.root.querySelector('.gd-moment-clip,.gd-moment-caption')"),'Finished effects left decorations'
    page.evaluate("()=>{const f=window.momentFixture;f.stop();f.stop=f.animateScoreChanges(f.root,{previous:f.previous,model:f.model,motion:true,feedback:true})}")
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(80)
    reduced=page.evaluate("""()=>{const f=window.momentFixture,stopped=!f.root.querySelector('.gd-moment-clip,.gd-moment-caption');f.stop();f.root.remove();f.original.id='home-wrap';f.original.hidden=false;delete window.momentFixture;return stopped}""")
    assert reduced,'Reduced motion did not stop moment effects'
    page.emulate_media(reduced_motion='no-preference')
    return {**setup,**checks,'reducedMotionStops':True,'naturalCleanup':True}

def check_matchup_lineups(page):
    page.emulate_media(reduced_motion='no-preference')
    page.evaluate("""async()=>{
      const {matchupLineupHtml}=await import('./js/game-day-lineup-comparison.js');
      const {patchGameDay}=await import('./js/game-day-dom.js');
      const {animateScoreChanges}=await import('./js/game-day-score-motion.js');
      const slots=['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'];
      const names=['Patrick Mahomes','Christian McCaffrey','Kenneth Walker III','Amon-Ra St. Brown','Marvin Harrison Jr.','George Kittle','Jaxon Smith-Njigba','Brandon Aubrey','San Francisco 49ers'];
      const side=roster=>({roster,name:roster==='1'?'The Bayou Bombers':'A Long Rival Team Name',lineup:slots.map((slot,i)=>({id:`demo-${roster}-${i}`,roster,slot,slotType:slot,slotIndex:i,position:slot==='FLEX'?'WR':slot,name:names[i],nflTeam:'SF',state:'live',points:i===0?20.5:i===1?null:0})),bench:[]});
      const game={id:'demo',sides:[side('1'),side('2')]};game.sides[0].lineup[3].injuryStatus='Questionable';game.sides[1].lineup[6].injuryStatus='Questionable';game.sides[1].lineup[2]={...game.sides[1].lineup[2],empty:true,points:null};
      const dialog=document.createElement('dialog');dialog.className='gameday-watch';dialog.dataset.motion='on';document.querySelector('#view').append(dialog);
      const markup=()=>'<header class="gd-watch-header"><h2>Demo lineup preview</h2></header><div data-watch-content>'+matchupLineupHtml(game)+'</div>';
      dialog.innerHTML=markup();dialog.showModal();
      window.lineupFixture={dialog,game,markup,patchGameDay,animateScoreChanges};
    }""")
    results=[]
    for width in [320,390,768]:
        page.set_viewport_size({'width':width,'height':844})
        checks=page.evaluate("""()=>{
          const f=window.lineupFixture,check=(v,m)=>{if(!v)throw Error(m)},root=f.dialog;
          const rows=[...root.querySelectorAll('.gd-lineup-comparison > .gd-lineup-pairs > .gd-compare-row')];
          check(rows.length===9,'Missing starting slot');
          for(const row of rows){const cells=[...row.querySelectorAll('.gd-compare-player')],r=cells.map(e=>e.getBoundingClientRect());check(r[0].right<r[1].left,'Comparison stacked');const scores=cells.map(e=>e.querySelector('.gameday-player-score').getBoundingClientRect());check(Math.abs(scores[0].bottom-scores[1].bottom)<1,'Paired scores are not aligned');}
          check([...root.querySelectorAll('.dfl-player-copy strong,.gd-compare-head strong')].every(e=>e.scrollWidth<=e.clientWidth+1),'Player/team name clipped');
          check(root.scrollWidth<=root.clientWidth,'Matchup comparison overflows');
          const measure=()=>[...root.querySelectorAll('.gd-thermal-value')].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]});
          const model={completed:false,games:[],starters:f.game.sides.flatMap(t=>t.lineup),snapshot:{points:{'1:demo-1-0':20.5},totals:{}}};
          const before=measure(),stop=f.animateScoreChanges(root,{previous:{points:{'1:demo-1-0':19},totals:{}},model,motion:true});
          check(root.querySelector('.gd-moment-caption')?.textContent==='20-point game','Comparison lost player moment');check(JSON.stringify(before)===JSON.stringify(measure()),'Comparison moment moves score glyphs');stop();
          const button=root.querySelector('[data-gameday-player]');button.focus();const identity=button;f.game.sides[0].lineup[0].points=22.75;f.patchGameDay(root,f.markup());check(document.activeElement===identity&&identity.isConnected,'Refresh lost player focus');check(root.querySelector('[data-gameday-score-key="1:demo-1-0"]').textContent.includes('22.75'),'Refresh failed to patch points');f.game.sides[0].lineup[0].points=20.5;f.patchGameDay(root,f.markup());
          return {width:innerWidth,pairedSlots:9,namesFit:true,scoresAligned:true,noOverflow:true,scoreGeometryStable:true,momentPreserved:true,refreshPreservesFocus:true};
        }""")
        page.screenshot(path=str(OUT/f'matchup-comparison-{width}.png'))
        results.append(checks)
    page.evaluate("()=>{window.lineupFixture.dialog.close();window.lineupFixture.dialog.remove();delete window.lineupFixture}")
    page.set_viewport_size({'width':390,'height':844})
    return results

def check_clubhouse_center(page):
    """Read-only, labeled demo: real controller, data model, rendering and motion."""
    page.emulate_media(reduced_motion='no-preference')
    tabs_source=(ROOT/'js/weekly-clubhouse-ui.js').read_text().split('export function wireClubhouseTabs')[1]
    page.evaluate("""async tabsSource=>{
      const {mountClubhouseCenter}=await import('./js/clubhouse-center.js'),{matchupCardHtml}=await import('./js/clubhouse-matchup-cards.js'),{savePageChoice}=await import('./js/page-disclosure.js');
      const slots=['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'],names=['Patrick Mahomes','Christian McCaffrey','Kenneth Walker III','Amon-Ra St. Brown','Marvin Harrison Jr.','George Kittle','Jaxon Smith-Njigba','Brandon Aubrey','San Francisco 49ers'];
      const members=[1,2,3,4].map(id=>({id,sleeper_user_id:'demo-user-'+id,team_name:id===1?'The Very Long Championship Bayou Bombers':'Demo Team '+id,display_name:'Demo Owner '+id}));
      const games=[1,2].map(id=>({matchup_id:id,user1:'demo-user-'+(id*2-1),user2:'demo-user-'+(id*2),roster1:id*2-1,roster2:id*2,left:{roster:id*2-1,name:members[id*2-2].team_name,memberId:id*2-1,score:40},right:{roster:id*2,name:members[id*2-1].team_name,memberId:id*2,score:45}}));
      const week={season:2099,week:5,leagueId:'demo',completed:false,members,games};
      const players={},rows=[1,2,3,4].map(roster=>{const ids=slots.map((slot,i)=>{const id=`demo-${roster}-${i}`;players[id]={n:names[i],p:slot==='FLEX'?'WR':slot,t:i<7?'SF':i===7?'DAL':'SF',is:roster===1&&i===3?'Questionable':null};return id});const bench=`bench-${roster}`;players[bench]={n:'Demo Bench Player',p:'RB',t:'SF'};return {roster_id:roster,points:roster%2?40:45,starters:ids,players:[...ids,bench],players_points:Object.fromEntries([...ids,bench].map((id,i)=>[id,i===0?19:0]))}});
      const nfl=new Map([['SF',{key:'live'}],['DAL',{key:'upcoming'}]]);
      const region=document.createElement('section');region.className='view';region.dataset.route='clubhouse';region.dataset.pulseSystem='1';
      region.innerHTML=`<div class="clubhouse-page clubhouse-command-center"><h2>Demo Clubhouse preview · simulated stats</h2><div class="tabs clubhouse-tabs" role="tablist" aria-label="Demo Clubhouse sections">${['overview','matchups','recap'].map(name=>`<button type="button" role="tab" data-clubhouse-tab="${name}" aria-controls="demo-clubhouse-${name}" aria-selected="${name==='matchups'}">${name}</button>`).join('')}</div><div id="demo-clubhouse-overview" hidden><div class="clubhouse-heading"><h2>Demo league overview</h2></div></div><div id="demo-clubhouse-recap" hidden><div class="clubhouse-heading"><h2>Demo weekly recap</h2></div></div><div id="demo-clubhouse-matchups"><div class="clubhouse-matchup-toolbar"><button type="button" data-clubhouse-motion>Motion on</button></div><div data-clubhouse-scoreboard></div><p class="clubhouse-stat-status" data-clubhouse-stats-state role="status"></p>${games.map(g=>`<section data-clubhouse-matchup="${g.matchup_id}">${matchupCardHtml(g,week,new Map())}</section>`).join('')}</div></div>`;
      document.querySelector('#view').append(region);
      savePageChoice('gameday-motion','on');savePageChoice('clubhouse-matchup-2099-5','1');
      let active=true,pending=null,failed=false,statsCalls=0;
      const loadStats=async()=>{statsCalls++;if(failed)throw Error('Demo offline');if(statsCalls===1)return {data:[]};return new Promise(resolve=>pending=resolve)};
      const center=mountClubhouseCenter(region,week,{active:()=>active,loadStats,loadLeague:async()=>({roster_positions:slots})});
      const wireTabs=Function('history','function wireClubhouseTabs'+tabsSource+';return wireClubhouseTabs')({replaceState(){}});wireTabs(region,'matchups');
      center.update({rows,players,nfl});
      window.clubhouseFixture={center,region,rows,players,nfl,savePageChoice,get pending(){return pending},get statsCalls(){return statsCalls},failStats(){failed=true},restoreStats(){failed=false},stop(){active=false;center.stop()},bundle:{data:rows.flatMap(row=>row.starters.map(id=>({player_id:id,season:2099,week:5,season_type:'regular',stats:players[id].p==='QB'?{pass_yd:205,pass_td:2,pass_int:0}:players[id].p==='RB'?{rush_yd:63,rush_td:1,rec:4,rec_yd:30}:players[id].p==='K'?{}:players[id].p==='DEF'?{sack:2,int:1,pts_allow:14}:{rec:6,rec_yd:98,rec_td:1}})))}};
    }""",tabs_source)
    page.wait_for_timeout(1000)
    result={'layouts':[]}
    try:
        for width in [320,390,768]:
            page.set_viewport_size({'width':width,'height':844})
            for mode in ['light','dark','medicine']:
                page.evaluate('window.reviewSetTheme',mode)
                layout=page.evaluate("""()=>{
                  const f=window.clubhouseFixture,root=f.region,check=(v,m)=>{if(!v)throw Error(m)},card=root.querySelector('[data-clubhouse-matchup]:not([hidden])');
                  check(root.querySelectorAll('[data-clubhouse-game]').length===2,'Missing matchup button');
                  const rows=[...card.querySelectorAll('.gd-lineup-comparison > .gd-lineup-pairs > .gd-compare-row')];check(rows.length===9,'Missing Clubhouse starting slot');
                  for(const row of rows){const cells=[...row.querySelectorAll('.gd-compare-player')],boxes=cells.map(e=>e.getBoundingClientRect()),scores=cells.map(e=>e.querySelector('.gameday-player-score').getBoundingClientRect());check(boxes[0].right<boxes[1].left,'Clubhouse lineups stack');check(Math.abs(scores[0].bottom-scores[1].bottom)<1,'Clubhouse scores misalign');}
                  check([...card.querySelectorAll('.dfl-player-copy strong,.clubhouse-matchup-name strong,.gd-compare-head strong')].every(e=>e.scrollWidth<=e.clientWidth+1),'Clubhouse player/team name clips');
                  check([...root.querySelectorAll('[data-clubhouse-game],[data-clubhouse-motion]')].every(e=>e.offsetHeight>=44&&e.offsetWidth>=44),'Clubhouse controls too small');
                  check(!root.querySelector('.gd-moment-caption'),'Initial Clubhouse snapshot celebrated');
                  check(card.querySelectorAll('.clubhouse-status-table tbody tr').length===3,'Starter status comparison is incomplete');
                  check(card.querySelector('[data-lead="true"]')===card.querySelectorAll('.clubhouse-game-side')[1],'Actual leader cue points at the wrong side');
                  check(document.documentElement.scrollWidth<=innerWidth,'Clubhouse overflows phone');
                  return {width:innerWidth,pairedSlots:rows.length,namesFit:true,scoresAligned:true,allGamesVisible:true,touchTargets:true,initialQuiet:true,noOverflow:true};
                }""")
                result['layouts'].append({'mode':mode,**layout})
            if width==390:
                page.locator('[data-clubhouse-matchup]:not([hidden]) .clubhouse-game-teams').scroll_into_view_if_needed()
                page.screenshot(path=str(OUT/'clubhouse-demo-head-to-head-390.png'))
        page.set_viewport_size({'width':390,'height':844})
        page.evaluate("window.reviewSetTheme('light');window.clubhouseFixture.region.querySelector('.clubhouse-tabs').scrollIntoView({behavior:'instant',block:'start'})")
        result['polish']=page.evaluate("""async()=>{
          const f=window.clubhouseFixture,root=f.region,check=(v,m)=>{if(!v)throw Error(m)},frame=()=>new Promise(r=>requestAnimationFrame(r));
          const tabs=root.querySelector('.clubhouse-tabs'),marker=tabs.querySelector('.clubhouse-tab-indicator'),overview=tabs.querySelector('[data-clubhouse-tab="overview"]'),matchups=tabs.querySelector('[data-clubhouse-tab="matchups"]');
          check(marker&&marker.offsetHeight===2,'Sliding marker has incorrect geometry');
          overview.click();await frame();check(marker.getAnimations().some(a=>a.playState==='running'),'Tab switch has no sliding marker');
          overview.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await frame();check(document.activeElement===matchups&&matchups.getAttribute('aria-selected')==='true','Native keyboard tab navigation lost');
          for(const name of ['recap','overview','matchups'])tabs.querySelector('[data-clubhouse-tab="'+name+'"]').click();await frame();
          check(tabs.querySelectorAll('[aria-selected="true"]').length===1&&root.querySelector('#demo-clubhouse-overview').hidden&&root.querySelector('#demo-clubhouse-recap').hidden&&!root.querySelector('#demo-clubhouse-matchups').hidden,'Rapid tabs left multiple panels');
          await new Promise(r=>setTimeout(r,340));check(Math.abs(marker.getBoundingClientRect().left-matchups.getBoundingClientRect().left)<1&&Math.abs(marker.getBoundingClientRect().width-matchups.getBoundingClientRect().width)<1,'Tab marker failed to settle');
          root.querySelector('[data-clubhouse-game="2"]').click();const card=root.querySelector('[data-clubhouse-matchup="2"]'),hero=card.querySelector('.clubhouse-game-teams');hero.scrollIntoView({behavior:'instant',block:'center'});await frame();await frame();
          const light=hero.querySelector('.clubhouse-stage-light');for(let n=0;n<40&&!light.getAnimations().some(a=>a.playState==='running');n++)await new Promise(r=>setTimeout(r,10));check(light.getAnimations().some(a=>a.playState==='running'),'Matchup entrance has no finite light sweep: '+JSON.stringify({rect:hero.getBoundingClientRect().toJSON(),motion:root.querySelector('.clubhouse-page').dataset.motion,hidden:!!card.closest('[hidden]')}));
          for(const [index,side] of [...hero.querySelectorAll('.clubhouse-game-side')].entries())for(const identity of side.querySelectorAll(':scope > .clubhouse-team-mark,:scope > .clubhouse-matchup-name')){
            const entrance=identity.getAnimations().find(a=>a.playState==='running');check(entrance,'Both team crests and names must enter together');const frames=entrance.effect.getKeyframes();const first=new DOMMatrix(frames[0].transform),last=new DOMMatrix(frames.at(-1).transform);check(first.m41===(index?32:-32)&&Math.abs(first.a-.97)<.001&&last.m41===0&&last.a===1,'Teams must slide in from opposite sides');check(entrance.effect.getTiming().duration===700,'Entrance must match the GameDay timing');
          }
          const values=[...card.querySelectorAll('[data-matchup-score-value],.gd-thermal-value')],sizes=()=>values.map(e=>{const b=e.getBoundingClientRect();return [b.width,b.height,getComputedStyle(e).transform]});const before=sizes();await frame();check(JSON.stringify(before)===JSON.stringify(sizes())&&getComputedStyle(hero).transform==='none','Visual polish moves score geometry');
          root.querySelector('[data-clubhouse-game="1"]').click();check([...root.getAnimations({subtree:true})].filter(a=>a.constructor===Animation&&a.playState==='running').every(a=>!a.effect.target.closest('[hidden]')),'Rapid matchups animate a hidden game');
          root.querySelector('[data-clubhouse-motion]').click();overview.click();await frame();check(marker.getAnimations().length===0&&[...root.getAnimations({subtree:true})].filter(a=>a.constructor===Animation&&a.playState==='running').length===0,'Motion off leaves UI effects running');
          check(getComputedStyle(tabs.querySelector('button')).transitionDuration==='0s','Motion off leaves CSS transitions running');matchups.click();root.querySelector('[data-clubhouse-motion]').click();await frame();
          return {slidingTabMarker:true,keyboardTabs:true,rapidSelection:true,finiteMatchupLight:true,scoreGeometryStable:true,motionOff:true};
        }""")
        result['updates']=page.evaluate("""async()=>{
          const f=window.clubhouseFixture,root=f.region,check=(v,m)=>{if(!v)throw Error(m)},settle=()=>new Promise(r=>setTimeout(r,30));
          root.querySelector('[data-clubhouse-game="2"]').click();check(root.querySelector('[data-clubhouse-matchup]:not([hidden])').dataset.clubhouseMatchup==='2'&&root.querySelector('[data-clubhouse-game="2"]').getAttribute('aria-pressed')==='true','Matchup switch did not select');
          root.querySelector('[data-clubhouse-game="1"]').click();
          const card=root.querySelector('[data-clubhouse-matchup="1"]'),button=card.querySelector('[data-gameday-player]'),identity=button,bench=card.querySelector('.gd-compare-bench'),positions=card.querySelector('.clubhouse-position-stats');
          check(bench&&positions,'Bench/positional stats missing');bench.open=true;positions.open=true;button.focus();button.scrollIntoView({behavior:'instant',block:'center'});
          f.rows[0].points=48;f.rows[0].players_points['demo-1-0']=25;f.center.update({rows:f.rows,players:f.players,nfl:f.nfl,force:true});
          check(document.activeElement===identity&&identity.isConnected&&bench.open&&positions.open,'Refresh lost focus or expanded stats');
          check(card.querySelector('.gd-moment-caption')&&card.querySelector('.clubhouse-pressure-label'),'Actual live moment/close-game context missing');
          f.pending(f.bundle);await settle();
          check(card.querySelector('.gd-moment-caption'),'Stats arriving cancelled live score effect');
          check(card.querySelector('[data-clubhouse-stat-key="1:demo-1-0"]').textContent==='205 pass yd · 2 pass TD · 0 INT','Actual scoped QB box score missing');
          check(card.querySelector('[data-clubhouse-stat-key="1:demo-1-3"]').textContent==='6 rec · 98 rec yd · 1 rec TD','Actual scoped WR box score missing');
          check(card.querySelector('[data-clubhouse-stat-key="1:demo-1-7"]').textContent==='Yet to play','Future kicker shows stale stats');
          check(positions.querySelector('tbody tr td').textContent==='25.00','Positional points do not follow starters');
          root.querySelector('[data-clubhouse-motion]').click();check(root.querySelector('[data-clubhouse-motion]').getAttribute('aria-pressed')==='false'&&!card.querySelector('.gd-moment-caption'),'Motion off left moment running');
          f.failStats();f.rows[0].players_points['demo-1-0']=31;f.center.update({rows:f.rows,players:f.players,nfl:f.nfl,force:true});await settle();
          check(!card.querySelector('.gd-moment-caption'),'Motion off creates celebration');
          check(root.querySelector('[data-clubhouse-stats-state]').textContent.includes('last checked stats')&&card.querySelector('[data-clubhouse-stat-key="1:demo-1-3"]').textContent.includes('98 rec yd'),'Stats failure discarded known values');
          f.center.fail();check(card.querySelector('.gd-lineup-comparison'),'Score failure discarded lineup');
          root.querySelector('[data-clubhouse-motion]').click();button.scrollIntoView({behavior:'instant',block:'center'});f.rows[0].players_points['demo-1-0']=42;f.center.update({rows:f.rows,players:f.players,nfl:f.nfl});check(card.querySelector('.gd-moment-caption'),'Motion on did not restore live effect');return {selectableMatchups:true,refreshPreservesFocus:true,expandedStatsPreserved:true,realBoxScores:true,upcomingExplicit:true,positionalPoints:true,liveMoment:true,statsDoNotCancelMoment:true,motionOff:true,failureKeepsData:true};
        }""")
        result['boxScoreLayouts']=[]
        for width in [320,390,768]:
            page.set_viewport_size({'width':width,'height':844})
            box=page.evaluate("""()=>{const root=window.clubhouseFixture.region,card=root.querySelector('[data-clubhouse-matchup]:not([hidden])'),lines=[...card.querySelectorAll('[data-clubhouse-stat-key]')].filter(e=>e.getClientRects().length);return {width:innerWidth,lines:lines.length,fit:lines.every(e=>e.scrollWidth<=e.clientWidth+1&&e.getBoundingClientRect().left>=root.getBoundingClientRect().left&&e.getBoundingClientRect().right<=root.getBoundingClientRect().right+1),overflow:document.documentElement.scrollWidth>innerWidth}}""")
            assert box['lines']>=18 and box['fit'] and not box['overflow'],box
            result['boxScoreLayouts'].append(box)
            if width==390:
                page.locator('[data-clubhouse-matchup]:not([hidden]) .gd-lineup-comparison h3').evaluate("e=>window.scrollBy({top:e.getBoundingClientRect().top-70,behavior:'instant'})")
                page.screenshot(path=str(OUT/'clubhouse-demo-box-scores-390.png'))
        result['leadTruth']=page.evaluate("""()=>{
          const f=window.clubhouseFixture,check=(v,m)=>{if(!v)throw Error(m)},card=f.region.querySelector('[data-clubhouse-matchup="1"]');
          const rows=f.rows.map(r=>({...r,points:r.roster_id%2?60:45}));
          const statuses=key=>new Map([...f.nfl].map(([team,status])=>[team,{...status,key}]));
          for(const state of ['upcoming','unknown']){f.center.update({rows,players:f.players,nfl:statuses(state)});check(!card.querySelector('[data-lead="true"]')&&!card.querySelector('td.is-ahead')&&!f.region.querySelector('.clubhouse-mini-team.is-leading'),'Pending/pregame snapshot claims a lead');}
          f.center.update({rows,players:f.players,nfl:statuses('live')});check(card.querySelector('[data-lead="true"]')===card.querySelectorAll('.clubhouse-game-side')[0],'Lead flip did not move the cue');
          f.center.update({rows:rows.map(r=>({...r,points:45})),players:f.players,nfl:statuses('live')});check(!card.querySelector('[data-lead="true"]'),'Tied game claims a lead');
          f.center.update({rows:rows.map(r=>({...r,points:r.roster_id%2?null:45})),players:f.players,nfl:statuses('live')});check(!card.querySelector('[data-lead="true"]'),'Missing actual score claims a lead');
          f.center.update({rows:f.rows,players:f.players,nfl:f.nfl});return {pregameQuiet:true,unknownQuiet:true,leadFlip:true,tiesQuiet:true,missingScoresQuiet:true};
        }""")
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("window.clubhouseFixture.region.querySelectorAll('.gd-moment-caption').length===0",timeout=5000)
        result['cleanup']=page.evaluate("""async()=>{const f=window.clubhouseFixture,check=(v,m)=>{if(!v)throw Error(m)};check(f.region.querySelectorAll('.gd-moment-caption').length===0,'Reduced motion left celebration');f.restoreStats();f.center.update({rows:f.rows,players:f.players,nfl:f.nfl,force:true});const line=f.region.querySelector('[data-clubhouse-stat-key]'),known=line.textContent;f.stop();f.pending({data:[]});await new Promise(r=>setTimeout(r,30));check(line.textContent===known,'Late stats mutated stopped Clubhouse');check(!f.region.querySelector('canvas')&&f.region.getAnimations({subtree:true}).filter(a=>a.constructor===Animation&&a.playState==='running').length===0,'Clubhouse stop left rendering alive');return {reducedMotion:true,canvasRemoved:true,animationsStopped:true,lateStatsIgnored:true}}""")
    finally:
        page.evaluate("window.clubhouseFixture.stop();window.clubhouseFixture.region.remove();window.clubhouseFixture.savePageChoice('gameday-motion','off');delete window.clubhouseFixture")
        page.emulate_media(reduced_motion='no-preference')
        page.evaluate("window.reviewSetTheme('light')")
        page.set_viewport_size({'width':390,'height':844})
    return result

def check_injury_layout(page):
    rows=page.locator('.bx-slide:not(.bx-leaving) .injury-player').evaluate_all("""rows=>rows.map(row=>{
      const portrait=row.querySelector('.dfl-player-portrait').getBoundingClientRect(),copy=row.querySelector('.injury-player-copy'),text=copy.getBoundingClientRect(),state=row.querySelector('.injury-player-state').getBoundingClientRect(),box=row.getBoundingClientRect();
      return {portrait:portrait.toJSON(),text:text.toJSON(),state:state.toJSON(),box:box.toJSON(),copyFits:copy.scrollWidth<=copy.clientWidth+1,stateFits:row.querySelector('.injury-player-state').scrollWidth<=row.querySelector('.injury-player-state').clientWidth+1,rowFits:row.scrollWidth<=row.clientWidth+1};
    })""")
    for row in rows:
        assert row['portrait']['right']+6<=row['text']['left'], f"Injury portrait overlaps player text: {row}"
        assert row['text']['right']+6<=row['state']['left'] or row['text']['bottom']+4<=row['state']['top'], f"Injury status overlaps player text: {row}"
        assert row['copyFits'] and row['stateFits'] and row['rowFits'] and row['state']['right']<=row['box']['right']+1, f"Injury information leaves its row: {row}"
    return rows

def check_home_replies(page):
    source=(ROOT/'js/wall-conversations.js').read_text()
    source=source[source.index('// Braces keep'):].replace('export ', '')
    return page.evaluate('''async source=>{
      const check=(ok,message)=>{if(!ok)throw Error(message)},until=async fn=>{for(let i=0;i<100&&!fn();i++)await new Promise(r=>setTimeout(r,10));check(fn(),'Reply fixture timed out')};
      let reads=0,writes=0,cleared=0,member={id:7};
      const members=[{id:7,display_name:'The Boys'}],rows=Array.from({length:51},(_,i)=>({id:i+1,member_id:7,body:'Receipt '+i,created_at:'2026-10-08T12:00:00Z',members:{display_name:'The Boys'}}));
      const db=()=>({from:table=>{check(table==='member_wall_replies','Unexpected reply table');return {
        select(){return this},eq(){return this},order(){return this},
        async limit(count){reads++;return reads===1?{error:Error('Fixture offline')}:{data:rows.slice(0,count)}},
        async insert(row){writes++;check(row.post_id===91&&row.member_id===7&&row.body==='Bring the receipts','Reply targets the wrong post/member');return writes===1?{error:Error('Fixture offline')}:{data:null}}
      }}});
      const root=document.createElement('div');root.id='home-wrap';root.className='home-banter';document.body.append(root);
      const helpers=Function('db','isAdmin','currentMember','loadMemberDirectory','esc','toast','wireWallDraft','clearWallDraft',source+';return {threadHtml,wireConversations}')(
        db,()=>false,()=>member,async()=>members,v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),()=>{},()=>{},()=>cleared++);
      try{
        root.innerHTML=helpers.threadHtml({id:91,reply_count:51});await helpers.wireConversations(root);
        const thread=root.querySelector('details');check(reads===0&&!thread.open,'Closed Home threads must not fetch replies');thread.querySelector('summary').click();await until(()=>!!root.querySelector('[data-thread-retry]'));
        root.querySelector('[data-thread-retry]').click();await until(()=>!!root.querySelector('[data-replies-more]'));check(root.querySelectorAll('.wall-reply').length===50,'Replies must paginate');
        root.querySelector('[data-replies-more]').click();await until(()=>root.querySelectorAll('.wall-reply').length===51);check(!root.querySelector('[data-replies-more]'),'Pagination did not finish');
        let form=root.querySelector('form');form.elements.body.value='Bring the receipts';form.requestSubmit();await until(()=>root.querySelector('[data-reply-status]').textContent.includes('Could not post'));
        check(form.elements.body.value==='Bring the receipts'&&!form.querySelector('button').disabled,'Failed reply lost the draft or prevented retry');form.requestSubmit();await until(()=>cleared===1&&thread.querySelector('summary').textContent==='Replies (52)');
        check(writes===2&&root.querySelector('[data-mention-picker]'),'Home replies must support posting and mentions');
        thread.querySelector('summary').click();thread.querySelector('summary').click();await new Promise(r=>setTimeout(r,20));check(reads===4,'Reopening a loaded thread duplicated its fetch');
        member=null;root.innerHTML=helpers.threadHtml({id:91});await helpers.wireConversations(root);root.querySelector('summary').click();await until(()=>root.textContent.includes('Pick your name'));check(!root.querySelector('form'),'Guests can read replies but need a profile to post');
        return {lazyLoad:true,inlineOpen:true,retry:true,pagination:true,draftOnFailure:true,postAndCount:true,mentions:true,guestRead:true};
      }finally{root.remove()}
    }''',source)

with sync_playwright() as p:
    executable = os.environ.get('DFL_REVIEW_CHROMIUM')
    browser = p.chromium.launch(executable_path=executable, headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    html = (OUT / 'index.html').read_text().replace('<head>', f'<head><base href="{url}">', 1)
    page.goto(url, wait_until='domcontentloaded')
    page.wait_for_function('!!window.reviewVfx', timeout=15000)
    page.locator('.bx-pause').click()
    page.locator('[data-bx-go="0"]').click()
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(1600)
    moment_effects=check_game_day_moments(page)
    matchup_lineups=check_matchup_lineups(page)
    clubhouse_center=check_clubhouse_center(page)
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    page.screenshot(path=str(OUT / 'home-390.png'))
    # Player leaders are secondary to the matchup and lineup action. Open the
    # game-day disclosure for its existing detailed checks.
    page.locator('.home-live-details').evaluate('e=>e.open=true')
    metrics_visibility = page.evaluate('''() => {
        const logo=document.querySelector('.home-newspaper-date').getBoundingClientRect();
        const last=document.querySelector('.home-thermal-leaders .gameday-player:last-child').getBoundingClientRect();
        const ticker=document.querySelector('#tabbar').getBoundingClientRect();
        return {logoLeft:logo.left,logoRight:logo.right,lastRowBottom:last.bottom,tickerTop:ticker.top};
    }''')
    assert metrics_visibility['logoLeft'] >= 0 and metrics_visibility['logoRight'] <= 390, 'Home date is clipped'
    print('Home gutters:', page.evaluate('[...document.querySelectorAll(".bx-slide,.home-thermal-leaders,.gameday-matchup")].map(e=>({class:e.className,padding:getComputedStyle(e).padding,left:e.getBoundingClientRect().left,gutter:getComputedStyle(e).getPropertyValue("--home-gutter")}))'), flush=True)
    metrics = {'visibility': metrics_visibility}
    metrics['homeReplies'] = check_home_replies(page)
    for width in [390, 320, 832, 1280]:
        page.set_viewport_size({'width': width, 'height': 844})
        page.wait_for_timeout(300)
        if width == 390:
            metrics['leaderCore'] = page.locator('.home-thermal-leaders').evaluate("e=>e.offsetHeight")
        metrics[str(width)] = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,canvas:!!document.querySelector("canvas"), sections:[...document.querySelectorAll(".topbar,.home-newspaper-masthead,.bx-stage,.gameday-matchup,.home-thermal-leaders,.tabbar")].map(e=>({class:e.className,top:e.getBoundingClientRect().top,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,height:e.getBoundingClientRect().height}))})')
        page.screenshot(path=str(OUT / f'home-{width}.png'))
        masthead = page.locator('.home-newspaper-masthead').evaluate("e=>({width:e.getBoundingClientRect().width,title:e.querySelector('h1').textContent.trim()})")
        assert masthead['title'] == 'The clubhouse' and masthead['width'] <= width, f'Masthead overflow or missing wordmark: {masthead}'
        metrics[str(width)]['masthead'] = masthead
        if width < 900:
            # The full-width banner adds natural scroll. Every player must
            # remain reachable above the persistent navigation.
            page.evaluate("window.scrollTo({top:Math.max(0,scrollY+document.querySelector('.home-thermal-leaders .gameday-player:last-child').getBoundingClientRect().bottom-document.querySelector('#tabbar').getBoundingClientRect().top+20),behavior:'instant'})")
            visible = page.evaluate("""() => {const row=document.querySelector('.home-thermal-leaders .gameday-player:last-child').getBoundingClientRect();return {top:row.top,bottom:row.bottom,headerBottom:document.querySelector('.topbar').getBoundingClientRect().bottom,tickerTop:document.querySelector('#tabbar').getBoundingClientRect().top}}""")
            assert visible['top'] > visible['headerBottom'] and visible['bottom'] < visible['tickerTop'] - 1, f'Last player cannot be reached above persistent controls: {visible}'
            metrics[str(width)]['scrolledPlayer'] = visible
            page.screenshot(path=str(OUT / f'home-{width}-leaders.png'))
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('.bx-next').click()
    page.wait_for_timeout(350)
    assert page.locator('[data-bx-go="1"]').get_attribute('aria-current') == 'true', 'Next slide did not advance'
    page.locator('.bx-prev').click()
    page.wait_for_timeout(350)
    assert page.locator('[data-bx-go="0"]').get_attribute('aria-current') == 'true', 'Previous slide did not return'
    assert all(page.locator(f'#tabbar [data-route="{route}"] svg use').get_attribute('href').startswith('#dfl-nav-') for route in ['home','clubhouse','sportsbook','trade','analyzer'])
    assert page.evaluate('document.querySelector("#dfl-nav-house").namespaceURI') == 'http://www.w3.org/2000/svg'
    assert metrics['leaderCore'] < 240, 'Leader rows must stay compact beneath the color key'
    metrics['pause'] = page.locator('.bx-pause').get_attribute('aria-label')
    assert metrics['pause'] == 'Play the broadcast'
    assert all(metrics[str(w)]['scroll'] <= w for w in [390, 320, 832, 1280]), 'Horizontal overflow'
    assert all(-0.5 <= section['left'] and section['right'] <= width + 0.5 for width in [390,320,832,1280] for section in metrics[str(width)]['sections']), 'A primary section is clipped at the viewport edge'
    assert page.locator('.home-thermal-leaders [data-score-temperature="hot"]').count() == 2
    assert page.locator('.home-thermal-leaders [data-score-temperature="cold"]').count() == 2
    assert page.locator('.home-score-key').count() == 0, 'The hot/cold info text should be removed'
    page.locator('[data-home-live-slot]').scroll_into_view_if_needed()
    page.locator('[data-home-live-slot]').evaluate("e=>e.dataset.motion='on'")
    page.wait_for_timeout(300)
    metrics['renderer'] = page.locator('canvas.gd-vfx-canvas').get_attribute('data-renderer')
    assert metrics['renderer'] == 'webgl', 'Animated score renderer did not start'
    metrics['fonts'] = page.evaluate('({headline:getComputedStyle(document.querySelector(".bx-home-title")).fontFamily,score:getComputedStyle(document.querySelector(".gd-thermal-value")).fontFamily,stroke:getComputedStyle(document.querySelector(".gd-thermal-value")).webkitTextStrokeWidth,loaded:document.fonts.check("30px Anton")})')
    assert metrics['fonts']['loaded'] and 'Anton' in metrics['fonts']['headline'] and 'DFL Broadcast' not in metrics['fonts']['score'], 'Pixel display font is still active'
    assert metrics['fonts']['stroke'] == '0px', 'Synthetic score stroke is still active'
    metrics['refinement'] = page.evaluate("""() => ({playerFont:parseFloat(getComputedStyle(document.querySelector('.home-thermal-leaders .gd-thermal-number')).fontSize),paper:getComputedStyle(document.querySelector('#home-wrap')).getPropertyValue('--bg').trim(),hero:document.querySelector('.bx-home-art').complete,visibleLore:!document.querySelector('[data-home-lore-slot]').closest('details'),visibleWall:!document.querySelector('[data-wall-slot]').closest('details')})""")
    assert metrics['refinement']['hero'] and page.evaluate("getComputedStyle(document.querySelector('#home-wrap')).getPropertyValue('--bg').trim()===getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()"), 'Home must use the shared app palette and retain broadcast artwork'
    assert metrics['refinement']['visibleLore'] and metrics['refinement']['visibleWall'], 'DFL stories are hidden in More'
    page.locator('[data-home-live-slot]').evaluate("e=>e.dataset.motion='off'")
    metrics['unevenTeamNames'] = []
    for width in [320,390,832,1280]:
        page.set_viewport_size({'width':width,'height':844})
        names = page.evaluate('''() => {
            const names=[...document.querySelectorAll('.home-team-name strong')],saved=names.map(e=>e.textContent);
            names[0].textContent='Short';names[1].textContent='The Very Long Bayou Championship Fantasy Football Bombers';
            const rows=[...document.querySelectorAll('.gameday-faceoff-team')].map(e=>({scoreY:e.querySelector('.home-team-total').getBoundingClientRect().top,fullName:e.querySelector('strong').scrollWidth<=e.querySelector('strong').clientWidth+1}));
            names.forEach((e,i)=>e.textContent=saved[i]);return rows;
        }''')
        assert abs(names[0]['scoreY']-names[1]['scoreY'])<1 and all(row['fullName'] for row in names), f'Uneven team names misalign or clip scores: {width}: {names}'
        metrics['unevenTeamNames'].append({'width':width,'rows':names})
    page.set_viewport_size({'width':390,'height':844})
    metrics['readingOrder'] = page.evaluate("""() => {
      const selectors=['.home-frontpage','.home-week-desk','.home-league-desk','[data-home-lore-slot]','.home-banter'];
      const root=document.querySelector('#home-wrap'),children=[...root.children];
      return selectors.map(selector=>({selector,index:children.indexOf(root.querySelector(selector))}));
    }""")
    assert all(x['index']>=0 for x in metrics['readingOrder']) and [x['index'] for x in metrics['readingOrder']] == sorted(x['index'] for x in metrics['readingOrder']), 'Home sections are out of reading order'
    assert page.evaluate("!document.querySelector('[data-home-focus-slot]').closest('details')&&!document.querySelector('[data-home-rankings-slot]').closest('details')"), 'Next actions and standings must be visible without expanding a disclosure'
    assert page.locator('.home-pickem-card').get_attribute('href') == '#/sportsbook?product=pickem', 'Home Pick’em must open the Pick’em card directly'
    assert page.locator('.home-week-desk').inner_text().lower().count('locks') == 1, 'Pick’em cutoff is missing or repeated'
    assert page.locator('[data-home-deadline-slot]').count() == 0, 'Duplicate deadline notice returned'
    metrics['mobileType'] = []
    for width in [320, 390, 768, 1280]:
        page.set_viewport_size({'width':width,'height':844})
        typography = page.evaluate('''() => {
            const type=s=>{const e=document.querySelector(s),c=getComputedStyle(e);return {size:parseFloat(c.fontSize),family:c.fontFamily,weight:Number(c.fontWeight),line:parseFloat(c.lineHeight),transform:c.textTransform}};
            const labelElements=[...document.querySelectorAll('.home-rank-head span')],labels=labelElements.map(e=>e.getBoundingClientRect());
            return {width:innerWidth,fontLoaded:document.fonts.check('600 15px "Rajdhani"'),heading:type('.home-rankings-card h2'),body:type('.home-focus-action'),name:type('.home-thermal-leaders .dfl-player-copy strong'),metadata:type('.home-thermal-leaders .dfl-player-copy small'),detail:type('[data-page-detail="home-week"] summary small'),rankLabelsFit:labelElements.every(e=>e.scrollWidth<=e.clientWidth+1)&&labels.every((r,i)=>!i||labels[i-1].right<=r.left+1),masthead:document.querySelector('.home-newspaper-masthead').offsetHeight};
        }''')
        assert typography['fontLoaded'] and all('Rajdhani' in typography[k]['family'] for k in ['heading','body','name','metadata','detail']), f'Home type did not load consistently: {typography}'
        assert typography['heading']['size'] == 18 and typography['body']['size'] == 12 and typography['name']['size'] == 15 and typography['metadata']['size'] == typography['detail']['size'] == 12, f'Home text scale is inconsistent: {typography}'
        assert typography['heading']['weight'] == 700 and typography['name']['weight'] == 600 and typography['heading']['transform'] == 'uppercase' and typography['name']['transform'] == 'none' and typography['rankLabelsFit'], f'Home headings or rank columns are crowded: {typography}'
        metrics['mobileType'].append(typography)
    page.set_viewport_size({'width':390,'height':844})
    assert page.locator('[data-page-detail="home-week"]').evaluate('e=>!e.open') and page.locator('[data-page-detail="home-league"]').evaluate('e=>!e.open'), 'Secondary detail should start collapsed'
    assert page.evaluate("document.querySelector('.home-banter').previousElementSibling.matches('[data-home-lore-slot]')"), 'History should lead into league conversation'
    metrics['cleanup'] = page.evaluate("""() => ({stories:[...document.querySelectorAll('.home-league-story')].map(e=>({border:getComputedStyle(e).borderLeftWidth,background:getComputedStyle(e).backgroundColor,decoration:getComputedStyle(e).textDecorationLine})),actions:[...document.querySelectorAll('.home-section-action')].map(e=>({label:e.getAttribute('aria-label'),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),storyLinks:document.querySelectorAll('.home-league-file > nav').length})""")
    assert all(s['border'] == '0px' and s['background'] == 'rgba(0, 0, 0, 0)' and s['decoration'] == 'none' for s in metrics['cleanup']['stories']), 'Archive stories still use boxed cards or underlined links'
    assert all(a['label'] and a['width'] >= 44 and a['height'] >= 44 for a in metrics['cleanup']['actions']), 'Section controls need accessible names and phone-sized targets'
    assert metrics['cleanup']['storyLinks'] == 1, 'Home must expose its weekly archive paths'
    assert page.locator('.home-archive-paths a').count() == 2, 'Both weekly recap and historical-week archives need direct links'
    page.locator('.home-league-file > header .home-section-action').focus()
    page.keyboard.press('Shift+Tab')
    page.keyboard.press('Tab')
    assert page.locator('.home-league-file > header .home-section-action').evaluate("e=>getComputedStyle(e).outlineStyle") != 'none', 'Keyboard focus is not visible'
    page.evaluate('document.activeElement.blur();window.scrollTo(0,0)')
    page.evaluate("document.querySelectorAll('#tabbar,.bottomline').forEach(e=>e.style.visibility='hidden')")
    page.screenshot(path=str(OUT / 'home-390-full.png'), full_page=True)
    page.evaluate("document.querySelectorAll('#tabbar,.bottomline').forEach(e=>e.style.removeProperty('visibility'))")
    page.evaluate("window.scrollTo(0,document.querySelector('.home-league-file').getBoundingClientRect().top+scrollY-64)")
    page.screenshot(path=str(OUT / 'home-390-stories.png'))
    page.evaluate('window.scrollTo(0,0)')
    metrics['navigation'] = []
    metrics['sharedHeader'] = []
    for nav_mode in ['light','dark']:
        page.evaluate('mode=>window.reviewSetTheme(mode)',nav_mode)
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':844})
            reference = None
            header_reference = None
            for route in ['home','clubhouse','sportsbook','trade','analyzer','wall','history','golf']:
                page.evaluate("""route => {document.querySelector('#view').dataset.route=route;document.querySelectorAll('#tabbar .on').forEach(e=>e.classList.remove('on'));(document.querySelector(`#tabbar [data-route="${route}"]`)||document.querySelector('#more-btn')).classList.add('on');window.reviewSyncNav()}""", route)
                page.wait_for_timeout(350)
                page.wait_for_function("""() => {const active=document.querySelector('#tabbar .on');const marker=getComputedStyle(document.querySelector('#tabbar'),'::before');return active && marker.backgroundImage.includes(getComputedStyle(active).color) && Math.abs(new DOMMatrix(marker.transform).m41-active.offsetLeft)<1}""", timeout=5000)
                nav = page.evaluate("""() => {const bar=document.querySelector('#tabbar'),active=bar.querySelector('.on'),s=getComputedStyle(bar),a=getComputedStyle(active),i=getComputedStyle(active.querySelector('svg'));return {height:bar.getBoundingClientRect().height,background:s.backgroundColor,color:a.color,font:a.fontSize,iconWidth:i.width,filter:i.filter,icons:[...bar.querySelectorAll('use')].map(e=>e.getAttribute('href'))}}""")
                assert 44 <= nav['height'] <= 50, f'Navigation is not compact: {nav}'
                assert page.evaluate("[...document.querySelectorAll('#tabbar a,#tabbar .tabmore')].every(e=>e.getBoundingClientRect().height>=44)"), 'Navigation targets are too small'
                if reference is None: reference = nav
                assert page.evaluate("[...document.querySelectorAll('#tabbar a > span,#tabbar .tabmore > span')].every(e=>{const a=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return b.left>=a.left-.5&&b.right<=a.right+.5})"), f'Navigation labels overflow at {width}'
                assert nav == reference, f'Navigation changes on {route} at {width}: {nav} / {reference}'
                metrics['navigation'].append({'mode':nav_mode,'width':width,'route':route,**nav})
                header = page.evaluate("""() => {
                    const bar=document.querySelector('.topbar'),inner=bar.querySelector('.topbar-inner');
                    return {height:bar.getBoundingClientRect().height,background:getComputedStyle(bar).backgroundColor,color:getComputedStyle(bar).color,innerHeight:inner.getBoundingClientRect().height,controls:[...bar.querySelectorAll('.topbar-actions > button')].map(e=>{const b=e.getBoundingClientRect(),c=getComputedStyle(e);return {left:b.left,right:b.right,height:b.height,font:c.fontSize,color:c.color,order:c.order}})};
                }""")
                if header_reference is None: header_reference = header
                assert header == header_reference and header['height'] == 44, f'Header changes on {route} at {width}: {header}'
                assert all(c['height'] >= 44 and c['left'] >= 0 and c['right'] <= width for c in header['controls']), header
                assert page.locator('.bottomline').count() == 0, f'Ticker returned on {route}'
                metrics['sharedHeader'].append({'mode':nav_mode,'width':width,'route':route,**header})

                if width == 390 and route in ['home','clubhouse','golf']:
                    page.locator('#tabbar').screenshot(path=str(OUT / f'nav-{route}.png'))
    page.evaluate("window.reviewSetTheme('light')")
    page.evaluate("document.querySelector('#view').dataset.route='home';document.querySelectorAll('#tabbar .on').forEach(e=>e.classList.remove('on'));document.querySelector('#tabbar [data-route=home]').classList.add('on')")
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("document.querySelector('#view').dataset.route='clubhouse'")
    page.locator('#tabbar').evaluate("e=>e.style.paddingBottom='34px'")
    page.wait_for_timeout(300)
    metrics['phoneInset'] = page.evaluate("""() => {const nav=document.querySelector('#tabbar').getBoundingClientRect();return {navHeight:nav.height,measured:parseFloat(document.documentElement.style.getPropertyValue('--season-nav-height')),paddingBottom:parseFloat(getComputedStyle(document.body).paddingBottom),tickerAbsent:!document.querySelector('.bottomline')&&!document.body.classList.contains('has-bottomline')}}""")
    print('Phone inset:', metrics['phoneInset'], flush=True)
    assert metrics['phoneInset']['navHeight'] == metrics['phoneInset']['measured'] and metrics['phoneInset']['paddingBottom'] >= metrics['phoneInset']['navHeight'] + 19 and metrics['phoneInset']['tickerAbsent'], f"Page spacing does not clear phone navigation: {metrics['phoneInset']}"
    page.locator('#tabbar').evaluate("e=>e.style.removeProperty('padding-bottom')")
    page.wait_for_timeout(300)
    page.evaluate("document.querySelector('#view').dataset.route='home'")
    metrics['slides'] = []
    count = page.evaluate('window.reviewDeck.length')
    for width in [320, 390, 768, 1000, 1280]:
        page.set_viewport_size({'width': width, 'height': 844})
        stage_height = None
        gameday_top = None
        for index in range(count):
            page.locator(f'[data-bx-go="{index}"]').focus()
            page.locator(f'[data-bx-go="{index}"]').press('Enter')
            page.wait_for_timeout(650)
            page.wait_for_function("[...document.querySelector('.bx-stage').getAnimations({subtree:true})].every(a=>a.effect.getTiming().iterations===Infinity||a.effect.getComputedTiming().endTime>1500||!['running','pending'].includes(a.playState))", timeout=10000)
            layout = page.evaluate('''() => {
                const stage=document.querySelector('.bx-stage'), slide=stage.querySelector('.bx-slide:not(.bx-leaving)'), box=slide.getBoundingClientRect();
                const elements=[...slide.children,...slide.querySelectorAll('.bx-editorial-copy > *, .bx-champ > *')].filter(e=>getComputedStyle(e).position!=='absolute'&&!['none','contents'].includes(getComputedStyle(e).display));
                const crest=slide.querySelector('.bx-editorial-subject img'), copy=slide.querySelector('.bx-editorial-copy'), subject=slide.querySelector('.bx-editorial-subject'), artwork=subject?.getBoundingClientRect();
                return {width:innerWidth,treatment:window.reviewDeck[Number(stage.querySelector('[aria-current="true"]').dataset.bxGo)].treatment,stageHeight:stage.offsetHeight,gamedayTop:document.querySelector('[data-home-gameday-slot]').getBoundingClientRect().top+scrollY,
                    left:box.left,right:box.right,contentTop:box.top,contentBottom:box.bottom,
                    content:elements.map(e=>({class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,scroll:e.scrollWidth,width:e.clientWidth})),
                    crest:crest ? {complete:crest.complete,natural:crest.naturalWidth,left:artwork.left,right:artwork.right,top:artwork.top,bottom:artwork.bottom,copyBoxes:(getComputedStyle(copy).display==='contents'?[...copy.querySelectorAll('.bx-champ > *')]:[copy]).map(e=>e.getBoundingClientRect().toJSON()),src:crest.getAttribute('src'),artWidth:slide.querySelector('.bx-editorial-illustration').getBoundingClientRect().width,fit:getComputedStyle(crest).objectFit,imageBox:crest.getBoundingClientRect().toJSON(),opacity:Number(getComputedStyle(subject).opacity),hasSplatter:!!slide.querySelector('.bx-editorial-splatter'),stageWidth:stage.clientWidth,stageTop:stage.getBoundingClientRect().top,stageBottom:stage.getBoundingClientRect().bottom} : null,
                    controlsTop:Math.min(...[...stage.querySelectorAll('.bx-controls,.bx-arrow')].map(e=>e.getBoundingClientRect().top)),
                    scroll:document.documentElement.scrollWidth};
            }''')
            if stage_height is None:
                stage_height, gameday_top = layout['stageHeight'], layout['gamedayTop']
            assert layout['stageHeight'] == stage_height and abs(layout['gamedayTop'] - gameday_top) < 1, f'Broadcast rotation moves the page: {layout}'
            assert layout['scroll'] <= width, f'Slide overflow: {layout}'
            assert all(c['left'] >= layout['left'] - 1 and c['right'] <= layout['right'] + 1 and c['top'] >= layout['contentTop'] - 1 and c['bottom'] <= layout['contentBottom'] + 1 and c['scroll'] <= c['width'] + 1 for c in layout['content']), f'Slide does not fit its content area: {layout}'
            if layout['crest']:
                crest = layout['crest']
                assert crest['complete'] and crest['natural'] > 0 and crest['right'] <= layout['right'] + 1 and crest['top'] >= crest['stageTop'] - 1 and crest['bottom'] <= layout['controlsTop'], f'Illustration leaves the stage or runs behind controls: {layout}'
            if layout['crest']:
                art = layout['crest']
                assert art['imageBox']['left']>=art['left']-1 and art['imageBox']['right']<=art['right']+1 and art['fit']=='contain', f'Art image is cropped: {art}'
                assert not art['hasSplatter'] and art['artWidth']/art['stageWidth']>=.45 and art['opacity']>=.9, f'Artwork is too small or faint: {layout}'
                assert all(b['right'] <= art['left'] - 8 or b['bottom'] <= art['top'] or b['top'] >= art['bottom'] for b in art['copyBoxes']), f'Broadcast art overlaps text: {layout}'
            layout['injuryRows'] = check_injury_layout(page)
            metrics['slides'].append(layout)
            if width == 390:
                page.locator('.bx-stage').screenshot(path=str(OUT / f'slide-{index}-{layout["treatment"]}.png'))
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('[data-bx-go="0"]').focus()
    page.locator('[data-bx-go="0"]').press('Enter')
    page.wait_for_timeout(650)
    density_context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3)
    density_page = density_context.new_page()
    density_page.set_content(html, wait_until='domcontentloaded')
    density_page.wait_for_function('!!window.reviewVfx', timeout=15000)
    density_page.locator('.home-live-details').evaluate('e=>e.open=true')
    density_page.evaluate("window.reviewSetTheme('light')")
    density_page.locator('.home-thermal-leaders').scroll_into_view_if_needed()
    density_page.locator('[data-home-live-slot]').evaluate("e=>e.dataset.motion='on'")
    density_page.wait_for_function('document.querySelector("canvas.gd-vfx-canvas")?.dataset.running === "true"', timeout=15000)
    density_page.evaluate('document.fonts.ready')
    density_page.wait_for_timeout(650)
    metrics['phoneDensity'] = density_page.locator('canvas.gd-vfx-canvas').evaluate('(e)=>({pixels:e.width,css:e.clientWidth,ratio:e.width/e.clientWidth})')
    assert metrics['phoneDensity']['ratio'] >= 2.9, 'Score effects are below phone screen resolution'
    # The renderer discards its buffer after compositing. Sample immediately
    # after a real draw, before the browser can clear the default framebuffer.
    metrics['scoreEffects'] = density_page.evaluate("""() => new Promise((resolve,reject)=>{
        const canvas=document.querySelector('canvas.gd-vfx-canvas'),gl=canvas.getContext('webgl'),original=gl.drawArrays;
        const timeout=setTimeout(()=>{gl.drawArrays=original;reject(Error('Score effects did not draw a frame'))},5000);
        gl.drawArrays=function(...args){
            original.apply(this,args);gl.drawArrays=original;
            queueMicrotask(()=>{
                clearTimeout(timeout);
                const pixels=new Uint8Array(canvas.width*canvas.height*4);
                gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
                let visible=0,blue=0,warm=0;
                for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>20){visible++;if(pixels[i+2]>pixels[i]+4)blue++;if(pixels[i]>pixels[i+2]+4)warm++}}
                resolve({visible,blue,warm});
            });
        };
    })""")
    assert metrics['scoreEffects']['visible'] > 30 and metrics['scoreEffects']['blue'] > 30 and metrics['scoreEffects']['warm'] > 30, f'Hot and cold score effects did not render: {metrics["scoreEffects"]}'
    density_page.screenshot(path=str(OUT / 'home-390@3x.png'))
    density_context.close()
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(200)
    metrics['reducedMotion'] = page.locator('canvas.gd-vfx-canvas').evaluate('(e)=>e.dataset.running')
    assert metrics['reducedMotion'] == 'false', 'Reduced motion did not stop score effects'
    assert page.locator('.bx-home-feature').get_attribute('href') == '#/clubhouse'
    page.evaluate("""() => {
        const stage=document.querySelector('[data-bx-stage]');
        window.reviewOpener=stage.querySelector('.bx-home-feature');
        window.reviewStage.update([...window.reviewDeck, {id:'fixture:late',treatment:'announcement',headline:'Late league update',body:'A new edition from the league wire.',temporal:'recent'}]);
    }""")
    page.wait_for_timeout(200)
    assert page.locator('.bx-page-count').text_content() == f'1 of {count + 1}', 'Page count did not update when the deck grew'
    assert page.evaluate("document.querySelector('.bx-home-feature')===window.reviewOpener"), 'Deck refresh replayed the opener'
    metrics['deckRefresh'] = 'passed'
    section_hash = page.evaluate('location.hash')
    for section, selector in [('scores','[data-home-gameday-slot]'), ('week','.home-week-desk'), ('league','.home-league-desk'), ('archive','[data-home-lore-slot]')]:
        page.locator(f'[data-home-jump="{section}"]').click()
        page.wait_for_timeout(800)
        assert page.locator('[data-home-jump][aria-current]').count() == 0, 'Jump buttons must not remain selected'
        assert page.evaluate('location.hash') == section_hash, 'Section navigation changed the app route'
        assert page.locator('.topbar').bounding_box()['height'] + 15 <= page.locator(selector).bounding_box()['y'] < 200, 'Section navigation is obscured by the top bar'
    page.locator('[data-page-detail="home-league"] summary').click()
    assert page.locator('[data-page-detail="home-league"]').evaluate('e=>e.open'), 'League news and activity did not open'
    page.locator('[data-page-detail="home-week"] summary').click()
    assert page.locator('[data-page-detail="home-week"]').evaluate('e=>e.open'), 'Weekly planning did not open'
    page.bring_to_front()
    page.wait_for_function("document.visibilityState==='visible'")
    page.emulate_media(reduced_motion='no-preference')
    page.evaluate("async()=>{const {savePageChoice}=await import('./js/page-disclosure.js');savePageChoice('gameday-motion','on');dispatchEvent(new Event('dfl:route-performance'))}")
    # Real touch events catch implicit pointer-capture handoffs on child text.
    touch = context.new_cdp_session(page)
    def swipe_week(dx, dy=0):
        panel = page.locator('[data-week-panel]:not([hidden])')
        panel.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-150,behavior:"instant"})')
        page.wait_for_timeout(100)
        box = panel.bounding_box()
        x, y = box['x'] + box['width'] * (.8 if dx < 0 else .2), box['y'] + 30
        touch.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
        for step in range(1,6):
            touch.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':x+dx*step/5,'y':y+dy*step/5}]})
            page.wait_for_timeout(20)
        touch.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        page.wait_for_timeout(350)
    page.set_viewport_size({'width':390,'height':844})
    page.locator('[data-week-tab="brief"]').click()
    for panel in ['picks','players','startsit']:
        swipe_week(-120)
        assert page.locator(f'[data-week-tab="{panel}"]').get_attribute('aria-selected') == 'true', f'Touch swipe failed to open {panel}'
        page.wait_for_function('''()=>{const e=document.querySelector('.home-week-tabs'),selected=e?.querySelector('[aria-selected=true]'),marker=e?.querySelector('.dfl-selection-rail');if(!selected||!marker)return false;const tab=selected.getBoundingClientRect(),rail=marker.getBoundingClientRect();return Math.abs(tab.left-rail.left)<1&&Math.abs(tab.width-rail.width)<1}''',timeout=2500)
    swipe_week(-120)
    assert page.locator('[data-week-tab="startsit"]').get_attribute('aria-selected') == 'true', 'Last touch tab should not wrap'
    swipe_week(120)
    assert page.locator('[data-week-tab="players"]').get_attribute('aria-selected') == 'true', 'Reverse touch swipe failed'
    swipe_week(0,-90)
    assert page.locator('[data-week-tab="players"]').get_attribute('aria-selected') == 'true', 'Vertical scrolling changed tabs'
    metrics['weekTouchNavigation'] = 'passed'
    # Exercise the real player-card controller with isolated fast/slow data.
    # Slow data must still connect after the sheet entrance has been released.
    card_model = {'player':{'id':'7564','name':'Ja’Marr Chase','position':'WR','nflTeam':'CIN'},'week':5,'ownerLabel':'The Boys','owner':None,'state':'final','injury':{'tag':'Healthy','availability':'Available','body':''},'points':24.6,'recent':[{'week':5,'points':24.6}],'stats':{'items':[]}}
    context.route('**/js/player-card-data.js', lambda route: route.fulfill(status=200,content_type='text/javascript',body='export async function loadPlayerCard(){await new Promise(r=>setTimeout(r,globalThis.reviewCardDelay));if(globalThis.reviewCardHold)await new Promise(r=>globalThis.reviewCardRelease=r);return '+json.dumps(card_model)+'}'))
    page.evaluate("async()=>{const {mountPlayerCards}=await import('./js/player-card-actions.js');mountPlayerCards();window.reviewPortraitStarts=0;window.reviewOriginalAnimate=Element.prototype.animate;Element.prototype.animate=function(...args){if(this.classList.contains('dfl-connected-portrait'))window.reviewPortraitStarts++;return window.reviewOriginalAnimate.apply(this,args)}}")
    page.locator('[data-week-tab="players"]').click()
    player = page.locator('[data-position-panel]:not([hidden]) [data-player-card]').first
    player.evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-240,behavior:"instant"})')
    stable_sheets=[]
    for delay in [75,900]:
        page.evaluate('delay=>{window.reviewCardDelay=delay;window.reviewCardHold=delay===900;delete window.reviewCardRelease}', delay)
        if delay == 75:
            page.locator('[data-position-panel]:not([hidden]) .dfl-player-portrait').first.click()
        else:
            player.click()
            page.locator('[data-player-card-loading]').wait_for()
            page.wait_for_timeout(250)
            pending=page.locator('.dfl-player-card').bounding_box()
            assert page.locator('[data-player-card-body]').get_attribute('aria-busy')=='true', 'Player loading is not announced'
            assert page.locator('[data-player-card-loading] .gd-thermal-number').count()==0, 'Pending card fabricated a score'
            page.wait_for_function('!!window.reviewCardRelease')
            page.evaluate('window.reviewCardHold=false;window.reviewCardRelease()')
        try:
            frames = page.wait_for_function("()=>{const e=document.querySelector('.dfl-connected-portrait:popover-open'),a=e?.getAnimations()[0];if(!a)return false;a.pause();return a.effect.getKeyframes()}", timeout=10000).json_value()
        except Exception:
            print('Connected detail diagnostic:', {'errors':errors,'state':page.evaluate("()=>({visible:document.visibilityState,motion:document.documentElement.dataset.uiMotion,source:document.querySelector('[data-position-panel]:not([hidden]) .dfl-player-portrait')?.getBoundingClientRect().toJSON(),target:document.querySelector('.player-card-hero .dfl-player-portrait')?.getBoundingClientRect().toJSON(),dialogOpen:document.querySelector('.dfl-player-card')?.open})")}, flush=True)
            raise
        assert 'scale(' in frames[0]['transform'] and frames[0]['transform'] != frames[-1]['transform'], 'Portrait does not travel from the source'
        if delay==900:
            ready=page.locator('.dfl-player-card').bounding_box()
            assert all(abs(pending[k]-ready[k])<1 for k in ['x','y','width','height']), f'Player sheet jumped on completion: {pending} -> {ready}'
            assert page.locator('[data-player-card-body]').get_attribute('aria-busy') is None, 'Ready player card remains busy'
            stable_sheets.append({'pending':pending,'ready':ready})
        page.locator('.dfl-connected-portrait').evaluate('e=>e.getAnimations()[0].play()')
        page.wait_for_timeout(400)
        assert page.locator('.dfl-connected-portrait').count() == 0 and page.locator('.player-card-hero .dfl-player-portrait').evaluate('e=>getComputedStyle(e).visibility==="visible"'), 'Portrait cleanup failed'
        page.keyboard.press('Escape')
        page.wait_for_timeout(250)
        assert player.evaluate('e=>e===document.activeElement'), 'Player dismissal lost focus'
    page.evaluate('window.reviewCardDelay=1200')
    player.click()
    page.locator('[data-player-card-loading]').wait_for()
    page.keyboard.press('Escape')
    page.wait_for_timeout(1400)
    assert page.locator('.dfl-player-card').evaluate('e=>!e.open') and page.locator('.dfl-player-card .player-card-hero').count()==0, 'Late player response replaced a dismissed card'
    assert player.evaluate('e=>e===document.activeElement'), 'Pending card dismissal lost focus'
    page.evaluate('window.reviewCardDelay=75')
    player.click()
    page.wait_for_function("()=>{const a=document.querySelector('.dfl-connected-portrait:popover-open')?.getAnimations()[0];if(!a)return false;a.pause();return true}", timeout=10000)
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)
    assert page.locator('.dfl-connected-portrait').count() == 0 and page.locator('.dfl-player-card').evaluate('e=>!e.open'), 'Dismissal left a traveling portrait'
    starts = page.evaluate('window.reviewPortraitStarts')
    page.evaluate("async()=>{const {savePageChoice}=await import('./js/page-disclosure.js');savePageChoice('gameday-motion','off');dispatchEvent(new Event('dfl:route-performance'))}")
    player.click()
    page.wait_for_timeout(500)
    assert page.evaluate('window.reviewPortraitStarts') == starts and page.locator('.player-card-hero').is_visible(), 'Motion-off player details failed'
    page.keyboard.press('Escape')
    page.wait_for_timeout(220)
    page.evaluate("async()=>{const {savePageChoice}=await import('./js/page-disclosure.js');savePageChoice('gameday-motion','on');dispatchEvent(new Event('dfl:route-performance'))}")
    page.emulate_media(reduced_motion='reduce')
    player.click()
    page.wait_for_timeout(500)
    assert page.evaluate('window.reviewPortraitStarts') == starts and page.locator('.dfl-connected-portrait').count() == 0 and page.locator('.player-card-hero').is_visible(), 'Reduced-motion player details failed'
    page.keyboard.press('Escape')
    page.wait_for_timeout(220)
    page.evaluate("()=>{Element.prototype.animate=window.reviewOriginalAnimate}")
    metrics['connectedPlayerDetails'] = {'fastData':True,'slowData':True,'stableSheets':stable_sheets,'dismissedPending':True,'cancelledTravel':True,'focusReturn':True,'reducedMotion':True}

    metrics['sectionNavigation'] = 'passed'
    metrics['expandedHome'] = []
    for mode in ['light','dark']:
        page.evaluate('mode=>window.reviewSetTheme(mode)', mode)
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':844})
            for panel in ['brief','picks','players','startsit']:
                page.locator(f'[data-week-tab="{panel}"]').click()
                page.wait_for_timeout(300)
                assert page.locator(f'[data-week-panel="{panel}"]').is_visible(), f'Week Ahead tab did not open: {panel}'
                assert page.locator(f'[data-week-tab="{panel}"]').get_attribute('aria-selected') == 'true'
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'Forecast overflows in {mode}/{width}/{panel}'
                if panel == 'startsit':
                    assert page.locator('.home-outlook-swaps article').count() == 2
                    assert page.locator('.home-outlook-swaps').evaluate('e=>[...e.querySelectorAll("strong")].every(n=>getComputedStyle(n).whiteSpace==="normal"&&n.scrollWidth<=n.clientWidth+1)'), 'Start/Sit player names are clipped'
                    assert 'Projected pts' in page.locator('.home-outlook-swaps').inner_text()
                    page.locator('[data-week-tab="startsit"]').focus()
                    page.keyboard.press('ArrowRight')
                    assert page.locator('[data-week-tab="brief"]').get_attribute('aria-selected') == 'true'
                    page.keyboard.press('End')
                    assert page.locator('[data-week-tab="startsit"]').get_attribute('tabindex') == '0'
                    assert page.locator('[data-week-tab="brief"]').get_attribute('tabindex') == '-1'
                    assert page.locator('.home-outlook-startsit').evaluate('e=>[...e.querySelectorAll(".home-outlook-swaps,.home-outlook-alarms,.home-outlook-swaps article,.home-outlook-alarms p")].every(e=>getComputedStyle(e).backgroundColor==="rgba(0, 0, 0, 0)")'), 'Start/Sit rows regained filled boxes'
                    page.screenshot(path=str(OUT / f'startsit-{mode}-{width}.png'))
                contrast = page.evaluate('window.reviewTextContrast()')
                assert not contrast['failures'], f'Unreadable forecast in {mode}/{width}/{panel}: {contrast["failures"]}'
                metrics['expandedHome'].append({'mode':mode,'width':width,'panel':panel})
            page.locator('[data-week-tab="players"]').click()
            for position in ['QB','RB','WR','TE','K','DEF']:
                page.locator(f'[data-position-tab="{position}"]').click()
                assert page.locator(f'[data-position-panel="{position}"]').is_visible(), f'Player position did not open: {position}'
            page.locator('[data-home-rank-toggle]').click()
            assert page.locator('.home-rankings-card .is-rank-collapsed').is_visible()
            page.locator('[data-home-rank-toggle]').click()
            for feed in ['activity','news']:
                page.locator(f'[data-feed-tab="{feed}"]').click()
                page.wait_for_timeout(300)
                assert page.locator(f'[data-feed-panel="{feed}"]').is_visible()
                contrast = page.evaluate('window.reviewTextContrast()')
                assert not contrast['failures'], f'Unreadable feed in {mode}/{width}/{feed}: {contrast["failures"]}'
            page.locator('[data-week-tab="brief"]').click()
    metrics['themes'] = []
    metrics['stickyTopbar'] = []
    for mode in ['light','dark','medicine','medicine-light','fairway','team:KC']:
        page.evaluate('mode=>window.reviewSetTheme(mode)', mode)
        page.locator('.gameday-home-detail').evaluate('e=>e.open=true')
        page.locator('.home-score-tools').evaluate('e=>e.open=true')
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':844})
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
            page.wait_for_timeout(350)
            spacing = page.evaluate("""() => {const top=document.querySelector('.topbar').getBoundingClientRect(),nav=document.querySelector('#tabbar').getBoundingClientRect();const visible=document.querySelector('.home-newspaper-masthead').getBoundingClientRect();return {gap:visible.top-(innerWidth>=900?nav.bottom:top.bottom),expected:16}}""")
            assert spacing['gap'] >= spacing['expected'] - 1, f'Masthead touches fixed controls: {spacing}'
            nav = page.evaluate("""() => {
                const bar=document.querySelector('#tabbar'),link=bar.querySelector('.on'),s=getComputedStyle(link),marker=getComputedStyle(bar,'::before');
                return {height:bar.getBoundingClientRect().height,color:s.color,icon:getComputedStyle(link.querySelector('svg')).color,markerDisplay:marker.display,markerPaint:marker.backgroundImage,markerSize:marker.backgroundSize,markerHeight:parseFloat(marker.height),markerWidth:parseFloat(marker.width),targetWidth:link.offsetWidth,targetHeight:link.offsetHeight,aligned:Math.abs(new DOMMatrix(marker.transform).m41-link.offsetLeft)<1,extraMarker:getComputedStyle(link,'::before').display};
            }""")
            assert 44 <= nav['height'] <= 50 and nav['icon'] == nav['color'], f'Navigation presentation differs in {mode}: {nav}'
            assert nav['markerDisplay'] == 'block' and nav['color'] in nav['markerPaint'] and nav['markerSize'].split(',')[0].strip() == '52% 3px' and nav['markerHeight'] == nav['targetHeight'] and nav['markerHeight'] >= 44 and abs(nav['markerWidth']-nav['targetWidth'])<1 and nav['aligned'] and nav['extraMarker'] == 'none', f'Active navigation indicator is missing or duplicated: {nav}'
            assert page.evaluate("[...document.querySelectorAll('#tabbar a,#tabbar .tabmore')].every(e=>e.getBoundingClientRect().height>=44)"), 'Navigation targets are too small'
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth"), f'Theme overflows at {mode}/{width}'
            page.locator('.home-banter').scroll_into_view_if_needed()
            page.wait_for_timeout(300)
            letters = page.evaluate("""() => {
                const posts=[...document.querySelectorAll('.wall-post')];
                return {columns:getComputedStyle(document.querySelector('.wall-posts')).gridTemplateColumns.split(' ').length,
                    fits:posts.every(post=>{const b=post.getBoundingClientRect(),head=post.querySelector('.wall-head').getBoundingClientRect(),body=post.querySelector('.wall-body').getBoundingClientRect();return head.bottom<=body.top+1 && [...post.querySelectorAll('.wall-head,.identity-byline,.wall-body,.wall-photo,.wall-reaction-buttons')].every(e=>{const c=e.getBoundingClientRect();return c.left>=b.left-1 && c.right<=b.right+1})}),
                    targets:[...document.querySelectorAll('.wall-reaction-buttons button')].every(e=>{const b=e.getBoundingClientRect();return b.width>=44 && b.height>=44})};
            }""")
            assert letters['fits'] and letters['targets'] and letters['columns'] == (1 if width < 768 else 3), f'Letters are cramped in {mode}/{width}: {letters}'
            page.wait_for_function("[...document.querySelectorAll('.home-banter .wall-photo')].every(e=>e.complete && e.naturalWidth>0)")
            photos=page.locator('.home-banter .wall-photo').evaluate_all("es=>es.map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return {ratio:b.width/b.height,natural:e.naturalWidth/e.naturalHeight,fit:s.objectFit,max:s.maxHeight,transform:s.transform}})")
            assert len(photos)==2 and all(abs(p['ratio']-p['natural'])<.01 and p['fit']=='contain' and p['max']=='none' and p['transform']=='none' for p in photos), f'Wall photos are cropped: {mode}/{width}: {photos}'
            assert page.locator('.home-banter .wall-photo-frame').count()==0, 'Home must show the complete upload even if the full Wall has saved framing'
            for value in ['1','12','99+']:
                page.locator('#notification-count').evaluate('(e,value)=>e.textContent=value',value)
                badge=page.locator('#notification-count').evaluate("e=>{const b=e.getBoundingClientRect(),button=e.closest('button').getBoundingClientRect(),bar=e.closest('.topbar').getBoundingClientRect();return {fits:b.top>=bar.top&&b.bottom<=bar.bottom&&b.left>=button.left&&b.right<=button.right,glyphRoom:e.clientHeight>=parseFloat(getComputedStyle(e).lineHeight)}}")
                assert badge['fits'] and badge['glyphRoom'], f'Notification badge clips in {mode}/{width}/{value}: {badge}'

            previews = page.evaluate("""() => ({
                bodies:[...document.querySelectorAll('.home-banter .wall-body:not(.hidden)')].map(e=>({height:e.clientHeight,line:parseFloat(getComputedStyle(e).lineHeight),hasThread:!!e.closest('.wall-post').querySelector('[data-wall-thread] summary')})),
                headingFits:(()=>{const h=document.querySelector('.home-banter .section-title');return h.scrollWidth<=h.clientWidth})(),
                actions:[...document.querySelectorAll('.home-focus-links a')].every(e=>{const b=e.getBoundingClientRect();return b.height>=44 && b.width>=44})
            })""")
            assert previews['headingFits'] and previews['actions'] and all(b['height'] <= 4*b['line']+1 and b['hasThread'] for b in previews['bodies']), f'Home previews or next actions are cramped in {mode}/{width}: {previews}'
            if mode in ['light','dark']:
                page.evaluate("window.scrollTo({top:800,behavior:'instant'})")
                sticky = page.locator('.topbar').evaluate("e=>({top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height,background:getComputedStyle(e).backgroundColor,scroll:scrollY})")
                assert sticky['scroll'] > 500 and abs(sticky['top']) < 1 and sticky['height'] == 44 and sticky['background'] != 'rgba(0, 0, 0, 0)', f'Top bar does not stay visible: {sticky}'
                metrics['stickyTopbar'].append({'mode':mode,'width':width,**sticky})
                page.screenshot(path=str(OUT / f'sticky-{mode}-{width}.png'))
                badge = page.locator('.home-newspaper-date')
                assert badge.locator('time').get_attribute('datetime') == '2026-10-07'
                assert page.locator('.topbar .brand-edition').count() == 0
                assert not page.locator('.topbar .brand-lockup').is_visible()
                assert page.evaluate("[...document.querySelectorAll('.topbar-actions > button')].every(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=document.querySelector('.topbar').getBoundingClientRect().bottom+1})"), 'Status bar content is clipped'
                assert page.locator('.home-newspaper-name h1').inner_text() == 'THE CLUBHOUSE'
                assert page.locator('.home-newspaper-masthead .home-newspaper-seal').count() == 0
                composition = page.evaluate('''() => {
                    const box=s=>document.querySelector(s).getBoundingClientRect(), name=box('.home-newspaper-name h1'), date=box('.home-newspaper-date'), stage=box('.home-broadcast'), desk=box('.home-personal-desk'), focus=box('.home-week-focus'), leaders=box('.home-thermal-leaders');
                    const rows=[...document.querySelectorAll('.gameday-faceoff-team')].map(e=>({portrait:e.querySelector('.gameday-faceoff-mark').getBoundingClientRect().toJSON(),name:e.querySelector('.home-team-name').getBoundingClientRect().toJSON(),fullName:e.querySelector('.home-team-name strong').scrollWidth<=e.querySelector('.home-team-name strong').clientWidth+1&&getComputedStyle(e.querySelector('.home-team-name strong')).whiteSpace==='normal',score:e.querySelector('.home-team-total').getBoundingClientRect().toJSON()}));
                    return {dateAbove:date.bottom<=name.top+1,leadersBelow:leaders.top>=stage.bottom-1,sideBySide:stage.left>=desk.right+18-1,stacked:stage.top>=focus.bottom+16,rows};
                }''')
                assert composition['dateAbove'] and composition['leadersBelow'], f'Masthead/score hierarchy broken: {composition}'
                assert composition['sideBySide'] if width>=1000 else composition['stacked'], f'Score desk grouping broken: {composition}'
                assert all(r['fullName'] for r in composition['rows']), f'Team names must wrap in full: {composition}'
                assert all(r['score']['top']>=max(r['name']['bottom'],r['portrait']['bottom'])-1 and (r['portrait']['right']<=r['name']['left']+1 or r['name']['right']<=r['portrait']['left']+1) for r in composition['rows']), f'Matchup scores overlap team names: {composition}'
                metrics.setdefault('frontPageGrouping',[]).append({'mode':mode,'width':width,**composition})
            checks = []
            # Scroll every region into view: deferred Wall content and CSS
            # transitions are evaluated after the browser actually paints them.
            height = page.evaluate('document.scrollingElement.scrollHeight')
            for top in range(0,height,600):
                page.evaluate("top=>window.scrollTo({top,behavior:'instant'})",top)
                page.wait_for_timeout(300)
                checks.extend(page.evaluate('window.reviewTextContrast()')['checks'])
            page.locator('#more').evaluate("e=>e.classList.remove('hidden')")
            page.wait_for_timeout(300)
            checks.extend(page.evaluate('window.reviewTextContrast()')['checks'])
            page.locator('#more').evaluate("e=>e.classList.add('hidden')")
            failures = [c for c in checks if c['ratio']+.01<c['required']]
            assert not failures, f'Unreadable text in {mode}/{width}: {failures}'
            metrics['themes'].append({'mode':mode,'width':width,'textChecks':len(checks),'minimumContrast':min(c['ratio'] for c in checks),'nav':nav,'letters':letters})
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
            if width in [390,1280]:
                page.screenshot(path=str(OUT / f'theme-{mode.replace(":","-")}-{width}.png'))
                page.locator('#tabbar').screenshot(path=str(OUT / f'nav-{mode.replace(":","-")}-{width}.png'))
                page.evaluate("document.querySelector('#tabbar').style.visibility='hidden'")
                page.screenshot(path=str(OUT / f'theme-{mode.replace(":","-")}-{width}-full.png'),full_page=True)
                page.evaluate("document.querySelector('#tabbar').style.removeProperty('visibility')")
    metrics['emptyWeek'] = page.evaluate("""() => {
      const focus=document.createElement('div'),forecast=document.createElement('div');
      focus.innerHTML=window.reviewEmptyWeek.focus;forecast.innerHTML=window.reviewEmptyWeek.forecast;
      return {focus:focus.textContent,forecast:forecast.textContent,focusLink:focus.querySelector('a')?.getAttribute('href'),forecastLink:forecast.querySelector('a')?.getAttribute('href'),statuses:focus.querySelectorAll('[role=status]').length+forecast.querySelectorAll('[role=status]').length};
    }""")
    assert 'Checking' not in metrics['emptyWeek']['focus'] and 'Building' not in metrics['emptyWeek']['forecast'] and metrics['emptyWeek']['statuses'] == 0, 'Unavailable weekly data must not remain in a loading state'
    assert metrics['emptyWeek']['focusLink'] == metrics['emptyWeek']['forecastLink'] == '#/analyzer', 'Unavailable forecasts need a usable next action'
    metrics['scoreConsistency'] = check_score_consistency(page)
    metrics['pageIdentity'] = []
    metrics['themedSlides'] = []
    for mode in ['light','dark','medicine','medicine-light','fairway','team:KC']:
        page.evaluate('window.reviewSetTheme',mode)
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':900})
            page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
            identity = page.evaluate('''() => {
              const fixture=document.createElement('div');fixture.innerHTML=Object.values(window.reviewHeaderSources).join('');document.querySelector('#view').append(fixture);
              const skin=e=>{const s=getComputedStyle(e),r=getComputedStyle(e,'::before'),seal=getComputedStyle(e,'::after');return {background:s.backgroundImage,border:s.borderColor,radius:s.borderRadius,rail:r.backgroundImage,height:r.height,seal:seal.backgroundImage}};
              const home=skin(document.querySelector('.home-newspaper-masthead')),others=[...fixture.querySelectorAll('.page-identity')].map(skin);fixture.remove();
              return {home,others,tools:[...document.querySelectorAll('.home-tool-card')].map(e=>({href:e.getAttribute('href'),width:e.offsetWidth,height:e.offsetHeight})),divider:getComputedStyle(document.querySelector('.home-league-file h2'),'::after').content};
            }''')
            # Option 2 uses an open masthead. Shared shell, palette and tool
            # routes stay consistent; the other pages retain their identity plate.
            assert identity['home']['background']=='none' and identity['home']['radius']=='0px', identity
            assert identity['others'][0]==identity['others'][1], identity
            assert [t['href'] for t in identity['tools']]==['#/trade','#/sportsbook'] and all(t['width']>=44 and t['height']>=44 for t in identity['tools']), identity
            assert identity['divider']=='none', identity
            metrics['pageIdentity'].append({'mode':mode,'width':width,**identity})
            for index in range(count):
                page.locator(f'[data-bx-go="{index}"]').evaluate('e=>e.click()')
                page.wait_for_timeout(500)
                check=page.evaluate('''() => {
                  const stage=document.querySelector('.bx-stage'),slide=stage.querySelector('.bx-slide:not(.bx-leaving)'),box=slide.getBoundingClientRect();
                  const content=[...slide.children,...slide.querySelectorAll('.bx-editorial-copy > *, .bx-champ > *')].filter(e=>getComputedStyle(e).position!=='absolute'&&!['none','contents'].includes(getComputedStyle(e).display));
                  return {headline:slide.querySelector('h2')?.textContent,displaySizes:[...slide.querySelectorAll('.bx-head,.bx-name,.bx-home-title')].map(e=>parseFloat(getComputedStyle(e).fontSize)),copySizes:[...slide.querySelectorAll('.bx-sub,.bx-body,.bx-when-text')].map(e=>parseFloat(getComputedStyle(e).fontSize)),fit:content.every(e=>{const b=e.getBoundingClientRect();return b.left>=box.left-1&&b.right<=box.right+1&&b.top>=box.top-1&&b.bottom<=box.bottom+1&&e.scrollWidth<=e.clientWidth+1}),overflow:document.documentElement.scrollWidth>innerWidth,contrast:window.reviewTextContrast().failures};
                }''')
                assert check['fit'] and not check['overflow'] and not check['contrast'], f'Themed slide unreadable: {mode}/{width}/{index}: {check}'
                assert all(size>=28 for size in check['displaySizes']) and all(size>=15 for size in check['copySizes']), f'Broadcast text shrunk below its reading scale: {check}'
                if index==0:
                    assert 'Bring the' in check['headline'] and page.locator('.bx-home-headline-art').count()==0, 'Opener text must follow the theme'
                check['injuryRows'] = check_injury_layout(page)
                metrics['themedSlides'].append({'mode':mode,'width':width,'index':index,**check})
                if width==390 and index in [0,2,3]:
                    page.locator('.bx-stage').screenshot(path=str(OUT/f'themed-{mode.replace(":","-")}-slide-{index}.png'))
    page.evaluate("window.reviewSetTheme('light')")
    metrics['momentEffects']=moment_effects
    metrics['matchupLineups']=matchup_lineups
    metrics['clubhouseCenter']=clubhouse_center
    metrics['playerForm']=check_player_form(page)
    metrics['gameDayScope'] = check_game_day_scope(page)
    metrics['matchupInteractions'] = check_matchup_interactions(page)
    metrics['consoleErrors'] = errors
    assert not errors, errors
    (OUT / 'browser-checks.json').write_text(json.dumps(metrics, indent=2))
    browser.close()
    print(json.dumps(metrics))
