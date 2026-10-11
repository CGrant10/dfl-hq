import {describe,it,expect,vi} from 'vitest';
vi.mock('./supabase.js',()=>({db:vi.fn()}));
import {createPlayerSearchIndex,searchPlayerIndex} from './player-search-index.js';
import {playerSearchResults} from './league-search.js';

const players=Object.fromEntries(Array.from({length:300},(_,i)=>[String(i+1),{
  n:`${['Josh Allen','James Cook','CeeDee Lamb','Amon-Ra St. Brown','Allen Robinson'][i%5]} ${i%9}`,
  p:['QB','RB','WR','TE','DE'][i%5],t:['BUF','DAL','DET','FA'][i%4],s:i%3?'Active':'Inactive'
}]));
const oldLeague=(data,query)=>{
  const terms=String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);
  return terms.length?Object.entries(data).filter(([,p])=>terms.every(t=>`${p.n} ${p.p} ${p.t}`.toLowerCase().includes(t)))
    .sort(([,a],[,b])=>Number(b.s==='Active')-Number(a.s==='Active')||a.n.localeCompare(b.n)).slice(0,12).map(([id])=>id):[];
};

describe('indexed player search',()=>{
  it('preserves league results, active-first order, tied-name order and multiword matching',()=>{
    for(const query of ['', '  ', 'ALLEN', 'cook rb', 'st. brown', 'BUF', 'wr dal', 'nobody', 'josh allen 0']) {
      expect(playerSearchResults(players,query).map(p=>p.id)).toEqual(oldLeague(players,query));
    }
  });
  it('enumerates once across repeated searches and rebuilds for refreshed player snapshots',()=>{
    let scans=0;
    const snapshot=new Proxy({1:{n:'Example Player',p:'QB',t:'BUF',s:'Active'}},{ownKeys(target){scans++;return Reflect.ownKeys(target)}});
    expect(playerSearchResults(snapshot,'example')[0].detail).toContain('BUF');
    playerSearchResults(snapshot,'qb');playerSearchResults(snapshot,'player');
    expect(scans).toBe(1);
    const refreshed={1:{...snapshot[1],t:'DAL'}};
    expect(playerSearchResults(refreshed,'example')[0].detail).toContain('DAL');
    expect(playerSearchResults(refreshed,'buf')).toEqual([]);
  });
  it('preserves watchlist eligibility, original order and its eight-result limit',()=>{
    const eligible=p=>['QB','RB','WR','TE','K','DEF'].includes(p.p)&&['BUF','DAL','DET'].includes(p.t);
    const index=createPlayerSearchIndex(players,{eligible,fields:['n','t','p']});
    for(const query of ['allen', 'COOK', 'dal wr', 'st. brown', 'josh', 'FA', 'DE']) {
      const terms=query.toLowerCase().split(/\s+/);
      const previous=Object.entries(players).filter(([,p])=>eligible(p)&&terms.every(t=>`${p.n} ${p.t} ${p.p}`.toLowerCase().includes(t))).slice(0,8);
      expect(searchPlayerIndex(index,query,8)).toEqual(previous);
    }
  });
  it('stops after enough results instead of visiting the remaining database',()=>{
    let reads=0;
    const index=Array.from({length:20000},(_,i)=>({entry:[String(i),{}],get text(){reads++;return 'matching player'}}));
    expect(searchPlayerIndex(index,'matching',8)).toHaveLength(8);
    expect(reads).toBe(8);
    reads=0;expect(searchPlayerIndex(index,'  ',8)).toEqual([]);expect(reads).toBe(0);
  });
});
