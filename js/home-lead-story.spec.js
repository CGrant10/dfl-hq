import {describe,expect,it} from 'vitest';
import {homeLeadStory} from './home-lead-story.js';
import {homeBroadcastDeck} from './home-presentation.js';
import {tradeAlertSlide} from './home-slides.js';
const now=new Date('2026-10-15T20:00:00Z');
const game=(id,a,b,extra={})=>({id,isMine:false,sides:[{uid:'a'+id,name:'North '+id,score:a,live:0},{uid:'b'+id,name:'South '+id,score:b,live:0}],...extra});
const model=(games,extra={})=>({season:2026,week:6,games,...extra});
const trade=(occurredAt)=>({...tradeAlertSlide({occurredAt,href:'#/trade?tx=exact',week:6,packages:[{teamName:'A',players:[{name:'Star',value:80}]},{teamName:'B',players:[{name:'Bench',value:10}]}]}),key:'trade:exact'});
describe('the Home lead follows verified league events',()=>{
 it('leads with the closest live game and opens that exact matchup',()=>{
  const wide=game('1',100,70);wide.sides[0].live=1;
  const close=game('2',90,90.4);close.sides[1].live=1;
  const lead=homeLeadStory({model:model([wide,close]),deck:[trade(now)],now});
  expect(lead.headline).toBe('0.40 apart.');expect(lead.kicker).toBe('LIVE · WEEK 6');expect(lead.href).toContain('matchup=2');expect(lead.body).toContain('still playing');
 });
 it('never turns a forecast or a merely live league flag into a live lead',()=>{
  expect(homeLeadStory({model:model([game('1',130,110)],{live:true}),now})).toBeNull();
 });
 it('keeps a live tie as a tie, without declaring a winner',()=>{
  const g=game('tied',0,0);g.sides[0].live=1;
  expect(homeLeadStory({model:model([g]),now}).headline).toBe('Dead even.');
 });
 it('does not build score headlines from missing points',()=>{
  const g=game('1',null,70);g.sides[1].live=1;
  expect(homeLeadStory({model:model([g]),now})).toBeNull();
 });
 it('keeps a recent trade separate from the shared daily opener and retains its exact receipt link',()=>{
  const t=trade(now);const deck=homeBroadcastDeck([t],{week:6,now});
  expect(deck[0].homeFeature).toBe(true);expect(deck[0].href).toBeNull();expect(deck[1]).toBe(t);
  expect(deck[1].href).toBe('#/trade?tx=exact');expect(deck).toHaveLength(2);expect(homeBroadcastDeck(deck,{now})).toEqual(deck);
 });
 it.each(['2026-10-11T20:00:00Z','2026-10-16T20:00:00Z',null])('does not hype an undated, stale or future trade: %s',at=>{
  expect(homeLeadStory({deck:[trade(at)],now})).toBeNull();
 });
 it('chooses a final nailbiter before a blowout, and uses the scored winner',()=>{
  const lead=homeLeadStory({model:model([game('big',150,60),game('close',99.6,100)],{completed:true}),now});
  expect(lead.headline).toBe('0.40 points.');expect(lead.body).toBe('South close beat North close.');expect(lead.kicker).toContain('FINAL');
 });
 it('only calls a blowout after completion and does not pretend a final tie was a loss',()=>{
  expect(homeLeadStory({model:model([game('1',150,50)],{completed:true}),now}).subtitle).toBe('Fucking buried.');
  expect(homeLeadStory({model:model([game('1',100,100)],{completed:true}),now})).toBeNull();
 });
 it('builds a rivalry from past scored meetings, excluding the selected and future weeks',()=>{
  const g=game('own',0,0,{isMine:true});const rows=[4,5,6,7].map(week=>({season:2026,week,user1:g.sides[0].uid,user2:g.sides[1].uid,score1:120,score2:100}));
  const lead=homeLeadStory({model:model([g]),history:rows,now});
  expect(lead.headline).toBe('2 straight.');expect(lead.body).toContain('North own');expect(lead.href).toContain('matchup=own');
 });
});

it('retains a quiet-day archive once after the independent daily card',()=>{
 const record={id:'record:one',kind:'record',temporal:'historical',headline:'A team scored 190.40 in 2024.',href:'#/history'};
 const deck=homeBroadcastDeck([record],{now});
 expect(deck[0].kicker).toContain('DFL DAILY');expect(deck[1]).toBe(record);expect(deck).toHaveLength(2);
});
it('leaves unusually long archival copy in its full story instead of squeezing it into the hero',()=>{
 expect(homeLeadStory({archive:{id:'long',headline:'A'.repeat(90)},now})).toBeNull();
});
