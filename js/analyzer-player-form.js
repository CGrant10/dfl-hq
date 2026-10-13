import {scorePlayer} from './dfl-scoring.js';
import {playerTemperature} from './score-temperature.js';
const numeric = value => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const club = value => ({JAC:'JAX',WSH:'WAS',LA:'LAR'}[value] || value);

export function completedCurrentGames(rows, schedule, season, week) {
  return (rows || []).filter(row => validResult(row,season,week) && schedule?.get(club(row.team || row.player?.team))?.key === 'final');
}
function validResult(row,season,week) {
  return Number(row?.season) === Number(season) && Number(row?.week) === Number(week) && row?.season_type === 'regular'
    && row.stats && numeric(row.stats.gp) > 0;
}
/** Current score is separate from the projection and the multi-game trend. */
export function applyAnalyzerPlayerForm(pool, {season,week,scoring,completed=[],current={data:[]},matchups=[],schedule=null} = {}) {
  const actual = new Map();
  for (const row of matchups || []) for (const [id,points] of Object.entries(row.players_points || {})) {
    const value=numeric(points);if(value!=null)actual.set(String(id),value);
  }
  const currentRows = new Map((current.data || []).filter(row=>validResult(row,season,week)).map(row=>[String(row.player_id),row]));
  const rated=new Map(pool);
  for(const p of pool.values())for(const option of p.waiverOptions||[])rated.set(option.id,option);
  for (const player of rated.values()) {
    player.scoreHistory=completed.filter(bundle=>!bundle.stale&&bundle.data?.length&&Number(bundle.week)<Number(week)).map(bundle=>{
      const row=bundle.data.find(row=>String(row.player_id)===String(player.id)&&validResult(row,season,bundle.week));
      return {season:Number(season),week:Number(bundle.week),points:row?scorePlayer(row.stats,scoring):0};
    });
    let latest=null;
    for (const bundle of completed) {
      const row=(bundle.data || []).find(row=>String(row.player_id)===String(player.id)&&validResult(row,season,bundle.week));
      if(row)latest={week:bundle.week,points:scorePlayer(row.stats,scoring),state:'final',afterHalftime:true,stale:!!bundle.stale};
    }
    const row=currentRows.get(String(player.id)),status=schedule?.get(club(player.nflTeam));
    // Pregame zeroes are not an actual performance. A current stats row is
    // needed before trusting a score, including commissioner corrections.
    if((row && status?.key!=='upcoming') || actual.has(String(player.id))&&['live','final'].includes(status?.key))latest={week,points:actual.get(String(player.id)) ?? scorePlayer(row.stats,scoring),
      state:status?.key || 'unknown',afterHalftime:status?.afterHalftime===true,stale:!!current.stale};
    player.gameForm = latest;
  }
  return pool;
}
export function analyzerPlayerSignal(player = {}) {
  if(player.injuryStatus)return player.injuryStatus;
  const form=player.gameForm;
  if(!form || numeric(form.points)==null)return '';
  const heat=form.stale?'neutral':playerTemperature(form.points,form.state,form.afterHalftime);
  return `${heat==='hot'?'HOT · ':heat==='cold'?'COLD · ':''}W${form.week} · ${form.points.toFixed(1)}`;
}
