import { describe,it,expect,vi } from 'vitest';
vi.mock('./supabase.js',()=>({db:vi.fn(),isAdmin:()=>false}));
vi.mock('./members.js',()=>({currentMember:()=>null,loadMemberDirectory:async()=>[]}));
import {cleanBookState,readBookState,writeBookState} from './sportsbook-view-state.js';
import {mentionHtml,mentionToken} from './wall-conversations.js';
import {playerSearchResults} from './league-search.js';
const store=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}};
describe('Sportsbook UI memory',()=>{
 it('isolates members and never persists wager values',()=>{const storage=store();writeBookState(1,{product:'pickem',tab:'tickets',filters:{search:'Allen'},scroll:720,stake:500,picks:[1]},storage);expect(readBookState(1,storage)).toMatchObject({product:'pickem',tab:'tickets',scroll:720,filters:{search:'Allen'}});expect(readBookState(2,storage).product).toBe('book');expect(readBookState(1,storage)).not.toHaveProperty('stake');expect(readBookState(1,storage)).not.toHaveProperty('picks')});
 it('survives corrupt, blocked or unexpected storage',()=>{expect(cleanBookState(null).scroll).toBe(0);expect(cleanBookState({scroll:-3,product:'garbage',filters:{search:123}})).toMatchObject({scroll:0,product:'book',filters:{search:''}});expect(readBookState(1,{getItem:()=>'{bad'}).tab).toBe('markets');expect(()=>writeBookState(1,{scroll:42},{getItem:()=>null,setItem:()=>{throw Error()}})).not.toThrow()});
});
describe('Wall mentions',()=>{
 const members=[{id:1,display_name:'First Last'},{id:2,display_name:'Bro'}];
 it('supports spaces, repeated mentions and case without prefix matches',()=>{expect(mentionToken('First Last')).toBe('@{First Last}');expect(mentionHtml('@{first last} @{Bro} @{Brother}',members)).toBe('<a href="#/profile?id=1">@First Last</a> <a href="#/profile?id=2">@Bro</a> @{Brother}')});
 it('escapes both posts and member names',()=>{expect(mentionHtml('<img onerror=evil> @{<script>}',[{id:3,display_name:'<script>'}])).toBe('&lt;img onerror=evil&gt; <a href="#/profile?id=3">@&lt;script&gt;</a>')});
});
describe('player search',()=>{
 const players={1:{n:'Josh Allen',p:'QB',t:'BUF',s:'Active'},2:{n:'Josh Allen',p:'DE',t:'JAX',s:'Inactive'}};
 it('matches multiple name/team/position terms and identifies a player card',()=>{expect(playerSearchResults(players,'allen buf')).toEqual([{kind:'Players',id:'1',title:'Josh Allen',detail:'QB · BUF · Open player card',url:'#/sportsbook?player=Josh%20Allen'}]);expect(playerSearchResults(players,'Josh')[0].id).toBe('1');expect(playerSearchResults(players,'')).toEqual([])});
});
