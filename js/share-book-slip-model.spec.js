import {it,expect} from 'vitest';
import {bookSlipView} from './share-book-slip-model.js';
const spec=(extra={})=>({template:'ticket',ticket:{picks:[{pick:'A',odds:'+120',status:'won'},{pick:'B',odds:'-110',status:'won'}],stake:25,ret:105,profit:80,odds:'+320',status:'won',...extra}});
it('prints the authoritative return and profit for a won parlay',()=>{
 const v=bookSlipView(spec());expect(v.status).toBe('WON');expect(v.returnValue).toBe(105);expect(v.returnLabel).toBe('Total return');expect(v.profit).toEqual({label:'Profit',value:80});expect(v.picks.every(p=>p.mark==='check-lg')).toBe(true);
});
it('keeps provisional hits distinct from official payment',()=>{
 const v=bookSlipView(spec({status:'open',gradingPending:true,liveResult:'won',picks:[{pick:'A',status:'won',pending:true}]}));expect(v.status).toBe('HIT · PENDING');expect(v.returnLabel).toBe('Potential return');expect(v.picks[0].resultLabel).toBe('Hit · grading pending');expect(v.banter).not.toContain('Cash');
});
it('does not show profit or winning returns for a missed or void ticket',()=>{
 const lost=bookSlipView(spec({status:'lost'})),voided=bookSlipView(spec({status:'void'}));expect(lost.returnValue).toBe(0);expect(lost.profit).toBeNull();expect(voided.returnValue).toBe('—');expect(voided.profit).toBeNull();
 const pulled=bookSlipView(spec({status:'void',pulled:true}));expect(pulled.returnValue).toBe(25);expect(pulled.status).toBe('PULLED');expect(pulled.returnLabel).toBe('Refunded');
});
it('retains pending miss/refund labels and never treats a projected outcome as settled',()=>{
 const v=bookSlipView(spec({status:'open',gradingPending:true,liveResult:'lost',pendingReturn:{label:'Est. return',value:0}}));expect(v.returnValue).toBe(0);expect(v.returnLabel).toBe('Est. return');expect(v.status).toBe('MISS · PENDING');expect(v.profit).toBeNull();
});
it('makes compact omissions explicit and full exports retain every selection',()=>{
 const s=spec({picks:Array.from({length:10},(_,i)=>({pick:'Pick '+i,status:i===9?'lost':'won'}))});expect(bookSlipView(s).omitted).toBe(4);expect(bookSlipView(s,'full').picks).toHaveLength(10);expect(bookSlipView(s,'full').picks[9].mark).toBe('x-lg');
});
