import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SLEEPER = "https://api.sleeper.app/v1";
const TOKEN_HASH = "c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091";

type Json = Record<string, any>;

function envKey(name: "SUPABASE_SECRET_KEYS", legacy: string) {
  try {
    const map = JSON.parse(Deno.env.get(name) || "{}");
    if (map.default) return map.default as string;
  } catch { /* legacy projects expose the service-role key directly */ }
  return Deno.env.get(legacy) || "";
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorized(request: Request) {
  const supplied = request.headers.get("x-dfl-cron-token") || "";
  return supplied.length >= 32 && await sha256(supplied) === TOKEN_HASH;
}

async function sleeper(path: string) {
  const response = await fetch(`${SLEEPER}${path}`, {
    headers: { "User-Agent": "DFL-HQ-Sleeper-Sync/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Sleeper ${response.status} on ${path}`);
  return response.json();
}

function stable(value: any): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function points(whole: unknown, decimal: unknown) {
  return Number(whole || 0) + Number(decimal || 0) / 100;
}

function standings(rosters: Json[], season: number, league: Json, leagueId: string, names: Map<string, Json>) {
  const rows = rosters.map((roster) => {
    const settings = roster.settings || {};
    return {
      season,
      league_id: leagueId,
      roster_id: roster.roster_id,
      sleeper_user_id: roster.owner_id || null,
      team_name: names.get(roster.owner_id)?.team || "",
      wins: settings.wins || 0,
      losses: settings.losses || 0,
      ties: settings.ties || 0,
      points_for: points(settings.fpts, settings.fpts_decimal),
      points_against: points(settings.fpts_against, settings.fpts_against_decimal),
      rank: null as number | null,
      made_playoffs: false,
    };
  });

  if (!rows.some((row) => row.wins + row.losses + row.ties > 0)) return rows;
  rows.sort((a, b) => (b.wins - a.wins) || (a.losses - b.losses) || (b.points_for - a.points_for));
  const playoffTeams = Number(league.settings?.playoff_teams || 0);
  rows.forEach((row, index) => {
    row.rank = index + 1;
    row.made_playoffs = playoffTeams > 0 && row.rank <= playoffTeams;
  });
  return rows;
}

function matchups(raw: Json[], season: number, week: number, leagueId: string, owners: Map<number, string>) {
  if (!raw?.length || !raw.some((item) => Number(item.points) > 0)) return [];
  const groups = new Map<number, Json[]>();
  for (const item of raw) {
    if (item.matchup_id == null) continue;
    const group = groups.get(item.matchup_id) || [];
    group.push(item);
    groups.set(item.matchup_id, group);
  }
  return Array.from(groups, ([matchupId, sides]) => {
    const [a, b] = sides;
    const scoreA = a ? Number(a.points) : null;
    const scoreB = b ? Number(b.points) : null;
    let winner = null;
    if (scoreA != null && scoreB != null && scoreA !== scoreB) winner = scoreA > scoreB ? a.roster_id : b.roster_id;
    return {
      season, week, matchup_id: matchupId, league_id: leagueId,
      roster1: a?.roster_id ?? null, user1: a ? owners.get(a.roster_id) ?? null : null, score1: scoreA,
      roster2: b?.roster_id ?? null, user2: b ? owners.get(b.roster_id) ?? null : null, score2: scoreB,
      winner_roster_id: winner,
    };
  });
}

async function upsert(admin: ReturnType<typeof createClient>, table: string, rows: Json[], onConflict: string) {
  if (!rows.length) return;
  const { error } = await admin.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function notifyCommissioners(url: string, token: string, body: string) {
  const response = await fetch(`${url}/functions/v1/send-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-dfl-cron-token": token },
    body: JSON.stringify({
      title: "Sleeper sync complete",
      body,
      category: "announcements",
      targetUrl: "#/admin",
      audience: "commissioners",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Commissioner notification failed (${response.status})`);
}

async function refreshMemberTeamNames(admin: ReturnType<typeof createClient>) {
  const [members, currentUsers, historicalRosters] = await Promise.all([
    admin.from("members").select("id,team_name,sleeper_user_id"),
    admin.from("sleeper_users").select("sleeper_user_id,team_name"),
    admin.from("sleeper_rosters").select("sleeper_user_id,team_name"),
  ]);
  if (members.error || currentUsers.error || historicalRosters.error) return;

  const current = new Map((currentUsers.data || []).map((row) => [row.sleeper_user_id, row.team_name || ""]));
  const previous = new Map<string, Set<string>>();
  for (const row of historicalRosters.data || []) {
    if (!row.sleeper_user_id || !row.team_name) continue;
    if (!previous.has(row.sleeper_user_id)) previous.set(row.sleeper_user_id, new Set());
    previous.get(row.sleeper_user_id)!.add(row.team_name);
  }
  for (const member of members.data || []) {
    const next = current.get(member.sleeper_user_id);
    if (!next || next === member.team_name) continue;
    if (member.team_name && !previous.get(member.sleeper_user_id)?.has(member.team_name)) continue;
    const { error } = await admin.from("members").update({ team_name: next }).eq("id", member.id);
    if (error) throw new Error(`members: ${error.message}`);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const cronToken = request.headers.get("x-dfl-cron-token") || "";
  if (!await authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = Deno.env.get("SUPABASE_URL") || "";
  const secret = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !secret) return Response.json({ error: "Server configuration unavailable" }, { status: 500 });
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const checkedAt = new Date().toISOString();

  try {
    const { data: config, error: configError } = await admin.from("sleeper_config")
      .select("sleeper_league_id,last_auto_signature,auto_sync_enabled").eq("id", 1).single();
    if (configError) throw configError;
    if (!config.auto_sync_enabled) return Response.json({ ok: true, skipped: "disabled" });
    const leagueId = String(config.sleeper_league_id || "").trim();
    if (!leagueId) throw new Error("No Sleeper league is configured");

    const league = await sleeper(`/league/${leagueId}`);
    if (!league) throw new Error("Configured Sleeper league was not found");
    const season = Number(league.season);
    const nflState = await sleeper("/state/nfl");
    const week = Math.max(1, Math.min(18, Number(league.settings?.leg || nflState?.week || 1)));
    const [users, rosters, weeklyMatchups, weeklyTransactions] = await Promise.all([
      sleeper(`/league/${leagueId}/users`),
      sleeper(`/league/${leagueId}/rosters`),
      sleeper(`/league/${leagueId}/matchups/${week}`),
      sleeper(`/league/${leagueId}/transactions/${week}`),
    ]);

    const signature = await sha256(stable({ league, users, rosters, weeklyMatchups, weeklyTransactions, week }));
    if (signature === config.last_auto_signature) {
      const { error } = await admin.from("sleeper_config").update({
        last_auto_checked_at: checkedAt,
        last_auto_error: "",
      }).eq("id", 1);
      if (error) throw error;
      await notifyCommissioners(url, cronToken, `Checked ${season} Week ${week}. No Sleeper changes found.`);
      return Response.json({ ok: true, changed: false, season, week });
    }

    const now = new Date().toISOString();
    const names = new Map<string, Json>((users || []).map((user: Json) => [user.user_id, {
      team: user.metadata?.team_name || "",
      display: user.display_name || user.username || "",
    }]));
    const owners = new Map<number, string>((rosters || []).map((roster: Json) => [roster.roster_id, roster.owner_id]));

    await upsert(admin, "sleeper_users", (users || []).map((user: Json) => ({
      sleeper_user_id: user.user_id,
      username: user.username || "",
      display_name: user.display_name || user.username || "",
      team_name: user.metadata?.team_name || "",
      avatar: user.avatar || null,
      current_season: season,
      updated_at: now,
    })), "sleeper_user_id");

    await upsert(admin, "sleeper_rosters", (rosters || []).map((roster: Json) => ({
      season,
      league_id: leagueId,
      roster_id: roster.roster_id,
      sleeper_user_id: roster.owner_id || null,
      team_name: names.get(roster.owner_id)?.team || "",
      display_name: names.get(roster.owner_id)?.display || "",
      players: roster.players || [],
      starters: roster.starters || [],
      synced_at: now,
    })), "season,roster_id");

    await upsert(admin, "sleeper_standings", standings(rosters || [], season, league, leagueId, names), "season,roster_id");
    await upsert(admin, "sleeper_leagues", [{
      sleeper_league_id: leagueId,
      season,
      name: league.name || "",
      status: league.status || "",
      scoring_settings: league.scoring_settings || {},
      playoff_teams: league.settings?.playoff_teams ?? null,
      max_keepers: league.settings?.max_keepers ?? null,
      previous_league_id: league.previous_league_id || null,
      synced_at: now,
    }], "sleeper_league_id");

    const matchupRows = matchups(weeklyMatchups || [], season, week, leagueId, owners);
    await upsert(admin, "sleeper_matchups", matchupRows, "season,week,matchup_id");
    const transactionRows = (weeklyTransactions || [])
      .filter((transaction: Json) => transaction.status !== "failed")
      .map((transaction: Json) => ({
        sleeper_transaction_id: String(transaction.transaction_id),
        season,
        week: transaction.leg ?? week,
        type: transaction.type || "",
        status: transaction.status || "",
        details: transaction,
        created_ms: transaction.created ?? null,
      }));
    await upsert(admin, "sleeper_transactions", transactionRows, "sleeper_transaction_id");
    await refreshMemberTeamNames(admin);

    const { error: updateError } = await admin.from("sleeper_config").update({
      last_synced_at: now,
      last_sync_note: `Automatic sync: ${season}, week ${week}`,
      last_auto_checked_at: checkedAt,
      last_auto_signature: signature,
      last_auto_error: "",
    }).eq("id", 1);
    if (updateError) throw updateError;

    await notifyCommissioners(url, cronToken,
      `Updated ${season} Week ${week}: ${rosters?.length || 0} rosters and ${transactionRows.length} transactions checked.`);

    return Response.json({
      ok: true,
      changed: true,
      season,
      week,
      counts: { users: users?.length || 0, rosters: rosters?.length || 0, matchups: matchupRows.length, transactions: transactionRows.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("sleeper_config").update({ last_auto_checked_at: checkedAt, last_auto_error: message }).eq("id", 1);
    console.error("Sleeper auto-sync failed", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
});
