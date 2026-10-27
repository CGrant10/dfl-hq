import {describe,it,expect} from 'vitest';
import {injuryAvailabilityIndex,playerAvailability,automaticTradePlayer,regularSeasonEnd} from './player-availability.js';
const now=Date.parse('2026-10-27T12:00:00Z');
const row=(over={})=>({status:'Injured Reserve',date:'2026-10-26T12:00:00Z',athlete:{displayName:'Receiver Jr.',position:{abbreviation:'WR'},team:{abbreviation:'JAX'}},details:{returnDate:'2027-02-15'},...over});
const facts=(rows,player={})=>playerAvailability({name:'Receiver',position:'WR',nflTeam:'JAC',injuryStatus:'IR',playerStatus:'Inactive',...player},{index:injuryAvailabilityIndex({injuries:[{injuries:rows}]},{season:2026,now}),season:2026,now});
describe('current-season player availability',()=>{
 it('recognizes returns beyond the regular season and blocks recommendations',()=>{expect(new Date(regularSeasonEnd(2026)).toISOString().slice(0,10)).toBe('2027-01-11');expect(facts([row()])).toMatchObject({outForSeason:true,automaticTradeEligible:false,expectedReturnDate:'2027-02-15',availabilitySource:'ESPN'})});
 it('does not call short-term IR a season-ending injury or assume clearance from an estimated return',()=>{expect(facts([row({details:{returnDate:'2026-11-01'}})])).toMatchObject({outForSeason:false,automaticTradeEligible:false})});
 it('accepts explicit season-ending news but never turns conditional return-window news into a diagnosis',()=>{
  expect(facts([row({details:{},shortComment:'Receiver suffered a season-ending knee injury Sunday.'})]).outForSeason).toBe(true);
  expect(facts([row({details:{},shortComment:'Receiver could have a season-ending injury.'})]).outForSeason).toBe(false);
  expect(facts([row({details:{},shortComment:'Receiver avoided a season-ending injury.'})]).outForSeason).toBe(false);
  expect(facts([row({details:{},shortComment:'This is not a season-ending injury.'})]).outForSeason).toBe(false);
  expect(facts([row({details:{},longComment:'He could miss the rest of the season if not activated by November.'})]).outForSeason).toBe(false);
 });
 it('never transfers another team or position’s injury and ignores old-season news',()=>{
  expect(facts([row({athlete:{displayName:'Receiver',position:{abbreviation:'WR'},team:{abbreviation:'BUF'}}})]).outForSeason).toBe(false);
  expect(facts([row({date:'2025-10-26T12:00:00Z'})]).outForSeason).toBe(false);
 });
 it('lets the latest healthy report replace older IR without inventing a return from a weekly projection',()=>{
  expect(facts([row(),row({status:'Active',date:'2026-10-27T10:00:00Z'})],{injuryStatus:null,playerStatus:'Active'})).toMatchObject({outForSeason:false,automaticTradeEligible:true});
  expect(facts([row()],{injuryStatus:null,playerStatus:'Active'})).toMatchObject({outForSeason:true,automaticTradeEligible:false});
 });
 it('does not carry old injury notes into a healthy player’s current value',()=>{expect(playerAvailability({name:'Healthy',position:'WR',nflTeam:'BUF',injuryStatus:null,playerStatus:'Active',injuryNotes:'A season-ending injury in a previous year.'},{season:2026,now})).toMatchObject({outForSeason:false,automaticTradeEligible:true})});
 it('fails closed for automatic IR targets when the secondary feed is missing, while allowing ordinary questionable players',()=>{
  expect(automaticTradePlayer({injuryStatus:'IR'})).toBe(false);expect(automaticTradePlayer({outForSeason:true})).toBe(false);expect(automaticTradePlayer({injuryStatus:'Questionable',playerStatus:'Active'})).toBe(true);
 });
});
