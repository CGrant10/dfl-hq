const keyFor = weekly => `dfl.weeklySignals.${weekly?.season || 0}.${weekly?.week || 0}`;
const round = value => Math.round((Number(value) || 0) * 10) / 10;

export function weeklySignalChanges(weekly, storage) {
  if (!(weekly?.pool instanceof Map)) return [];
  try{storage??=globalThis.localStorage}catch{storage=null}
  let previous = {};
  try { previous = JSON.parse(storage?.getItem(keyFor(weekly)) || "{}"); } catch { previous = {}; }
  if(!previous||typeof previous!=='object'||Array.isArray(previous))previous={};
  const current = {}, changes = [];
  for (const [id, player] of weekly.pool) {
    if(!['QB','RB','WR','TE'].includes(String(player?.position||'').trim().toUpperCase()))continue;
    if(typeof player.name!=='string'||!player.name.trim()||/^\d+$/.test(player.name))continue;
    const old=previous[id];
    if(!player.rostered&&Math.max(Number(player.points)||0,Number(player.recentAverage)||0,Number(old?.points)||0)<3)continue;
    current[id] = { name: player.name, points: round(player.points), injury: player.outForSeason?"Out for season":player.injuryStatus || "", hasGame: !!player.hasGame };
    if (!old) continue;
    if (old.injury !== current[id].injury) changes.push({ id, name: player.name, type: "injury",
      detail: current[id].injury ? `Now ${current[id].injury}` : "Injury designation cleared", impact: current[id].injury ? "down" : "up" });
    else if (Math.abs(current[id].points - old.points) >= 2) changes.push({ id, name: player.name, type: "projection",
      detail: `${current[id].points > old.points ? "+" : ""}${round(current[id].points - old.points).toFixed(1)} projection change`,
      impact: current[id].points > old.points ? "up" : "down" });
    else if (old.hasGame !== current[id].hasGame) changes.push({ id, name: player.name, type: "schedule",
      detail: current[id].hasGame ? "Matchup added" : "No active matchup", impact: current[id].hasGame ? "up" : "down" });
  }
  try{storage?.setItem(keyFor(weekly), JSON.stringify(current))}catch{}
  return changes.sort((a, b) => Number(b.type === "injury") - Number(a.type === "injury")).slice(0, 6);
}
