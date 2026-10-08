import {disclosure,wirePageDisclosures} from "../page-disclosure.js";
// =====================================================================
// Fantasy Fun Facts - "Did you know?"
// ---------------------------------------------------------------------
// One fact a day, chosen by the date so the whole league sees the same
// one, plus the rest of the book underneath it.
//
// This page computes nothing. funfacts.js derives the facts, and it in
// turn takes every figure from lore.js. Three layers, one direction, no
// second stats engine.
// =====================================================================
import { currentMember } from "../members.js";
import { teamPortrait } from "../team-presentation.js";
import { filterFacts } from "../league-play-model.js";
import { mountTrivia } from "../league-trivia.js";
import { esc, errorBox, loading, toast } from "../ui.js";
import { loadLore, clearLore, namer } from "../lore.js";
import { funFacts, factOfTheDay } from "../funfacts.js";
import { shareFact } from "../fact-share.js";
import { canEdit } from "../inline.js";
import { loadLeagueState } from "../league-state.js";
import { loadMemberDirectory } from "../members.js";
import { historyForWeek } from "../league-history-week.js";

const ICON = {
  nailbiter: "i-versus", blowout: "i-versus", high: "i-record", low: "i-record",
  streak: "i-medal", volume: "i-history", title: "i-trophy",
};

export async function render(view) {
  view.innerHTML = loading();

  const [lore, leagueState, members] = await Promise.all([
    loadLore(),
    loadLeagueState().catch(() => null),
    loadMemberDirectory().catch(() => []),
  ]);
  if (!lore || lore.error) { view.innerHTML = errorBox(lore?.error || new Error("No league data yet")); return; }

  const all = funFacts(lore);
  const factId = new URLSearchParams(location.hash.split('?')[1] || '').get('fact');
  const selected = all.find(fact => fact.id === factId);
  const today = selected || factOfTheDay(lore);
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const requestedWeek = Number(params.get('week')), currentWeek = Number(leagueState?.currentWeek) || 1;
  const selectedWeek = Number.isInteger(requestedWeek) && requestedWeek >= 1 && requestedWeek <= 18 ? requestedWeek : currentWeek;
  const historyWeek = historyForWeek({ lore, week: selectedWeek, members, historicalName: namer(lore) });

  if (!today) {
    view.innerHTML = `<header class="page-head"><h1>DFL Lore</h1></header>
      <div class="state"><span class="state-title">Not enough history yet</span>
      <span>Once a few seasons have been synced from Sleeper, the league's records show up here.</span></div>`;
    return;
  }

  view.innerHTML = `
    <header class="page-head"><div><h1>DFL Lore</h1><p>Know the records. Remember the rivalries. Test your league knowledge.</p></div></header>
    <details class="card trivia-hub"><summary>DFL trivia · Week ${leagueState?.currentWeek || 1} <span>Take the five-question challenge</span></summary><div data-trivia-host role="region" aria-label="Weekly DFL trivia"><p role="status">Open the challenge to load this week’s quiz.</p></div></details>

    <section class="factcard dfl-mark" data-fact>
      <span class="fact-kicker">
        <svg class="ico-sm" aria-hidden="true"><use href="#${esc(ICON[today.kind] || "i-record")}"></use></svg>
        DFL Lore
      </span>
      <p class="fact-ask">Did you know?</p>
      <p class="fact-head">${esc(today.headline)}</p>
      <p class="fact-detail">${esc(today.detail)}</p>
      ${today.season ? `<span class="fact-when">${esc(today.season)} season</span>` : ""}
      <div class="row-end">
        <button type="button" class="btn ghost small" data-share>
          <svg class="ico-sm" aria-hidden="true"><use href="#i-moment"></use></svg>
          Share
        </button>
      </div>
    </section>

    <p class="muted tiny fact-note">${selected ? 'From the DFL archive — drawn from the league’s recorded history.' : 'A new piece of league history every day — the same one for everybody.'}</p>

    <section class="card" id="league-week-archive" aria-labelledby="league-week-title">
      <h2 class="section-title" id="league-week-title" tabindex="-1">This week in DFL history</h2>
      <div class="lore-tools"><label for="history-week">Historical week<select id="history-week">${Array.from({length:18},(_,i)=>i+1).map(week=>`<option value="${week}" ${week===selectedWeek?'selected':''}>Week ${week}</option>`).join('')}</select></label><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Season-specific recaps →</a></div>
      <p class="muted">${historyWeek ? `${historyWeek.games} recorded games across ${historyWeek.seasons} seasons · Week ${historyWeek.week}` : `No finished scores saved for Week ${selectedWeek} yet.`}</p>
      ${historyWeek ? `<section class="history-week-grid">
      <article><small>WEEK'S RECORD</small><strong>${esc(historyWeek.high.name)}</strong><span>${historyWeek.high.score.toFixed(2)} points · ${historyWeek.high.season}</span></article>
      <article><small>BIGGEST ASS-WHIPPING</small><strong>${esc(historyWeek.blowout.winner.name)}</strong><span>Beat ${esc(historyWeek.blowout.loser.name)} by ${historyWeek.blowout.margin.toFixed(2)} · ${historyWeek.blowout.season}</span></article>
      <article><small>DECIMAL HELL</small><strong>${esc(historyWeek.close.winner.name)}</strong><span>Escaped ${esc(historyWeek.close.loser.name)} by ${historyWeek.close.margin.toFixed(2)} · ${historyWeek.close.season}</span></article>
      <article><small>WEEK ${historyWeek.week} RIVALS</small><strong>${esc(historyWeek.rivalry.names.join(" vs "))}</strong><span>${historyWeek.rivalry.games} meetings in Week ${historyWeek.week}</span></article>
      </section>` : ''}
    </section>

    ${canEdit() ? `
      <section class="card lore-admin">
        <div class="card-title-row">
          <div>
            <div class="card-title">DFL Lore</div>
            <p class="muted tiny">The facts are worked out from the Sleeper data every time this page
            loads — there is no stored list to regenerate. Refresh re-reads the league from Supabase,
            which is what you want after a sync.</p>
          </div>
          <span class="admin-badge">Admin only</span>
        </div>
        <div class="row-end">
          <span class="muted tiny" data-lore-status>${all.length} facts from ${lore.matchups.length} games</span>
          <button type="button" class="btn ghost small" data-lore-refresh>Refresh DFL Lore</button>
        </div>
      </section>` : ""}

    ${disclosure("facts-browse","Browse league facts","Search your team, rivalries, records and championships",`    <section class="lore-discovery" aria-label="Explore DFL facts">
     <h2 class="section-title">Explore the lore</h2>
     <div class="lore-tools"><label for="lore-filter">Show<select id="lore-filter"><option value="all">All facts</option><option value="mine">My team</option><option value="rivalries">Rivalries</option><option value="records">Records</option><option value="titles">Championships</option></select></label><label for="lore-search">Search facts<input id="lore-search" type="search" placeholder="Owner, season or record"></label></div>
     <p class="muted" role="status" data-fact-count></p><div class="lore-card-grid" data-fact-results></div><button class="btn ghost" type="button" data-more-facts hidden>Show more facts</button>
    </section>`)}
  `;

  view.querySelector('#history-week').addEventListener('change',event=>{params.set('week',event.target.value);params.set('archive','weekly');location.hash='#/facts?'+params.toString()});
  if(params.get('archive')==='weekly'){view.querySelector('#league-week-title').focus({preventScroll:true});view.querySelector('#league-week-archive').scrollIntoView({block:'start'})}
  wirePageDisclosures(view);
  let shown=6;
  const drawFacts=()=>{
    const mine=currentMember(),filter=view.querySelector('#lore-filter').value;
    const results=filterFacts(all,{filter,query:view.querySelector('#lore-search').value,userId:mine?.sleeper_user_id||''});
    view.querySelector('[data-fact-count]').textContent=filter==='mine'&&!mine?'Choose your profile to see your team’s facts.':`Showing ${Math.min(shown,results.length)} of ${results.length} facts`;
    view.querySelector('[data-fact-results]').innerHTML=results.slice(0,shown).map(f=>{
      const owners=members.filter(m=>(f.userIds||[]).includes(String(m.sleeper_user_id)));
      return `<article class="card lore-fact"><div class="lore-fact-owners">${owners.map(m=>teamPortrait({identity:m,team_name:m.team_name||m.display_name})).join('')}<small>${esc(f.season?`${f.season} season`:'All-time')} · ${esc(f.kind)}</small></div><h3>${esc(f.headline)}</h3><p>${esc(f.detail)}</p><button class="btn ghost small" type="button" data-share-fact="${esc(f.id)}">Share fact</button></article>`;
    }).join('')||'<p class="muted">No matching facts. Try another filter or search.</p>';
    view.querySelector('[data-more-facts]').hidden=results.length<=shown;
  };
  view.querySelector('[data-more-facts]').addEventListener('click',()=>{shown+=6;drawFacts()});
  const resetFacts=()=>{shown=6;drawFacts()};
  drawFacts();view.querySelector('#lore-filter').addEventListener('change',resetFacts);view.querySelector('#lore-search').addEventListener('input',resetFacts);
  view.querySelector('[data-fact-results]').addEventListener('click',event=>{const button=event.target.closest('[data-share-fact]');if(button)void shareFact(all.find(f=>f.id===button.dataset.shareFact))});
  let triviaLoaded=false;view.querySelector('.trivia-hub').addEventListener('toggle',event=>{if(event.currentTarget.open&&!triviaLoaded){triviaLoaded=true;void mountTrivia(view.querySelector('[data-trivia-host]'),leagueState,members)}});
  if(new URLSearchParams(location.hash.split("?")[1]||"").get("play")==="trivia")view.querySelector(".trivia-hub").open=true;
  /*
    THE REFRESH.

    It re-reads, it does not regenerate: clearLore() drops the cached
    league and loadLore({force}) fetches it again, which makes funfacts.js
    rebuild because it caches against the lore object's identity. That is
    the whole existing pipeline, run again - no second generation system.

    THIS IS NOT A SECURITY BOUNDARY, and it does not need to be. The
    operation is "re-read data this browser is already allowed to read", so
    a non-admin invoking it would gain exactly nothing. It is behind
    canEdit() because it is commissioner housekeeping, not because it is
    privileged - and nothing here writes.
  */
  view.querySelector("[data-lore-refresh]")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const status = view.querySelector("[data-lore-status]");
    btn.disabled = true;
    const was = btn.textContent;
    btn.textContent = "Refreshing…";
    if (status) status.textContent = "Re-reading the league…";
    try {
      clearLore();
      const fresh = await loadLore({ force: true });
      if (fresh?.error) throw fresh.error;
      const n = funFacts(fresh).length;
      toast(`DFL Lore refreshed — ${n} facts`);
      await render(view);                     // redraw with the new data
      return;
    } catch (err) {
      if (status) status.textContent = "Could not refresh";
      toast(err.message || "Could not refresh DFL Lore", true);
    }
    btn.disabled = false;
    btn.textContent = was;
  });

  view.querySelector("[data-share]")?.addEventListener("click", () => {
    /* A PICTURE, not a paragraph. shareCanvas() underneath falls back the
       right way on its own: the share sheet on a phone (which is how this
       reaches Messenger), then saving the PNG, then the clipboard. */
    const how = shareFact(today);
    if (how === "saved")  toast("Image saved to your downloads");
    if (how === "copied") toast("Copied — paste it in the group chat");
    if (how === "failed") toast("Could not share on this device", true);
  });
}
