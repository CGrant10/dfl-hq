import {shareLayoutView} from './share-layout-model.js';

/** Official settlement owns payout; provisional hits never become paid slips. */
export function bookSlipView(spec,format='compact') {
 const view=shareLayoutView(spec,format);if(view?.template!=='ticket')return null;
 const t=view.ticket,pending=t.status==='open'&&t.gradingPending;
 const status=t.pulled?'PULLED':pending?(t.liveResult==='won'?'HIT · PENDING':t.liveResult==='lost'?'MISS · PENDING':t.liveResult==='void'?'PUSH · PENDING':'OPEN'):{won:'WON',lost:'LOST',void:'VOID',open:'OPEN'}[t.status]||'OPEN';
 const returnLabel=t.pendingReturn?.label||(t.pulled?'Refunded':t.status==='won'?'Total return':t.status==='lost'?'Returned':t.status==='void'?'Void':'Potential return');
 const profit=t.status==='won'?{label:'Profit',value:Math.max(0,Number(view.returnValue)-Number(t.stake))}:t.status==='open'&&!t.pendingReturn?{label:'Potential profit',value:t.profit}:null;
 const banter=t.status==='won'?'Cash it. Talk shit.':t.status==='lost'?'Well, shit.':t.pulled?'Pulled the plug.':t.status==='void'?'Run it back.':'Let the ticket talk.';
 return {...view,status,returnLabel,profit,banter,picks:view.picks.map(p=>({...p,mark:p.status==='won'?'check-lg':p.status==='lost'?'x-lg':p.status==='void'?'dash-lg':'clock',result:p.result||'',resultLabel:p.pending?`${{won:'Hit',lost:'Miss',void:'Push'}[p.status]||'Open'} · grading pending`:{won:'Hit',lost:'Miss',void:'Push',open:'Pending'}[p.status]||'Pending'}))};
}
