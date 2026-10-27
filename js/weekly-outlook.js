// =====================================================================
// weekly-outlook.js - who to start THIS week, and why
// ---------------------------------------------------------------------
// team-analyzer.js answers "how good is this roster over a season". That is
// the right question in July and the wrong one on a Saturday, when the only
// thing that matters is which eleven names go in the lineup tomorrow.
//
// This module is season-blind on purpose. A season-long stud on a bye is
// worth nothing this week; a WR3 against the league's most generous
// secondary is worth a lot. Those two facts are invisible to a season model
// and decisive to a weekly one.
//
// WHAT IT WILL NOT DO IS PRETEND. Three rules, because a lineup tool that
// bluffs is worse than none:
//
//   1. A player with no projection for this week is UNKNOWN, never zero. A
//      missing row means Sleeper has not published one, not that he will
//      score nothing, and scoring it as zero would bench a healthy starter.
//   2. Advice is only given when the margin clears a threshold. Weekly
//      projections are not precise to a tenth of a point, so presenting a
//      0.2 gap as a start/sit call invents certainty nobody has.
//   3. Every recommendation carries its reason and its margin, so the
//      manager overrules it with better information than it had.
//
// Pure functions, no fetching and no DOM - see sleeper.js for the data and
// weekly-outlook-panel.js for the rendering.
// =====================================================================

import { scorePlayer } from "./dfl-scoring.js";
import {playerLiveState} from './live-score.js';

/* The lineup this league actually submits. Mirrors team-analyzer.js so the
   two cannot disagree about what a legal lineup is. */
export const WEEKLY_STARTERS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 };
export const FLEX_ELIGIBLE = new Set(["RB", "WR", "TE"]);

/* Below this, the projections are not telling us anything we should act on. */
export const SWAP_THRESHOLD = 1.5;

/* Sleeper's own words for "this man may not play". */
const OUT_STATUSES = new Set(["Out", "IR", "PUP", "Sus", "NA", "DNR"]);
const RISKY_STATUSES = new Set(["Questionable", "Doubtful"]);

const num = value => (value == null || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null);
const idOf = row => (row?.player_id == null ? "" : String(row.player_id));

/**
 * Fold one week of Sleeper projection rows into a per-player view.
 *
 * @param {Object[]} rows            raw rows from loadWeeklyProjections()
 * @param {Object}   scoringSettings the league's own scoring
 * @returns {Map<string, Object>}
 */
export function buildWeeklyPool(rows = [], scoringSettings = null, {players=new Map(),schedule=null}={}) {
  const pool = new Map();
  for (const row of rows || []) {
    const id = idOf(row);
    if (!id) continue;
    const known=players.get(id),meta = row.player || {};
    const position = String(known?.position || meta.position || "").toUpperCase();
    const status = known ? known.injuryStatus ?? null : row.injury_status ?? meta.injury_status ?? null;
    /* gp is Sleeper's own "is he playing this week" flag, but it is absent
       for most rows: of 3,114 week-1 rows only ~400 carry a real projection,
       and those are exactly the ones naming an opponent. The rest score 0
       against nobody - filler that would otherwise sit in a lineup slot
       looking like advice. No opponent and no gp means not scheduled. */
    const games = num(row.stats?.gp);
    const opponent = row.opponent || null;
    const team=known?.nflTeam||row.team||meta.team||null,nfl=schedule?.get(({WSH:'WAS',JAC:'JAX',LA:'LAR'}[team]||team));
    const gameStatus = nfl?.key==='live'?'live':nfl?.key==='final'?'final':row.game_status || row.game?.status || row.metadata?.game_status || "";
    pool.set(id, {
      id,
      position,rostered:!!known,outForSeason:!!known?.outForSeason,
      name: known?.name||[meta.first_name, meta.last_name].filter(Boolean).join(" ") || id,
      team,
      opponent,
      gameId: row.game_id || null,
      gameStatus,
      kickoff:nfl?.kickoff||row.date||row.game?.date||null,
      recentAverage:known?.staleSignals?.includes('weeklyResults')?null:num(known?.recentAverage),recentGames:num(known?.recentGames)||0,
      gameLabel:nfl?.label||'',scheduleKnown:games!=null||!!opponent||!!nfl,
      week: num(row.week),
      points: row.stats ? scorePlayer(row.stats, scoringSettings) : null,
      injuryStatus: status,
      isOut: !!known?.isOut || OUT_STATUSES.has(String(status)),
      isRisky: !known?.isOut && (!!known?.isRisky || RISKY_STATUSES.has(String(status))),
      hasGame: nfl ? true : games == null ? Boolean(opponent) : games > 0,
    });
  }
  for(const [id,p] of players)if(!pool.has(id))pool.set(id,{id,rostered:true,outForSeason:!!p.outForSeason,name:p.name,position:p.position,team:p.nflTeam,points:null,hasGame:null,scheduleKnown:false,injuryStatus:p.injuryStatus,isOut:!!p.isOut||OUT_STATUSES.has(String(p.injuryStatus)),isRisky:!p.isOut&&(!!p.isRisky||RISKY_STATUSES.has(String(p.injuryStatus)))});
  return pool;
}

export function weeklyPlayerLocked(player,now=Date.now()){
 const state=playerLiveState(player).key;
 if(['playing','final','played'].includes(state))return true;
 if(player?.hasGame===false&&player.scheduleKnown!==false)return false;
 const kickoff=Date.parse(player?.kickoff);
 return Number.isFinite(kickoff)&&kickoff<=Number(now)&&!/postpon|cancel/i.test(player?.gameStatus||'');
}
const DEFAULT_SLOTS=['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'];
const uncertain=player=>!player||!player.isOut&&!(player.hasGame===false&&player.scheduleKnown!==false)&&(player.points==null||player.scheduleKnown===false);

/**
 * How generous each defense is this week, in points conceded to the
 * positions we score.
 *
 * Derived from the same payload rather than a second source: every
 * projection names its opponent, so summing projections BY opponent is the
 * league's own consensus on how much that defense will give up. A defense
 * facing a good offense looks generous here, which is the honest reading -
 * it is a matchup rating, not a defensive grade.
 *
 * @returns {Map<string, {points:number, byPosition:Object, rank:number, count:number}>}
 */
export function defenseDifficulty(pool = new Map()) {
  const totals = new Map();
  for (const player of pool.values()) {
    /* Kicker and team-defense rows are needed for the nine-slot lineup total,
       but they must not change how a skill player's defensive matchup rates. */
    if (player.position === "K" || player.position === "DEF") continue;
    if (!player.opponent || player.points == null || !player.hasGame) continue;
    const entry = totals.get(player.opponent)
      || { points: 0, byPosition: {}, opponent: player.opponent };
    entry.points += player.points;
    entry.byPosition[player.position] = (entry.byPosition[player.position] || 0) + player.points;
    totals.set(player.opponent, entry);
  }
  const ordered = [...totals.values()].sort((a, b) => b.points - a.points);
  const out = new Map();
  ordered.forEach((entry, index) => {
    out.set(entry.opponent, { ...entry, rank: index + 1, count: ordered.length });
  });
  return out;
}

/** A player's matchup, phrased for a human. Null when we cannot tell. */
export function matchupNote(player, defense = new Map()) {
  if (!player?.opponent) return null;
  const entry = defense.get(player.opponent);
  if (!entry || !entry.count) return null;
  /* Normalised position, not rank/count: with rank/count the best of two
     defenses scores 0.5 and reads "good" when it is the softest matchup on
     the board. This puts rank 1 at 0 and last at 1 whatever the sample. */
  const share = entry.count <= 1 ? 0 : (entry.rank - 1) / (entry.count - 1);
  const tone = share <= .25 ? "great" : share <= .5 ? "good" : share <= .75 ? "tough" : "brutal";
  return { tone, rank: entry.rank, count: entry.count, opponent: player.opponent };
}

/* A player we cannot rate is not a player worth benching somebody for. */
function playable(entry) {
  return !!entry && entry.points != null && entry.hasGame && !entry.isOut;
}

/**
 * Score a candidate for a slot.
 *
 * THE PROJECTION IS THE PROJECTION. This used to haircut Questionable and
 * Doubtful players by 12% before ranking them, which was wrong twice over:
 * Sleeper's projection already prices expected availability, so the discount
 * double-counted it with a cruder model than theirs - and it did so silently,
 * reordering the lineup behind the manager's back.
 *
 * It produced exactly the nonsense you would expect. In week 1, Tucker Kraft
 * projected 10.86 against Juwan Johnson's 10.43; the haircut took Kraft to
 * 9.56 and started Johnson. Kraft's "Questionable" carried no injury start
 * date at all - a soft preseason tag, not a gameday designation.
 *
 * So availability is now binary. A player who CANNOT play is excluded by
 * playable(); everyone else is ranked on the published number, and the flag is
 * surfaced next to them for a human to weigh. A tool that quietly moves a
 * projection is harder to trust than one that shows it and says "he is
 * questionable".
 */
function effectivePoints(entry) {
  if (!playable(entry)) return null;
  return entry.points;
}

function slotCandidates(playerIds, weekly, position) {
  return playerIds
    .map(id => weekly.get(String(id)))
    .filter(entry => entry && (position === "FLEX"
      ? FLEX_ELIGIBLE.has(entry.position)
      : entry.position === position))
    .map(entry => ({ entry, score: effectivePoints(entry) }))
    .filter(row => row.score != null)
    .sort((a, b) => b.score - a.score);
}

/**
 * The best legal lineup for this week, filled highest-scoring slot first so
 * a flex never steals a player a dedicated slot needed.
 *
 * @returns {{slots:Object[], total:number, unknown:Object[]}}
 */
export function bestWeeklyLineup(playerIds = [], weekly = new Map(), {starterIds=[],rosterPositions=DEFAULT_SLOTS,now=Date.now()}={}) {
  const used = new Set();
  const positions=rosterPositions.filter(p=>p!=='BN'&&p!=='IR');
  const slots = positions.map((position,index)=>{
    const id=String(starterIds[index]||''),player=weekly.get(id);
    const keep=id&&id!=='0'&&(weeklyPlayerLocked(player,now)||uncertain(player));
    if(keep)used.add(id);
    return {position,player:keep?(player||{id,name:'Projection pending',position,points:null}):null,score:keep?player?.points??null:null,fixed:!!keep};
  });
  const take = slot => {
    if(slot.fixed)return;
    const position=slot.position;
    const pick = slotCandidates(playerIds, weekly, position)
      .find(row => !used.has(row.entry.id)&&!weeklyPlayerLocked(row.entry,now));
    if (pick) used.add(pick.entry.id);
    Object.assign(slot,{player:pick?.entry||null,score:pick?.score??null});
  };
  slots.filter(s=>s.position!=='FLEX').forEach(take);slots.filter(s=>s.position==='FLEX').forEach(take);
  const total = slots.reduce((sum, slot) => sum + (slot.score || 0), 0);
  const unknown = playerIds
    .map(id => weekly.get(String(id)))
    .filter(entry => entry && !playable(entry));
  return { slots, total, unknown };
}

/**
 * What to change about the lineup that is currently submitted.
 *
 * Compares the submitted starters against the best legal lineup and reports
 * only the moves worth making - see SWAP_THRESHOLD. Returns the swaps, the
 * points left on the bench, and anything in the lineup that cannot play.
 *
 * @param {Object} input
 * @param {string[]} input.playerIds   every player on the roster
 * @param {string[]} input.starterIds  the lineup as submitted
 * @param {Map} input.weekly           from buildWeeklyPool()
 * @param {Map} input.defense          from defenseDifficulty()
 */
export function startSitAdvice({ playerIds = [], starterIds = [], weekly = new Map(),
 defense = new Map(),rosterPositions=DEFAULT_SLOTS,now=Date.now(),stale=false } = {}) {
 const positions=rosterPositions.filter(p=>p!=='BN'&&p!=='IR'),submitted=starterIds.map(String);
 const roster=[...new Set([...playerIds.map(String),...submitted.filter(id=>id&&id!=='0')])];
 const best=bestWeeklyLineup(roster,weekly,{starterIds:submitted,rosterPositions:positions,now});
 const submittedSet=new Set(submitted),bestIds=new Set(best.slots.map(s=>s.player?.id).filter(Boolean));
 const unknownStarters=submitted.filter(id=>id&&id!=='0'&&uncertain(weekly.get(id))).map(id=>weekly.get(id)||{id,name:'Projection pending'});
 const emptySlots=positions.filter((p,i)=>!submitted[i]||submitted[i]==='0');
 const locked=submitted.map(id=>weekly.get(id)).filter(p=>p&&weeklyPlayerLocked(p,now));
 const alarms=submitted.map(id=>weekly.get(id)).filter(p=>p&&!weeklyPlayerLocked(p,now)&&(p.isOut||p.hasGame===false&&p.scheduleKnown!==false))
  .map(player=>({player,reason:player.isOut?`listed ${player.injuryStatus||'Out'}`:'no game this week'}));
 const incoming=[...bestIds].filter(id=>!submittedSet.has(id)).map(id=>weekly.get(id)).filter(p=>p&&!weeklyPlayerLocked(p,now)).sort((a,b)=>b.points-a.points);
 const outgoing=submitted.filter(id=>!bestIds.has(id)).map(id=>weekly.get(id)).filter(p=>p&&!uncertain(p)&&!weeklyPlayerLocked(p,now)).sort((a,b)=>(effectivePoints(a)||0)-(effectivePoints(b)||0));
 let working=[...submitted];const swaps=[];
 const assign=ids=>{
  // Other inactive starters still occupy their slots until their own move.
  // Validate the entire submitted lineup, including those temporary occupants.
  const allocationPool=new Map(weekly);
  for(const id of ids){const p=weekly.get(id);if(p&&(p.isOut||p.hasGame===false))allocationPool.set(id,{...p,isOut:false,hasGame:true,points:0});}
  const lineup=bestWeeklyLineup(ids,allocationPool,{starterIds:working,rosterPositions:positions,now});
  for(const slot of lineup.slots)if(slot.player)slot.player=weekly.get(slot.player.id)||slot.player;
  const assigned=new Set(lineup.slots.map(s=>s.player?.id));
  return ids.every(id=>assigned.has(id))?lineup:null;
 };
 for(const player of incoming){
  for(let i=0;i<outgoing.length;i++){
   const out=outgoing[i],blocked=out.isOut||out.hasGame===false,gain=player.points-(effectivePoints(out)||0);
   if(gain<SWAP_THRESHOLD&&!blocked)continue;
   const ids=working.filter(id=>id&&id!=='0'&&id!==out.id).concat(player.id),lineup=assign(ids);if(!lineup)continue;
   outgoing.splice(i,1);working=lineup.slots.map(slot=>slot.player?.id||'0');
   const confidence=stale||unknownStarters.length?'limited':player.isRisky||out.isRisky?'conditional':gain>=3?'clear':'lean';
   swaps.push({in:player,out,gain,urgent:blocked,reassign:[],backup:null,confidence,
    call:player.isRisky?'Start if active':blocked?'Replace now':confidence==='clear'?'Clear upgrade':'Lean start',
    matchupIn:matchupNote(player,defense),matchupOut:matchupNote(out,defense)});
   break;
  }
 }
 swaps.sort((a,b)=>Number(b.urgent)-Number(a.urgent)||b.gain-a.gain);
 const reassign=working.flatMap((id,index)=>{
  const original=submitted.indexOf(id);
  return id!=='0'&&original>=0&&positions[original]!==positions[index]?[{player:weekly.get(id),from:positions[original],to:positions[index]}]:[];
 });
 if(swaps.length)swaps[0].reassign=reassign;
 const backups=new Set();
 for(const swap of swaps){
  swap.slot=positions[working.indexOf(swap.in.id)];
  if(!swap.in.isRisky)continue;
  const kickoff=Date.parse(swap.in.kickoff);
  swap.backup=roster.map(id=>weekly.get(id)).filter(p=>playable(p)&&!p.isRisky&&!working.includes(p.id)&&!backups.has(p.id)&&!weeklyPlayerLocked(p,now))
   .filter(p=>{const at=Date.parse(p.kickoff);return Number.isFinite(kickoff)?Number.isFinite(at)&&at>=kickoff:true;})
   .sort((a,b)=>b.points-a.points).find(p=>assign(working.filter(id=>id&&id!=='0'&&id!==swap.in.id).concat(p.id)))||null;
  if(swap.backup)backups.add(swap.backup.id);
 }
 const submittedTotal=submitted.reduce((sum,id)=>sum+(effectivePoints(weekly.get(id))||0),0);
 return {swaps,alarms,unknownStarters,emptySlots,lockedCount:locked.length,
  submittedTotal,bestTotal:best.total,pointsOnBench:Math.max(0,best.total-submittedTotal),lineup:best,
  lineupIsSet:submitted.some(id=>id&&id!=='0'),completeEstimate:!unknownStarters.length&&!emptySlots.length&&best.slots.every(slot=>slot.player&&slot.score!=null),stale};
}
