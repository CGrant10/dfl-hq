import {shareLayoutView} from './share-layout-model.js';
const signed=n=>`${Number(n)>0?'+':''}${Number(n||0).toFixed(1)}`;
const score=n=>n==null?'—':Number(n).toFixed(2);
const section=(label,rows=[],copy='')=>({label,rows,copy});

// A presentation adapter only: retain settlement, routing and omission semantics.
export function nightGameContent(spec,format='compact'){
 const view=shareLayoutView(spec,format),full=format==='full';
 const base={title:spec.photoHeadline||spec.headline||spec.kind,label:spec.kind,primary:null,context:spec.context,status:spec.status,credit:'',sections:[],footer:spec.footer||'DFL HQ'};
 if(view?.template==='trade'){
  const t=view.trade;
  return {...base,title:t.call==='REVIEW'?'CHECK\nDATA.':`${t.call||'TRADE'}.`,label:'DFLyzer verdict',primary:{label:'Trade balance',value:`${t.fairness}%`},
   sections:[...(t.confidence?[section('Data quality',[],`${t.confidence.label}${full?` · ${t.confidence.reasons.join(' ')}`:''}`)]:[]),
    ...view.columns.map(c=>section(`${c.from} → ${c.to}`,[...c.players.map(p=>({name:p.name,detail:p.meta,value:String(p.value)})),...(c.omitted?[{name:`+ ${c.omitted} more player${c.omitted===1?'':'s'}`}]:[]),{name:'Package value',value:String(c.total)}])),
    section('Lineup impact',t.deltas.map(d=>({name:d.team,value:`${signed(d.delta)} / wk`})))],
   notes:view.remarks.map(r=>[r.title,full?r.copy:null].filter(Boolean).join(' '))};
 }
 if(view?.template==='ticket'){
  const t=view.ticket,pending=t.status==='open'&&t.gradingPending;
  const title=t.pulled?'PULLED.':pending?`${view.status.toUpperCase()}.`:({won:'CASHED.',lost:'MISSED.',void:'PUSH.',open:'ON THE\nBOARD.'}[t.status]||view.status.toUpperCase());
  return {...base,title,label:`${t.picks.length===1?'Single':`${t.picks.length}-pick`} entry`,status:pending?'GRADING PENDING':t.status==='open'?'OPEN':view.status.toUpperCase(),
   primary:{label:view.returnLabel,value:`${view.returnValue}${view.returnValue==='—'?'':' SIN'}`},
   sections:[section('Ticket',[{name:'Odds',value:t.odds},{name:t.pulled?'Refunded stake':'Stake',value:`${t.stake} SIN`}]),
    section('Your picks',view.picks.map((p,i)=>({name:p.pick,detail:p.market,value:p.odds,mark:p.status,status:p.pending?`${{won:'HIT',lost:'MISS',void:'PUSH'}[p.status]||p.status.toUpperCase()} · PENDING`:p.status.toUpperCase(),index:i+1}))),
    ...(view.omitted?[section('More picks',[{name:`+ ${view.omitted} more picks`}])]:[]),
    ...(t.status==='open'&&(!t.gradingPending||t.liveResult==='open')?[section('Potential profit',[],`${t.profit} SIN if ${t.picks.length===1?'the pick lands':'all picks land'}.`)]:[])]};
 }
 if(view?.template==='recap'){
  const r=view.recap,h=r.hero||{};
  return {...base,title:r.title||spec.headline,label:h.label||'Week highlights',primary:{label:h.name||'',value:h.value??''},
   sections:[...(r.mvp?[{...section(r.mvp.label||'League MVP',[{name:r.mvp.name,value:`${score(r.mvp.points)} PTS`}]),prominent:true}]:[]),
    ...view.highlights.map(h=>section(h.label,[{name:h.name,detail:h.detail,value:h.value}])),
    ...(view.omitted?[section('More highlights',[{name:`+ ${view.omitted} more highlights`}])]:[]),
    ...(full&&r.story?[section('The week',[],r.story)]:[]),...view.sections],notes:h.detail?[h.detail]:[]};
 }
 if(view?.template==='profile'){
  const p=view.profile;
  return {...base,title:p.who,label:'Scouting report',primary:{label:p.team,value:p.record},
   sections:[section('Career',[{name:'Win percentage',value:p.winPct==null?'—':`${Math.round(p.winPct*100)}%`},{name:'Points',value:p.points},{name:'Average finish',value:p.avgFinish},{name:'Seasons',value:String(p.seasons)}]),
    section('Trophy case',view.trophies.map(([name,value])=>({name,value}))),section('Crime scene',view.crimes.map(([name,value])=>({name,value}))),
    ...(view.omitted?[section('More receipts',[{name:`+ ${view.omitted} more career receipts`}])]:[]),section('DFLyzer verdict',[],p.verdict)]};
 }
 if(spec.kind==='Matchup final')return {...base,...spec.nightGame,sections:[section('Final scores',spec.results.map(r=>({name:r.label,value:r.value}))),...spec.sections]};
 return {...base,primary:spec.results?.length===1?spec.results[0]:null,sections:[...(spec.results?.length>1?[section('Results',spec.results.map(r=>({name:r.label,value:r.value})))]:[]),...(spec.sections||[])],notes:spec.summary?[spec.summary]:[]};
}
