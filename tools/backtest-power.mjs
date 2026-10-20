import {readFileSync,writeFileSync} from 'node:fs';
import {buildPowerBoards,POWER_WEIGHTS} from '../js/league-power-model.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/dfl-power-history.json',import.meta.url)));
const sets={training:[2019,2020,2021,2022,2023],validation:[2024],holdout:[2025]};
for(const season of Object.values(sets).flat())for(let week=1;week<=fixture.regularSeasonWeeks[season];week++){
 const slate=fixture.games.filter(g=>g[0]===season&&g[1]===week);
 if(slate.length!==6||new Set(slate.flatMap(g=>[g[2],g[3]])).size!==12||slate.some(g=>!Number.isFinite(g[4])||!Number.isFinite(g[5])))throw Error(`Incomplete historical slate: ${season} Week ${week}`);
}
const candidates=[{allPlay:.6,recent:.3,record:.1},{allPlay:.7,recent:.2,record:.1},{allPlay:.5,recent:.4,record:.1},{allPlay:.8,recent:.1,record:.1},{allPlay:.6,recent:.2,record:.2}];
function evaluate(seasons,weights,baseline=false){let hits=0,total=0,windows=0;
 for(const season of seasons){
  const games=fixture.games.filter(g=>g[0]===season).map(g=>({season,week:g[1],roster1:g[2],roster2:g[3],score1:g[4],score2:g[5]}));
  const ids=[...new Set(games.flatMap(g=>[g.roster1,g.roster2]))],teams=ids.map(id=>({id:String(id),roster_id:id}));
  for(let week=3;week<fixture.regularSeasonWeeks[season];week++){
   const built=buildPowerBoards({teams,matchups:games,currentWeek:week+1,season,weights});
   if(built.latestWeek!==week)continue;
   const next=games.filter(g=>g.week===week+1),scores=new Map(next.flatMap(g=>[[String(g.roster1),g.score1],[String(g.roster2),g.score2]]));
   if(scores.size!==teams.length||next.length*2!==teams.length)continue;
   const rows=built.boards.at(-1).rows;
   if(baseline)rows.sort((a,b)=>(b.wins+b.ties*.5)/b.history.length-(a.wins+a.ties*.5)/a.history.length||b.points-a.points);
   windows++;
   for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=scores.get(rows[i].id),b=scores.get(rows[j].id);if(a===b)continue;hits+=a>b?1:0;total++;
   }
  }
 }
 return {pairwiseAccuracy:Math.round(hits/total*10000)/100,correct:hits,comparisons:total,weeklyWindows:windows};
}
const tuned=candidates.map(weights=>({weights,training:evaluate(sets.training,weights)})).sort((a,b)=>b.training.pairwiseAccuracy-a.training.pairwiseAccuracy);
const selected=tuned[0];
if(Object.keys(POWER_WEIGHTS).some(k=>POWER_WEIGHTS[k]!==selected.weights[k]))throw Error('The shipped performance weights differ from the training-only selection. Review calibration.');
const result={method:'Predict next-week pairwise scoring order using only earlier completed regular-season weeks. No historical roster forecasts are available; this evaluates performance weights only. Playoff games are excluded.',games:fixture.games.length,regularSeasonWeeks:fixture.regularSeasonWeeks,sets,candidates:tuned,selected:selected.weights,validation:evaluate(sets.validation,selected.weights),holdout:evaluate(sets.holdout,selected.weights),baselineValidation:evaluate(sets.validation,selected.weights,true),baselineHoldout:evaluate(sets.holdout,selected.weights,true)};
if(process.env.DFL_POWER_BACKTEST_REPORT)writeFileSync(process.env.DFL_POWER_BACKTEST_REPORT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
