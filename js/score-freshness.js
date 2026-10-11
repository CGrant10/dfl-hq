export function scoreFreshness({checkedAt=null,state='ready',nflAvailable=true,playersAvailable=true,completed=false,now=Date.now()}={}) {
  const minutes=checkedAt==null?null:Math.max(0,Math.floor((now-checkedAt)/60000));
  const age=minutes==null?'':minutes<1?'just now':`${minutes}m ago`;
  if(state==='offline')return {state:'offline',text:checkedAt==null?'Offline · scores unavailable':`Offline · last checked ${age}`};
  if(state==='error')return {state:'error',text:checkedAt==null?'Scores unavailable · try Refresh':`Refresh unavailable · last checked ${age}`};
  if(state==='checking')return {state:'checking',text:checkedAt==null?'Checking scores…':`Updating · last checked ${age}`};
  if(checkedAt==null)return {state:'checking',text:'Checking scores…'};
  const notes=[!completed&&!nflAvailable?'NFL status unavailable':'',!completed&&!playersAvailable?'Lineup status unavailable':''].filter(Boolean);
  const delayed=!completed&&minutes>=2;
  return {state:delayed||notes.length?'delayed':'ready',text:[`${delayed?'Scores delayed · last checked':'Checked'} ${age}`,...notes].join(' · ')};
}

export function mountScoreFreshness(node,{onChange=(_values)=>{}}={}) {
  let values={},stopped=false;
  const paint=()=>{if(stopped)return;const view=scoreFreshness(values);if(node){if(node.textContent!==view.text)node.textContent=view.text;node.dataset.scoreFreshness=view.state}onChange(values)};
  const timer=setInterval(paint,30000);
  return {update(next){values={...values,...next};paint()},stop(){stopped=true;clearInterval(timer)}};
}
