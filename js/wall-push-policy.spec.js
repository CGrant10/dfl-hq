import {describe,it,expect} from 'vitest';
import {wallPushEligibility,wallPushFailure} from './wall-push-policy.js';
const now=Date.parse('2026-10-11T17:00:00Z');
const message={category:'wall',source_key:'wall:reply:50',audience:'members',target_member_ids:[12],created_at:new Date(now-60000).toISOString()};
const device={enabled:true,categories:['wall'],member_id:12};
describe('Wall push consent and retries',()=>{
 it('requires the exact targeted member and a separate opt-in',()=>{expect(wallPushEligibility(message,device,now)).toBe('ready');expect(wallPushEligibility(message,{...device,categories:['announcements']},now)).toBe('disabled');expect(wallPushEligibility(message,{...device,member_id:13},now)).toBe('disabled')});
 it('checks opt-out again before delivery and never sends old conversations',()=>{expect(wallPushEligibility(message,{...device,enabled:false},now)).toBe('disabled');expect(wallPushEligibility({...message,created_at:new Date(now-86400001).toISOString()},device,now)).toBe('expired')});
 it('refuses non-Wall or broad audience messages',()=>{expect(wallPushEligibility({...message,source_key:'weekly:2026:5'},device,now)).toBe('disabled');expect(wallPushEligibility({...message,audience:'all'},device,now)).toBe('disabled')});
 it('retries transient errors without disabling a valid device',()=>{expect(wallPushFailure(429,1)).toMatchObject({terminal:false,disable:false,delayMs:120000});expect(wallPushFailure(503,3).terminal).toBe(false);expect(wallPushFailure(0,5)).toMatchObject({terminal:true,result:'failed',disable:false})});
 it('disables expired endpoints, while a permanent payload error ends only this message',()=>{expect(wallPushFailure(410,1)).toMatchObject({disable:true,result:'disabled'});expect(wallPushFailure(400,1)).toMatchObject({disable:false,result:'failed'})});
});
