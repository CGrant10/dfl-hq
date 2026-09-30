const number = value => Number(value) || 0;
const key = value => String(value ?? "");
const nameFor = (members, id) => members.find(member => key(member.sleeper_user_id) === key(id))?.team_name
  || members.find(member => key(member.sleeper_user_id) === key(id))?.display_name || "Unknown";

export function historyForWeek({ lore, week, members = [] } = {}) {
  const games = (lore?.matchups || []).filter(game => Number(game.week) === Number(week)
    && Number.isFinite(Number(game.score1)) && Number.isFinite(Number(game.score2))).map(game => {
    const left = { id: game.user1, name: nameFor(members, game.user1), score: number(game.score1) };
    const right = { id: game.user2, name: nameFor(members, game.user2), score: number(game.score2) };
    return { season: Number(game.season), left, right, margin: Math.abs(left.score - right.score),
      winner: left.score >= right.score ? left : right, loser: left.score >= right.score ? right : left };
  });
  if (!games.length) return null;
  const high = games.flatMap(game => [game.left, game.right].map(team => ({ ...team, season: game.season }))).sort((a, b) => b.score - a.score)[0];
  const blowout = [...games].sort((a, b) => b.margin - a.margin)[0];
  const close = [...games].sort((a, b) => a.margin - b.margin)[0];
  const rivalries = new Map();
  games.forEach(game => { const pair = [key(game.left.id), key(game.right.id)].sort().join(":"), row = rivalries.get(pair) || { names: [game.left.name, game.right.name], games: 0, margin: 0 }; row.games += 1; row.margin += game.margin; rivalries.set(pair, row); });
  const rivalry = [...rivalries.values()].sort((a, b) => b.games - a.games || a.margin - b.margin)[0];
  return { week: Number(week), seasons: new Set(games.map(game => game.season)).size, games: games.length, high, blowout, close, rivalry };
}
