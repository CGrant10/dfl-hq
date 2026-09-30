import { db } from "./supabase.js";
import { toast } from "./ui.js";

const locked=board=>!!board?.locksAt&&new Date(board.locksAt)<=new Date();
const fmt=v=>v?new Date(v).toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"";

export async function loadPickemBoard(){
  const{data,error}=await db().rpc("pickem_current_board");
  if(error){if(/does not exist|schema cache|Could not find/i.test(error.message||""))return{available:false};throw error}
  return data||{available:false};
}

export function pickemMarkup(board,esc){
  if(!board?.available)return `<section class="sb-pickem-empty"><small>NFL PICK'EM</small><h2>Building this week's card</h2><p>A commissioner can tap Sync Pick'em now, or the free public NFL feed will fill it during the next automatic refresh.</p></section>`;
  const picks=board.entry?.picks||{},isLocked=locked(board),games=board.games||[],chosen=Object.keys(picks).length;
  return `<section class="sb-pickem" data-season="${Number(board.season)}" data-week="${Number(board.week)}">
    <div class="sb-pickem-hero"><div><small>WEEK ${Number(board.week)} · ${Number(board.season)}</small><h2>Call the whole slate.</h2><p>${isLocked?"Card locked. Follow the damage live.":`Pick every winner before ${esc(fmt(board.locksAt))}.`}</p></div><span>${chosen}/${games.length}</span></div>
    <div class="sb-pickem-games">${games.map(g=>{
      const live=g.status==="live",final=g.status==="final",state=final?`${g.away_score}–${g.home_score}`:live?"LIVE":esc(fmt(g.starts_at));
      return `<article class="sb-pickem-game${g.is_monday_night?" is-mnf":""}" data-pickem-game="${esc(g.provider_event_id)}"><div class="sb-pickem-gamehead"><small>${g.is_monday_night?"MONDAY NIGHT · TIEBREAKER":"NFL"}</small><b>${state}</b></div><div class="sb-pickem-sides">
        <button type="button" data-pickem-team="${esc(g.away_team_id)}" aria-pressed="${String(picks[g.provider_event_id])===String(g.away_team_id)}" ${isLocked?"disabled":""}><span>${esc(g.away_team_name)}</span>${final?`<b>${Number(g.away_score)}</b>`:""}</button>
        <span>@</span>
        <button type="button" data-pickem-team="${esc(g.home_team_id)}" aria-pressed="${String(picks[g.provider_event_id])===String(g.home_team_id)}" ${isLocked?"disabled":""}><span>${esc(g.home_team_name)}</span>${final?`<b>${Number(g.home_score)}</b>`:""}</button>
      </div></article>`}).join("")}</div>
    <div class="sb-pickem-lock"><label><span>Monday night total</span><input type="number" min="0" max="150" inputmode="decimal" id="pickem-total" value="${board.entry?.tiebreakTotal??""}" placeholder="47.5" ${isLocked?"disabled":""}></label>${!isLocked?`<button type="button" class="btn" id="pickem-save">Lock my card</button>`:""}<p id="pickem-status" class="muted tiny" aria-live="polite"></p></div>
    ${pickemStandings(board.standings||[],esc,"Weekly board")}
    ${pickemStandings(board.seasonStandings||[],esc,"Season race",true)}
  </section>`;
}

function pickemStandings(rows,esc,title,season=false){return `<section class="sb-pickem-standings"><div class="sb-board-head"><div><small>${season?"ALL SEASON":"THIS WEEK"}</small><h2>${esc(title)}</h2></div><span>${rows.length} cards</span></div>${rows.length?`<ol>${rows.map((r,i)=>`<li><b>${i+1}</b><span>${esc(r.display_name)}</span><strong>${season?`${r.total_correct} right`:r.graded?`${r.correct_count} right`:"Locked"}</strong>${season?`<small>${Number(r.week_wins)}W · ${Number(r.weeks)} wk</small>`:r.graded&&r.tiebreak_delta!=null?`<small>Δ ${Number(r.tiebreak_delta)}</small>`:""}</li>`).join("")}</ol>`:`<p class="sb-empty">${season?"Season standings begin after the first slate is final.":"Nobody has locked a card yet."}</p>`}</section>`}

export function wirePickem(host,board,refresh){
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
