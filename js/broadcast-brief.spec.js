import {describe,it,expect} from 'vitest';
import {renderBroadcastBrief} from './broadcast-brief.js';
describe('wide broadcast previews',()=>{
 it('retains golf scores and the confirmed live/final state in the compact view',()=>{
  const html=renderBroadcastBrief({kind:'golf',treatment:'scoreboard',temporal:'live',headline:'DFL Golf',kicker:'League outing',sides:[{name:'North',score:4},{name:'South',score:0}],href:'#/golf'});
  expect(html).toContain('<b>4</b>');expect(html).toContain('<b>0</b>');expect(html).toContain('· live');expect(html).toContain('Open golf day');
 });
 it('retains the complete award name and house art while removing repeated filler copy',()=>{
  const html=renderBroadcastBrief({treatment:'champion',headline:'The Bastards of the Very Long Championship Team Name',image:'https://example.invalid/member-avatar.jpg',subtitle:'A long repeated description'});
  expect(html).toContain('The Bastards of the Very Long Championship Team Name');expect(html).toContain('assets/dfl-daily-champion.webp');expect(html).not.toContain('member-avatar');expect(html).not.toContain('A long repeated description');expect(html).not.toContain('Talk your shit');
 });
 it('keeps all three trade routes and player names accessible behind compact lead-player previews',()=>{
  const html=renderBroadcastBrief({kind:'trade',href:'#/trade?tx=exact',tradeStory:{packages:[{teamName:'Bayou & Co',players:[{id:'1',name:'Amon-Ra St. Brown'},{id:'2',name:'Travis Kelce'}]},{teamName:'Klutch',players:[{id:'3',name:'Derrick Henry'}]},{teamName:'Mayhem',players:[{id:'4',name:'Mike Evans'}]}]}});
  expect(html).toContain('href="#/trade?tx=exact"');expect(html.match(/class="bx-brief-package"/g)).toHaveLength(3);expect(html).toContain('Bayou &amp; Co sends Amon-Ra St. Brown, Travis Kelce');expect(html).toContain('Klutch sends Derrick Henry');expect(html).toContain('Mayhem sends Mike Evans');expect(html).toContain('<span>+1</span>');
 });
 it('shows the exact two scores once rather than repeating the winner figure',()=>{
  const html=renderBroadcastBrief({kind:'league-story',headline:'Keep the receipt.',figure:'131.22',sides:[{name:'North',score:'131.22'},{name:'South',score:'0.00'}]});
  expect(html.match(/131\.22/g)).toHaveLength(1);expect(html).toContain('<b>0.00</b>');expect(html).toContain('North');expect(html).toContain('South');
 });
 it('gives an archive metric a distinct heading rather than repeating its figure',()=>{
  const html=renderBroadcastBrief({kind:'record',storyKind:'blowout',headline:'108.38-point beating',figure:108.38,subtitle:'North 202.76 – 94.38 South',href:'#/history?season=2025'});
  expect(html.match(/108\.38/g)).toHaveLength(1);expect(html).toContain('Biggest beating');expect(html).toContain('North 202.76 – 94.38 South');expect(html).toContain('href="#/history?season=2025"');
 });
 it('labels only a known final football margin, including a real zero score',()=>{
  const item={kind:'league-story',temporal:'final',sides:[{name:'North',score:'0.26',up:true},{name:'South',score:'0.00'}],href:'#/clubhouse?week=7'};
  expect(renderBroadcastBrief(item)).toContain('<b>0.26</b> pt margin');
  for(const temporal of ['live','upcoming'])expect(renderBroadcastBrief({...item,temporal})).not.toContain('pt margin');
  for(const score of [null,undefined,'',NaN])expect(renderBroadcastBrief({...item,sides:[item.sides[0],{name:'South',score}]})).not.toContain('pt margin');
  expect(renderBroadcastBrief({...item,kind:'golf'})).not.toContain('pt margin');
 });
 it('keeps the sourced transaction balance and label beside the exact receipt action',()=>{
  const item={kind:'trade',figure:'78%',href:'#/trade?tx=exact',tradeStory:{balanceLabel:'group balance',packages:[{teamName:'North',players:[]},{teamName:'South',players:[]},{teamName:'West',players:[]}]}};
  const html=renderBroadcastBrief(item);
  expect(html).toContain('<b>78%</b> group balance');expect(html).toContain('href="#/trade?tx=exact"');
  expect(renderBroadcastBrief({...item,figure:null})).not.toContain('group balance');
 });
 it('uses the actual rivalry headline and accessible series rather than a generic heading',()=>{
  const html=renderBroadcastBrief({storyKind:'rivalry',headline:'The rematch',storyNames:['North','South'],storySeries:'7–5',href:'#/history'});
  expect(html).toContain('The rematch');expect(html).not.toContain('The rivalry');expect(html).toContain('aria-label="Series 7–5"');
 });
 it('makes a larger trade explicit and preserves every route in its accessible summary',()=>{
  const packages=['North','South','East','West'].map(teamName=>({teamName,players:[{name:teamName+' player'}]}));
  const html=renderBroadcastBrief({kind:'trade',tradeStory:{packages},href:'#/trade?tx=four'});
  expect(html).toContain('4-team trade');expect(html).toContain('West sends West player');expect(html.match(/class="bx-brief-package"/g)).toHaveLength(3);
 });

});
