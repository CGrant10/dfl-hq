import {describe,it,expect} from 'vitest';
import {waiverMarketHtml,waiverOfferIntelHtml,waiverDropsHtml} from './waiver-intelligence-ui.js';
describe('compact waiver context',()=>{
 it('labels observed position counts, partial history and the current waiver order',()=>{
  const html=waiverMarketHtml({intelligence:{state:'partial',pickups:12,weeks:4,myPriority:3,positionDemand:[{position:'RB',count:8}]}});
  expect(html).toContain('PARTIAL HISTORY');expect(html).toContain('12 adds');expect(html).toContain('#3');expect(html).toContain('RB <strong>8');
 });
 it('keeps potential fits expandable, current names escaped and private claims unasserted',()=>{
  const html=waiverOfferIntelHtml({player:{id:'one',position:'RB'},intel:{pickups:3,otherTeams:[{name:'<img src=x onerror=bad()>',gain:2.5,ahead:true}]}});
  expect(html).toContain('<details');expect(html).not.toContain('<details open');expect(html).toContain('Fits 1 other team');expect(html).not.toContain('<img');expect(html).toContain('Claims are private');
 });
 it('escapes drop attribution and only renders a watchlist when useful drops exist',()=>{
  expect(waiverDropsHtml({recentDrops:[]})).toBe('');const html=waiverDropsHtml({recentDrops:[{player:{name:'<script>bad</script>',position:'RB'},teamName:'A & B',gain:2,targetWeek:7}]});
  expect(html).not.toContain('<script>');expect(html).toContain('A &amp; B');expect(html).toContain('W7');
 });
});
