import {describe,it,expect} from 'vitest';
import {homeLeagueStory} from './home-lead-story.js';
import {weeklyHeadlineSlide} from './home-slides.js';
import {homeBroadcastDeck} from './home-presentation.js';
import {renderItem} from './broadcast-stage.js';
const game=(winner='a',loser='b',high=120,low=90)=>({winner:{uid:winner,name:`Current ${winner}`,value:high},loser:{uid:loser,name:`Current ${loser}`,value:low}});
const report={final:true,season:2026,week:5,games:[game(),game('c','d',115,95)]};
const receipt=(week,a='a',b='b',left=120,right=90,season=2026)=>({season,week,user1:a,user2:b,score1:left,score2:right});
const options={season:2026,week:6};
describe('supporting Home league stories',()=>{
 it('falls back to the verified weekly result with sparse history',()=>{
  expect(homeLeagueStory(report,options)).toEqual(weeklyHeadlineSlide(report,options));
 });
 it('identifies the actual losing team, using current names and exact scores',()=>{
  const story=homeLeagueStory(report,{...options,history:[receipt(3),receipt(4)]});
  expect(story).toMatchObject({storySignal:'losing-run',figure:'3',figureLabel:'Straight losses'});
  expect(story.sides.find(side=>side.subject)).toMatchObject({name:'Current b',score:'90.00'});
  expect(story.href).toBe('#/clubhouse?season=2026&week=5&tab=matchups');
  const html=renderItem(story,{editorial:true});expect(html).toContain('data-story-subject');expect(html).toContain('THE LOSING STREAK');
 });
 it('requires consecutive weeks and breaks a streak on ties, missing weeks or ambiguous games',()=>{
  for(const history of [[receipt(2),receipt(4)],[receipt(3),receipt(4,'a','b',90,90)],[receipt(3),receipt(4),receipt(4,'b','c',80,100)]]){
   expect(homeLeagueStory(report,{...options,history}).storySignal).not.toBe('losing-run');
  }
 });
 it('deduplicates repeat syncs without counting them as extra losses',()=>{
  const history=[receipt(3),receipt(4),receipt(4)];
  expect(homeLeagueStory(report,{...options,history}).figure).toBe('3');
 });
 it('does not use conflicting, future, current-week, missing-score or unplayed receipts',()=>{
  for(const extra of [receipt(4,'a','b',80,100),receipt(5),receipt(6),receipt(4,'a','b',null,90),receipt(4,'a','b',0,0)]){
   const history=[receipt(3),extra];expect(homeLeagueStory(report,{...options,history}).storySignal).toBeUndefined();
  }
  const history=[receipt(3),receipt(4),receipt(4,'a','b',90,100)];
  expect(homeLeagueStory(report,{...options,history}).storySignal).toBeUndefined();
 });
 it('reports a winning run only from four consecutive wins',()=>{
  const story=homeLeagueStory(report,{...options,history:[receipt(2,'a','c'),receipt(3,'a','d'),receipt(4,'a','c')]});
  expect(story).toMatchObject({storySignal:'winning-run',figure:'4'});expect(story.sides.find(side=>side.subject).name).toBe('Current a');
 });
 it('ends a rivalry streak only when the current scored winner had lost at least three meetings',()=>{
  const history=[receipt(1,'a','b',80,100),receipt(2,'a','b',90,110),receipt(4,'a','b',95,120)];
  expect(homeLeagueStory(report,{...options,history})).toMatchObject({storySignal:'revenge',figure:'3'});
  history.push(receipt(3,'a','b',100,100));expect(homeLeagueStory(report,{...options,history}).storySignal).not.toBe('revenge');
 });
 it('claims a season high only with every earlier week and the complete league field',()=>{
  const history=[1,2,3,4].flatMap(week=>[receipt(week,'a','b',100,95),receipt(week,'c','d',105,99)]);
  expect(homeLeagueStory(report,{...options,history})).toMatchObject({storySignal:'season-high',figure:'120.00'});
  expect(homeLeagueStory(report,{...options,history:history.slice(1)}).storySignal).not.toBe('season-high');
  expect(homeLeagueStory(report,{...options,history:[...history,receipt(2,'a','c',200,190)]}).storySignal).not.toBe('season-high');
 });
 it('never jumps across an unknown or conflicting rivalry result to invent a streak',()=>{
  const prior=[receipt(1,'a','b',80,100),receipt(2,'a','b',90,110),receipt(3,'a','b',95,120)];
  for(const last of [[receipt(4,'a','b',null,100)],[receipt(4,'a','b',0,0)],[receipt(4,'a','b',80,100),receipt(4,'a','b',120,100)]]){
   expect(homeLeagueStory(report,{...options,history:[...prior,...last]}).storySignal).not.toBe('revenge');
  }
 });
 it('does not call an equal score a new record or overlook a higher score elsewhere this week',()=>{
  const history=[1,2,3,4].flatMap(week=>[receipt(week,'a','b',120,95),receipt(week,'c','d',105,99)]);
  expect(homeLeagueStory(report,{...options,history}).storySignal).not.toBe('season-high');
  const altered={...report,games:[game(),game('c','d',180,170)]};
  const story=homeLeagueStory(altered,{...options,history,meSleeperId:'c'});
  expect(story.storySignal).not.toBe('season-high');
 });
 it('excludes the personal matchup and never turns a projection, stale or mismatched report into a fact',()=>{
  const history=[receipt(3),receipt(4)];
  expect(homeLeagueStory(report,{...options,history,meSleeperId:'a'}).storySignal).toBeUndefined();
  for(const altered of [{...report,final:false},{...report,season:2025},{...report,week:3}])expect(homeLeagueStory(altered,{...options,history})).toBeNull();
 });
 it('keeps the independent daily opener and adds one supporting story',()=>{
  const story=homeLeagueStory(report,{...options,history:[receipt(3),receipt(4)]});
  const deck=homeBroadcastDeck([story],{now:new Date('2026-10-22T12:00:00')});
  expect(deck).toHaveLength(2);expect(deck[0].homeFeature).toBe(true);expect(deck[0].href).toBeNull();expect(deck[1]).toBe(story);
 });
});
