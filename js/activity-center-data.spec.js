import {it,expect,vi} from 'vitest';
vi.mock('./supabase.js',()=>({db:()=>{throw Error('No real database')}}));
import {loadActivityContext} from './activity-center-data.js';
it('batches authorized inbox targets, tolerates provider failures and never writes',async()=>{
 const calls=[],client={from:table=>({select:fields=>{const q={in(key,ids){calls.push({table,fields,key,ids});return q},gt(){return q},order(){return q},limit(){return q},then(resolve){resolve(table==='nfl_highlight_clips'?{error:Error('Unavailable')}:{data:[]})}};return q}}),rpc:vi.fn(async name=>({data:{member_id:9,bets:[{id:8}]}}))};
 const rows=[1,2,3].map(id=>({category:'trades',target_url:'#/trade?tx=123'}));rows.push({category:'sportsbook',target_url:'#/sportsbook?ticket=8'},{category:'matchup_moments',target_url:'#/clubhouse?clip=7&nflGame=100'});
 const context=await loadActivityContext(rows,{client,memberId:1});expect(calls.find(r=>r.table==='trade_alerts').ids).toEqual(['123']);expect(calls).toHaveLength(2);expect(context.games).toEqual([]);expect(context.bets).toEqual([]);expect(context.accountMemberId).toBeNull();expect(client.rpc).toHaveBeenCalledWith('sportsbook_my_live_account');
});
it('reads saved exact moments and game clips for an alert originally sent without video',async()=>{
 const calls=[],client={from(table){const q={select(){return q},in(key,ids){calls.push({table,key,ids});return q},gt(){return q},order(){return q},limit(n){expect(n).toBeLessThanOrEqual(200);return q},then(resolve){resolve({data:table==='gameday_moments'?[{event_key:'nfl:100:200:3'}]:[]})}};return q},rpc:vi.fn()};
 const context=await loadActivityContext([{category:'matchup_moments',target_url:'#/clubhouse?season=2026&week=8&tab=matchups&matchup=2&moment=nfl:100:200:3'}],{client,memberId:1});
 expect(calls).toContainEqual({table:'gameday_moments',key:'event_key',ids:['nfl:100:200:3']});expect(calls).toContainEqual({table:'nfl_highlight_clips',key:'game_id',ids:['100']});expect(context.moments).toHaveLength(1);expect(client.rpc).not.toHaveBeenCalled();
 expect(calls.some(c=>c.table==='nfl_live_games')).toBe(false);
});
it('does no enrichment work for ordinary league notices or forged external targets',async()=>{
 const client={from:vi.fn(),rpc:vi.fn()};await loadActivityContext([{category:'announcements',target_url:'#/home'},{category:'trades',target_url:'https://evil.test/?tx=123'}],{client});expect(client.from).not.toHaveBeenCalled();expect(client.rpc).not.toHaveBeenCalled();
});
