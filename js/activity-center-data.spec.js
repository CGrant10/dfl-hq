import {it,expect,vi} from 'vitest';
vi.mock('./supabase.js',()=>({db:()=>{throw Error('No real database')}}));
import {loadActivityContext} from './activity-center-data.js';
it('batches authorized inbox targets, tolerates provider failures and never writes',async()=>{
 const calls=[],client={from:table=>({select:fields=>({in:async(key,ids)=>{calls.push({table,fields,key,ids});if(table==='nfl_live_games')return{error:Error('Unavailable')};return{data:[]}}})}),rpc:vi.fn(async name=>({data:{member_id:9,bets:[{id:8}]}}))};
 const rows=[1,2,3].map(id=>({category:'trades',target_url:'#/trade?tx=123'}));rows.push({category:'sportsbook',target_url:'#/sportsbook?ticket=8'},{category:'matchup_moments',target_url:'#/clubhouse?clip=7&nflGame=100'});
 const context=await loadActivityContext(rows,{client,memberId:1});expect(calls.find(r=>r.table==='trade_alerts').ids).toEqual(['123']);expect(calls).toHaveLength(3);expect(context.games).toEqual([]);expect(context.bets).toEqual([]);expect(context.accountMemberId).toBeNull();expect(client.rpc).toHaveBeenCalledWith('sportsbook_my_live_account');
});
it('does no enrichment work for ordinary league notices or forged external targets',async()=>{
 const client={from:vi.fn(),rpc:vi.fn()};await loadActivityContext([{category:'announcements',target_url:'#/home'},{category:'trades',target_url:'https://evil.test/?tx=123'}],{client});expect(client.from).not.toHaveBeenCalled();expect(client.rpc).not.toHaveBeenCalled();
});
