import {it,expect} from 'vitest';
import {matchupStory} from './matchup-story.js';
import {momentRecapFrames,momentRecapFrame} from './moment-recap.js';
import {matchupReceiptData} from './game-day-matchup-share.js';
const sides=[{roster:'1',name:'Winner',score:110,starters:[{id:'1',name:'Winner starter',points:24}]},{roster:'2',name:'Loser',score:100,starters:[{id:'2',name:'Losing team MVP',points:30}],bench:[{points:50}]}];
const game={id:'7',isMine:true,sides},model={completed:true,leagueId:'league',season:2026,week:7,games:[game]};
const lead=(patch={})=>({key:'3',kind:'lead',matchupId:'7',roster:'1',at:10000,text:'Winner moves ahead · 99.00 – 98.00',recap:{sides:[{points:99},{points:98}]},...patch});
it('waits for the completed slate and valid final scores',()=>{
 expect(matchupStory({...model,completed:false},game)).toBeNull();expect(matchupStory(model,{...game,sides:[{...sides[0],score:null},sides[1]]})).toBeNull();
});
it('uses the top scorer from both actual lineups, excluding bench points',()=>{
 expect(matchupStory(model,game).mvp).toMatchObject({name:'Losing team MVP',points:30,owner:'Loser'});
});
it('includes only the last saved lead change when it agrees with the final winner',()=>{
 expect(matchupStory(model,game,[lead(),lead({key:'2',at:9000,roster:'2'})]).turningPoint.key).toBe('3');
 expect(matchupStory(model,game,[lead(),lead({key:'4',at:11000,roster:'2'})]).turningPoint).toBeNull();
 expect(matchupStory(model,game,[lead({matchupId:'other'})]).turningPoint).toBeNull();
 const tie={...game,sides:game.sides.map(s=>({...s,score:100}))};expect(matchupStory(model,tie,[lead()]).turningPoint).toBeNull();
});
it('finishes a recap with real final scores, an MVP and bounded result banter',()=>{
 const finish=matchupStory(model,game,[lead()]),frames=momentRecapFrames([],'7',{finish});expect(frames).toHaveLength(1);const html=momentRecapFrame(frames[0]);expect(html).toContain('110.00');expect(html).toContain('100.00');expect(html).toContain('30.00 pts');expect(html).toContain('Last saved lead change');expect(html).not.toContain('touchdown');
});
it('adds the saved turning point to the existing final share card data',()=>{
 const data=matchupReceiptData(model,{gameId:'7',moments:[lead()]});expect(data.turningPoint.key).toBe('3');expect(data.banter).toBe(matchupStory(model,game).roast);expect(data.mvp.points).toBe(30);
});
