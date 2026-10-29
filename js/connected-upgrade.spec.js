import {describe,it,expect} from 'vitest';
import {viewingMatchup,matchupContextMarkup,setViewingMatchup,viewingMatchupFrom} from './matchup-view-context.js';
import {tradeRouteTarget,routingBoardMarkup} from './trade-routing-board.js';
import {momentChirp} from './matchup-banter.js';
const sides=[{roster:'1',name:'A & B',score:0},{roster:'2',name:'Bayou',score:7.08}];
const model={season:2026,week:7,live:true},game={id:'6',sides};
describe('Fantasy viewing context',()=>{
 it('preserves real zero/decimal scores independently of the NFL replay',()=>{const c=viewingMatchup(model,game);expect(c.sides[0].score).toBe(0);expect(matchupContextMarkup(c)).toContain('7.08');expect(matchupContextMarkup(c)).toContain('A &amp; B');sides[0].score=3;expect(c.sides[0].score).toBe(0);sides[0].score=0});
 it('omits unknown scores and invalid weeks instead of displaying zero',()=>{for(const value of [null,undefined,'',NaN])expect(viewingMatchup(model,{...game,sides:[{...sides[0],score:value},sides[1]]})).toBeNull();expect(viewingMatchup({...model,week:19},game)).toBeNull()});
 it('inherits through its actual source and is cleared for unrelated openings',()=>{const parent={},child={parentElement:parent},c=viewingMatchup(model,game);setViewingMatchup(parent,c);expect(viewingMatchupFrom(child)).toBe(c);setViewingMatchup(parent,null);expect(viewingMatchupFrom(child)).toBeNull()});
});
const parties=[{id:'1',team_name:'Alpha',playerIds:['a']},{id:'2',team_name:'Beta',playerIds:['b']},{id:'3',team_name:'Gamma',playerIds:['c']}],sends=parties.map(p=>new Set(p.playerIds)),pool=new Map(['a','b','c'].map(id=>[id,{id,name:id,position:'WR'}]));
describe('Trade receiving board',()=>{
 it('permits recipient changes while keeping ownership fixed',()=>{expect(tradeRouteTarget(parties,sends,'a','3')).toBe('3');for(const to of ['1','missing',null])expect(tradeRouteTarget(parties,sends,'a',to)).toBeNull();expect(tradeRouteTarget(parties,sends,'missing','2')).toBeNull()});
 it('rejects duplicate selection and mismatched ownership',()=>{expect(tradeRouteTarget([{...parties[0]}, {...parties[1],playerIds:['a']},parties[2]],[new Set(['a']),new Set(['a']),sends[2]],'a','3')).toBeNull();expect(tradeRouteTarget(parties,[new Set(),new Set(['a']),sends[2]],'a','3')).toBeNull()});
 it('shows all actual routes and unassigned players without a misleading verdict',()=>{const html=routingBoardMarkup(parties,{sends,destinations:{a:'2',b:'3'}},pool,'c');expect(html).toContain('Choose a destination');expect(html).toContain('From Alpha');expect(html).toContain('Choose recipient for c');expect(html).toContain('data-td-route-to="3" disabled');});
});
describe('Short banter follows verified moments',()=>{
 it('stays silent for an ordinary checkpoint or a malformed lead',()=>{expect(momentChirp({kind:'score'},game,model)).toBeNull();expect(momentChirp({kind:'lead',recap:{sides:[{points:0,leading:true},{points:7}]}},game,model)).toBeNull()});
 it('does not turn yards or a score sync into fantasy touchdown points',()=>{const e={kind:'touchdown',key:'one',player:{name:'Chase'},recap:{play:{kind:'touchdown',yards:42}},team:{team_name:'Alpha'}};const line=momentChirp(e,game,model);expect(line).toContain('Chase');expect(line).not.toMatch(/6 points|42 points|winner|won/);expect(momentChirp(e,game,model)).toBe(line);expect(momentChirp({...e,recap:null},game,model)).toBeNull()});
 it('calls a lead temporary, never a final win',()=>{const e={kind:'lead',key:'lead:7',recap:{sides:[{team_name:'Alpha',points:10,leading:true},{team_name:'Beta',points:7}]}};expect(momentChirp(e,game,model)).toMatch(/Alpha|Beta/);expect(momentChirp(e,game,model)).not.toMatch(/won|winner|beat/)});
});
