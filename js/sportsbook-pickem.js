import { db } from "./supabase.js";
import { toast } from "./ui.js";

const locked=board=>!!board?.locksAt&&new Date(board.locksAt)<=new Date();
const fmt=v=>v?new Date(v).toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"";

export async function loadPickemBoard(){
  const{data,error}=await db().rpc("pickem_current_board");
  if(error){if(/does not exist|schema cache|Could not find/i.test(error.message||""))return{available:false};throw error}
  return data||{available:false};
}

export function pickemMarkup(board,esc,canBook=false){
  if(!board?.available)return `<section class="sb-pickem-empty"><small>NFL PICK'EM</small><h2>Building this week's card</h2><p>A commissioner can tap Sync Pick'em now, or the free public NFL feed will fill it during the next automatic refresh.</p></section>`;
  const picks=board.entry?.picks||{},isLocked=locked(board),games=board.games||[],chosen=Object.keys(picks).length;
  const liveDone=Number(board.entry?.liveCorrect||0)+Number(board.entry?.liveWrong||0);
  return `<section class="sb-pickem" data-season="${Number(board.season)}" data-week="${Number(board.week)}">
    <div class="sb-pickem-hero"><div><small>WEEK ${Number(board.week)} · ${Number(board.season)}</small><h2>${isLocked?"Receipts are live.":"Call the whole slate."}</h2><p>${isLocked?`${Number(board.entry?.liveCorrect||0)} right · ${Number(board.entry?.liveWrong||0)} wrong · ${games.length-liveDone} pending`:`Pick every winner before ${esc(fmt(board.locksAt))}.`}</p></div><span>${isLocked?`${Number(board.entry?.liveCorrect||0)}–${Number(board.entry?.liveWrong||0)}`:`${chosen}/${games.length}`}</span></div>
    ${recapMarkup(board.lastRecap,esc)}
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
    ${canBook?`<form class="sb-pickem-prize" id="pickem-prize-form"><label><span>Weekly winner prize</span><input name="prize" type="number" min="0" max="10000" step="25" value="${Number(board.weeklyPrize||0)}"><small>Set 0 to keep Pick'em bragging-rights only.</small></label><button class="btn small" type="submit">Save SIN prize</button></form>`:""}
  </section>`;
}

function recapMarkup(recap,esc){if(!recap?.winner)return"";const move=Number(recap.mine?.movement||0),streak=Number(recap.mine?.streak||0);return `<aside class="sb-pickem-recap"><header><small>WEEK ${Number(recap.week)} RECEIPTS</small><strong>${esc(recap.winner.name)} took the week</strong></header><div><span><small>WINNER</small><b>${Number(recap.winner.correct)} right${Number(recap.winner.prize||0)?` · +${Number(recap.winner.prize)} SIN`:""}</b></span>${recap.closest?`<span><small>CLOSEST MNF CALL</small><b>${esc(recap.closest.name)} · off ${Number(recap.closest.delta)}</b></span>`:""}${recap.worst?`<span><small>WEEKLY DISASTER</small><b>${esc(recap.worst.name)} · ${Number(recap.worst.correct)} right</b></span>`:""}${recap.mine?`<span><small>YOUR RECEIPT</small><b>#${Number(recap.mine.rank||0)} · ${Number(recap.mine.correct||0)} right${move?` · ${move>0?"▲":"▼"}${Math.abs(move)}`:""}${streak>1?` · 🔥${streak}`:""}</b></span>`:""}</div></aside>`}

function pickemStandings(rows,esc,title,season=false,games=[],isLocked=false){const names=new Map(games.map(g=>[String(g.provider_event_id),new Map([[String(g.away_team_id),g.away_team_id],[String(g.home_team_id),g.home_team_id]])]));return `<section class="sb-pickem-standings"><div class="sb-board-head"><div><small>${season?"ALL SEASON":"THIS WEEK"}</small><h2>${esc(title)}</h2></div><span>${rows.length} cards</span></div>${rows.length?`<ol>${rows.map((r,i)=>{const move=Number(r.movement||0),streak=Number(r.streak||0),card=isLocked&&r.picks?Object.entries(r.picks).map(([game,team])=>names.get(String(game))?.get(String(team))||team).join(" · "):"";return `<li><b>${season?Number(r.season_rank||i+1):Number(r.weekly_rank||i+1)}</b><span>${esc(r.display_name)}</span><strong>${season?`${r.total_correct} right`:r.graded?`${r.correct_count} right`:"Locked"}</strong>${season?`<small>${Number(r.week_wins)}W · ${Number(r.weeks)} wk${move?` · ${move>0?"▲":"▼"}${Math.abs(move)}`:""}${streak>1?` · 🔥${streak}`:""}</small>`:r.graded&&r.tiebreak_delta!=null?`<small>Δ ${Number(r.tiebreak_delta)}</small>`:""}${card?`<details class="sb-pickem-card-picks"><summary>View picks</summary><p>${esc(card)}</p></details>`:""}</li>`}).join("")}</ol>`:`<p class="sb-empty">${season?"Season standings begin after the first slate is final.":"Nobody has locked a card yet."}</p>`}</section>`}

export function wirePickem(host,board,refresh){
  host.querySelector("#pickem-prize-form")?.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector("button"),prize=Number(form.elements.prize.value);button.disabled=true;const{error}=await db().rpc("pickem_save_config",{new_weekly_prize:prize});if(error){toast(error.message||"Could not save prize",true);button.disabled=false;return}toast(prize?`${prize} SIN weekly prize set`:"Pick'em prize turned off");await refresh()});
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
  const picks=board.entry?.picks||{},count=Object.keys(picks).length,total=(board.games||[]).length,isLocked=locked(board),done=Number(board.entry?.liveCorrect||0)+Number(board.entry?.liveWrong||0);
  const headline=!board.entry?"Your card is waiting":isLocked?`${Number(board.entry.liveCorrect||0)} right · ${Number(board.entry.liveWrong||0)} wrong`:count===total?"Card locked and loaded":`${total-count} picks left`;
  const detail=!board.entry?`Week ${Number(board.week)} locks ${fmt(board.locksAt)}`:isLocked?`${total-done} games still pending`:`${count} of ${total} games picked`;
  return `<a class="home-pickem-card" href="#/sportsbook" data-assemble><div><small>NFL PICK'EM · WEEK ${Number(board.week)}</small><strong>${esc(headline)}</strong><span>${esc(detail)}</span></div><b>${!board.entry?"PLAY":isLocked?`${Number(board.entry.liveCorrect||0)}–${Number(board.entry.liveWrong||0)}`:`${count}/${total}`}</b></a>`;
}
