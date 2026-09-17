import { esc, toast } from "./ui.js";
import { buildWeeklyPool, startSitAdvice } from "./weekly-outlook.js";
import { buildAftermath, shareAftermath } from "./aftermath-share.js";

const nameOf = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || team?.id || ""}`;
const num = value => Number(value) || 0;
const round = value => Math.round(value * 10) / 10;
const scoreRound = value => Math.round(value * 100) / 100;

function hash(text) {
  let value = 2166136261;
  for (const char of String(text)) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function latestMatchup(lore, uid) {
  return [...(lore?.matchups || [])]
    .filter(row => String(row.user1) === String(uid) || String(row.user2) === String(uid))
    .filter(row => num(row.score1) || num(row.score2) || row.winner_roster_id != null)
    .sort((a, b) => num(b.season) - num(a.season) || num(b.week) - num(a.week))[0] || null;
}

function memberName(members, uid, fallback = "Unknown") {
  const member = (members || []).find(row => String(row.sleeper_user_id) === String(uid));
  return member?.team_name || member?.display_name || fallback;
}

function matchupStory({ lore, uid, members, weekly }) {
  const current = weekly?.season && weekly?.week
    ? (lore?.matchups || []).find(row => Number(row.season) === Number(weekly.season)
      && Number(row.week) === Number(weekly.week)
      && (String(row.user1) === String(uid) || String(row.user2) === String(uid)))
    : null;
  const row = current || latestMatchup(lore, uid);
  if (!row) return null;
  const left = String(row.user1) === String(uid);
  const opponentId = left ? row.user2 : row.user1;
  const opponent = memberName(members, opponentId, "the other sideline");
  const mineTeam = weekly?.teams?.find(team => String(team.sleeper_user_id) === String(uid));
  const theirTeam = weekly?.teams?.find(team => String(team.sleeper_user_id) === String(opponentId));
  const currentComplete = Boolean(current && mineTeam?.complete && theirTeam?.complete);
  const mine = current && Number.isFinite(mineTeam?.actual)
    ? mineTeam.actual : num(left ? row.score1 : row.score2);
  const theirs = current && Number.isFinite(theirTeam?.actual)
    ? theirTeam.actual : num(left ? row.score2 : row.score1);
  const margin = round(Math.abs(mine - theirs));
  const won = mine > theirs;
  const tied = mine === theirs;
  const live = Boolean(current && !currentComplete);
  const mineProjection = mineTeam?.projection;
  const theirProjection = theirTeam?.projection;
  const projectionLine = Number.isFinite(mineProjection) && Number.isFinite(theirProjection)
    ? `Sleeper projects ${round(mineProjection)}-${round(theirProjection)} this week.` : null;
  return {
    key: "matchup",
    label: `${row.season} · WEEK ${row.week}${live ? " · LIVE" : " · FINAL"}`,
    headline: currentComplete
      ? tied
        ? `You and ${opponent} finished dead even.`
        : won
          ? `Your win over ${opponent} is secured.`
          : `${opponent} locked this one down.`
      : live
      ? tied
        ? `You and ${opponent} are dead even. Somebody blink.`
        : won
          ? `You're up ${margin} on ${opponent}. Keep your foot on their throat.`
          : `${opponent} is up ${margin}. The week is still alive—fix your face.`
      : tied
        ? `You and ${opponent} settled absolutely nothing.`
        : won
          ? `${opponent} is still looking for the license plate.`
          : `${opponent} got you by ${margin}. Keep the excuses short.`,
    detail: currentComplete
      ? `Final score ${mine.toFixed(2)}-${theirs.toFixed(2)}.`
      : live
      ? [`Current score ${mine.toFixed(2)}-${theirs.toFixed(2)}.`, projectionLine].filter(Boolean).join(" ")
      : tied ? `${mine.toFixed(2)} apiece` : `${won ? "You won" : "You lost"} by ${margin}`,
    sides: [
      { name: "YOU", score: mine.toFixed(2), winner: mine > theirs },
      { name: opponent, score: theirs.toFixed(2), winner: theirs > mine },
    ],
    href: "#/profile",
  };
}

function hotSeatStory(teams, weekly) {
  const weeklySeat = [...(weekly?.teams || [])]
    .filter(team => team.lineupIsSet && team.pointsOnBench > 0)
    .sort((a, b) => b.pointsOnBench - a.pointsOnBench)[0];
  if (weeklySeat) {
    const swap = weeklySeat.swap;
    return {
      key: "hot-seat", label: `WEEK ${weekly.week} · LINEUP HOT SEAT`,
      headline: swap
        ? `${nameOf(weeklySeat)} has ${swap.in} on the bench while ${swap.out} burns the furniture.`
        : `${nameOf(weeklySeat)} left points sitting on the damn bench.`,
      detail: `${round(weeklySeat.pointsOnBench)} current points are sitting outside the best lineup.`,
      href: weeklySeat.sleeper_user_id ? `#/analyzer?owner=${encodeURIComponent(weeklySeat.sleeper_user_id)}` : "#/analyzer",
    };
  }
  let hottest = null;
  for (const team of teams) {
    if (team.lineup?.source !== "set") continue;
    const starter = [...(team.lineup?.starters || [])].sort((a, b) => num(a.expectedPoints) - num(b.expectedPoints))[0];
    const bench = [...(team.lineup?.bench || [])].sort((a, b) => num(b.expectedPoints) - num(a.expectedPoints))[0];
    const gap = bench && starter ? round(num(bench.expectedPoints) - num(starter.expectedPoints)) : 0;
    if (gap > 0 && (!hottest || gap > hottest.gap)) hottest = { team, starter, bench, gap };
  }
  if (!hottest) {
    const last = teams.at(-1);
    if (!last) return null;
    return {
      key: "hot-seat", label: "LINEUP HOT SEAT",
      headline: `${nameOf(last)} is one bad Sunday away from becoming performance art.`,
      detail: `The roster model has them dead last at #${last.rank}.`, href: "#/analyzer",
    };
  }
  return {
    key: "hot-seat", label: "LINEUP HOT SEAT",
      headline: `Somebody tell ${nameOf(hottest.team)} that ${hottest.bench.name} is rotting on the bench.`,
      detail: `${hottest.bench.name} grades ${hottest.gap} season-projection points above ${hottest.starter.name}.`,
    href: hottest.team.sleeper_user_id ? `#/analyzer?owner=${encodeURIComponent(hottest.team.sleeper_user_id)}` : "#/analyzer",
  };
}

function temperatureStories(teams, standings, season, weekly) {
  if (!teams.length) return [];
  const weeklyRanked = [...(weekly?.teams || [])].filter(team => Number.isFinite(team.projection))
    .sort((a, b) => b.projection - a.projection);
  const hot = weeklyRanked[0] || teams[0];
  const cold = weeklyRanked.at(-1) || teams.at(-1);
  const usingWeekly = weeklyRanked.length >= 2;
  const stories = [{
    key: "temperature", label: "LEAGUE TEMPERATURE · HOT",
    headline: `${nameOf(hot)} owns the room right now. Annoying, but the math checks out.`,
    detail: usingWeekly
      ? `${round(hot.projection)} points · highest current Sleeper projection for Week ${weekly.week}.`
      : `#1 roster model · ${round(num(hot.lineup?.weeklyPoints))} projected points per week.`, href: "#/analyzer",
  }];
  if (cold && cold.id !== hot.id) stories.push({
    key: "temperature", label: "LEAGUE TEMPERATURE · COLD",
    headline: `${nameOf(cold)} is currently refrigerating the power rankings.`,
    detail: usingWeekly
      ? `${round(cold.projection)} points · lowest current Sleeper projection for Week ${weekly.week}.`
      : `#${cold.rank} roster model · somebody check for a pulse.`, href: "#/analyzer",
  });

  const current = (standings || []).filter(row => Number(row.season) === Number(season) && Number(row.rank) > 0);
  const modelRank = new Map(teams.map(team => [String(team.sleeper_user_id), num(team.rank)]));
  const fraud = current.map(row => ({ row, gap: modelRank.get(String(row.sleeper_user_id)) - num(row.rank) }))
    .filter(item => Number.isFinite(item.gap) && item.gap >= 2).sort((a, b) => b.gap - a.gap)[0];
  if (fraud) {
    const team = teams.find(item => String(item.sleeper_user_id) === String(fraud.row.sleeper_user_id));
    stories.push({
      key: "temperature", label: "LEAGUE TEMPERATURE · FRAUD WATCH",
      headline: `${nameOf(team)} has a shiny record and a roster held together with duct tape.`,
      detail: `#${fraud.row.rank} in the standings, #${team.rank} in the roster model. The bill is coming.`, href: "#/analyzer",
    });
  }
  return stories;
}

function rivalryStory({ lore, uid, members }) {
  const records = new Map();
  for (const row of lore?.matchups || []) {
    const left = String(row.user1) === String(uid);
    const right = String(row.user2) === String(uid);
    if (!left && !right) continue;
    const opponentId = String(left ? row.user2 : row.user1);
    if (!opponentId || opponentId === "null") continue;
    const mine = num(left ? row.score1 : row.score2);
    const theirs = num(left ? row.score2 : row.score1);
    if (!mine && !theirs && row.winner_roster_id == null) continue;
    const record = records.get(opponentId) || { opponentId, wins: 0, losses: 0, ties: 0, points: 0, against: 0 };
    record.points += mine; record.against += theirs;
    if (mine > theirs) record.wins++; else if (mine < theirs) record.losses++; else record.ties++;
    records.set(opponentId, record);
  }
  const rival = [...records.values()].filter(row => row.wins + row.losses + row.ties >= 2)
    .sort((a, b) => (b.wins + b.losses + b.ties) - (a.wins + a.losses + a.ties) || Math.abs(b.wins - b.losses) - Math.abs(a.wins - a.losses))[0];
  if (!rival) return null;
  const opponent = memberName(members, rival.opponentId, "an old enemy");
  const ahead = rival.wins > rival.losses;
  const behind = rival.losses > rival.wins;
  return {
    key: "rivalry", label: "RIVALRY FILE",
    headline: ahead
      ? `${opponent} has donated ${rival.wins} wins to your personal collection.`
      : behind
        ? `${opponent} has your number. Burn the number.`
        : `You and ${opponent} have been trading punches for years.`,
    detail: `${rival.wins}-${rival.losses}${rival.ties ? `-${rival.ties}` : ""} all time · ${round(rival.points)}-${round(rival.against)} total points.`,
    href: "#/facts",
  };
}

function personalStory(teams, uid) {
  const team = teams.find(item => String(item.sleeper_user_id) === String(uid));
  if (!team) return null;
  if (team.rank === 1) return {
    key: "power", label: "POWER CHECK",
    headline: `You walked in at #1. Try to act like you've been here before.`,
    detail: `${nameOf(team)} leads the current roster model.`, href: "#/analyzer",
  };
  const teamsAbove = team.rank - 1;
  return {
    key: "power", label: "POWER CHECK",
    headline: `${teamsAbove} team${teamsAbove === 1 ? " is" : "s are"} between you and the throne. Handle your business.`,
    detail: `${nameOf(team)} sits #${team.rank} in the current roster model.`, href: "#/analyzer",
  };
}

export function buildClubhouseWeekly({ analysis, rows = [], actualRows = [], season, week, fetchedAt = 0 } = {}) {
  if (analysis?.state !== "ready" || !rows.length || !season || !week) return null;
  const pool = buildWeeklyPool(rows, analysis.league?.scoring_settings || null);
  const actual = buildWeeklyPool(actualRows, analysis.league?.scoring_settings || null);
  const livePool = new Map(pool);
  for (const [id, played] of actual) {
    if (!played.hasGame) continue;
    livePool.set(id, { ...(pool.get(id) || {}), ...played, points: played.points });
  }
  const teams = analysis.teams.map(team => {
    const owner = nameOf(team);
    const advice = startSitAdvice({
      playerIds: team.playerIds || [], starterIds: team.starters || [], weekly: livePool,
    });
    const firstSwap = advice.swaps[0];
    const submitted = (team.starters || []).map(String);
    const actualPoints = submitted.reduce((total, id) => {
      const played = actual.get(id);
      return total + (played?.hasGame ? num(played.points) : 0);
    }, 0);
    const remaining = submitted.filter(id => pool.get(id)?.hasGame && !actual.get(id)?.hasGame).length;
    const liveProjection = submitted.reduce((total, id) => {
      const played = actual.get(id);
      const projected = pool.get(id);
      return total + num(played?.hasGame ? played.points : projected?.points);
    }, 0);
    const starterSet = new Set(submitted);
    const performance = id => {
      const played = actual.get(String(id));
      if (!played?.hasGame || !Number.isFinite(played.points)) return null;
      return {
        id: String(id), name: played.name, position: played.position, nflTeam: played.team,
        points: scoreRound(played.points), owner, sleeper_user_id: team.sleeper_user_id,
      };
    };
    const starterScores = submitted.map(performance).filter(Boolean);
    const benchScores = (team.playerIds || []).map(String).filter(id => !starterSet.has(id))
      .map(performance).filter(Boolean);
    return {
      id: team.id, sleeper_user_id: team.sleeper_user_id, team_name: owner,
      projection: advice.lineupIsSet ? round(liveProjection) : round(advice.bestTotal),
      /* Final fantasy scores settle to hundredths. Keeping only one decimal
         could turn a sub-point loss into the wrong-looking margin. */
      actual: scoreRound(actualPoints), remaining,
      complete: submitted.length > 0 && remaining === 0,
      pointsOnBench: round(advice.pointsOnBench), starterScores, benchScores,
      lineupIsSet: advice.lineupIsSet,
      swap: firstSwap ? { in: firstSwap.in.name, out: firstSwap.out.name, gain: round(firstSwap.gain) } : null,
    };
  }).filter(team => Number.isFinite(team.projection));
  return { season: Number(season), week: Number(week), fetchedAt, teams, pool: livePool };
}

export function aftermathReportWeek(week, now = new Date()) {
  const current = Math.max(1, Number(week) || 1);
  return now instanceof Date && now.getDay() === 2 ? Math.max(1, current - 1) : current;
}

export function clubhouseView({ analysis, lore, members = [], meSleeperId = null, standings = [], weekly = null, aftermathWeekly = weekly, now = new Date() } = {}) {
  if (analysis?.state !== "ready" || !analysis.teams?.length || !meSleeperId) return null;
  const teams = analysis.teams;
  const stories = [
    personalStory(teams, meSleeperId),
    matchupStory({ lore, uid: meSleeperId, members, weekly }),
    hotSeatStory(teams, weekly),
    ...temperatureStories(teams, standings, analysis.projectionSeason, weekly),
    rivalryStory({ lore, uid: meSleeperId, members }),
  ].filter(Boolean);
  if (!stories.length) return null;
  const dateKey = now instanceof Date ? now.toISOString().slice(0, 10) : String(now);
  const surprise = hash(`${dateKey}:${meSleeperId}`) % 17 === 0;
  if (surprise) stories.unshift({
    key: "chaos", label: "CHAOS MODE",
    headline: `The league opened the app and chose violence. Good.`,
    detail: `${teams.length} rosters, one trophy, and several deeply questionable decisions.`, href: "#/analyzer",
  });
  const start = hash(`${dateKey}:${meSleeperId}:start`) % stories.length;
  return {
    stories, start,
    gameDay: now instanceof Date && now.getDay() === 0,
    aftermath: buildAftermath({ lore, members, weekly: aftermathWeekly, now }),
  };
}

export function clubhouseShell() {
  return `<section class="clubhouse is-loading" data-clubhouse aria-live="polite"><div class="clubhouse-load"><span></span><strong>BUILDING THE WEEKLY REPORT</strong></div></section>`;
}

function storyWithTeamNames(story, teamNames = []) {
  const names = [...new Set(teamNames.map(name => String(name || "").trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  if (!names.length) return esc(story);
  const upper = String(story).toUpperCase();
  let cursor = 0, html = "";
  while (cursor < story.length) {
    let hit = null;
    for (const name of names) {
      const at = upper.indexOf(name.toUpperCase(), cursor);
      if (at >= 0 && (!hit || at < hit.at || (at === hit.at && name.length > hit.name.length))) hit = { at, name };
    }
    if (!hit) { html += esc(story.slice(cursor)); break; }
    html += esc(story.slice(cursor, hit.at));
    html += `<strong>${esc(story.slice(hit.at, hit.at + hit.name.length))}</strong>`;
    cursor = hit.at + hit.name.length;
  }
  return html;
}

function playerPodium(title, subtitle, players = [], tone = "gold") {
  if (!players.length) return "";
  return `<section class="weekly-player-podium is-${tone}">
    <header><span>${esc(subtitle)}</span><h3>${esc(title)}</h3></header>
    <ol>${players.slice(0, 3).map((player, index) => `<li>
      <b>${index + 1}</b><span><strong>${esc(player.name)}</strong><small>${esc([player.position, player.nflTeam, player.owner].filter(Boolean).join(" · "))}</small></span>
      <em>${Number(player.points).toFixed(2)}</em>
    </li>`).join("")}</ol>
  </section>`;
}

export function clubhouseCard(view) {
  const report = view?.aftermath;
  if (!report?.final) return "";
  const highlights = (report.highlights || []).slice(0, 4);
  const teamNames = (report.games || []).flatMap(game => [game.winner?.name, game.loser?.name]);
  return `<div class="clubhouse-frame weekly-report">
    <header><span><i></i>WEEK ${esc(report.week)} · FINAL REPORT</span><button type="button" data-clubhouse-share>SHARE REPORT</button></header>
    <section class="weekly-report-body">
      <span class="weekly-report-kicker">NO MERCY · NO EXCUSES · JUST RECEIPTS</span>
      <h2>${esc(report.title || `WEEK ${report.week} RECAP`)}</h2>
      <p class="weekly-report-story">${storyWithTeamNames(report.story || "The league survived another week. Barely.", teamNames)}</p>
      <div class="weekly-report-grid">${highlights.map(item => `<article class="weekly-report-highlight is-${esc(item.tone || "ink")}">
        <small>${esc(item.label)}</small><strong>${esc(item.title)}</strong><span>${esc(item.detail)}</span>
      </article>`).join("")}</div>
      <div class="weekly-player-grid">
        ${playerPodium("STARTED & SHOWED OUT", "TOP 3 STARTERS", report.players?.starters, "gold")}
        ${playerPodium("WASTED ON THE BENCH", "TOP 3 BENCH", report.players?.bench, "red")}
      </div>
    </section>
  </div>`;
}

/** The personal scoreboard used by Home's four-panel dashboard deck. */
export function clubhouseWeekCard(view) {
  const story = view?.stories?.find(item => item.key === "matchup") || view?.stories?.[0];
  if (!story) return "";
  const sides = story.sides || [];
  const mine = sides[0], opponent = sides[1];
  const final = /FINAL/i.test(story.label || "");
  const title = !mine || !opponent
    ? "YOUR WEEK"
    : mine.score === opponent.score
      ? (final ? "DEAD EVEN" : "TOO CLOSE")
      : mine.winner
        ? (final ? "WIN SECURED" : "IN CONTROL")
        : (final ? "TOUGH LOSS" : "WORK TO DO");
  return `<article class="hd-week-card">
    <img class="hd-ghost-crest" src="icons/crest-512.webp" alt="" aria-hidden="true">
    <div class="hd-week-copy">
      <small>${esc(story.label || "YOUR WEEK")}</small>
      <h2>${esc(title)}</h2>
      <p>${esc(story.detail || story.headline)}</p>
    </div>
    ${mine && opponent ? `<div class="hd-scoreboard">
      <div class="hd-score-side ${mine.winner ? "is-winner" : ""}"><strong>${esc(mine.name)}</strong><b>${esc(mine.score)}</b><span>${final ? "All players final" : "Live score"}</span></div>
      <span class="hd-versus">VS</span>
      <div class="hd-score-side ${opponent.winner ? "is-winner" : ""}"><strong>${esc(opponent.name)}</strong><b>${esc(opponent.score)}</b><span>${final ? "All players final" : "Live score"}</span></div>
    </div>` : `<a class="hd-story-link" href="${esc(story.href || "#/analyzer")}">${esc(story.headline)} <span aria-hidden="true">→</span></a>`}
  </article>`;
}

export function wireClubhouse(root, view) {
  root.innerHTML = clubhouseCard(view);
  root.classList.remove("is-loading", "is-gameday");
  root.querySelector("[data-clubhouse-share]")?.addEventListener("click", event => {
    event.preventDefault(); event.stopPropagation();
    const outcome = shareAftermath(view.aftermath);
    if (outcome === "saved") toast("Week recap saved to your downloads");
    if (outcome === "failed") toast("Could not share the week recap", true);
  });
}
