import {it,expect} from 'vitest';
import {stadiumRacerLabel} from './stadium-racer-labels.js';
it('keeps number and name tags readable and inside portrait and landscape edges',()=>{
 for(const width of [280,320,390,768,844,1440])for(const laneHeight of [14,18,30,56])for(const x of [40,width/2,width-40]){
  const tag=stadiumRacerLabel({x,y:100,laneHeight,width,bodyScale:laneHeight/74,textWidth:75});
  expect(tag.x).toBeGreaterThanOrEqual(5);expect(tag.x+tag.width).toBeLessThanOrEqual(width-5);
  expect(tag.height).toBeLessThan(laneHeight);expect(tag.font).toBeGreaterThanOrEqual(11);expect(tag.width).toBeGreaterThanOrEqual(22);
 }
});
