import {describe,it,expect} from 'vitest';
import {KIT_PRESETS,SKIN_TONES,normalizeKit,applyKitPreset,footballYardNumber,footballSpot,finishMargin,kitInk} from './racer-kit-model.js';
import {racerMaterial,racerSpriteComponents} from './racer-kit-art.js';
import {buildStadiumRace,stadiumFrame} from './stadium-model.js';
describe('racer kits and football field',()=>{
 it('uses real mirrored yard numbers and a touchdown finish',()=>{expect(Array.from({length:11},(_,i)=>footballYardNumber(i))).toEqual(['','10','20','30','40','50','40','30','20','10','']);expect(footballSpot(.2)).toBe('OWN 20');expect(footballSpot(.5)).toBe('THE 50');expect(footballSpot(.8)).toBe('OPP 20');expect(footballSpot(1)).toBe('TOUCHDOWN');});
 it('offers every NFL team and themed fan kits with valid independent gear',()=>{
  expect(KIT_PRESETS.filter(p=>p.group==='NFL')).toHaveLength(32);expect(KIT_PRESETS.filter(p=>p.group==='Pokémon')).toHaveLength(8);expect(KIT_PRESETS.filter(p=>p.group==='Anime')).toHaveLength(8);expect(new Set(KIT_PRESETS.map(p=>p.id)).size).toBe(KIT_PRESETS.length);
  for(const p of KIT_PRESETS){const kit=applyKitPreset(normalizeKit({number:99,skin:SKIN_TONES[5][1]}),p.id);expect(kit.number).toBe(99);expect(kit.skin).toBe(SKIN_TONES[5][1]);expect(kit.preset).toBe(p.id);for(const key of ['helmet','jersey','pants','trim'])expect(kit[key]).toMatch(/^#[0-9a-f]{6}$/);}
 });
 it('validates saved gear, accepts number zero, and rejects untrusted styles/fields',()=>{
  expect(normalizeKit({number:0}).number).toBe(0);const kit=normalizeKit({number:100,helmetStyle:'bad',preset:'nfl:<script>',jersey:'url(x)',speed:10,member_id:5},{number:7});expect(kit.number).toBe(7);expect(kit.helmetStyle).toBe('classic');expect(kit.preset).toBe('dfl');expect(kit).not.toHaveProperty('speed');expect(kit).not.toHaveProperty('member_id');
 });
 it('separates skin, helmet, jersey, pants, trim and outlines for recoloring',()=>{
  expect(racerMaterial(230,20,160)).toBe(1);expect(racerMaterial(20,200,30)).toBe(2);expect(racerMaterial(10,155,210)).toBe(3);expect(racerMaterial(230,210,5)).toBe(4);expect(racerMaterial(230,230,220,.8)).toBe(5);expect(racerMaterial(18,20,23)).toBe(0);
 });
 it('never lets appearance change a racer’s position, speed, or finish order',()=>{
  const racers=Array.from({length:12},(_,i)=>({id:String(i+1),name:`Member ${i+1}`})),manifest={engine:'stadium-v1',seed:1234,story_duration_ms:60000,order:racers.map(r=>r.id).reverse()};
  const normal=buildStadiumRace(racers,manifest,60000),custom=buildStadiumRace(racers.map((r,i)=>({...r,kit:applyKitPreset(normalizeKit({skin:SKIN_TONES[i%6][1]}),KIT_PRESETS[i+15].id)})),manifest,60000);
  for(const time of [-1500,0,8000,29000,55000,59000,60000])expect(stadiumFrame(custom,time)).toEqual(stadiumFrame(normal,time));
 });
 it('derives a close finish from actual recorded crossings',()=>{expect(finishMargin([{place:2,finish_ms:59050},{place:1,finish_ms:58900}])).toBe(150);expect(finishMargin([{place:1,finish_ms:10}])).toBeNull();});
 it('extracts whole poses without neighboring sprite fragments',()=>{
  const data=new Uint8ClampedArray(30*10*4);for(let y=1;y<9;y++)for(const start of [1,16])for(let x=start;x<start+9;x++)data[(y*30+x)*4+3]=255;data[(9*30+29)*4+3]=255;
  const poses=racerSpriteComponents(data,30,10,2);expect(poses).toHaveLength(2);expect(poses.map(p=>[p.minX,p.width,p.height])).toEqual([[1,9,8],[16,9,8]]);
 });
 it('keeps numbers readable on black, yellow and low-contrast team kits',()=>{expect(kitInk('#101820')).toBe('#f5f0e7');expect(kitInk('#f5ca28')).toBe('#0b1019');expect(kitInk('#00338d','#c60c30')).not.toBe('#c60c30');expect(kitInk('#26303b','#eae2cf')).toBe('#eae2cf');});
});
