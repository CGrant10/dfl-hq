import {describe,it,expect} from 'vitest';
import {powerDetailMarkup,powerRankingsMarkup} from './league-power-ui.js';

const row={id:'1',name:'Current team',rank:2,previousRank:4,movement:2,score:70,record:'3-1',allPlayRate:.7,allPlayRecord:'30-14',pointsPerGame:120,scoringRank:3,forecast:130,history:[{week:2,points:80,relative:.8},{week:3,points:120,relative:1.2},{week:4,points:160,relative:1.6}]};
const board={week:4,label:'Week 4',rosterWeight:.25,forecastWeek:5,rows:[row]};
describe('power ranking facts and identity',()=>{
 it('shows the same recency weighting used by the ranking model',()=>{
  const html=powerDetailMarkup(row,board,null,null);
  // (.8*1 + 1.2*2 + 1.6*3) / 6 = 133%, not the unweighted 120%.
  expect(html).toContain('133%');expect(html).not.toContain('120%');
 });
 it('reports verified rank and score changes without guessing their cause',()=>{
  const previous={rows:[{...row,score:73}]};
  const html=powerDetailMarkup(row,board,previous,null);
  expect(html).toContain('Up 2 from #4.');expect(html).toContain('Power -3.0');
  expect(html).not.toContain('All-play results improved');
 });
 it('keeps current team images in old editions and in their details',()=>{
  const team={id:'1',team_name:'Older saved name',sleeper_team_image:'https://sleepercdn.com/uploads/current.jpg'};
  const view={allTeams:[team],focus:{id:'1'},powerRankings:{boards:[board]}};
  const html=powerRankingsMarkup(view);
  expect(html).toContain('src="https://sleepercdn.com/uploads/current.jpg"');
  expect(html).toContain('Current team');expect(html).not.toContain('Older saved name');
  expect(powerDetailMarkup(row,board,null,null,team)).toContain('src="https://sleepercdn.com/uploads/current.jpg"');
 });
});
