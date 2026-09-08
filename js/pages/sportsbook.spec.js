import { it, expect, vi } from 'vitest';
const { markets, outcomes } = vi.hoisted(() => ({
  markets: [{id:1,category:'Fantasy',status:'open',title:'Team <A> vs B'}],
  outcomes: [{id:2,market_id:1,label:'Team <A>',odds_american:-150}]
}));
vi.mock('../supabase.js', () => ({hasPermission:()=>false, db:()=>({
  rpc:async name=>({data:name==='sportsbook_touch_wallet'?[{balance:2400}]:[],error:null}),
  from:table=>{const query={select:()=>query,order:()=>query,limit:()=>query,then:resolve=>resolve({data:table==='sportsbook_markets'?markets:outcomes,error:null})};return query;}
})}));
vi.mock('../members.js',()=>({currentMember:()=>({display_name:'Preview'})}));
vi.mock('../sportsbook-ticket.js',()=>({shareTicket:vi.fn()}));
import { render } from './sportsbook.js';

it('renders the real markets and wallet with separate accessible ticket panel', async()=>{
  const view={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
  await render(view);
  expect(view.innerHTML).toContain('2,400');
  expect(view.innerHTML).toContain('Team &lt;A&gt;');
  expect(view.innerHTML).toContain('data-bet-outcome="2"');
  expect(view.innerHTML).toContain('id="sb-tickets" role="tabpanel" aria-labelledby="sb-tab-tickets" hidden');
  expect(view.innerHTML).toContain('No tickets yet');
  expect(view.innerHTML).not.toContain('Projected');
});
