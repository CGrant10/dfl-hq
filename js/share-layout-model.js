const score=value=>value==null?'—':Number(value).toFixed(2);
const signed=value=>`${Number(value)>0?'+':''}${Number(value||0).toFixed(1)}`;

/** A highlight image explicitly counts omissions; the full view retains its source. */
export function shareLayoutView(spec,format='compact') {
 const full=format==='full';
 if(spec.template==='trade') {
  const t=spec.trade,limit=t.columns.length>2?1:3;
  return {template:'trade',full,trade:t,columns:t.columns.map(c=>({...c,players:full?c.players:c.players.slice(0,limit),omitted:full?0:Math.max(0,c.players.length-limit)})),remarks:full?t.remarks||[]:(t.remarks||[]).slice(0,1)};
 }
 if(spec.template==='ticket') {
  const t=spec.ticket,labels={open:'On the board',won:'Cashed',lost:'Torn up',void:'Voided'};
  return {template:'ticket',full,ticket:t,picks:full?t.picks:t.picks.slice(0,5),omitted:full?0:Math.max(0,t.picks.length-5),status:t.pulled?'Pulled':labels[t.status]||t.status,returnLabel:t.pulled?'Refunded':t.status==='won'?'Paid':t.status==='lost'?'Returned':t.status==='void'?'Void':'To return',returnValue:t.pulled?t.stake:t.status==='lost'?0:t.status==='void'?'—':t.ret};
 }
 if(spec.template==='recap') {
  const r=spec.recap;
  return {template:'recap',full,recap:r,highlights:full?r.allHighlights||r.highlights:r.highlights.slice(0,3),omitted:full?0:Math.max(0,r.highlights.length-3),sections:full?spec.detailSections||[]:[]};
 }
 if(spec.template==='profile') {
  const p=spec.profile;
  return {template:'profile',full,profile:p,trophies:full?p.trophyCase:p.trophyCase.slice(0,2),crimes:full?p.crimeScene:p.crimeScene.slice(0,2),omitted:full?0:Math.max(0,p.trophyCase.length-2)+Math.max(0,p.crimeScene.length-2)};
 }
 return null;
}

export function shareImageDescription(spec,format='compact') {
 const v=shareLayoutView(spec,format);if(!v)return `${spec.kind}: ${spec.summary||spec.headline}`;
 const rows=[spec.kind,spec.context,v.full?'Full details':'Highlights'];
 if(v.template==='trade') {
  const t=v.trade;rows.push(`Verdict: ${t.call}. Trade balance: ${t.fairness}%.`);
  for(const c of v.columns)rows.push(`${c.from} sends to ${c.to}: ${c.players.map(p=>`${p.name}, ${p.meta||''}, value ${p.value}`).join('; ')||'No players'}. ${c.omitted?`${c.omitted} more players. `:''}Package value ${c.total}.`);
  rows.push(...t.deltas.map(d=>`${d.team}: ${signed(d.delta)} points per week.`),...v.remarks.map(r=>[r.title,v.full?r.copy:''].filter(Boolean).join('. ')));
 }else if(v.template==='ticket') {
  const t=v.ticket;rows.push(`${v.status}. ${t.picks.length} picks. Odds ${t.odds}. Stake ${t.stake} SIN. ${v.returnLabel} ${v.returnValue}${v.returnValue==='—'?'':' SIN'}.`);
  rows.push(...v.picks.map((p,i)=>`Pick ${i+1}: ${p.pick}. ${p.market}. Odds ${p.odds}. ${p.status}.`));if(v.omitted)rows.push(`${v.omitted} more picks.`);if(t.status==='open')rows.push(`Potential profit ${t.profit} SIN. All picks must land.`);
 }else if(v.template==='recap') {
  const r=v.recap;rows.push([r.hero?.label,r.hero?.name,r.hero?.value,r.hero?.detail].filter(Boolean).join('. '));if(r.mvp)rows.push(`${r.mvp.label||'MVP'}: ${r.mvp.name}, ${score(r.mvp.points)} points.`);
  rows.push(...v.highlights.map(h=>[h.label,h.name,h.value,h.detail].filter(Boolean).join('. ')));if(v.full)rows.push(r.story||'',...v.sections.map(s=>[s.label,...(s.rows||[]).map(r=>[r.name,r.value,r.detail].filter(Boolean).join(', ')),s.copy].filter(Boolean).join('. ')));if(v.omitted)rows.push(`${v.omitted} more highlights.`);
 }else if(v.template==='profile') {
  const p=v.profile;rows.push(p.who,p.team,`Record ${p.record}. Win percentage ${p.winPct==null?'—':Math.round(p.winPct*100)+'%'}. Points ${p.points}. Average finish ${p.avgFinish}. ${p.seasons} seasons.`,'Trophy case: '+(v.trophies.map(r=>r.join(', ')).join('; ')||'No achievements yet'),'Crime scene: '+(v.crimes.map(r=>r.join(', ')).join('; ')||'No receipts yet'));if(v.omitted)rows.push(`${v.omitted} more career receipts.`);rows.push(p.verdict);
 }
 rows.push(spec.footer);return rows.filter(Boolean).join('\n');
}

export function shareExportFilename(filename,format,style) {
 const base=String(filename||'dfl-share.png').replace(/\.png$/i,'');return `${base}-${format==='full'?'full':'highlights'}${style==='photo'?'-photo':''}.png`;
}
