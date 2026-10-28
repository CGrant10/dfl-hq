import {describe,it,expect,vi} from 'vitest';
import {activityCard,activityTarget,filterActivity} from './activity-center-model.js';
import {activityListMarkup} from './activity-center-ui.js';
import {sportsbookTicketRoute,revealSportsbookTicket} from './sportsbook-ticket-route.js';
const now=Date.parse('2026-10-28T15:00:00Z');
const trade={id:1,category:'trades',title:'Deal done',body:'A trade',target_url:'#/trade?tx=123',created_at:'2026-10-28T14:00:00Z',is_read:false};
const receipt={sleeper_transaction_id:'123',teams:[{roster_id:1,team_name:'Alpha'},{roster_id:2,team_name:'Bravo'},{roster_id:3,team_name:'Charlie'}],packages:[{roster_id:1,sends:[{id:'wr',name:'Receiver',nfl_team:'BUF'}]},{roster_id:2,sends:[{id:'rb',name:'Runner'}]},{roster_id:3,sends:[{id:'te',name:'Tight end'}]}],result:{fairness:0}};
const play={...trade,id:2,category:'matchup_moments',title:'Receiver · TOUCHDOWN',body:'▶ Video available · A big catch',target_url:'#/clubhouse?season=2026&week=8&tab=highlights&matchup=2&moment=nfl:100:200:3&nflGame=100&clip=7'};
const clip={id:7,game_id:'100',play_id:'200',headline:'A touchdown catch',thumbnail_url:'https://a.espncdn.com/media/motion/2026/1028/example.jpg',game_label:'BUF vs MIA',expires_at:'2026-10-30T12:00:00Z'};
describe('activity previews keep the original source and permissions',()=>{
 it('shows routed two/three-team sends with actual balance, including zero, and an exact receipt link',()=>{
  const card=activityCard(trade,{trades:[receipt]});expect(card.href).toBe(trade.target_url);expect(card.preview.balance).toBe(0);expect(card.preview.packages).toHaveLength(3);
  const html=activityListMarkup([trade],{trades:[receipt]});expect(html).toContain('Receiver');expect(html).toContain('Runner');expect(html).toContain('Charlie sends');expect(html).toContain('0%');
 });
 it('uses an available routing review but falls back gracefully for missing/malformed receipts',()=>{
  expect(activityCard(trade,{trades:[{...receipt,routing_review:{...receipt,result:{fairness:88}}}]}).preview.balance).toBe(88);
  for(const record of [null,{...receipt,packages:null},{...receipt,packages:{}}])expect(activityCard(trade,{trades:record?[record]:[]}).preview).toBeNull();
 });
 it('keeps clip identity, game and play aligned; an expired/wrong clip becomes the exact play',()=>{
  expect(activityCard(play,{clips:[clip],now})).toMatchObject({action:'Watch clip',href:play.target_url,preview:{type:'clip'}});
  for(const bad of [{...clip,expires_at:'2026-10-27T12:00:00Z'},{...clip,game_id:'999'},{...clip,play_id:'999'}]){
   const card=activityCard(play,{clips:[bad],now});expect(card.action).toBe('View play');expect(card.href).toContain('moment=nfl%3A100%3A200%3A3');expect(card.href).not.toContain('&clip=');expect(card.body).toBe('A big catch');
  }
 });
 it('only renders trusted ESPN clip posters and never embeds or autoplays video',()=>{
  const html=activityListMarkup([play],{clips:[{...clip,thumbnail_url:'https://evil.test/track.jpg'}],now});expect(html).not.toContain('evil.test');expect(html).not.toContain('<video');expect(html).not.toContain('<iframe');
 });
 it('uses the authenticated account for ticket amounts and never substitutes potential payout for actual payout',()=>{
  const row={...trade,category:'sportsbook',target_url:'#/sportsbook?product=book&ticket=4'};
  const context={memberId:1,accountMemberId:1,bets:[{id:4,status:'lost',stake:20,payout:0,potential_payout:200,legs:[{},{}]}]};
  expect(activityCard(row,context).preview).toMatchObject({type:'ticket',status:'lost',payout:0,stake:20,picks:2});
  expect(activityCard(row,{...context,accountMemberId:2}).preview).toBeNull();
  expect(activityCard(row,{...context,bets:[{id:4,status:'open',potential_payout:200}]}).preview).toBeNull();
 });
 it('makes legacy ticket notices useful without guessing which ticket they refer to',()=>{
  const card=activityCard({...trade,title:'Sportsbook ticket settled',category:'sportsbook',target_url:'#/sportsbook'});
  expect(card.preview).toBeNull();expect(card.href).toBe('#/sportsbook?product=book&view=tickets');
 });
 it('filters unread and categories independently, including zero-result states',()=>{
  const rows=[trade,{...play,is_read:true},{...trade,id:3,category:'sportsbook'}];
  expect(filterActivity(rows,'unread')).toHaveLength(2);expect(filterActivity(rows,'plays')).toEqual([rows[1]]);expect(activityListMarkup(rows,{},'league')).toContain('Nothing here yet');
 });
 it('escapes notification copy, package names and targets; only app routes are followed',()=>{
  const html=activityListMarkup([{...trade,title:'<script>x</script>',body:'<img onerror=evil>',target_url:'javascript:alert(1)'}]);expect(html).not.toContain('<script>');expect(html).not.toContain('<img onerror');expect(html).toContain('href="#/home"');
  for(const url of ['https://evil.test','#//evil.test','#/home?x="bad"','#/home\n'])expect(activityTarget(url)).toBe('#/home');
 });
});
describe('ticket routes',()=>{
 it('accepts an exact positive ticket and legacy My Bets route, rejecting unsafe IDs',()=>{
  expect(sportsbookTicketRoute('#/sportsbook?product=book&ticket=42')).toEqual({ticket:'42',tickets:true});
  expect(sportsbookTicketRoute('#/sportsbook?view=tickets').tickets).toBe(true);
  for(const id of ['-1','0','abc','1"]'])expect(sportsbookTicketRoute('#/sportsbook?ticket='+encodeURIComponent(id)).ticket).toBeNull();
 });
});

it('opens the Book and My Bets, expands the settled group and focuses the exact ticket',()=>{
 const book={click:vi.fn()},tab={click:vi.fn()},group={tagName:'DETAILS',open:false,parentElement:null};
 const ticket={isConnected:true,dataset:{},parentElement:group,scrollIntoView:vi.fn(),focus:vi.fn()};
 const root={querySelector:s=>s.includes('data-sb-product')?book:s.includes('data-sb-tab')?tab:s.includes('data-ticket-id')?ticket:null};group.parentElement=root;
 vi.stubGlobal('requestAnimationFrame',fn=>fn());
 try{expect(revealSportsbookTicket(root,{hash:'#/sportsbook?ticket=42'})).toBe(true);expect(book.click).toHaveBeenCalledOnce();expect(tab.click).toHaveBeenCalledOnce();expect(group.open).toBe(true);expect(ticket.dataset.ticketFocus).toBe('true');expect(ticket.focus).toHaveBeenCalledWith({preventScroll:true});}
 finally{vi.unstubAllGlobals()}
});
it('a legacy tickets link switches views without choosing an unrelated ticket',()=>{
 const click=vi.fn(),root={querySelector:()=>({click})};expect(revealSportsbookTicket(root,{hash:'#/sportsbook?view=tickets'})).toBe(true);expect(click).toHaveBeenCalledTimes(2);
});
