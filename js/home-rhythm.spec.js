import {describe,it,expect} from 'vitest';
import {homeRhythmPhase} from './home-rhythm.js';
const now=Date.parse('2026-10-28T17:00:00Z');
const upcoming=(date,extra={})=>({model:{season:2026,week:7,completed:true},leagueState:{season:2026,currentWeek:8},openingWeek:8,openingNfl:{payload:{events:[{date,status:{type:{state:'pre'}}}]}},...extra});
describe('Home entry rhythm',()=>{
 it('keeps receipts first early in the next week, then prioritizes decisions within 48 hours of kickoff',()=>{
  expect(homeRhythmPhase(upcoming('2026-10-31T00:15:00Z'),now)).toMatchObject({mode:'aftermath',key:'final',order:['recap','live','plan']});
  expect(homeRhythmPhase(upcoming('2026-10-29T00:15:00Z'),now)).toMatchObject({mode:'pregame',key:'pregame'});
 });
 it('uses actual NFL game states through breaks and settlement, with no weekday guess',()=>{
  for(const state of ['live','final'])expect(homeRhythmPhase({model:{season:2026,week:8,events:[{state,kickoff:now-3600000}]}},now).mode).toBe('live');
  expect(homeRhythmPhase({model:{season:2026,week:8,completed:true}},now).mode).toBe('aftermath');
  expect(homeRhythmPhase({},now).mode).toBe('unknown');
 });
 it('never uses the old final week as aftermath once the new NFL slate starts',()=>{
  const edition=upcoming('2026-10-28T16:00:00Z');edition.openingNfl.payload.events[0].status.type.state='in';
  expect(homeRhythmPhase(edition,now)).toMatchObject({mode:'live',week:8});
 });
});
