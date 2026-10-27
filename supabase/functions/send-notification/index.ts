import {footballNotificationTarget} from '../../../js/football-notification-target.js';
import {highlightVideoUrl} from '../../../js/home-highlight-model.js';
import {livePlaySource,LIVE_PLAY_AGE} from '../../../js/live-football-model.js';
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import webpush from "npm:web-push@3.6.7";
import {WATCHLIST_NOTIFICATION_FILTER} from '../../../js/watchlist-alerts.js';
import {MATCHUP_MOMENTS_CATEGORY,MATCHUP_MOMENTS_FILTER,optedMatchupRecipients} from '../../../js/matchup-moments.js';

/*
  THE PREFLIGHT HAS TO ECHO WHAT THE BROWSER ASKS FOR, NOT A LIST WE MAINTAIN.

  db() attaches identity headers that vary by what the member is doing -
  x-member-id, x-device-token, and the three x-golf-* pass headers a golf guest
  carries on EVERY request. A fixed allow-list means each new header silently
  kills the preflight for the people who send it, and the browser refuses the
  POST before this function ever runs. supabase-js reports that as nothing more
  than "Failed to send a request to the Edge Function", so the symptom is an
  Edge Function error on a function that is healthy and never got the call.

  That is exactly how enabling notifications broke for anyone holding a golf
  pass: x-golf-outing / x-golf-code / x-golf-participant were not on the list.

  Echoing is safe here. The origin is already "*", no credentials or cookies
  ride along, and a header the caller invents grants nothing - authorisation is
  decided by maySend() below, which re-checks the headers in Postgres.
*/
const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type, x-admin-token, x-member-id, x-commissioner-pin, x-device-token, x-golf-outing, x-golf-code, x-golf-participant, x-dfl-cron-token";
const SLEEPER_SYNC_TOKEN_HASH = "c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091";
const corsHeaders = (request?: Request) => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": request?.headers.get("access-control-request-headers") || ALLOWED_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Access-Control-Request-Headers",
});
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: corsHeaders() });
const categories = new Set(["announcements", "trades", "polls", "fees", "matchups", "weekly", "sportsbook", "waivers", "events", "updates", "wall",MATCHUP_MOMENTS_CATEGORY]);

async function internalSyncRequest(request: Request) {
  const token = request.headers.get("x-dfl-cron-token") || "";
  if (token.length < 32) return false;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
  return hash === SLEEPER_SYNC_TOKEN_HASH;
}

function envKey(name: "SUPABASE_PUBLISHABLE_KEYS" | "SUPABASE_SECRET_KEYS", legacy: string) {
  try {
    const map = JSON.parse(Deno.env.get(name) || "{}");
    if (map.default) return map.default as string;
  } catch { /* fall through to legacy while existing projects migrate */ }
  return Deno.env.get(legacy) || "";
}

function forwardedAuthHeaders(request: Request) {
  const headers: Record<string, string> = {};
  for (const name of ["x-admin-token", "x-member-id", "x-commissioner-pin"]) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

async function maySend(request: Request, url: string, publishableKey: string) {
  const verifier = createClient(url, publishableKey, {
    global: { headers: forwardedAuthHeaders(request) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await verifier.rpc("has_commissioner_permission", { permission_name: "broadcast" });
  return !error && data === true;
}

async function vapidKeys(admin: SupabaseClient) {
  const fromEnvironment = {
    publicKey: Deno.env.get("VAPID_PUBLIC_KEY") || "",
    privateKey: Deno.env.get("VAPID_PRIVATE_KEY") || "",
  };
  if (fromEnvironment.publicKey && fromEnvironment.privateKey) return fromEnvironment;
  const { data: saved, error: readError } = await admin.from("notification_push_config")
    .select("public_key,private_key").eq("singleton", true).maybeSingle();
  if (readError) throw readError;
  if (saved) return { publicKey: saved.public_key, privateKey: saved.private_key };
  const generated = webpush.generateVAPIDKeys();
  const { error: insertError } = await admin.from("notification_push_config").insert({
    singleton: true, public_key: generated.publicKey, private_key: generated.privateKey,
  });
  if (!insertError) return generated;
  /* Two first devices can arrive together. The winner's keys are canonical. */
  if (insertError.code === "23505") {
    const { data: winner, error } = await admin.from("notification_push_config")
      .select("public_key,private_key").eq("singleton", true).single();
    if (error) throw error;
    return { publicKey: winner.public_key, privateKey: winner.private_key };
  }
  throw insertError;
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const input = await request.json().catch(() => ({}));
    const url = Deno.env.get("SUPABASE_URL") || "";
    const publishableKey = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const secretKey = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    if (!secretKey) return json({ error: "Server database key is unavailable" }, 500);
    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const keys = await vapidKeys(admin);
    if (input.action === "config") return json({ publicKey: keys.publicKey, configured: true });

    const internalSync = await internalSyncRequest(request);
    if (!internalSync && !await maySend(request, url, publishableKey)) return json({ error: "Commissioner broadcast access required" }, 403);

    const title = String(input.title || "").trim().slice(0, 80);
    let body = String(input.body || "").trim().slice(0, 240);
    const category = categories.has(input.category) ? input.category : "announcements";
    let targetUrl = /^#\/[a-z0-9-]+(?:\?[^\s]*)?$/i.test(input.targetUrl || "") ? input.targetUrl : "#/home";
    const sourceKey = /^(?:trade|weekly|sportsbook):[a-z0-9:_-]{1,140}$/i.test(String(input.sourceKey || ""))
      ? String(input.sourceKey) : null;
    const lineupAlert=internalSync&&sourceKey?.startsWith('weekly:lineup:')&&category==='matchups';
    const moment=category===MATCHUP_MOMENTS_CATEGORY,livePlay=moment&&livePlaySource(sourceKey);
    if(moment&&(!internalSync||(!/^weekly:matchup:[0-9]{4}:[0-9]{1,2}:[0-9]+:(close|final)$/.test(sourceKey||'')&&!livePlay)||input.audience!=='members'))return json({error:'Matchup moments require targeted internal delivery'},403);
    if(livePlay){
      const parts=sourceKey!.split(':'),route=footballNotificationTarget(sourceKey,targetUrl,input.targetMemberIds);if(!route)return json({error:'Invalid live play target'},422);
      if(route.moment){const saved=await admin.from('gameday_moments').select('id').eq('event_key',route.moment).eq('season',route.season).eq('week',route.week).eq('matchup_id',route.matchup).limit(1);if(saved.error)throw saved.error;if(!saved.data?.length)return json({ok:true,skipped:'highlight-not-saved',delivered:0})}
      const {data:feed,error}=await admin.from('nfl_live_games').select('season,week,plays,fetched_at').eq('game_id',parts[5]).maybeSingle();if(error)throw error;const play=feed?.plays?.find((p:any)=>String(p.id)===parts[6]);
      if(!feed||feed.season!==Number(parts[2])||feed.week!==Number(parts[3])||!play?.eligible||Date.now()-Date.parse(feed.fetched_at)>150000||!Number.isFinite(play.at)||Date.now()-play.at<0||Date.now()-play.at>LIVE_PLAY_AGE)return json({ok:true,skipped:'expired-play',delivered:0});
      if(route.clip){const video=await admin.from('nfl_highlight_clips').select('game_id,play_id,video_url,expires_at').eq('id',route.clip).maybeSingle();const clip=video.error?null:video.data;if(!clip||clip.game_id!==parts[5]||clip.play_id!==parts[6]||!highlightVideoUrl(clip.video_url)||Date.parse(clip.expires_at)<=Date.now()){targetUrl=targetUrl.replace('&tab=highlights','&tab=matchups').replace(/&nflGame=\d+&clip=\d+$/,'');body=String(play.text||body).slice(0,240)}else body=`▶ Video available · ${play.text}`.slice(0,240)}
    }
    const watch=internalSync&&category==='waivers'&&/^weekly:watch:[0-9]{4}:[0-9]{1,2}:[0-9]+:[a-f0-9]{64}$/.test(sourceKey||'');
    if(sourceKey?.startsWith('weekly:watch:')&&!watch)return json({error:'Watchlist updates require internal delivery'},403);
    if(watch&&input.audience!=='members')return json({error:'Watchlist updates require targeted delivery'},403);
    const expiring=lineupAlert||moment||watch,expiresAt=expiring?Date.parse(input.expiresAt):NaN;
    if(expiring&&(!Number.isFinite(expiresAt)||expiresAt<=Date.now()))return json({ok:true,skipped:'expired',delivered:0});
    const lineupKeys=lineupAlert?[...new Set((Array.isArray(input.lineupKeys)?input.lineupKeys:[])
      .filter((key:unknown)=>typeof key==='string'&&/^weekly:lineup:[0-9]{4}:[0-9]{1,2}:[0-9]+:[a-z0-9_-]+:(out|questionable)$/i.test(key)))].slice(0,9):[];
    let targetIds = [...new Set<number>((Array.isArray(input.targetMemberIds) ? input.targetMemberIds : [])
      .map(Number).filter(Number.isSafeInteger))];
    if (internalSync && input.audience === "commissioners") {
      const { data: commissioners, error } = await admin.from("commissioner_access")
        .select("member_id").eq("active", true);
      if (error) throw error;
      targetIds = (commissioners || []).map(row => Number(row.member_id)).filter(Number.isSafeInteger);
    }
    if(moment){
      const {data:opted,error}=await admin.from('push_subscriptions').select('member_id,enabled,categories').eq('enabled',true).in('member_id',targetIds).contains('categories',MATCHUP_MOMENTS_FILTER);
      if(error)throw error;
      targetIds=optedMatchupRecipients(opted||[],targetIds);
      if(!targetIds.length)return json({ok:true,skipped:'no-opted-recipients',delivered:0});
    }
    let watchKeys:string[]=[];
    if(watch){
      const ids=(Array.isArray(input.watchPlayerIds)?input.watchPlayerIds:[]).filter((id:unknown)=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,32}$/.test(id)).slice(0,20);
      const {data:opted,error}=await admin.from('push_subscriptions').select('member_id').eq('enabled',true).in('member_id',targetIds).contains('categories',WATCHLIST_NOTIFICATION_FILTER);
      if(error)throw error;
      const devices=await admin.from('player_watch_devices').select('id,member_id').in('member_id',targetIds).gte('updated_at',new Date(Date.now()-90*86400000).toISOString());
      if(devices.error)throw devices.error;
      const watched=devices.data?.length&&ids.length?await admin.from('player_watch_items').select('device_id,player_id').in('device_id',devices.data.map(d=>d.id)).in('player_id',ids):{data:[],error:null};
      if(watched.error)throw watched.error;
      watchKeys=[...new Set<string>((Array.isArray(input.watchKeys)?input.watchKeys:[]).filter((key:unknown)=>typeof key==='string'&&/^weekly:watch:[0-9]{4}:[0-9]{1,2}:[0-9]+:[A-Za-z0-9_-]{1,32}:[0-9]+$/.test(key)))].slice(0,20);
      if(targetIds.length!==1||String(targetIds[0])!==sourceKey?.split(':')[4]||watchKeys.length!==ids.length||watchKeys.some(key=>!ids.includes(key.split(':')[5])||!targetIds.includes(Number(key.split(':')[4]))))return json({error:'Watchlist event keys required'},422);
      // Recheck settings and removal before writing an inbox item or pushing.
      targetIds=targetIds.filter(mid=>(opted||[]).some(o=>Number(o.member_id)===mid)&&ids.every((id:string)=>(watched.data||[]).some(w=>w.player_id===id&&devices.data?.some(d=>d.id===w.device_id&&Number(d.member_id)===mid))));
      if(!targetIds.length||!ids.length)return json({ok:true,skipped:'no-watched-opted-recipients',delivered:0});
    }
    const targeted = input.audience === "members" || (internalSync && input.audience === "commissioners");
    const audience = targeted && targetIds.length ? "members" : "all";
    if (targeted && !targetIds.length) return json({ error: "No notification recipients are configured" }, 422);
    if (!title || !body) return json({ error: "A title and message are required" }, 400);

    if (sourceKey) {
      const { data: existing, error } = await admin.from("notification_messages")
        .select("id").eq("source_key", sourceKey).maybeSingle();
      if (error) throw error;
      if (existing) return json({ ok: true, messageId: existing.id, delivered: 0, failed: 0, pushConfigured: true, duplicate: true });
    }

    const sender = Number(request.headers.get("x-member-id")) || null;
    const messageRow = {
      title, body, category, target_url: targetUrl, audience,
      target_member_ids: audience === "members" ? targetIds : [], sent_by_member_id: sender,
      ...(sourceKey ? { source_key: sourceKey } : {}),
      ...(lineupKeys.length ? {lineup_alert_keys:lineupKeys} : {}),
      ...(watchKeys.length ? {watch_alert_keys:watchKeys} : {}),
    };
    let { data: message, error: insertError } = await admin.from("notification_messages").insert(messageRow).select("id").single();
    /* Two sync tabs can discover the same trade together. The unique source
       key picks one sender; the loser returns the canonical inbox message and
       deliberately does not deliver a second push. */
    if (insertError?.code === "23505" && sourceKey) {
      const winner = await admin.from("notification_messages").select("id").eq("source_key", sourceKey).single();
      if (winner.error) throw winner.error;
      return json({ ok: true, messageId: winner.data.id, delivered: 0, failed: 0, pushConfigured: true, duplicate: true });
    }
    if (insertError) throw insertError;
    if(!message)throw new Error('Notification could not be recorded');

    let query = admin.from("push_subscriptions").select("id,member_id,endpoint,p256dh,auth,categories").eq("enabled", true);
    if (audience === "members") query = query.in("member_id", targetIds);
    const { data: subscriptions, error: subscriptionError } = await query;
    if (subscriptionError) throw subscriptionError;

    const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:dfl-hq@example.com";
    const pushConfigured = true;
    let delivered = 0, failed = 0;
    if (pushConfigured) {
      webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
      const payload = JSON.stringify({
        title, body, category, url: targetUrl, messageId: message.id,
        ...(expiring?{expiresAt:new Date(expiresAt).toISOString()}:{}),
        /* badge must be a transparent silhouette - Android keeps only its
           alpha channel. The service worker pins this anyway; it is correct
           here too so the payload does not carry a value that would be wrong
           if anything ever honoured it. */
        icon: "icons/app-192.png", badge: "icons/badge-96.png",
      });
      await Promise.all((subscriptions || []).filter(row => Array.isArray(row.categories) && row.categories.includes(category)).map(async row => {
        try {
          if(expiring&&expiresAt<=Date.now())return;
          await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, { TTL: expiring?Math.max(1,Math.min(7200,Math.floor((expiresAt-Date.now())/1000))):86400, urgency: category === "trades" || lineupAlert ? "high" : "normal" });
          delivered++;
          await admin.from("push_subscriptions").update({ failure_count: 0, last_success_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", row.id);
        } catch (error) {
          failed++;
          const statusCode=error&&typeof error==='object'&&'statusCode' in error?Number(error.statusCode):0;
          const gone = statusCode === 404 || statusCode === 410;
          await admin.from("push_subscriptions").update({ enabled: gone ? false : true, failure_count: gone ? 99 : 1, updated_at: new Date().toISOString() }).eq("id", row.id);
        }
      }));
    }
    return json({ ok: true, messageId: message.id, delivered, failed, pushConfigured });
  } catch (error) {
    console.error("send-notification", error);
    return json({ error: error instanceof Error ? error.message : "Notification failed" }, 500);
  }
});
