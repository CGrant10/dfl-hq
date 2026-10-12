import {describe, it, expect, vi} from 'vitest';
import {createTradeOfferCatalog} from './trade-offer-catalog.js';
const flush = async () => { for (let i=0;i<6;i++) await Promise.resolve(); };
const offers = (tier, count) => Array.from({length:count}, (_,id) => ({tier,id}));
function setup(options={}) {
  const jobs=[],onChange=vi.fn();
  const search={run:vi.fn(query=>new Promise((resolve,reject)=>jobs.push({query,resolve,reject}))),cancel:vi.fn(),stop:vi.fn()};
  const catalog=createTradeOfferCatalog({search,onChange,...options});
  return {jobs,search,catalog,onChange};
}
describe('trade tier counts',()=>{
  it('publishes the selected tier first and counts each tier from its own search',async()=>{
    const {catalog,jobs,search}=setup(),query={intent:'fair',partnerId:'2',limit:96};
    expect(catalog.read('one',query)).toMatchObject({state:'loading',counts:{fair:null,aggressive:null,steal:null}});
    jobs[0].resolve([...offers('fair',8),...offers('aggressive',2)]);await flush();
    expect(catalog.read('one',query)).toMatchObject({state:'ready',counts:{fair:8,aggressive:null,steal:null}});
    expect(jobs[1].query).toEqual({...query,intent:'aggressive'});
    jobs[1].resolve(offers('aggressive',13));await flush();
    jobs[2].resolve(offers('fair',3));await flush();
    expect(catalog.read('one',query).counts).toEqual({fair:8,aggressive:13,steal:0});
    expect(catalog.read('one',{...query,intent:'aggressive'}).offers).toHaveLength(13);
    expect(search.run).toHaveBeenCalledTimes(3);
    catalog.stop();
  });
  it('prioritizes an unsearched tab and ignores the interrupted tier result',async()=>{
    const {catalog,jobs,search}=setup();
    catalog.read('one',{intent:'fair'});jobs[0].resolve(offers('fair',1));await flush();
    expect(jobs[1].query.intent).toBe('aggressive');
    catalog.read('one',{intent:'steal'});
    expect(search.cancel).toHaveBeenCalledOnce();expect(jobs[2].query.intent).toBe('steal');
    jobs[1].resolve(offers('aggressive',99));await flush();
    expect(catalog.read('one',{intent:'steal'}).counts.aggressive).toBeNull();
    jobs[2].resolve(offers('steal',4));await flush();
    expect(jobs[3].query.intent).toBe('aggressive');
    jobs[3].resolve(offers('aggressive',2));await flush();
    expect(catalog.read('one',{intent:'steal'}).counts).toEqual({fair:1,aggressive:2,steal:4});
    catalog.stop();
  });
  it('resets counts for changed filters and blocks late results from the old query',async()=>{
    const {catalog,jobs,onChange}=setup();
    catalog.read('old',{intent:'fair',receiveAnchorIds:['old-player']});
    const next=catalog.read('new',{intent:'fair',receiveAnchorIds:['new-player']});
    expect(next.counts.fair).toBeNull();
    jobs[0].resolve(offers('fair',99));await flush();expect(onChange).not.toHaveBeenCalled();
    jobs[1].resolve(offers('fair',2));await flush();
    expect(catalog.read('new',{intent:'fair'}).counts.fair).toBe(2);
    catalog.stop();
  });
  it('does not turn a failed count into zero or discard successful tiers',async()=>{
    const {catalog,jobs,search}=setup(),query={intent:'fair'};
    catalog.read('one',query);jobs[0].reject(Error('Unavailable'));await flush();
    expect(catalog.read('one',query)).toMatchObject({state:'error',counts:{fair:null},countErrors:{fair:true}});
    jobs[1].resolve(offers('aggressive',3));await flush();jobs[2].resolve([]);await flush();
    expect(search.run).toHaveBeenCalledTimes(3);
    catalog.retry('one','fair');catalog.read('one',query);jobs[3].resolve(offers('fair',6));await flush();
    expect(catalog.read('one',query).counts).toEqual({fair:6,aggressive:3,steal:0});
    expect(search.run).toHaveBeenCalledTimes(4);catalog.stop();
  });
  it('pauses background work in manual mode and resumes without rerunning settled tiers',async()=>{
    const {catalog,jobs,search}=setup(),query={intent:'fair'};
    catalog.read('one',query);jobs[0].resolve(offers('fair',2));await flush();catalog.cancel();
    jobs[1].resolve(offers('aggressive',99));await flush();
    expect(catalog.read('one',query).counts.fair).toBe(2);
    expect(jobs[2].query.intent).toBe('aggressive');
    catalog.stop();jobs[2].resolve(offers('aggressive',5));await flush();
    expect(catalog.read('one',query).state).toBe('error');expect(search.stop).toHaveBeenCalledOnce();
  });
  it('bounds cached setups while keeping all three categories for each',async()=>{
    const {catalog,jobs}=setup({cacheLimit:1}),query={intent:'fair'};
    catalog.read('one',query);jobs[0].resolve(offers('fair',1));await flush();
    catalog.read('two',query);jobs[2].resolve(offers('fair',2));await flush();
    expect(catalog.read('one',query).counts.fair).toBeNull();catalog.stop();
  });
});
