// DFL HQ configuration
export const SUPABASE_URL = "https://rqavvpdbfdrwzalikkjg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_I14JPQNBW-fhIwZ7WkBlAg_M9zolGNL";
export const LEAGUE_NAME = "DFL HQ";
export const LEAGUE_FOUNDED = 2017;
export const FIRST_SYNCED_SEASON = 2019;

/*
  Normally the HTML meta is the browser-side version authority. 1.109.48 is a
  floor because this release adds an always-loaded Arena presentation module
  while the existing 1.109.47 HTML shell may already be sitting in a device's
  HTTP cache. Future HTML versions higher than this floor win automatically.
*/
const META_VERSION = globalThis.document?.querySelector('meta[name="dfl-app-version"]')?.content || "0";
const RELEASE_FLOOR = "1.109.48";
const newer = (a,b) => {
  const x=String(a).split(".").map(Number),y=String(b).split(".").map(Number);
  for(let i=0;i<Math.max(x.length,y.length);i++){
    const d=(x[i]||0)-(y[i]||0);if(d)return d>0?a:b;
  }
  return a;
};
export const APP_VERSION = newer(META_VERSION, RELEASE_FLOOR);
