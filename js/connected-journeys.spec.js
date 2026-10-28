import {describe,it,expect} from 'vitest';
import {playerJourneyLinks} from './player-journey.js';
import {readJourneyChoice,writeJourneyChoice} from './journey-memory.js';
import {tradeOfferKey,availableTradeOffers,tradeOfferAnchors} from './trade-offer-actions.js';
import {personalPostgame} from './personal-postgame-model.js';
import {personalPostgameMarkup} from './personal-postgame-ui.js';

describe('player paths and history-entry filters',()=>{
 it('uses the card edition and actual roster, safely encoding names',()=>{
  const links=playerJourneyLinks({player:{id:'a/b',name:'A & B'},season:2026,week:7,owner:{id:'2'}});
  expect(links.highlights).toContain('player=a%2Fb&query=A%20%26%20B');expect(links.matchup).toBe('#/clubhouse?season=2026&week=7&tab=matchups&roster=2');
  expect(playerJourneyLinks({player:{id:'x'},season:2026,week:7}).matchup).toBeNull();
 });
 it('restores only Back entries and preserves unrelated history state',()=>{
  const history={state:{dflRouteVisit:{id:'v1'},other:2},replaceState(next){this.state=next}};
  writeJourneyChoice('nfl',{game:'123',filter:'big'},{history});
  expect(readJourneyChoice({closest:()=>null},'nfl',{history})).toBeNull();
  expect(readJourneyChoice({closest:()=>({})},'nfl',{history})).toEqual({game:'123',filter:'big'});
  expect(history.state.other).toBe(2);expect(history.state.dflRouteVisit.id).toBe('v1');
 });
 it('still works when the browser rejects storing choices',()=>{
  expect(()=>writeJourneyChoice('x',{}, {history:{replaceState(){throw Error('restricted')}}})).not.toThrow();
 });
});
describe('working through real trade packages',()=>{
 const offer={other:{id:'2'},sendA:['b','a'],sendB:['c'],tier:'fair'};
 it('does not resurface passed packages after rank, tier or presentation order changes',()=>{
  const key=tradeOfferKey(offer),passed=['1:'+key];
  expect(tradeOfferKey({...offer,sendA:['a','b'],tier:'aggressive'})).toBe(key);
  expect(availableTradeOffers([offer,{...offer,sendB:['d']}],passed,'1')).toHaveLength(1);
  expect(availableTradeOffers([offer],passed,'3')).toEqual([offer]);
 });
 it('keeps different three-way routing distinct',()=>{
  const multi={parties:[{id:1},{id:2},{id:3}],sends:[['a'],['b'],['c']],destinations:{a:'2',b:'3',c:'1'}};
  expect(tradeOfferKey(multi)).toBe(tradeOfferKey({...multi,destinations:{c:'1',b:'3',a:'2'}}));
  expect(tradeOfferKey(multi)).not.toBe(tradeOfferKey({...multi,destinations:{a:'3',b:'1',c:'2'}}));
 });
 it('pins only a player in the chosen side and leaves full valuation to the search',()=>{
  expect(tradeOfferAnchors(offer,'c','receive')).toMatchObject({partnerId:'2',receiveAnchors:['c'],sendAnchors:[],sendCount:'any',receiveCount:'any'});
  expect(tradeOfferAnchors(offer,'a','send').sendAnchors).toEqual(['a']);
  expect(tradeOfferAnchors(offer,'a','receive')).toBeNull();expect(tradeOfferAnchors({...offer,parties:[{},{}]},'c','receive')).toBeNull();
 });
});
describe('a postgame receipt grounded in actual results',()=>{
 const p=(id,position,points,slotType=position)=>({id,name:id,position,points,slotType});
 const model={leagueId:'league',season:2026,week:7,completed:true,games:[{id:'4',sides:[{roster:'1',memberId:12,name:'My squad',score:110,lineup:[p('rb','RB',10),p('wr','WR',22),p('flex','TE',0,'FLEX')],bench:[p('backup-wr','WR',30),p('backup-qb','QB',40)]},{roster:'2',memberId:13,name:'The other guys',score:100,lineup:[],bench:[]}]}]};
 it('waits for a confirmed final and a real member matchup',()=>{
  expect(personalPostgame({...model,completed:false},12)).toBeNull();expect(personalPostgame(model,null)).toBeNull();expect(personalPostgame(model,999)).toBeNull();
  expect(personalPostgame({...model,games:[{...model.games[0],sides:[{...model.games[0].sides[0],score:null},model.games[0].sides[1]]}]},12)).toBeNull();
 });
 it('uses a legal flex replacement, ignores a quarterback with no legal replacement, and retains zero',()=>{
  const r=personalPostgame(model,12);expect(r.mvp.id).toBe('wr');expect(r.regret).toMatchObject({bench:{id:'backup-wr'},starter:{id:'flex',points:0},gain:30});expect(r.result).toBe('You got the win');expect(r.play).toBeNull();expect(r.swing).toBeNull();
 });
 it('does not call an opponents play yours or imply an unsaved turning point',()=>{
  const m={key:'10',matchupId:'4',roster:'2',kind:'touchdown',at:100,recap:{play:{gameId:'123',id:'9'}}};
  expect(personalPostgame(model,12,{moments:[m]}).play).toBeNull();
  expect(personalPostgame(model,12,{moments:[{...m,kind:'lead',recap:{sides:[{},{}]}}]}).swing).toBeNull();
 });
 it('keeps ties and missing player stats honest, and escapes member content',()=>{
  const tied={...model,games:[{id:'4',sides:[{...model.games[0].sides[0],name:'<script>x</script>',score:100,lineup:[p('unknown','WR',null)],bench:[]},model.games[0].sides[1]]}]};
  const r=personalPostgame(tied,12);expect(r.result).toBe('Tied it up');expect(r.mvp).toBeNull();expect(personalPostgameMarkup(r)).toContain('&lt;script&gt;');expect(personalPostgameMarkup(r)).not.toContain('<script>');
 });
 it('links to the exact real play without inventing a video',()=>{
  const m={eventKey:'nfl:123:9:1',matchupId:'4',roster:'1',kind:'touchdown',at:100,recap:{play:{gameId:'123',id:'9'}}};
  const r=personalPostgame(model,12,{moments:[m]});expect(r.video).toBe(false);expect(r.playHref).toContain('tab=nfl&nflGame=123&moment=nfl%3A123%3A9%3A1');
 });
 it('offers a video only when the active clip matches both the NFL game and play',()=>{
  const now=Date.parse('2026-10-28T15:00:00Z'),m={eventKey:'nfl:123:9:1',matchupId:'4',roster:'1',kind:'touchdown',at:100,recap:{play:{gameId:'123',id:'9'}}};
  const clip={id:'555',game_id:'123',play_id:'9',session_date:'2026-10-25',headline:'Player scores a touchdown',kind:'touchdown',thumbnail_url:'https://a.espncdn.com/clip.jpg',source_url:'https://www.espn.com/video/clip/_/id/555',video_url:'https://espnmedia-cdn.akamaized.net/espn/media/clip.mp4',duration:30,published_at:'2026-10-25T20:00:00Z',expires_at:'2026-10-29T11:00:00Z'};
  const check=clip=>personalPostgame(model,12,{moments:[m],clips:[clip],now});
  expect(check(clip)).toMatchObject({video:true});expect(check(clip).playHref).toContain('&tab=highlights&clip=555&moment=');
  expect(check({...clip,game_id:'456'}).video).toBe(false);expect(check({...clip,play_id:'8'}).video).toBe(false);expect(check({...clip,expires_at:'2026-10-28T14:00:00Z'}).video).toBe(false);
 });
});
