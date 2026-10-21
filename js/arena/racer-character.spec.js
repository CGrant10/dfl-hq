import {it,expect} from 'vitest';
import {racerCharacter,characterPose,defaultRacerKit} from './racer-character.js';
import {normalizeKit} from './racer-kit-model.js';
import {buildStadiumRace,stadiumFrame} from './stadium-model.js';

it('gives league members stable, genuinely different silhouettes and gear',()=>{
 const members=Array.from({length:12},(_,i)=>String(i+1)),profiles=members.map(id=>racerCharacter(id));
 expect(new Set(profiles.map(p=>p.name)).size).toBe(4);
 expect(new Set(profiles.map(p=>p.shoulders)).size).toBe(4);
 expect(new Set(members.map(id=>defaultRacerKit(id).skin)).size).toBeGreaterThan(3);
 expect(new Set(members.map(id=>defaultRacerKit(id).helmetStyle)).size).toBe(3);
 for(const id of members){expect(racerCharacter(id)).toEqual(racerCharacter(id,{number:99}));const kit=defaultRacerKit(id,{number:17,jersey:'#abcdef'});expect(kit).toEqual(normalizeKit(kit));expect(kit).toMatchObject({number:17,jersey:'#abcdef'});}
});
it('articulates a complete run cycle with smooth repeatable feet, arms and cloth',()=>{
 for(const id of ['1','2','3','4']){const c=racerCharacter(id),poses=Array.from({length:24},(_,i)=>characterPose(c,i/24));expect(new Set(poses.map(p=>JSON.stringify(p))).size).toBe(24);
  const start=characterPose(c,0),end=characterPose(c,1-1e-7);for(const key of Object.keys(start))expect(Math.abs(end[key]-start[key])).toBeLessThan(.0001);
  expect(characterPose(c,100,false)).toEqual(characterPose(c,0,false));
 }
});
it('keeps cosmetic identity out of race positions, timing and finishing order',()=>{
 const racers=Array.from({length:12},(_,i)=>({id:String(i+1)})),manifest={engine:'stadium-v1',story_duration_ms:60000,order:racers.map(r=>r.id).reverse(),seed:2407,presentation_version:2};
 const plain=buildStadiumRace(racers,manifest,60000),dressed=buildStadiumRace(racers.map(r=>({...r,kit:defaultRacerKit(r.id),character:racerCharacter(r.id)})),manifest,60000);
 for(const time of [-3000,0,12000,48000,60000])expect(stadiumFrame(dressed,time)).toEqual(stadiumFrame(plain,time));
});
