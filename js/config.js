// DFL HQ configuration
import "./golf-gps-beta.js";
import "./golf-gps-red-trail-beta.js";
import "./golf-event-course-picker.js";
import "./nav-neutral.js";
import "./golf-live-to-par.js";
export const SUPABASE_URL = "https://rqavvpdbfdrwzalikkjg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_I14JPQNBW-fhIwZ7WkBlAg_M9zolGNL";
export const LEAGUE_NAME = "DFL HQ";
export const LEAGUE_FOUNDED = 2017;
export const FIRST_SYNCED_SEASON = 2019;
export const LEGACY_SEASONS = Math.max(0, FIRST_SYNCED_SEASON - LEAGUE_FOUNDED);
export const dflSeasonCount = (syncedSeasons = 0) => Math.max(0, Number(syncedSeasons) || 0) + LEGACY_SEASONS;
const META_VERSION = globalThis.document?.querySelector('meta[name="dfl-app-version"]')?.content || "0";
const RELEASE_FLOOR = "1.116.4";
const newer = (a,b) => { const x=String(a).split(".").map(Number),y=String(b).split(".").map(Number); for(let i=0;i<Math.max(x.length,y.length);i++){ const d=(x[i]||0)-(y[i]||0); if(d)return d>0?a:b; } return a; };
export const APP_VERSION = newer(META_VERSION, RELEASE_FLOOR);