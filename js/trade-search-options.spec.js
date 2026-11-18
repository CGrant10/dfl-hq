import {describe,it,expect} from 'vitest';
import {applyTradeOptions,tradeOptionsChips,tradeOptionsMarkup} from './trade-search-options.js';
import {resetTradeSearch} from './trade-draft.js';
const team={playerIds:['rb','qb','wr']},pool=new Map([['rb',{id:'rb',name:'Running Back',position:'RB'}],['qb',{id:'qb',name:'Quarterback',position:'QB'}],['wr',{id:'wr',name:'Wide Receiver',position:'WR'}]]);
const shop=()=>({memberIds:[],receivePositions:['QB','RB','WR','TE'],sendAnchors:['rb'],receiveAnchors:['qb'],excludedSendIds:[],goal:'best',horizon:'season',sendCount:'any',receiveCount:'any',maxPlayers:8});
describe('one staged trade-options commit',()=>{
 it('invalidates pending schedule work when resetting the search to the whole league',()=>{
  const state={...shop(),horizon:'next4',scheduleRequest:4,scheduleLoading:true,scheduleError:true};resetTradeSearch(state);
  expect(state).toMatchObject({scheduleRequest:5,scheduleLoading:false,scheduleError:false,horizon:'season',partnerId:'all'});
 });
 it('reconciles both sides, anchors and owned exclusions in one update',()=>{
  const state=shop();applyTradeOptions(state,{...state,receivePositions:['RB','WR'],excludedSendIds:['rb','not-owned'],goal:'QB'},{team,pool});
  expect(state.receivePositions).toEqual(['RB','WR']);expect(state.sendAnchors).toEqual([]);expect(state.receiveAnchors).toEqual([]);expect(state.excludedSendIds).toEqual(['rb']);expect(state.goal).toBe('best');
 });
 it('keeps required package capacity, routes and legal count combinations',()=>{
  const state={...shop(),sendAnchors:['rb','wr'],receiveAnchors:['qb'],memberIds:['third']};
  applyTradeOptions(state,{...state,maxPlayers:2,sendCount:3,receiveCount:3},{team,pool});
  expect(state.maxPlayers).toBe(4);expect(state.sendCount).toBe('any');expect(state.receiveCount).toBe('any');expect(state.memberIds).toEqual(['third']);
 });
 it('shows removable active options without manufacturing a restriction for defaults',()=>{
  const state=shop();expect(tradeOptionsChips(state,pool)).toEqual([]);
  applyTradeOptions(state,{...state,excludedSendIds:['wr'],receivePositions:['RB','WR'],maxPlayers:4,horizon:'next4'},{team,pool});
  const html=tradeOptionsMarkup(state,pool);expect(html).toContain('data-tb-options');expect(html).toContain('data-tb-remove-filter="protect:wr"');expect(html).toContain('Keep Wide Receiver');expect(html).toContain('Up to 4 players');expect(html).toContain('RB + WR');
 });
 it('does not accept forged goals, horizons, sizes or package counts',()=>{
  const state=shop();applyTradeOptions(state,{receivePositions:[],excludedSendIds:['other'],maxPlayers:999,sendCount:'oops',receiveCount:'-3',goal:'invented',horizon:'never'},{team,pool});
  expect(state).toMatchObject({maxPlayers:8,goal:'best',horizon:'season',receivePositions:[],excludedSendIds:[],sendCount:'any',receiveCount:'any'});
 });
});
