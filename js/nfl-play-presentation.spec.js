import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {nflPlayNameIndex,nflPlayPresentation} from './nfl-play-presentation.js';
import {nflCenterPlays} from './nfl-game-center-model.js';
const summary=JSON.parse(readFileSync(new URL('../tools/fixtures/nfl-game-center-summary.json',import.meta.url),'utf8'));
it('turns a real long play into full player names and a clear outcome',()=>{
 const play=nflCenterPlays(summary).find(p=>p.id==='401873011981');
 expect(nflPlayPresentation(play,nflPlayNameIndex(summary))).toEqual({headline:'Tyler Shough → Barion Brown',label:'Big play',result:'49 yd catch',kind:'big-play'});
});
it('highlights official touchdowns and keeps full descriptions separate',()=>{const play=nflCenterPlays(summary).find(p=>p.id==='4018730111821');const view=nflPlayPresentation(play,nflPlayNameIndex(summary));expect(view).toMatchObject({headline:'Tyler Shough → Devaughn Vele',label:'Touchdown',kind:'touchdown'});expect(play.text).toContain('pass from Tyler Shough')});
it('never turns routine kickoffs, overturned plays or point changes into big plays',()=>{
 const kick=nflCenterPlays(summary).find(p=>p.typeId==='53');expect(kick.big).toBe(false);expect(nflPlayPresentation(kick).kind).toBe('play');
 expect(nflPlayPresentation({typeId:'67',score:true,voided:true,text:'No play',yards:40,big:true})).toMatchObject({label:'No play',kind:'play'});
});
it('does not guess between two official players with the same abbreviation',()=>{
 const data={boxscore:{players:[{statistics:[{athletes:[{athlete:{displayName:'DJ Moore'}},{athlete:{displayName:'David Moore'}}]}]}]}};
 expect(nflPlayPresentation({text:'D.Moore for 30 yards',typeId:'24',typeLabel:'Catch',yards:30,big:true},nflPlayNameIndex(data)).headline).toBe('Big play');
});
it('keeps a zero-yard touchdown distinct from an ordinary no-gain play',()=>{expect(nflPlayPresentation({typeId:'67',score:true,yards:0,text:'Touchdown'}).result).toBe('0 yd TD pass');expect(nflPlayPresentation({typeId:'24',score:false,yards:0,text:'Catch'}).result).toBe('No gain')});
