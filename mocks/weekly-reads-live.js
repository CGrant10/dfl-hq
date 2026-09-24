const teams = [
  [1,"Bastards of the Realm","2–0","↑ 1","BR"],
  [2,"DaGrapeApes","2–0","—","DA"],
  [3,"Hurts So Good","2–0","↑ 3","HG"],
  [4,"Gridiron Dad","1–1","↓ 2","GD"],
  [5,"The Boyou Bombers","1–1","↑ 2","BB"],
  [6,"Klutch Sports Group","1–1","—","KS"],
  [7,"DAKstreetboys!!!","1–1","↓ 3","DB"],
  [8,"Dream Enders","1–1","↑ 1","DE"],
  [9,"Quantum Leap","1–1","↓ 1","QL"],
  [10,"Jack-HAMMER","0–2","—","JH"],
  [11,"Go Nickers","0–2","—","GN"],
  [12,"Fuck you","0–2","—","FY"],
];

const rankList = document.querySelector("[data-rank-list]");
rankList.innerHTML = teams.map((team, index) => `<li class="${index > 2 ? "is-rank-collapsed" : ""}">
  <b>${team[0]}</b><span class="home-rank-face home-rank-initials">${team[4]}</span>
  <span><strong>${team[1]}</strong></span><em>${team[2]}</em><span class="${team[3].startsWith("↑") ? "rank-up" : ""}">${team[3]}</span>
</li>`).join("");

const ranks = document.querySelector(".home-rankings-card");
document.querySelector("[data-rank-toggle]").addEventListener("click", (event) => {
  const open = ranks.classList.toggle("is-expanded");
  event.currentTarget.setAttribute("aria-expanded", String(open));
  event.currentTarget.querySelector("span").textContent = open ? "Show top 3" : "View all 12";
});

const reading = document.querySelector("[data-reading]");
const stateButtons = [...document.querySelectorAll("[data-state]")];

const content = {
  autopsy: () => `<header><h2>The Autopsy</h2><small>2026 · Week 2 · Final</small></header>
    <div class="read-lead"><small>Game of the week</small><h3>Bastards survive by 0.7</h3><p><strong>Martin77 escaped with the kind of win that should require an apology.</strong> Dream Enders lost by less than a point and now gets to replay every lineup choice until Thursday.</p></div>
    <div class="read-stats">
      <article><small>Ass-whipping</small><strong>DaGrapeApes</strong><span>Won by 31.4. Completely unnecessary.</span></article>
      <article><small>Closest escape</small><strong>Martin77</strong><span>0.7 points and zero shame.</span></article>
      <article><small>Bench crime</small><strong>Dream Enders</strong><span>24.2 points left to rot.</span></article>
    </div>
    <div class="read-actions"><button type="button" data-toast="Opening the full Week 2 story">Read the full autopsy</button><button type="button" data-toast="Share card prepared">Share</button></div>`,
  slate: () => `<header><h2>The Slate</h2><small>2026 · Week 3 · Thursday</small></header>
    <div class="read-lead"><small>Main event</small><h3>DaGrapeApes vs Bastards</h3><p><strong>The series is tied 4–4 and the model gives Bastards a 6.2-point edge.</strong> One of them gets the league lead. The other gets a quiet group chat.</p></div>
    <div class="slate-games">
      <div class="slate-game"><span><b>Dream Enders vs Klutch Sports</b><small>Upset watch · one volatile flex decides it</small></span><strong>DREAM +2.1</strong></div>
      <div class="slate-game"><span><b>Hurts So Good vs Gridiron Dad</b><small>Best lineup ceiling of the week</small></span><strong>HURTS +8.4</strong></div>
      <div class="slate-game"><span><b>Jack-HAMMER vs Go Nickers</b><small>Somebody has to get a win</small></span><strong>TOSS-UP</strong></div>
    </div>
    <div class="read-actions"><button type="button" data-toast="Opening all six matchups">Read the full slate</button><button type="button" data-toast="Share card prepared">Share</button></div>`,
  vote: () => `<header><h2>Week 2 Superlatives</h2><small>Voting closes Thursday</small></header>
    <div class="vote-tabs"><button type="button" data-category="manager">Manager of the Week</button><button type="button" class="on" data-category="fraud">Biggest Fraud</button><button type="button" data-category="loss">Funniest Loss</button></div>
    <div class="nominees" data-nominees></div>
    <div class="vote-foot"><span><b data-vote-count>7</b> of 12 voted</span><button type="button" data-lock-vote>Lock my vote</button></div>`,
};

const nominees = {
  manager: [["DaGrapeApes","League-high 136.8 and no wasted starter spot."],["Hurts So Good","Won by 18.4 with the cleanest lineup."],["Bastards of the Realm","Survived the week’s closest game."]],
  fraud: [["Martin77","Won with the 10th-highest score."],["Dream Enders","Left 24.2 usable points on the bench."],["Jack-HAMMER","Favored by 18. Lost by 6 anyway."]],
  loss: [["Dream Enders","Lost by 0.7. One catch from peace."],["Jack-HAMMER","A 24-point swing from Thursday to Monday."],["Quantum Leap","Talked all week. Scored 87.5."]],
};

let state = "autopsy";
function wireReading() {
  reading.querySelectorAll("[data-toast]").forEach(button => button.addEventListener("click", () => {
    button.textContent = button.dataset.toast;
    setTimeout(() => { render(state); }, 900);
  }));
  reading.querySelectorAll("[data-category]").forEach(button => button.addEventListener("click", () => {
    reading.querySelectorAll("[data-category]").forEach(item => item.classList.toggle("on", item === button));
    drawNominees(button.dataset.category);
  }));
  reading.querySelector("[data-lock-vote]")?.addEventListener("click", event => {
    event.currentTarget.textContent = "Vote locked";
    event.currentTarget.disabled = true;
    reading.querySelector("[data-vote-count]").textContent = "8";
  });
}

function drawNominees(category) {
  const host = reading.querySelector("[data-nominees]");
  if (!host) return;
  host.innerHTML = nominees[category].map((item, index) => `<button type="button" class="nominee ${index === 0 ? "on" : ""}"><span><strong>${item[0]}</strong><small>${item[1]}</small></span><b>${index === 0 ? "Voted" : "Vote"}</b></button>`).join("");
  host.querySelectorAll(".nominee").forEach(button => button.addEventListener("click", () => {
    host.querySelectorAll(".nominee").forEach(item => { item.classList.toggle("on", item === button); item.querySelector("b").textContent = item === button ? "Voted" : "Vote"; });
  }));
}

function render(next) {
  state = next;
  stateButtons.forEach(button => button.classList.toggle("on", button.dataset.state === state));
  reading.innerHTML = content[state]();
  wireReading();
  if (state === "vote") drawNominees("fraud");
}

stateButtons.forEach(button => button.addEventListener("click", () => render(button.dataset.state)));
document.querySelectorAll(".tabbar a").forEach(link => link.addEventListener("click", event => event.preventDefault()));
render(state);
