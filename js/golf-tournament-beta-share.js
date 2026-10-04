import {editorialShareCanvas} from './share-editorial.js';
import {drawShareFrame,drawShareFooter} from "./share-card-style.js";
import { FONT, fitText, roundRect, shareCanvas } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";
import { memberNames } from "./golf-people.js";
import { progress as boardProgress, label as boardLabel, roundBoard } from "./golf-board.js";
import { shareBoard, shareTeamSheet } from "./golf-share.js";

const { INK, MUTED, BG, CARD, LINE, GOLD, CARD_2 } = SHARE_INK;
const W = 1080, H = 1350;

function adapted(state) {
  return { ...state, parts: state.participants || [], names: memberNames(state.members || []) };
}

export function shareBetaTournament(state) {
  return shareBoard(adapted(state), state.outing);
}

export function shareBetaTeams(state) {
  return shareTeamSheet(adapted(state), state.outing);
}

export function leaderboardCanvas(state, entry) {
 const balls=entry.battles.flatMap(b=>b.sides.map(s=>({...s,round:entry.round,matchId:s.match_id,matchNumber:s.match_number,teamOrder:s.slot})));const rows=roundBoard({balls,holes:state.holes},entry.round).flatMap(g=>g.rows);return editorialShareCanvas({kind:'Golf leaderboard',context:entry.round.name||entry.round.format,headline:state.outing.name||'DFL GOLF',sections:[{label:'Leaderboard',rows:rows.map((r,i)=>({name:`${i+1}. ${r.name}`,value:boardLabel(r),detail:[r.teamName||'Individual',boardProgress(r)].join(' · ')}))}],footer:'Golf leaderboard'});
}

export function shareBetaLeaderboard(state, entry) {
  const title = `${state.outing.name || "DFL Golf"} leaderboard`;
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;
  const how = shareCanvas(leaderboardCanvas(state, entry), filename, { title, text: "Live tournament leaderboard" });
  return how === "saved" ? "Image saved to your downloads" : "Sharing…";
}
