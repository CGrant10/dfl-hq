import {bookLegResult} from './sportsbook-fantasy-results.js';
const numeric=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value))?Number(value):null;
const number=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:2});
/** This describes the latest observed stat. It never settles a leg or a wallet. */
export function ticketLegView(leg,now=Date.now()){
 const result=bookLegResult(leg,now),line=numeric(leg.accepted_line??leg.provider_line),score=numeric(leg.provider_score),side=String(leg.provider_side||'').toLowerCase();
 const stats=line!==null&&score!==null,comparable=stats&&['over','under'].includes(side);
 const ratio=stats&&line>0?Math.max(0,Math.min(1,score/line)):null;
 const value=stats?`${number(score)} / ${number(line)}`:'';
 if(result.status!=='open'){
  const status={won:'Hit',lost:'Miss',void:'Push'}[result.status],tone={won:'is-ahead',lost:'is-behind',void:'is-push'}[result.status];
  return {state:result.status,tone,text:status+(result.pending?' · pending':''),value,line,score,ratio,pending:result.pending,priority:result.status==='won'?3:0,icon:{won:'check-lg',lost:'x-lg',void:'dash-lg'}[result.status],side};
 }
 const atLine=comparable&&score===line,ahead=comparable&&!atLine&&(side==='over'?score>line:score<line);
 const text=comparable?(atLine?'At line':ahead?'Winning':'Behind'):stats?'Awaiting result':leg.market_status==='locked'?'Awaiting stats':'Not started';
 return {state:comparable?(atLine?'at-line':ahead?'winning':'behind'):'open',tone:comparable?(atLine?'is-push':ahead?'is-ahead':'is-behind'):'',text,value,line,score,ratio,side,pending:false,priority:comparable&&!ahead&&!atLine?1:comparable?2:4,icon:null};
}
/** Include a hidden miss/void or sweating leg before ordinary untouched legs. */
export function ticketPreviewIndices(views,limit=2){
 return views.map((view,index)=>({priority:view.priority,index})).sort((a,b)=>a.priority-b.priority||a.index-b.index).slice(0,limit).map(v=>v.index).sort((a,b)=>a-b);
}
