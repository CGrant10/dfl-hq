// DFL HQ configuration
// Optional UI/features must never be allowed to prevent the core app from booting.
// Load them independently so a stale/missing feature file degrades that feature only.
for (const modulePath of [
  "./golf-gps-beta.js",
  "./golf-gps-red-trail-beta.js",
  "./golf-event-course-picker.js",
  "./nav-neutral.js",
  "./golf-live-to-par.js",
]) {
  void import(modulePath).catch(err => console.warn(`Optional module failed: ${modulePath}`, err));
}
export const SUPABASE_URL = "https://rqavvpdbfdrwzalikkjg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_I14JPQNBW-fhIwZ7WkBlAg_M9zolGNL";
export const LEAGUE_NAME = "DFL HQ";
export const LEAGUE_FOUNDED = 2017;
export const FIRST_SYNCED_SEASON = 2019;
export const LEGACY_SEASONS = Math.max(0, FIRST_SYNCED_SEASON - LEAGUE_FOUNDED);
export const dflSeasonCount = (syncedSeasons = 0) => Math.max(0, Number(syncedSeasons) || 0) + LEGACY_SEASONS;
const META_VERSION = globalThis.document?.querySelector('meta[name="dfl-app-version"]')?.content || "0";
const RELEASE_FLOOR = "1.116.9";
const newer = (a,b) => { const x=String(a).split(".").map(Number),y=String(b).split(".").map(Number); for(let i=0;i<Math.max(x.length,y.length);i++){ const d=(x[i]||0)-(y[i]||0); if(d)return d>0?a:b; } return a; };
export const APP_VERSION = newer(META_VERSION, RELEASE_FLOOR);