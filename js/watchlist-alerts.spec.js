import {describe,it,expect} from 'vitest';
import {buildWatchlistDrafts,watchAlertKey,WATCHLIST_NOTIFICATION_FILTER} from './watchlist-alerts.js';
const first={memberId:1,id:'p1',revision:1,name:'Player One',copy:'Dropped · available in DFL'};
const second={memberId:1,id:'p2',revision:2,name:'Player Two',copy:'Healthy → Out'};
const input={changes:[first,second],opted:[1],season:2026,week:5,now:1000};
describe('watchlist notifications',()=>{
 it('groups meaningful changes for one opted member with bounded expiry',async()=>{const drafts=await buildWatchlistDrafts(input);expect(drafts).toHaveLength(1);expect(drafts[0]).toMatchObject({category:'waivers',audience:'members',targetMemberIds:[1],watchPlayerIds:['p1','p2'],targetUrl:'#/analyzer?watchlist=1',expiresAt:new Date(7201000).toISOString()});expect(drafts[0].body.length).toBeLessThanOrEqual(240)});
 it('does not draft for disabled or excluded category recipients',async()=>{expect(await buildWatchlistDrafts({...input,opted:[]})).toEqual([]);expect(WATCHLIST_NOTIFICATION_FILTER).toBe('["waivers"]')});
 it('does not replay an individual event when another event changes the group',async()=>{const sent=watchAlertKey(first,2026,5);const drafts=await buildWatchlistDrafts({...input,notifiedKeys:[sent]});expect(drafts[0].watchPlayerIds).toEqual(['p2']);expect(drafts[0].body).not.toContain('Player One')});
 it('keeps concurrent retries deterministic and separates different owners',async()=>{const a=await buildWatchlistDrafts(input),b=await buildWatchlistDrafts({...input,changes:[second,first,{...first,memberId:2}],opted:[1,2]});expect(b).toHaveLength(2);expect(b[0].sourceKey).toBe(a[0].sourceKey);expect(b[1].targetMemberIds).toEqual([2]);expect(b[1].body).not.toContain('Player Two')});
 it('withholds already recorded changes and keeps later genuine changes distinct',async()=>{expect(await buildWatchlistDrafts({...input,notifiedKeys:input.changes.map(c=>watchAlertKey(c,2026,5))})).toEqual([]);const a=await buildWatchlistDrafts({...input,changes:[first]}),b=await buildWatchlistDrafts({...input,changes:[{...first,revision:2}]});expect(a[0].sourceKey).not.toBe(b[0].sourceKey)});
});
