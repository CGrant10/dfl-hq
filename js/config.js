// DFL HQ configuration
export const SUPABASE_URL = "https://rqavvpdbfdrwzalikkjg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_I14JPQNBW-fhIwZ7WkBlAg_M9zolGNL";
export const LEAGUE_NAME = "DFL HQ";
export const LEAGUE_FOUNDED = 2017;
export const FIRST_SYNCED_SEASON = 2019;
// The HTML release meta is the single browser-side version authority. Keeping a
// second hard-coded value here allowed the updater to reload successfully and
// then immediately claim the fresh app was still old.
export const APP_VERSION =
  globalThis.document?.querySelector('meta[name="dfl-app-version"]')?.content || "1.72.2";
