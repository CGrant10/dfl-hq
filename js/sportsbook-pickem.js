import { db } from "./supabase.js";
import { toast } from "./ui.js";

import { pickemState } from "./pickem-state.js";
const locked=board=>pickemState(board).isLocked;
const fmt=v=>v?new Date(v).toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"";

export async function loadPickemBoard(){
  const{data,error}=await db().rpc("pickem_current_board");
  if(error){if(/does not exist|schema cache|Could not find/i.test(error.message||""))return{available:false};throw error}
  return data||{available:false};
}

export function pickemMarkup(board,esc,canBook=false){
  if(!board?.available)return `<section class="sb-pickem-empty"><small>NFL PICK'EM</small><h2>Building this week's card</h2><p>A commissioner can tap Sync Pick'em now, or the free public NFL feed will fill it during the next automatic refresh.</p></section>`;
  const { picks, isLocked, chosen, entered, correct, wrong, pending } = pickemState(board), games=board.games||[];
  return `<section class="sb-pickem" data-season="${Number(board.season)}" data-week="${Number(board.week)}">
    <div class="sb-pickem-hero"><div><small>WEEK ${Number(board.week)} · ${Number(board.season)}</small><h2>${isLocked ? entered ? "Receipts are live." : "This week’s card is closed." : "Call the whole slate."}</h2><p>${isLocked ? entered ? `${correct} right · ${wrong} wrong · ${pending} pending` : "No card submitted. Follow the league results below and check back for the next slate." : `Pick every winner before ${esc(fmt(board.locksAt))}.`}</p></div><span>${isLocked ? entered ? `${correct}–${wrong}` : "NO CARD" : `${chosen}/${games.length}`}</span></div>
    <div class="sb-pickem-games">${games.map(g=>{
      const live=g.status==="live",final=g.status==="final",state=final?`${g.away_score}–${g.home_score}`:live?"LIVE":esc(fmt(g.starts_at));
      return `<article class="sb-pickem-game${g.is_monday_night?" is-mnf":""}" data-pickem-game="${esc(g.provider_event_id)}"><div class="sb-pickem-gamehead"><small>${g.is_monday_night?"MONDAY NIGHT · TIEBREAKER":"NFL"}</small><b>${state}</b></div><div class="sb-pickem-sides">
        <button type="button" data-pickem-team="${esc(g.away_team_id)}" aria-pressed="${String(picks[g.provider_event_id])===String(g.away_team_id)}" ${isLocked?"disabled":""}><span>${esc(g.away_team_name)}</span>${final?`<b>${Number(g.away_score)}</b>`:""}${isLocked?`<small>${Number(g.awayPickPct||0)}%${Number(g.awayPickPct||0)>0&&Number(g.awayPickPct||0)<35?" · UPSET":""}</small>`:""}</button>
        <span>@</span>
        <button type="button" data-pickem-team="${esc(g.home_team_id)}" aria-pressed="${String(picks[g.provider_event_id])===String(g.home_team_id)}" ${isLocked?"disabled":""}><span>${esc(g.home_team_name)}</span>${final?`<b>${Number(g.home_score)}</b>`:""}${isLocked?`<small>${Number(g.homePickPct||0)}%${Number(g.homePickPct||0)>0&&Number(g.homePickPct||0)<35?" · UPSET":""}</small>`:""}</button>
      </div></article>`}).join("")}</div>
    <div class="sb-pickem-lock"><label><span>Monday night total</span><input type="number" min="0" max="150" inputmode="decimal" id="pickem-total" value="${board.entry?.tiebreakTotal??""}" placeholder="47.5" ${isLocked?"disabled":""}></label>${!isLocked?`<button type="button" class="btn" id="pickem-save">Lock my card</button>`:""}<p id="pickem-status" class="muted tiny" aria-live="polite"></p></div>
    ${pickemStandings(board.standings||[],esc,"Weekly board",false,games,isLocked)}
    ${pickemStandings(board.seasonStandings||[],esc,"Season race",true)}
    ${board.lastRecap?.winner ? `<details class="sb-secondary"><summary>Last week’s Pick’em receipts</summary>${recapMarkup(board.lastRecap,esc)}</details>` : ""}
    ${pickemArchive(board,esc)}
    ${canBook?`<form class="sb-pickem-prize" id="pickem-prize-form"><label><span>Weekly winner prize</span><input name="prize" type="number" min="0" max="10000" step="25" value="${Number(board.weeklyPrize||0)}"><small>Set 0 to keep Pick'em bragging-rights only.</small></label><button class="btn small" type="submit">Save SIN prize</button></form>`:""}
  </section>`;
}

function recapMarkup(recap,esc){if(!recap?.winner)return"";const move=Number(recap.mine?.movement||0),streak=Number(recap.mine?.streak||0);return `<aside class="sb-pickem-recap"><header><small>WEEK ${Number(recap.week)} RECEIPTS</small><strong>${esc(recap.winner.name)} took the week</strong></header><div><span><small>WINNER</small><b>${Number(recap.winner.correct)} right${Number(recap.winner.prize||0)?` · +${Number(recap.winner.prize)} SIN`:""}</b></span>${recap.closest?`<span><small>CLOSEST MNF CALL</small><b>${esc(recap.closest.name)} · off ${Number(recap.closest.delta)}</b></span>`:""}${recap.worst?`<span><small>WEEKLY DISASTER</small><b>${esc(recap.worst.name)} · ${Number(recap.worst.correct)} right</b></span>`:""}${recap.mine?`<span><small>YOUR RECEIPT</small><b>#${Number(recap.mine.rank||0)} · ${Number(recap.mine.correct||0)} right${move?` · ${move>0?"▲":"▼"}${Math.abs(move)}`:""}${streak>1?` · 🔥${streak}`:""}</b></span>`:""}</div></aside>`}

function pickemStandings(rows,esc,title,season=false,games=[],isLocked=false){const names=new Map(games.map(g=>[String(g.provider_event_id),new Map([[String(g.away_team_id),g.away_team_id],[String(g.home_team_id),g.home_team_id]])]));return `<section class="sb-pickem-standings"><div class="sb-board-head"><div><small>${season?"ALL SEASON":"THIS WEEK"}</small><h2>${esc(title)}</h2></div><span>${rows.length} cards</span></div>${rows.length?`<ol>${rows.map((r,i)=>{const move=Number(r.movement||0),streak=Number(r.streak||0),card=isLocked&&r.picks?Object.entries(r.picks).map(([game,team])=>names.get(String(game))?.get(String(team))||team).join(" · "):"";return `<li><b>${season?Number(r.season_rank||i+1):Number(r.weekly_rank||i+1)}</b><span>${esc(r.display_name)}</span><strong>${season?`${r.total_correct} right`:r.graded?`${r.correct_count} right`:"Locked"}</strong>${season?`<small>${Number(r.week_wins)}W · ${Number(r.weeks)} wk${move?` · ${move>0?"▲":"▼"}${Math.abs(move)}`:""}${streak>1?` · 🔥${streak}`:""}</small>`:r.graded&&r.tiebreak_delta!=null?`<small>Δ ${Number(r.tiebreak_delta)}</small>`:""}${card?`<details class="sb-pickem-card-picks"><summary>View picks</summary><p>${esc(card)}</p></details>`:""}</li>`}).join("")}</ol>`:`<p class="sb-empty">${season?"Season standings begin after the first slate is final.":"Nobody has locked a card yet."}</p>`}</section>`}

function pickemArchive(board,esc){const rivals=board.rivals||[],history=board.history||[];return `<details class="sb-pickem-archive"><summary><span><small>SEASON LAB</small><strong>History & rivalries</strong></span><b>OPEN</b></summary><div class="sb-pickem-archive-body"><section class="sb-pickem-rival"><header><small>HEAD TO HEAD</small><h3>Who knows ball?</h3></header>${rivals.length?`<label><span>Compare with</span><select data-pickem-rival>${rivals.map(r=>`<option value="${Number(r.member_id)}">${esc(r.display_name)}</option>`).join("")}</select></label><div>${rivals.map((r,index)=>{const mine=Number(r.my_wins||0),theirs=Number(r.their_wins||0),edge=mine===theirs?"Dead even":mine>theirs?"You own this matchup":`${r.display_name} has the edge`;return `<article data-rival-panel="${Number(r.member_id)}" ${index?"hidden":""}><strong>${esc(edge)}</strong><div><span><b>${mine}</b><small>YOUR WEEKS</small></span><span><b>${Number(r.ties||0)}</b><small>TIES</small></span><span><b>${theirs}</b><small>THEIR WEEKS</small></span></div><p>${Number(r.my_correct||0)}–${Number(r.their_correct||0)} correct across ${Number(r.weeks||0)} shared week${Number(r.weeks)===1?"":"s"}.${r.current_disagreements!=null?` You disagree on ${Number(r.current_disagreements)} pick${Number(r.current_disagreements)===1?"":"s"} this week.`:""}</p></article>`}).join("")}</div>`:`<p class="sb-empty">Rivalries unlock after two owners finish the same weekly card.</p>`}</section><section class="sb-pickem-history"><header><small>THE RECEIPTS</small><h3>Weekly archive</h3></header>${history.length?`<ol>${history.map(row=>`<li><b>W${Number(row.week)}</b><span><strong>${esc(row.winner?.name||"Winner")}</strong><small>${Number(row.winner?.correct||0)} right${Number(row.winner?.prize||0)?` · +${Number(row.winner.prize)} SIN`:""}</small></span>${row.mine?`<em>#${Number(row.mine.rank)} · ${Number(row.mine.correct)} right</em>`:`<em>NO CARD</em>`}</li>`).join("")}</ol>`:`<p class="sb-empty">The first completed week will start the archive.</p>`}</section></div></details>`}

export function wirePickem(host,board,refresh){
  host.querySelector("#pickem-prize-form")?.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector("button"),prize=Number(form.elements.prize.value);button.disabled=true;const{error}=await db().rpc("pickem_save_config",{new_weekly_prize:prize});if(error){toast(error.message||"Could not save prize",true);button.disabled=false;return}toast(prize?`${prize} SIN weekly prize set`:"Pick'em prize turned off");await refresh()});
  host.querySelector("[data-pickem-rival]")?.addEventListener("change",event=>{const id=event.currentTarget.value;host.querySelectorAll("[data-rival-panel]").forEach(panel=>{panel.hidden=panel.dataset.rivalPanel!==id})});
  if(!board?.available||locked(board))return;
  const picks={...(board.entry?.picks||{})};
  host.querySelectorAll("[data-pickem-team]").forEach(button=>button.addEventListener("click",()=>{
    const game=button.closest("[data-pickem-game]"),id=game?.dataset.pickemGame;if(!id)return;
    picks[id]=button.dataset.pickemTeam;
    game.querySelectorAll("[data-pickem-team]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
    const count=host.querySelector(".sb-pickem-hero > span");if(count)count.textContent=`${Object.keys(picks).length}/${(board.games||[]).length}`;
  }));
  host.querySelector("#pickem-save")?.addEventListener("click",async event=>{
    const button=event.currentTarget,status=host.querySelector("#pickem-status"),total=Number(host.querySelector("#pickem-total")?.value);
    button.disabled=true;if(status)status.textContent="Locking your card…";
    const{error}=await db().rpc("pickem_save_entry",{target_season:Number(board.season),target_week:Number(board.week),picks,tiebreak_total:total});
    if(error){button.disabled=false;if(status)status.textContent=error.message;return}
    toast("Pick'em card locked");await refresh();
  });
}

export function homePickemMarkup(board,esc){
  if(!board?.available)return"";
  const { chosen: count, total, isLocked, entered, correct, wrong, pending } = pickemState(board);
  const headline=isLocked ? entered ? `${correct} right · ${wrong} wrong` : "You missed this week’s cutoff" : !entered ? "Your card is waiting" : count===total ? "Card locked and loaded" : `${Math.max(0,total-count)} picks left`;
  const detail=isLocked ? entered ? `${pending} games still pending` : "View results · check back for the next card" : !entered ? `Week ${Number(board.week)} locks ${fmt(board.locksAt)}` : `${count} of ${total} games picked`;
  return `<a class="home-pickem-card" href="#/sportsbook" data-assemble><div><small>NFL PICK'EM · WEEK ${Number(board.week)}</small><strong>${esc(headline)}</strong><span>${esc(detail)}</span></div><b>${isLocked ? entered ? `${correct}–${wrong}` : "RESULTS" : !entered ? "PLAY" : `${count}/${total}`}</b></a>`;
}
