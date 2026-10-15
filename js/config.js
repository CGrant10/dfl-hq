// DFL HQ configuration
// Golf owns a sizeable set of self-mounting enhancements. Loading them from
// config.js made every visit (including Home) download and start their DOM
// observers. Keep the global navigation enhancement eager, but start the golf
// bundle only when the router actually enters Golf.
/* Browser-only presentation modules must not start while config is imported
   by Vitest, a build tool or another document-less runtime. The old eager
   import caught nav-neutral's `document is not defined`, but its rejected
   promise could outlive the test worker and fail an otherwise clean CI run. */
if (globalThis.document) {
  void import("./nav-neutral.js").catch(err => console.warn("Optional module failed: ./nav-neutral.js", err));
}

const GOLF_FEATURES = [
  {path:"./golf-gps-beta.js",load:()=>import("./golf-gps-beta.js")},
  {path:"./golf-gps-red-trail-beta.js",load:()=>import("./golf-gps-red-trail-beta.js")},
  {path:"./golf-gps-rolla-beta.js",load:()=>import("./golf-gps-rolla-beta.js")},
  {path:"./golf-gps-imported.js",load:()=>import("./golf-gps-imported.js")},
  {path:"./golf-event-course-picker.js",load:()=>import("./golf-event-course-picker.js")},
  {path:"./golf-tournament-beta.js",load:()=>import("./golf-tournament-beta.js")},
  {path:"./golf-event-modes.js",load:()=>import("./golf-event-modes.js")},
  {path:"./golf-live-to-par.js",load:()=>import("./golf-live-to-par.js")},
  {path:"./golf-scorecard.js",load:()=>import("./golf-scorecard.js")},
  {path:"./golf-matches.js",load:()=>import("./golf-matches.js")},
  {path:"./golf-live.js",load:()=>import("./golf-live.js")},
  {path:"./golf-theme.js",load:()=>import("./golf-theme.js")},
  {path:"./golf-match.js",load:()=>import("./golf-match.js")},
  {path:"./golf-courses.js",load:()=>import("./golf-courses.js")},
  {path:"./golf-draft.js",load:()=>import("./golf-draft.js")},
  {path:"./golf-bag.js",load:()=>import("./golf-bag.js")},
];
let golfFeaturesPromise = null;
export function loadGolfFeatures() {
  if (!golfFeaturesPromise) {
    golfFeaturesPromise = Promise.allSettled(GOLF_FEATURES.map(feature => feature.load()))
      .then(results => {
        results.forEach((result, index) => {
          if (result.status === "rejected") console.warn(`Optional module failed: ${GOLF_FEATURES[index].path}`, result.reason);
        });
      });
  }
  return golfFeaturesPromise;
}
export const SUPABASE_URL = "https://rqavvpdbfdrwzalikkjg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_I14JPQNBW-fhIwZ7WkBlAg_M9zolGNL";
export const LEAGUE_NAME = "DFL HQ";
export const LEAGUE_FOUNDED = 2017;
export const FIRST_SYNCED_SEASON = 2019;
export const LEGACY_SEASONS = Math.max(0, FIRST_SYNCED_SEASON - LEAGUE_FOUNDED);
export const dflSeasonCount = (syncedSeasons = 0) => Math.max(0, Number(syncedSeasons) || 0) + LEGACY_SEASONS;
const META_VERSION = globalThis.document?.querySelector('meta[name="dfl-app-version"]')?.content || "0";
const RELEASE_FLOOR = "1.422.0";
const newer = (a,b) => { const x=String(a).split(".").map(Number),y=String(b).split(".").map(Number); for(let i=0;i<Math.max(x.length,y.length);i++){ const d=(x[i]||0)-(y[i]||0); if(d)return d>0?a:b; } return a; };
export const APP_VERSION = newer(META_VERSION, RELEASE_FLOOR);

