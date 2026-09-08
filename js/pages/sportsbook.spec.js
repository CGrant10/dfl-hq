import { it, expect, vi } from 'vitest';
const { markets, outcomes, bets } = vi.hoisted(() => ({
  markets: [
    {id:1,category:'Fantasy',status:'open',title:'Team <A> vs B',auto_key:'matchup:2026:3:1'},
    {id:2,category:'Fantasy',status:'open',title:'C vs D',auto_key:'matchup:2026:3:2'}
  ],
  outcomes: [
    {id:2,market_id:1,label:'Team <A>',odds_american:-150},
    {id:3,market_id:1,label:'B',odds_american:130},
    {id:4,market_id:2,label:'C',odds_american:110}
  ],
  /* Mutated by the entry test below; empty for the first one. */
  bets: []
}));
vi.mock('../supabase.js', () => ({hasPermission:()=>false, db:()=>({
  rpc:async name=>({data:name==='sportsbook_touch_wallet'?[{balance:2400}]:name==='sportsbook_my_bets'?bets:[],error:null}),
  from:table=>{const query={select:()=>query,order:()=>query,limit:()=>query,then:resolve=>resolve({data:table==='sportsbook_markets'?markets:outcomes,error:null})};return query;}
})}));
vi.mock('../members.js',()=>({currentMember:()=>({display_name:'Preview'})}));
vi.mock('../sportsbook-ticket.js',()=>({shareTicket:vi.fn()}));
import { render } from './sportsbook.js';

const fakeView=()=>({innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null,append(){}});

it('renders the real markets and wallet with separate accessible ticket panel', async()=>{
  const view=fakeView();
  await render(view);
  expect(view.innerHTML).toContain('2,400');
  expect(view.innerHTML).toContain('Team &lt;A&gt;');
  expect(view.innerHTML).toContain('data-bet-outcome="2"');
  expect(view.innerHTML).toContain('id="sb-tickets" role="tabpanel" aria-labelledby="sb-tab-tickets" hidden');
  expect(view.innerHTML).toContain('No tickets yet');
  expect(view.innerHTML).not.toContain('Projected');
});

it('reads the week off the matchup key rather than printing week 1 forever', async()=>{
  const view=fakeView();
  await render(view);
  expect(view.innerHTML).toContain('Week 3');
  expect(view.innerHTML).not.toContain('WEEK 1');
});

it('offers no slip bar until something is picked', async()=>{
  const view=fakeView();
  await render(view);
  expect(view.innerHTML).not.toContain('sb-slipbar');
  /* Every price is a toggle, so every row has to say whether it is on. */
  expect(view.innerHTML).toContain('aria-pressed="false"');
});

it('draws a multi-pick entry as one ticket with its legs, and offers a pull', async()=>{
  bets.push({
    id:9,stake:100,odds_american:2200,potential_payout:2300,status:'open',pick_count:2,
    legs:[
      {outcome_id:2,market_id:1,label:'Team <A>',market:'Team <A> vs B',odds_american:-150,status:'open'},
      {outcome_id:4,market_id:2,label:'C',market:'C vs D',odds_american:110,status:'open'}
    ]
  });
  const view=fakeView();
  await render(view);

  // One ticket, not two, and it counts its picks.
  expect(view.innerHTML).toContain('2-pick entry');
  expect((view.innerHTML.match(/class="card sb-ticket/g)||[]).length).toBe(1);
  // Both legs are drawn, and the escaping still holds inside them.
  expect(view.innerHTML).toContain('sb-leg-pick">Team &lt;A&gt;');
  expect(view.innerHTML).toContain('sb-leg-pick">C<');
  // Every market on it is open, so it can still be pulled back.
  expect(view.innerHTML).toContain('data-cancel-bet="9"');
  expect(view.innerHTML).not.toContain('data-dismiss-bet="9"');
  // And the board marks the legs the member is already holding.
  expect(view.innerHTML).toContain('sb-held');
});

it('offers dismiss instead of pull once an entry is graded', async()=>{
  bets.length=0;
  bets.push({
    id:11,stake:100,odds_american:-150,potential_payout:166,status:'lost',pick_count:1,
    settled_at:'2026-09-01T00:00:00Z',
    legs:[{outcome_id:2,market_id:1,label:'Team <A>',market:'Team <A> vs B',odds_american:-150,status:'lost'}]
  });
  const view=fakeView();
  await render(view);
  expect(view.innerHTML).toContain('data-dismiss-bet="11"');
  expect(view.innerHTML).not.toContain('data-cancel-bet="11"');
  bets.length=0;
});
