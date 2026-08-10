/* =====================================================================
   DFL Golf - ONE scorecard per team. Mobile-first.
   ---------------------------------------------------------------------
   Scores are shared per team: one row in golf_scores per
   (outing_id, team_id, hole), member_id null. Any member of the team can
   write their own team's card; admins can write anybody's. Postgres is
   what enforces that - see golf_schema.sql.

   The card is laid out the way a golf app is: the marks and the strip at
   the top are paper-scorecard shorthand, kept exactly.

     THE STRIP    holes across, par under, the score in its mark, OUT and
                  IN on the end. The whole round at a glance, read-only.
     THE ROWS     one hole per row down the page: yardage, par, and the
                  strokes. This is where scores go in.

     A MARK       circle = under par, square = over, a second ring = by
                  two or more. Shape carries the meaning so the card still
                  reads in a screenshot or in the sun; the colour and the
                  word beside it agree with the shape rather than being
                  the only signal.

   Strokes go in two ways on purpose: the +/- pair, which is what you use
   one-handed on a tee box, and typing into the number, which is faster
   when you are catching up on three holes at the turn. The number IS the
   mark - it is a round input for a birdie and a square one for a bogey.

   Rolla is a 9-hole course, so holes 10-18 are the second time around and
   par/yardage for hole 12 comes from hole 3.
   ===================================================================== */
import { db, isAdmin } from "./supabase.js";
import { currentMember, loadMembers } from "./members.js";
const esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;","\>":"&gt;",'"':"&quot;"}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const MIN_STROKES=1,MAX_STROKES=15;
/* Long enough that + + + is one write, short enough that a save always
   beats the walk to the next tee. */
const SAVE_DELAY=600;
const fmtToPar=(score,par)=>{if(!score)return"—";const d=score-par;return d===0?"E":d>0?`+${d}`:`${d}`;};
/*
  One place decides what a score is called, what shape it wears and what
  colour it is, so the strip, the row and the label can never disagree.
*/
function holeResult(score,par){const s=Number(score);if(!s)return{mark:"m-none",cls:"result-empty",label:"—"};const d=s-Number(par);if(d<=-2)return{mark:"m-eagle",cls:"result-eagle",label:"EAGLE"};if(d===-1)return{mark:"m-birdie",cls:"result-birdie",label:"BIRDIE"};if(d===0)return{mark:"m-par",cls:"result-par",label:"PAR"};if(d===1)return{mark:"m-bogey",cls:"result-bogey",label:"BOGEY"};if(d===2)return{mark:"m-dbl",cls:"result-double",label:"DOUBLE"};return{mark:"m-dbl",cls:"result-double",label:`+${d}`};}
function styles(){if(document.getElementById("dfl-team-scorecard-style"))return;const s=document.createElement("style");s.id="dfl-team-scorecard-style";s.textContent=`.dfl-team-card{overflow:hidden}.dfl-team-head{padding:14px;border-bottom:1px solid var(--line);background:var(--bg-3)}.dfl-team-head-top{display:flex;align-items:center;gap:10px}.dfl-team-head h2{margin:0;font-size:20px}.dfl-team-kicker{font-size:9px;letter-spacing:.14em;font-weight:900;color:var(--accent);display:block;margin-bottom:2px}.dfl-team-roster{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.dfl-team-roster span{font-size:10px;padding:4px 7px;border:1px solid var(--line);border-radius:999px;background:var(--bg-2)}.dfl-score-status{padding:8px 14px;font-size:11px;color:var(--muted);border-bottom:1px solid var(--line)}.dfl-admin-actions{display:flex;justify-content:flex-end;padding:8px 10px;border-bottom:1px solid var(--line)}.dfl-clear-scorecard{border:1px solid #a33;border-radius:8px;padding:7px 10px;background:transparent;color:#e88;font-weight:900;font-size:11px}

/* ---- the strip: the whole round at a glance ---- */
.dfl-strip{margin:10px;border:1px solid var(--line);border-radius:10px;background:var(--bg-2);overflow:hidden}
.dfl-strip-title{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;background:var(--bg-3);border-bottom:1px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:var(--muted)}
.dfl-strip-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.dfl-strip-tbl{border-collapse:separate;border-spacing:0;width:100%;min-width:100%;font-variant-numeric:tabular-nums;table-layout:fixed}
.dfl-strip-tbl th,.dfl-strip-tbl td{padding:0;height:28px;text-align:center;border-bottom:1px solid var(--line-soft);font-size:11px;font-weight:800}
.dfl-strip-tbl th.lbl{width:42px;text-align:left;padding-left:11px;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.06em;border-right:1px solid var(--line)}
.dfl-strip-tbl .row-h td{background:var(--bg-3);color:var(--muted);font-size:10px}
.dfl-strip-tbl .row-p td{color:var(--muted);font-size:10px;height:24px}
.dfl-strip-tbl .row-s td{height:34px}
.dfl-strip-tbl .sub{border-left:1px solid var(--line);background:rgba(255,255,255,.03);width:34px}
.dfl-strip-tbl tr:last-child td,.dfl-strip-tbl tr:last-child th{border-bottom:0}
.dfl-strip-tbl td[data-ov-hole]{cursor:pointer}
.ovm{display:inline-grid;place-items:center;width:24px;height:24px;font-size:12px;font-weight:900;line-height:1}

/* ---- one hole, one row ---- */
.dfl-nine{margin:10px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--bg-2)}.dfl-nine-title{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-3);border-bottom:1px solid var(--line)}
.dfl-hole-grid{display:grid;grid-template-columns:38px 1fr 52px 132px 78px;align-items:center}
.dfl-hole-grid>div{min-height:44px;padding:5px 6px;border-bottom:1px solid var(--line-soft);border-right:1px solid var(--line-soft)}.dfl-hole-grid>div:not(.score):not(.result){display:flex;align-items:center}.dfl-hole-grid .hdr{min-height:30px;background:var(--bg-3);font-size:9px;text-transform:uppercase;font-weight:900;color:var(--muted)}.dfl-hole-grid .hole{justify-content:center;font-weight:900}.dfl-hole-grid .yards{justify-content:flex-start;font-variant-numeric:tabular-nums}.dfl-hole-grid .par{justify-content:center;color:var(--muted);font-weight:800}
.dfl-hole-grid .score{display:flex;align-items:center;justify-content:center;gap:5px;background:rgba(255,255,255,.025)}
.dfl-hole-grid .result{display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;font-weight:900;letter-spacing:.03em}
.result-eagle{color:#35d06f}.result-birdie{color:#8ee6ad}.result-par{color:var(--text)}.result-bogey{color:#ff766d}.result-double{color:#e33d35}.result-empty{color:var(--muted);font-weight:700}
.dfl-hole-grid .is-now{background:rgba(47,191,95,.07)}

/* A thumb in a golf glove needs 40px+, and the two buttons must not be so
   close together that a mis-tap costs a stroke. */
.sbtn{width:38px;height:40px;flex:0 0 38px;border:1px solid var(--line);border-radius:9px;background:var(--bg-3);color:var(--text);font-size:20px;font-weight:900;line-height:1;padding:0}
.sbtn:active{background:var(--bg-2)}
.sbtn:disabled{opacity:.35}

/* ---- the mark: the number wears its own result ---- */
/* The input IS the shape - a round field for a birdie, a square one for a
   bogey - so typing and the paper shorthand are the same object. */
.mark{display:inline-grid;place-items:center;flex:0 0 auto}
.dfl-hole-grid input,.mark input{box-sizing:border-box;width:42px;height:42px;padding:0;border:2px solid var(--line);border-radius:9px;background:var(--bg-2);color:var(--text);text-align:center;font-size:19px;font-weight:950;line-height:1}
.dfl-hole-grid input:focus{outline:3px solid var(--accent);outline-offset:2px;background:var(--bg-3)}
.dfl-hole-grid input[type=number]::-webkit-inner-spin-button,.dfl-hole-grid input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.m-none input{border-style:dashed;color:var(--muted)}
.m-par input{border-color:#4a5568}
.m-birdie input,.m-eagle input{border-radius:50%;border-color:#35d06f;color:#8ee6ad}
.m-eagle input{box-shadow:0 0 0 2px var(--bg-2),0 0 0 4px #35d06f}
.m-bogey input,.m-dbl input{border-radius:7px;border-color:#ff766d}
.m-dbl input{border-color:#e33d35;box-shadow:0 0 0 2px var(--bg-2),0 0 0 4px #e33d35}
.m-eagle,.m-dbl{margin:0 3px}
.ovm.m-birdie,.ovm.m-eagle{border:1.5px solid #35d06f;border-radius:50%;color:#8ee6ad}
.ovm.m-eagle{box-shadow:0 0 0 1.5px var(--bg-2),0 0 0 3px #35d06f}
.ovm.m-bogey{border:1.5px solid #ff766d;border-radius:3px}
.ovm.m-dbl{border:1.5px solid #e33d35;border-radius:3px;color:#f0a79b;box-shadow:0 0 0 1.5px var(--bg-2),0 0 0 3px #e33d35}
.ovm.m-none{color:var(--line)}

.dfl-nine-tally{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);border-top:1px solid var(--line)}.dfl-nine-tally div{padding:9px 7px;text-align:center;background:var(--bg-3)}.dfl-nine-tally small,.dfl-final small{display:block;font-size:8px;text-transform:uppercase;color:var(--muted);font-weight:900}.dfl-nine-tally b{font-size:15px}.dfl-final{margin:10px;padding:12px;border:2px solid var(--line);border-radius:10px;background:var(--bg-3);display:grid;grid-template-columns:1fr 1fr;text-align:center;gap:8px}.dfl-final b{display:block;font-size:18px;margin-top:2px}.dfl-score-help{padding:0 12px 10px;font-size:10px;color:var(--muted)}
@media(min-width:700px){.dfl-hole-grid{grid-template-columns:42px 1fr 56px 140px 96px}.dfl-nine,.dfl-final,.dfl-strip{margin:12px 14px}.ovm{width:26px;height:26px;font-size:13px}}
@media(max-width:600px){.dfl-team-head{padding:12px}
.dfl-hole-grid{grid-template-columns:28px minmax(40px,1fr) 30px 124px 58px}
.dfl-hole-grid>div{min-height:48px;padding:5px 2px}.dfl-hole-grid .yards{font-size:10.5px;white-space:nowrap}
.sbtn{width:34px;flex:0 0 34px;height:40px;font-size:19px}
.dfl-hole-grid .score{gap:3px}
.dfl-hole-grid input,.mark input{width:40px;height:40px;font-size:18px}
.dfl-hole-grid .result{font-size:9.5px;letter-spacing:0}
.dfl-strip-tbl th.lbl{width:34px;padding-left:8px}.dfl-strip-tbl .sub{width:30px}.ovm{width:22px;height:22px;font-size:11px}
.dfl-score-help{font-size:9px;padding-bottom:12px}}`;
document.head.appendChild(s);}
async function loadCard(outingId,teamId){const [team,parts,holes,scores,outing,members]=await Promise.all([db().from("golf_teams").select("*").eq("id",teamId).eq("outing_id",outingId).maybeSingle(),db().from("golf_participants").select("id,member_id,team_id").eq("outing_id",outingId).eq("team_id",teamId).order("sort_order"),db().from("golf_holes").select("hole,par").eq("outing_id",outingId).order("hole"),db().from("golf_scores").select("id,outing_id,team_id,hole,strokes").eq("outing_id",outingId).eq("team_id",teamId),db().from("golf_outings").select("id,course_id,course,holes").eq("id",outingId).maybeSingle(),loadMembers().catch(()=>[])]);const error=team.error||parts.error||holes.error||scores.error||outing.error;if(error)throw error;let courseHoles=[];const courseId=outing.data?.course_id;if(courseId){const ch=await db().from("golf_course_holes").select("hole,yardage_men,yardage_women,par,handicap").eq("course_id",courseId).order("hole");if(!ch.error)courseHoles=ch.data||[];}return{team:team.data,parts:parts.data||[],holes:holes.data||[],scores:scores.data||[],outing:outing.data,members:members||[],courseHoles};}
function scoreMap(scores){return new Map(scores.map(s=>[Number(s.hole),s]));}
function total(map,start,end){let t=0;for(let h=start;h<=end;h++)t+=num(map.get(h)?.strokes);return t;}
function courseHole(holes,h){return h>9?h-9:h}
function holePar(holes,h){const n=courseHole(holes,h);return Number(holes.find(x=>Number(x.hole)===n)?.par)||4}
function holeYards(courseHoles,h){const n=courseHole(courseHoles,h);return Number(courseHoles.find(x=>Number(x.hole)===n)?.yardage_men)||Number(courseHoles.find(x=>Number(x.hole)===n)?.yardage_women)||0}
function playedPar(map,holes,start,end){let p=0;for(let h=start;h<=end;h++)if(map.has(h))p+=holePar(holes,h);return p}

/*
  The strip. Nine columns of a nine, so it never needs to scroll on a phone,
  and the score sits in the same mark it wears in its row. Tapping a hole
  jumps to that row rather than trying to be a second place to score - one
  place to type is the whole reason the rows exist.
*/
function stripNine(label,start,holes,map){const nums=Array.from({length:9},(_,i)=>start+i),par=nums.reduce((a,h)=>a+holePar(holes,h),0),score=total(map,start,start+8);
return `<table class="dfl-strip-tbl"><tr class="row-h"><th class="lbl">Hole</th>${nums.map(h=>`<td>${h}</td>`).join("")}<td class="sub">${label}</td></tr>
<tr class="row-p"><th class="lbl">Par</th>${nums.map(h=>`<td>${holePar(holes,h)}</td>`).join("")}<td class="sub">${par}</td></tr>
<tr class="row-s"><th class="lbl">Score</th>${nums.map(h=>{const v=num(map.get(h)?.strokes),r=holeResult(v,holePar(holes,h));return `<td data-ov-hole="${h}"><span class="ovm ${r.mark}" data-ov-mark="${h}">${v||"·"}</span></td>`}).join("")}<td class="sub" data-ov-sub="${start}">${score||"—"}</td></tr></table>`}

function strip(holes,map){return `<section class="dfl-strip"><header class="dfl-strip-title"><span>Scorecard</span><span>Tap a hole to jump to it</span></header><div class="dfl-strip-scroll">${stripNine("OUT",1,holes,map)}${stripNine("IN",10,holes,map)}</div></section>`}

function nine(title,start,holes,courseHoles,map,editable){const holeNums=Array.from({length:9},(_,i)=>start+i),par=holeNums.reduce((a,h)=>a+holePar(holes,h),0),score=total(map,start,start+8),pPlayed=playedPar(map,holes,start,start+8),rows=holeNums.map(h=>{const p=holePar(holes,h),yards=holeYards(courseHoles,h),v=map.get(h)?.strokes??"",r=holeResult(v,p);return `<div class="hole" id="hole-${h}">${h}</div><div class="yards">${yards?`${yards} yd`:"—"}</div><div class="par">${p}</div><div class="score">${editable?`<button type="button" class="sbtn" data-step="-1" data-hole="${h}" aria-label="One fewer on hole ${h}">−</button>`:""}<span class="mark ${r.mark}" data-mark="${h}"><input data-team-score data-hole="${h}" data-par="${p}" type="text" pattern="[0-9]*" inputmode="numeric" enterkeyhint="done" autocomplete="off" placeholder="—" value="${esc(v)}" maxlength="2" ${editable?"":"disabled"} aria-label="Team strokes hole ${h}"></span>${editable?`<button type="button" class="sbtn" data-step="1" data-hole="${h}" aria-label="One more on hole ${h}">+</button>`:""}</div><div class="result ${r.cls}" data-result="${h}">${r.label}</div>`}).join("");return `<section class="dfl-nine"><header class="dfl-nine-title"><strong>${title}</strong><span>Par ${par}</span></header><div class="dfl-hole-grid"><div class="hdr">#</div><div class="hdr">Yardage</div><div class="hdr">Par</div><div class="hdr">Strokes</div><div class="hdr">Result</div>${rows}</div><div class="dfl-nine-tally"><div><small>9-hole score</small><b data-nine-score="${start}">${score||"—"}</b></div><div><small>+/−</small><b data-nine-topar="${start}">${fmtToPar(score,pPlayed)}</b></div></div></section>`}

/*
  Every number on the card recomputed from the inputs, in the DOM, without a
  round trip. A stroke changes the mark, the word, the strip, the nine's
  tally and the final score at once - waiting on Supabase to see the effect
  of your own tap is what makes an app feel broken.
*/
function recalc(root){const inputs=[...root.querySelectorAll("input[data-team-score]")],val=new Map(),par=new Map();
for(const i of inputs){const h=Number(i.dataset.hole),p=Number(i.dataset.par)||4,v=Number(i.value);par.set(h,p);val.set(h,Number.isFinite(v)&&v>0?v:0);
const r=holeResult(val.get(h),p);
const mark=root.querySelector(`[data-mark="${h}"]`);if(mark)mark.className="mark "+r.mark;
const res=root.querySelector(`[data-result="${h}"]`);if(res){res.textContent=r.label;res.className="result "+r.cls}
const ov=root.querySelector(`[data-ov-mark="${h}"]`);if(ov){ov.textContent=val.get(h)||"·";ov.className="ovm "+r.mark}}
const range=(a,b)=>{let s=0,p=0;for(let h=a;h<=b;h++){const v=val.get(h)||0;if(!v)continue;s+=v;p+=par.get(h)||0}return{s,p}};
for(const start of [1,10]){const {s,p}=range(start,start+8);
const sc=root.querySelector(`[data-nine-score="${start}"]`);if(sc)sc.textContent=s||"—";
const tp=root.querySelector(`[data-nine-topar="${start}"]`);if(tp)tp.textContent=fmtToPar(s,p);
const sub=root.querySelector(`[data-ov-sub="${start}"]`);if(sub)sub.textContent=s||"—"}
const all=range(1,18);
const fs=root.querySelector("[data-final-score]");if(fs)fs.textContent=all.s||"—";
const ft=root.querySelector("[data-final-topar]");if(ft)ft.textContent=fmtToPar(all.s,all.p)}

async function clearScorecard(outingId,teamId){if(!isAdmin())throw Error("Admin access required");const {error}=await db().from("golf_scores").delete().eq("outing_id",outingId).eq("team_id",teamId);if(error)throw error}
async function render(root,outingId,teamId){styles();const c=await loadCard(outingId,teamId);if(!c.team)throw Error("Team not found");const me=String(currentMember()?.id||"");const admin=isAdmin(),editable=admin||c.parts.some(p=>String(p.member_id)===me),map=scoreMap(c.scores),front=total(map,1,9),back=total(map,10,18),played=playedPar(map,c.holes,1,18),complete=front+back,names=c.parts.map(p=>c.members.find(m=>String(m.id)===String(p.member_id))?.display_name||"Unknown");root.innerHTML=`<section class="card dfl-team-card"><header class="dfl-team-head"><div class="dfl-team-head-top"><a class="backlink" href="#/golf?id=${outingId}">← Teams</a><div><span class="dfl-team-kicker">TEAM SCORECARD</span><h2>${esc(c.team.name||"Team")}</h2></div></div><div class="dfl-team-roster">${names.map(n=>`<span>${esc(n)}</span>`).join("")}</div></header><div class="dfl-score-status">${editable?"Tap − and + to add strokes, or type the number. Saves on its own.":"Read-only — only members of this team and admins can edit."}</div>${admin?`<div class="dfl-admin-actions"><button type="button" class="dfl-clear-scorecard" data-clear-scorecard>Clear Scorecard</button></div>`:""}${strip(c.holes,map)}${nine("Front 9",1,c.holes,c.courseHoles,map,editable)}${nine("Back 9 · second time around",10,c.holes,c.courseHoles,map,editable)}<div class="dfl-final"><div><small>Final Score</small><b data-final-score>${complete||"—"}</b></div><div><small>+/−</small><b data-final-topar>${fmtToPar(complete,played)}</b></div></div><div class="dfl-score-help">Circles are under par, squares are over — a double ring means by two or more. Course yardage comes from the selected course; Rolla is a 9-hole course, so the Back 9 repeats holes 1–9.</div></section>`;wire(root,outingId,teamId,editable);if(admin){const clear=root.querySelector("[data-clear-scorecard]");clear?.addEventListener("click",async()=>{if(!confirm(`Clear every stroke for ${c.team.name||"this team"}? This cannot be undone.`))return;clear.disabled=true;try{await clearScorecard(outingId,teamId);await render(root,outingId,teamId)}catch(err){clear.disabled=false;alert(err.message||"Could not clear scorecard")}})}}
async function saveScore(outingId,teamId,hole,value){const client=db();if(!value){const {error}=await client.from("golf_scores").delete().eq("outing_id",outingId).eq("team_id",teamId).eq("hole",hole);if(error)throw error;return}const strokes=Number(value);if(!Number.isInteger(strokes)||strokes<MIN_STROKES||strokes>MAX_STROKES)throw Error(`Enter strokes from ${MIN_STROKES} to ${MAX_STROKES}`);const existing=await client.from("golf_scores").select("id").eq("outing_id",outingId).eq("team_id",teamId).eq("hole",hole).maybeSingle();if(existing.error)throw existing.error;if(existing.data?.id){const {error}=await client.from("golf_scores").update({strokes,member_id:null}).eq("id",existing.data.id);if(error)throw error;return}const inserted=await client.from("golf_scores").insert({outing_id:outingId,team_id:teamId,member_id:null,hole,strokes});if(inserted.error){if(String(inserted.error.code)==="23505"){const retry=await client.from("golf_scores").update({strokes,member_id:null}).eq("outing_id",outingId).eq("team_id",teamId).eq("hole",hole);if(retry.error)throw retry.error;return}throw inserted.error}}

/*
  One timer per hole. Tapping + four times sends 4, not 1,2,3,4 - and the
  value is read at flush time so the last tap always wins.
*/
const timers=new Map();
function queueSave(root,outingId,teamId,input){const hole=Number(input.dataset.hole),key=`${teamId}:${hole}`;clearTimeout(timers.get(key));timers.set(key,setTimeout(async()=>{timers.delete(key);try{await saveScore(outingId,teamId,hole,input.value.trim())}catch(err){alert(err.message||"Could not save team score");await render(root,outingId,teamId)}},SAVE_DELAY))}

function wire(root,outingId,teamId,editable){if(!editable||root.dataset.scoreWire==="1")return;root.dataset.scoreWire="1";
// The strip is a jump list, not a second place to score.
root.addEventListener("click",e=>{const jump=e.target.closest("[data-ov-hole]");if(!jump)return;const row=root.querySelector(`#hole-${jump.dataset.ovHole}`);if(!row)return;row.scrollIntoView({block:"center",behavior:"smooth"});root.querySelectorAll(".dfl-hole-grid .is-now").forEach(el=>el.classList.remove("is-now"));row.classList.add("is-now")});
/*
  The first tap on an empty hole lands on PAR, not on 1. Par is the score
  entered most often, so it is one tap instead of four - and from there the
  buttons do exactly what they look like.
*/
root.addEventListener("click",e=>{const btn=e.target.closest("[data-step]");if(!btn)return;const input=root.querySelector(`input[data-team-score][data-hole="${btn.dataset.hole}"]`);if(!input)return;const par=Number(input.dataset.par)||4,now=Number(input.value);input.value=String(!Number.isFinite(now)||now<1?par:Math.max(MIN_STROKES,Math.min(MAX_STROKES,now+Number(btn.dataset.step))));recalc(root);queueSave(root,outingId,teamId,input)});
// Typing: digits only, so a stray letter can never become a save that fails.
root.addEventListener("input",e=>{const input=e.target.closest("input[data-team-score]");if(!input)return;const clean=input.value.replace(/\D/g,"").slice(0,2);if(clean!==input.value)input.value=clean;if(Number(clean)>MAX_STROKES)input.value=String(MAX_STROKES);recalc(root);queueSave(root,outingId,teamId,input)});
root.addEventListener("keydown",e=>{const input=e.target.closest("input[data-team-score]");if(!input||e.key!=="Enter")return;e.preventDefault();input.blur()})}
function boot(){styles();const run=()=>{const root=document.querySelector("#golf-outing"),q=new URLSearchParams(location.hash.split("?")[1]||""),outingId=q.get("id"),teamId=q.get("team");if(!root||!outingId||!teamId||!root.querySelector(".golf-scorecard-page"))return;render(root,outingId,teamId).catch(err=>{root.innerHTML=`<div class="card"><div class="card-body"><strong>Could not load team scorecard.</strong><p class="muted">${esc(err.message)}</p></div></div>`})};new MutationObserver(run).observe(document.body,{childList:true,subtree:true});run()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
