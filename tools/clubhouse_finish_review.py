"""Long-lineup and live-refresh checks inside the actual Clubhouse surface."""
def review_clubhouse_finish(page,check,out,tag,width,mode):
 page.evaluate('''async()=>{
  const {matchupLineupHtml}=await import('/js/game-day-lineup-comparison.js');
  const {patchGameDay}=await import('/js/game-day-dom.js');
  const {animateScoreChanges}=await import('/js/game-day-score-motion.js');
  const slots=['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'];
  const names=[['Patrick Mahomes','Christian McCaffrey','Kenneth Walker III','Amon-Ra St. Brown','Marvin Harrison Jr.','Chigoziem Okonkwo','Brian Thomas Jr.','Cameron Dicker','San Francisco 49ers'],['Josh Allen','Bijan Robinson','De’Von Achane','Jaxon Smith-Njigba','Justin Jefferson','T.J. Hockenson','Wan’Dale Robinson','Brandon Aubrey','New England Patriots']];
  f.finish={host:document.querySelector('[data-clubhouse-lineup="1"]'),patchGameDay,matchupLineupHtml,animateScoreChanges};
  f.finish.game={id:'1',sides:names.map((team,i)=>({roster:i+1,name:f.members[i].team_name,score:101+i,bench:[],lineup:team.map((name,j)=>({id:String(i*20+j+1),roster:i+1,name,slot:slots[j],slotType:slots[j],slotIndex:j,position:slots[j]==='FLEX'?'WR':slots[j],nflTeam:i?'BUF':'NO',points:j===3?null:22-j,state:j===3?'upcoming':j===6?'unknown':'live',kickoff:j===3?'2026-10-29T20:00:00Z':null,injuryStatus:!i&&j===4?'Questionable':''}))}))};
  f.finish.lines=new Map(f.finish.game.sides.flatMap(t=>t.lineup.map(p=>[`${p.roster}:${p.id}`,p.position==='QB'?'18/24 · 246 pass yd · 2 pass TD':'5 rec · 72 yd · 1 TD'])));
  f.finish.paint=()=>patchGameDay(f.finish.host,matchupLineupHtml(f.finish.game,{statLines:f.finish.lines,headerControls:true,targetsAfter:true}));
  f.finish.paint();
  f.finish.rows=[...f.finish.host.querySelectorAll('.gd-compare-row')];
  f.finish.rows[1].querySelectorAll('.gameday-player-score').forEach(e=>{const b=document.createElement('span');b.className='nfl-red-badge';b.textContent='RED ZONE';e.append(b)});
 }''')
 page.evaluate('document.fonts.ready');page.wait_for_timeout(200)
 rows=page.locator('[data-clubhouse-lineup="1"] .gd-compare-row')
 check(tag+' all nine submitted slots stay in order',rows.count()==9 and rows.evaluate_all("es=>es.map(e=>e.dataset.compareSlot.split(':')[0]).join(',')==='QB,RB,RB,WR,WR,TE,FLEX,K,DEF'"))
 check(tag+' opposite actual scores share a baseline through long names and injuries',rows.evaluate_all('''es=>es.every(e=>{const b=[...e.querySelectorAll('.gd-thermal-value')].map(n=>n.getBoundingClientRect());return b.length===2&&Math.abs(b[0].top-b[1].top)<1})'''))
 check(tag+' full names, phases and actual scores fit their own half',rows.evaluate_all('''es=>es.every(e=>[...e.querySelectorAll('.gd-compare-player')].every(p=>{const r=p.getBoundingClientRect();return [...p.querySelectorAll('.dfl-player-copy strong,.gameday-player-score>b,.gameday-player-score>small')].every(n=>{const b=n.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&(n.scrollWidth<=n.clientWidth+1||n.matches('.dfl-player-copy strong')&&getComputedStyle(n).whiteSpace==='nowrap'&&n.title===n.textContent)})}))'''))
 check(tag+' player taps retain 44px targets',rows.locator('.gameday-player-tap').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44)'))
 check(tag+' red-zone labels have their own track clear of actual scores',rows.locator('.nfl-red-badge').evaluate_all('''es=>es.length===2&&es.every(e=>{const r=e.getBoundingClientRect(),b=e.parentElement.querySelector('b').getBoundingClientRect();return r.top>=b.bottom-1})'''))
 check(tag+' missing totals remain a dash rather than a fabricated zero',rows.nth(3).locator('.gd-thermal-value').all_text_contents()==['—','—'])
 page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/f'{width}-{mode}-full-lineup-entry.png'))
 page.locator('[data-clubhouse-lineup="1"]').screenshot(path=str(out/f'{width}-{mode}-full-lineup.png'))
 for size in [20,32]:
  page.evaluate('size=>document.documentElement.style.fontSize=size+"px"',size)
  check(tag+f' full lineup fits at {size}px text',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and rows.evaluate_all('''es=>es.every(e=>[...e.querySelectorAll('.gd-compare-player')].every(n=>n.scrollWidth<=n.clientWidth+1))'''))
 page.evaluate('document.documentElement.style.fontSize="16px"')
 # Exercise the real fixed header without rebuilding its identity or score nodes.
 page.evaluate('''async()=>{const {mountPageScrollMotion}=await import('/js/page-scroll-motion.js');f.stopScroll=mountPageScrollMotion(document.querySelector('#view'));f.finish.rows[2].scrollIntoView({block:'start',behavior:'instant'})}''')
 page.wait_for_function('document.querySelector(".dfl-scroll-context.is-matchup")?.hidden===false')
 page.evaluate('f.finish.dockNodes=[...document.querySelectorAll(".dfl-scroll-scores span,.dfl-scroll-scores small,.dfl-scroll-scores b")];document.querySelector("[data-clubhouse-matchup=\\"1\\"] .clubhouse-strip-team b").textContent="107.40"')
 page.wait_for_function('document.querySelector(".dfl-scroll-scores b")?.textContent==="107.40"')
 check(tag+' live compact totals patch the same mounted nodes',page.evaluate('f.finish.dockNodes.every((n,i)=>n===[...document.querySelectorAll(".dfl-scroll-scores span,.dfl-scroll-scores small,.dfl-scroll-scores b")][i])'))
 check(tag+' compact header keeps one-line labels and accessible full names',page.locator('.dfl-scroll-context').evaluate('''e=>{const b=e.getBoundingClientRect();return b.width<=innerWidth&&b.height<=90&&e.scrollWidth<=e.clientWidth&&[...e.querySelectorAll('.dfl-scroll-scores small')].every(n=>getComputedStyle(n).whiteSpace==='nowrap'&&e.getAttribute('aria-label').includes(n.textContent))}'''))
 page.locator('.dfl-scroll-context').screenshot(path=str(out/f'{width}-{mode}-live-reference.png'))
 page.evaluate('f.stopScroll();f.finish.rows[0].scrollIntoView({block:"center",behavior:"instant"})')
 for motion in ['on','off','reduce']:
  page.emulate_media(reduced_motion='reduce' if motion=='reduce' else 'no-preference')
  page.evaluate('''motion=>{
   document.documentElement.dataset.uiMotion=motion==='off'?'off':'on';
   const f=window.f.finish;f.stopScore?.();const before=Object.fromEntries(f.game.sides.flatMap(t=>t.lineup.map(p=>[`${p.roster}:${p.id}`,p.points])));
   f.game.sides[0].lineup[0].points+=6.4;f.game.sides[1].lineup[0].points-=.2;f.paint();
   f.identity=f.rows[0].querySelector('.gameday-player-tap');f.bounds=f.rows.map(n=>n.getBoundingClientRect().height);
   f.stopScore=f.animateScoreChanges(f.host,{previous:{points:before,totals:{}},model:{games:[],snapshot:{points:Object.fromEntries(f.game.sides.flatMap(t=>t.lineup.map(p=>[`${p.roster}:${p.id}`,p.points]))),totals:{}}},motion:motion!=='off',feedback:true});
  }''',motion)
  check(tag+f' {motion} update preserves row heights and player identity',page.evaluate('f.finish.bounds.every((h,i)=>Math.abs(h-f.finish.rows[i].getBoundingClientRect().height)<1)&&f.finish.identity===f.finish.rows[0].querySelector(".gameday-player-tap")'))
  check(tag+f' {motion} gains and corrections replace phase ink cleanly',page.locator('[data-clubhouse-lineup="1"] .gd-score-delta').evaluate_all('''es=>es.length===2&&es.some(e=>e.textContent==='+6.40')&&es.some(e=>e.textContent==='−0.20')&&es.every(e=>getComputedStyle(e).visibility==='visible'&&getComputedStyle(e.parentElement).visibility==='hidden')'''))
  if motion!='on':check(tag+f' {motion} disables decorative digit rolls',page.locator('.gd-score-roll').count()==0)
  page.evaluate('f.finish.stopScore()')
  check(tag+f' {motion} cancelling removes transient score layers',page.locator('.gd-score-delta,.gd-score-roll,[data-score-rolling],.gd-score-updated').count()==0)
 page.emulate_media(reduced_motion='no-preference')
 page.evaluate('document.documentElement.dataset.uiMotion="on"')
