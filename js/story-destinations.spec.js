import {it,expect} from 'vitest';
import {matchupStoryHref,historyMomentHref,historyMomentKey,requestedMatchup} from './story-destinations.js';
it('routes historical matchups by the shown week and owner without inventing an ID',()=>{
 const hash=matchupStoryHref({season:2026,week:7,owner:'a & b'}),p=new URLSearchParams(hash.split('?')[1]);
 expect(p.get('week')).toBe('7');expect(p.get('owner')).toBe('a & b');expect(p.has('matchup')).toBe(false);
 const games=[{id:'1',sides:[{uid:'someone'}]},{id:'2',sides:[{uid:'a & b'}]}];
 expect(requestedMatchup(games,p)).toBe('2');
 expect(requestedMatchup(games,new URLSearchParams('matchup=1&owner=a+%26+b'))).toBe('1');
});
it('preserves exact player, matchup and story identities across URL encoding',()=>{
 const href=matchupStoryHref({season:2026,week:8,matchup:'6',player:'123'});
 expect(new URLSearchParams(href.split('?')[1]).get('player')).toBe('123');
 const story={kind:'high',headline:'A & B scored 200',detail:'Week 7, 2025',figure:200};
 expect(new URLSearchParams(historyMomentHref(story).split('?')[1]).get('moment')).toBe(historyMomentKey(story));
 expect(historyMomentKey({...story,detail:'Week 8, 2025'})).not.toBe(historyMomentKey(story));
});
