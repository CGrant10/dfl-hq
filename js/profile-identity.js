// Profile identity: earned titles, one featured receipt, one NFL team.
import { db } from "./supabase.js";
import { esc, toast } from "./ui.js";
import { refreshMember } from "./members.js";

const NFL = [
  ["ARI","Arizona Cardinals"],["ATL","Atlanta Falcons"],["BAL","Baltimore Ravens"],["BUF","Buffalo Bills"],
  ["CAR","Carolina Panthers"],["CHI","Chicago Bears"],["CIN","Cincinnati Bengals"],["CLE","Cleveland Browns"],
  ["DAL","Dallas Cowboys"],["DEN","Denver Broncos"],["DET","Detroit Lions"],["GB","Green Bay Packers"],
  ["HOU","Houston Texans"],["IND","Indianapolis Colts"],["JAX","Jacksonville Jaguars"],["KC","Kansas City Chiefs"],
  ["LV","Las Vegas Raiders"],["LAC","Los Angeles Chargers"],["LAR","Los Angeles Rams"],["MIA","Miami Dolphins"],
  ["MIN","Minnesota Vikings"],["NE","New England Patriots"],["NO","New Orleans Saints"],["NYG","New York Giants"],
  ["NYJ","New York Jets"],["PHI","Philadelphia Eagles"],["PIT","Pittsburgh Steelers"],["SF","San Francisco 49ers"],
  ["SEA","Seattle Seahawks"],["TB","Tampa Bay Buccaneers"],["TEN","Tennessee Titans"],["WAS","Washington Commanders"]
];
const teamValue = code => code ? `nfl:${code}` : "";
const teamCode = value => String(value||"").replace(/^nfl:/i,"").toUpperCase();
const teamName = value => NFL.find(([c])=>c===teamCode(value))?.[1] || "";
const count = value => Array.isArray(value) ? value.length : Number(value)||0;
function unique(items){return [...new Set(items.filter(Boolean))];}

export function titleChoices(member, career, extremes, chipSeasons=[]){
  const out=[];
  const titles=Math.max(count(career?.titles),Number(member?.championships)||0);
  const runnerUps=Math.max(count(career?.runnerUps),count(career?.seconds));
  const playoffs=count(career?.playoffs);
  if(titles>=1) out.push("DFL Champion");
  if(titles>=2) out.push("Multi-Time Champion");
  if(runnerUps>=1) out.push("DFL Finalist");
  if(playoffs>=1) out.push("Playoff Regular");
  if(Number(extremes?.streak?.win?.run)>=5) out.push("Certified Heater");
  if(chipSeasons.length) out.push("Chip Eater Survivor");
  if(Number(member?.joined_year)&&Number(member.joined_year)<=2019) out.push("DFL Original");
  return unique(out);
}

export function achievementChoices(career, extremes, chipSeasons=[]){
  const out=[];
  const titles=count(career?.titles), playoffs=count(career?.playoffs), runnerUps=Math.max(count(career?.runnerUps),count(career?.seconds));
  if(titles) out.push(`${titles}× DFL Champion`);
  if(runnerUps) out.push(`${runnerUps}× runner-up`);
  if(playoffs) out.push(`${playoffs} playoff trip${playoffs===1?"":"s"}`);
  if(extremes?.bestSeason?.rank) out.push(`Best finish: #${extremes.bestSeason.rank}`);
  if(extremes?.highWeek?.score) out.push(`Career high week: ${Number(extremes.highWeek.score).toFixed(1)} pts`);
  if(Number(extremes?.streak?.win?.run)>1) out.push(`${extremes.streak.win.run}-game win streak`);
  if(chipSeasons.length) out.push(`Survived the hot chip · ${chipSeasons.join(", ")}`);
  return unique(out);
}

export function profileIdentityDisplay(member){
  const bits=[];
  if(member?.profile_title) bits.push(`<span class="pill">${esc(member.profile_title)}</span>`);
  const fav=teamName(member?.favorite_team);
  if(fav) bits.push(`<span class="pill">🏈 ${esc(fav)}</span>`);
  if(member?.featured_achievement) bits.push(`<span class="pill green">★ ${esc(member.featured_achievement)}</span>`);
  return bits.length?`<div class="row profile-identity" style="margin-top:8px">${bits.join("")}</div>`:"";
}

export function identitySettingsCard(member,career,extremes,chipSeasons=[]){
  const titles=titleChoices(member,career,extremes,chipSeasons);
  const achievements=achievementChoices(career,extremes,chipSeasons);
  return `<div data-profile-identity-settings>
    <div class="dfl-field"><label class="u-label">Title</label><select data-identity-title><option value="">None</option>${titles.map(x=>`<option${member.profile_title===x?" selected":""}>${esc(x)}</option>`).join("")}</select></div>
    <div class="dfl-field"><label class="u-label">Featured achievement</label><select data-identity-achievement><option value="">None</option>${achievements.map(x=>`<option${member.featured_achievement===x?" selected":""}>${esc(x)}</option>`).join("")}</select></div>
    <div class="dfl-field"><label class="u-label">Favorite NFL team</label><select data-identity-team><option value="">None</option>${NFL.map(([code,name])=>`<option value="${teamValue(code)}"${teamCode(member.favorite_team)===code?" selected":""}>${esc(name)}</option>`).join("")}</select></div>
    <div class="row-end"><button type="button" class="btn ghost small" data-save-profile-identity>Save identity</button></div>
  </div>`;
}

export function wireProfileIdentity(root,member,onSaved){
  root.querySelector('[data-save-profile-identity]')?.addEventListener('click',async e=>{
    const btn=e.currentTarget; btn.disabled=true;
    try{
      const {error}=await db().rpc('profile_identity_save',{
        target_member_id:Number(member.id),
        new_title:root.querySelector('[data-identity-title]')?.value||'',
        new_achievement:root.querySelector('[data-identity-achievement]')?.value||'',
        new_favorite_team:root.querySelector('[data-identity-team]')?.value||''
      });
      if(error)throw error;
      await refreshMember(); toast('Profile identity saved'); await onSaved?.();
    }catch(err){toast(err?.message||'Could not update profile',true);btn.disabled=false;}
  });
}
