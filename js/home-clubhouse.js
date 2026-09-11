import { esc } from "./ui.js";

const nameOf = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || team?.id || ""}`;
const num = value => Number(value) || 0;
const round = value => Math.round(value * 10) / 10;

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

function matchupStory({ lore, uid, members }) {
  const row = latestMatchup(lore, uid);
  if (!row) return null;
  const left = String(row.user1) === String(uid);
  const mine = num(left ? row.score1 : row.score2);
  const theirs = num(left ? row.score2 : row.score1);
  const opponentId = left ? row.user2 : row.user1;
  const opponent = memberName(members, opponentId, "the other sideline");
  const margin = round(Math.abs(mine - theirs));
  const won = mine > theirs;
  const tied = mine === theirs;
  return {
    key: "matchup",
    label: `${row.season} · WEEK ${row.week}`,
    headline: tied
      ? `You and ${opponent} settled absolutely nothing.`
      : won
        ? `${opponent} is still looking for the license plate.`
        : `${opponent} got you by ${margin}. Keep the excuses short.`,
    detail: tied ? `${mine.toFixed(2)} apiece` : `${won ? "You won" : "You lost"} by ${margin}`,
    sides: [
      { name: "YOU", score: mine.toFixed(2), winner: mine > theirs },
      { name: opponent, score: theirs.toFixed(2), winner: theirs > mine },
    ],
    href: "#/profile",
  };
}

function hotSeatStory(teams) {
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

function temperatureStories(teams, standings, season) {
  if (!teams.length) return [];
  const hot = teams[0];
  const cold = teams.at(-1);
  const stories = [{
    key: "temperature", label: "LEAGUE TEMPERATURE · HOT",
    headline: `${nameOf(hot)} owns the room right now. Annoying, but the math checks out.`,
    detail: `#1 roster model · ${round(num(hot.lineup?.weeklyPoints))} projected points per week.`, href: "#/analyzer",
  }];
  if (cold && cold.id !== hot.id) stories.push({
    key: "temperature", label: "LEAGUE TEMPERATURE · COLD",
    headline: `${nameOf(cold)} is currently refrigerating the power rankings.`,
    detail: `#${cold.rank} roster model · somebody check for a pulse.`, href: "#/analyzer",
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

export function clubhouseView({ analysis, lore, members = [], meSleeperId = null, standings = [], now = new Date() } = {}) {
  if (analysis?.state !== "ready" || !analysis.teams?.length || !meSleeperId) return null;
  const teams = analysis.teams;
  const stories = [
    personalStory(teams, meSleeperId),
    matchupStory({ lore, uid: meSleeperId, members }),
    hotSeatStory(teams),
    ...temperatureStories(teams, standings, analysis.projectionSeason),
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
  const start = hash(`${Date.now()}:${meSleeperId}`) % stories.length;
  return { stories, start, gameDay: now instanceof Date && now.getDay() === 0 };
}

export function clubhouseShell() {
  return `<section class="clubhouse is-loading" data-clubhouse aria-live="polite"><div class="clubhouse-load"><span></span><strong>OPENING THE CLUBHOUSE</strong></div></section>`;
}

function storyHtml(story, index, total) {
  const sides = story.sides ? `<div class="clubhouse-matchup">${story.sides.map((side, sideIndex) => `<div class="clubhouse-side ${side.winner ? "is-winner" : ""}"><small>${esc(side.name)}</small><strong>${esc(side.score)}</strong></div>${sideIndex === 0 ? `<b class="clubhouse-vs">VS</b>` : ""}`).join("")}</div>` : "";
  return `<a class="clubhouse-story" href="${story.href || "#/analyzer"}" data-clubhouse-story>
    <div class="clubhouse-copy"><span class="clubhouse-kicker">${esc(story.label)}</span><h2>${esc(story.headline)}</h2><p>${esc(story.detail)}</p></div>${sides}
    <span class="clubhouse-count">${index + 1} / ${total}</span>
  </a>`;
}

export function clubhouseCard(view, index = view?.start || 0) {
  if (!view?.stories?.length) return "";
  const safeIndex = ((index % view.stories.length) + view.stories.length) % view.stories.length;
  return `<div class="clubhouse-frame ${view.gameDay ? "is-gameday" : ""}" data-clubhouse-index="${safeIndex}">
    <header><span><i></i>${view.gameDay ? "SUNDAY · GAME DAY" : "DFL COLD OPEN"}</span><button type="button" data-clubhouse-next aria-label="Show another league take">NEXT TAKE <b>→</b></button></header>
    ${storyHtml(view.stories[safeIndex], safeIndex, view.stories.length)}
  </div>`;
}

export function wireClubhouse(root, view) {
  const draw = next => {
    root.innerHTML = clubhouseCard(view, next);
    const frame = root.querySelector("[data-clubhouse-index]");
    root.classList.remove("is-loading");
    root.classList.toggle("is-gameday", Boolean(view.gameDay));
    root.querySelector("[data-clubhouse-next]")?.addEventListener("click", event => {
      event.preventDefault(); event.stopPropagation();
      draw(num(frame?.dataset.clubhouseIndex) + 1);
    });
  };
  draw(view.start);
}
