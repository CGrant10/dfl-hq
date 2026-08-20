// DFL HQ configuration
export const SUPABASE_URL = "https://rqavvpdbfdrwzalikkjg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_I14JPQNBW-fhIwZ7WkBlAg_M9zolGNL";
export const LEAGUE_NAME = "DFL HQ";
export const LEAGUE_FOUNDED = 2017;
export const FIRST_SYNCED_SEASON = 2019;

/* DFL played two seasons before the synced Sleeper record begins. This is
   tenure metadata only: it must never fabricate wins, points, finishes, or
   rows for seasons whose box scores we do not have. */
export const LEGACY_SEASONS = Math.max(0, FIRST_SYNCED_SEASON - LEAGUE_FOUNDED);
export const dflSeasonCount = (syncedSeasons = 0) =>
  Math.max(0, Number(syncedSeasons) || 0) + LEGACY_SEASONS;

/*
  Normally the HTML meta is the browser-side version authority. The release
  floor also lets a fresh JS release identify itself when an older HTML shell
  is still sitting in a device cache.
*/
const META_VERSION = globalThis.document?.querySelector('meta[name="dfl-app-version"]')?.content || "0";
const RELEASE_FLOOR = "1.109.71";
const newer = (a,b) => {
  const x=String(a).split(".").map(Number),y=String(b).split(".").map(Number);
  for(let i=0;i<Math.max(x.length,y.length);i++){
    const d=(x[i]||0)-(y[i]||0);if(d)return d>0?a:b;
  }
  return a;
};
export const APP_VERSION = newer(META_VERSION, RELEASE_FLOOR);
