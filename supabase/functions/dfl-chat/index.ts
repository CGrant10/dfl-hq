import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const DEFAULT_HEADERS = "authorization, x-client-info, apikey, content-type, x-member-id, x-profile-pin";
const corsHeaders = (request: Request) => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": request.headers.get("access-control-request-headers") || DEFAULT_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Access-Control-Request-Headers",
});
const json = (request: Request, value: unknown, status = 200) => Response.json(value, { status, headers: corsHeaders(request) });

const windows = new Map<string, { started: number; count: number }>();
function withinLimit(memberId: string) {
  const now = Date.now(), duration = 10 * 60 * 1000, max = 15;
  const current = windows.get(memberId);
  if (!current || now - current.started >= duration) {
    windows.set(memberId, { started: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= max;
}

function envKey(name: "SUPABASE_PUBLISHABLE_KEYS" | "SUPABASE_SECRET_KEYS", legacy: string) {
  try {
    const map = JSON.parse(Deno.env.get(name) || "{}");
    if (map.default) return map.default as string;
  } catch { /* fall through */ }
  return Deno.env.get(legacy) || "";
}

async function openAIKey() {
  const fromEnvironment = Deno.env.get("OPENAI_API_KEY") || "";
  if (fromEnvironment) return fromEnvironment;
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return "";
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc("dfl_chat_openai_key");
  return error ? "" : String(data || "");
}

async function verifyMember(memberId: number, pin: string) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc("profile_verify_pin", {
    target_member_id: memberId,
    attempted_pin: pin,
  });
  return !error && data === true;
}

function cleanMessages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(-8).flatMap(item => {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = String(item?.content || "").trim().slice(0, 1200);
    return role && content ? [{ role, content }] : [];
  });
}

function responseText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text.trim();
  return (payload?.output || []).flatMap((item: any) => item?.content || [])
    .filter((item: any) => item?.type === "output_text")
    .map((item: any) => item.text || "").join("\n").trim();
}

function responseSources(payload: any) {
  const unique = new Map<string, { url: string; title: string }>();
  for (const output of payload?.output || []) {
    for (const content of output?.content || []) {
      for (const note of content?.annotations || []) {
        if (note?.type !== "url_citation" || !note.url || unique.has(note.url)) continue;
        unique.set(note.url, { url: note.url, title: note.title || new URL(note.url).hostname });
      }
    }
  }
  return [...unique.values()].slice(0, 5);
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  try {
    if (Number(request.headers.get("content-length") || 0) > 16000) return json(request, { error: "Message is too long" }, 413);
    const input = await request.json().catch(() => ({}));
    if (input.action === "status") return json(request, { configured: Boolean(await openAIKey()) });
    const memberId = Number(request.headers.get("x-member-id"));
    const pin = String(request.headers.get("x-profile-pin") || "");
    if (!Number.isSafeInteger(memberId) || memberId < 1 || !/^[0-9]{4,6}$/.test(pin)) {
      return json(request, { error: "Profile PIN required" }, 401);
    }
    if (!await verifyMember(memberId, pin)) return json(request, { error: "Profile PIN not accepted" }, 403);
    if (input.action === "unlock") return json(request, { ok: true });
    if (!withinLimit(String(memberId))) return json(request, { error: "Ask DFL needs a quick breather. Try again in a few minutes." }, 429);

    const messages = cleanMessages(input.messages);
    if (!messages.length || messages.at(-1)?.role !== "user") return json(request, { error: "Ask a question first" }, 400);
    const apiKey = await openAIKey();
    if (!apiKey) return json(request, { error: "Ask DFL is not connected yet" }, 503);

    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_CHAT_MODEL") || "gpt-5-mini",
        store: false,
        max_output_tokens: 700,
        tools: [{ type: "web_search" }],
        instructions: `You are Ask DFL, the private assistant for an adult fantasy football league. Be sharp, candid, useful, and concise. Adult humor and natural swearing are welcome when they fit; never force a joke. Give a clear recommendation and the reasoning behind it. For current NFL news, injuries, depth charts, rankings, projections, schedules, or odds, use web search and favor recent primary or established sports sources. Say when evidence is thin. Do not claim access to league data you were not given. It is ${new Date().toISOString().slice(0, 10)}.`,
        input: messages,
      }),
    });
    const payload = await openAIResponse.json().catch(() => ({}));
    if (!openAIResponse.ok) {
      console.error("dfl-chat OpenAI", openAIResponse.status, payload?.error?.type || "request_failed");
      if (payload?.error?.code === "credit_balance_exhausted") {
        return json(request, { error: "Ask DFL is offline until API credits are added" }, 503);
      }
      return json(request, { error: "Ask DFL could not answer that right now" }, 502);
    }
    const text = responseText(payload);
    if (!text) return json(request, { error: "Ask DFL came up empty" }, 502);
    return json(request, { text, sources: responseSources(payload) });
  } catch (error) {
    console.error("dfl-chat", error instanceof Error ? error.message : "unknown error");
    return json(request, { error: "Ask DFL is unavailable" }, 500);
  }
});
