import {expect,it} from 'vitest';
import {playerGameHeadline,playerSeasonAverage,playerAverageMarkup,playerAvailabilityMarkup} from './player-card-summary.js';
it('shows the selected game line with genuine zeroes and combined receiving/rushing TDs',()=>{
 expect(playerGameHeadline({rawStats:{rec:0,rec_yd:0,rec_td:0}},'WR')).toBe('0 rec · 0 yd');
 expect(playerGameHeadline({rawStats:{rec:8,rec_yd:120,rec_td:1,rush_td:1}},'WR')).toBe('8 rec · 120 yd · 2 TD');
 expect(playerGameHeadline({rawStats:{pass_yd:300,pass_td:2,pass_int:0,rush_yd:15}},'QB')).toBe('300 pass yd · 2 pass TD · 0 INT · 15 rush yd');
 expect(playerGameHeadline({state:'Yet to play',rawStats:{rec:0}},'WR')).toBe('');
 expect(playerGameHeadline({rawStats:{}},'WR')).toBe('');
});
it('uses actual season PPR totals and appearances without treating missing data as zero',()=>{
 expect(playerSeasonAverage({data:{a:{gp:4,pts_ppr:50}}},'a')).toEqual({value:12.5,games:4,stale:false});
 expect(playerSeasonAverage({data:{a:{gp:1,pts_ppr:0}},stale:true},'a')).toEqual({value:0,games:1,stale:true});
 for(const row of [{gp:0,pts_ppr:0},{gp:3},{gp:false,pts_ppr:3},{gp:2,pts_ppr:''}])expect(playerSeasonAverage({data:{a:row}},'a')).toBeNull();
 expect(playerSeasonAverage(null,'a')).toBeNull();expect(playerAverageMarkup(null)).toContain(' hidden');
});

it('omits redundant healthy/no-tag rows without claiming unknown availability',()=>{
 for(const tag of ['Healthy','No tag','Available',''])expect(playerAvailabilityMarkup({tag,availability:tag==='No tag'?'No injury tag in Sleeper':'Available'})).toBe('');
 expect(playerAvailabilityMarkup({tag:'Questionable',availability:'Latest Sleeper tag'})).toContain('Questionable');
 expect(playerAvailabilityMarkup({tag:'IR',availability:'Out',body:'Knee'})).toContain('data-availability="out"');
});
it('keeps actual availability details and escapes provider text',()=>{
 const html=playerAvailabilityMarkup({tag:'Q',availability:'Game-time decision',body:'Knee <report>'});
 expect(html).toContain('Game-time decision · Knee &lt;report&gt;');expect(html).toContain('data-availability="questionable"');
});
