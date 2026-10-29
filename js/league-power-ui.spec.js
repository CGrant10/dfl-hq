import {describe,it,expect} from 'vitest';
import {powerDetailMarkup,powerRankingsMarkup,powerPreviewMarkup} from './league-power-ui.js';

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
 it('ranks lineup strength from the viewed edition, including ties and unavailable projections',()=>{
  const other={...row,id:'2',forecast:140},snapshot=powerPreviewMarkup(row,{...board,rows:[row,other]});
  expect(snapshot).toContain('<dt>Lineup</dt><dd>#2</dd>');expect(snapshot).toContain('<dt>Scoring</dt><dd>#3</dd>');expect(snapshot).toContain('Week 4');
  expect(powerPreviewMarkup(row,{...board,rows:[row,{...other,forecast:130}]})).toContain('<dt>Lineup</dt><dd>#1</dd>');
  expect(powerPreviewMarkup(row,{...board,rows:[row,{...other,forecast:null}]})).not.toContain('<dt>Lineup</dt>');
 });
 it('keeps a real zero and omits unavailable or preseason scoring claims',()=>{
  const preseason={...row,history:[],allPlayRate:null,forecast:0};
  const html=powerPreviewMarkup(preseason,{...board,rows:[preseason]});
  expect(html).toContain('<b>0.0</b> projected');expect(html).not.toContain('<dt>Scoring</dt>');expect(html).not.toContain('Week 4');
  expect(powerPreviewMarkup({...preseason,forecast:null},board)).not.toContain('projected');
 });
 it('routes team identity to its actual roster and separates the accessible snapshot control',()=>{
  const view={allTeams:[{id:'1',roster_id:11,team_name:row.name}],powerRankings:{boards:[board]}};
  const html=powerRankingsMarkup(view);
  expect(html).toContain('href="#/clubhouse?tab=matchups&amp;roster=11"');expect(html).toContain('aria-expanded="false" aria-controls="power-preview-0-1"');
  expect(html).toContain('data-power-preview inert aria-hidden="true"');expect(html).toContain('Full report');
 });

});
