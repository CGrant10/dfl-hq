import {it,expect} from 'vitest';
import {footballNotificationTarget} from './football-notification-target.js';
const source='weekly:play:2026:7:1:401:987',base='#/clubhouse?season=2026&week=7&tab=matchups&matchup=2&moment=nfl:401:987:3',video=base.replace('tab=matchups','tab=highlights')+'&nflGame=401&clip=123';
it('accepts the exact saved play and the video route without weakening recipient checks',()=>{expect(footballNotificationTarget(source,base,[1])).toMatchObject({game:'401',play:'987',matchup:2,moment:'nfl:401:987:3',clip:null});expect(footballNotificationTarget(source,video,[1])).toMatchObject({clip:'123',member:'1'})});
it('rejects mismatched NFL games, plays, weeks, members, extra targets and partial video routes',()=>{
 for(const url of [video.replace('nflGame=401','nflGame=999'),video.replace('nfl:401:987','nfl:401:999'),video.replace('week=7','week=8'),video.replace('matchup=2','matchup=0'),video.replace('&moment=nfl:401:987:3',''),video.replace('&clip=123',''),video.replace('tab=highlights','tab=matchups'),video+'&evil=1','https://evil.test/'+video])expect(footballNotificationTarget(source,url,[1])).toBe(null);
 expect(footballNotificationTarget(source,video,[2])).toBe(null);expect(footballNotificationTarget(source,video,[1,2])).toBe(null);expect(footballNotificationTarget(source.replace(':7:',':19:'),video.replace('week=7','week=19'),[1])).toBe(null);
});
