import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import webpush from "npm:web-push@3.6.7";

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
const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type, x-admin-token, x-member-id, x-commissioner-pin, x-device-token, x-golf-outing, x-golf-code, x-golf-participant";
const corsHeaders = (request?: Request) => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": request?.headers.get("access-control-request-headers") || ALLOWED_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Access-Control-Request-Headers",
});
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: corsHeaders() });
const categories = new Set(["announcements", "trades", "polls", "fees", "matchups", "events", "updates"]);

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

async function vapidKeys(admin: ReturnType<typeof createClient>) {
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

    if (!await maySend(request, url, publishableKey)) return json({ error: "Commissioner broadcast access required" }, 403);

    const title = String(input.title || "").trim().slice(0, 80);
    const body = String(input.body || "").trim().slice(0, 240);
    const category = categories.has(input.category) ? input.category : "announcements";
    const targetUrl = /^#\/[a-z0-9-]+(?:\?[^\s]*)?$/i.test(input.targetUrl || "") ? input.targetUrl : "#/home";
    const targetIds = [...new Set((Array.isArray(input.targetMemberIds) ? input.targetMemberIds : [])
      .map(Number).filter(Number.isSafeInteger))];
    const audience = input.audience === "members" && targetIds.length ? "members" : "all";
    if (!title || !body) return json({ error: "A title and message are required" }, 400);

    const sender = Number(request.headers.get("x-member-id")) || null;
    const { data: message, error: insertError } = await admin.from("notification_messages").insert({
      title, body, category, target_url: targetUrl, audience,
      target_member_ids: audience === "members" ? targetIds : [], sent_by_member_id: sender,
    }).select("id").single();
    if (insertError) throw insertError;

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
        icon: "icons/app-192.png", badge: "icons/app-192.png",
      });
      await Promise.all((subscriptions || []).filter(row => Array.isArray(row.categories) && row.categories.includes(category)).map(async row => {
        try {
          await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, { TTL: 86400, urgency: category === "trades" ? "high" : "normal" });
          delivered++;
          await admin.from("push_subscriptions").update({ failure_count: 0, last_success_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", row.id);
        } catch (error) {
          failed++;
          const gone = error?.statusCode === 404 || error?.statusCode === 410;
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
