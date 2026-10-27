import {completedCurrentGames} from "../../../js/analyzer-player-form.js";
import {nflWeekStatuses} from "../../../js/clubhouse-matchup-model.js";
import {buildPlayerPool} from '../../../js/team-analyzer.js';
import {assessExpertRankings} from '../../../js/expert-rankings-model.js';
import {captureTradeReceipts} from '../../../js/trade-alert-capture.js';
import {scheduledTradeNotification} from '../../../js/trade-receipt-model.js';

const get = async (url: string) => {
  const response = await fetch(url, {headers: {'User-Agent': 'DFL-HQ-Trade-Alerts/1.0'}, signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw Error(`Trade provider ${new URL(url).hostname}: ${response.status}`);
  return response.json();
};

export async function captureScheduledTrades({admin, league, users, rosters, transactions, season, week, url, cronToken, transactionWeeks={}}: any) {
  return captureTradeReceipts({transactions, currentRosters: rosters, season, week, transactionWeeks, database: admin,reviewUnsupported:true,
    log: (message: string) => console.warn(message),
    loadAnalyzer: async () => {
      // Runs for missing receipts or one-time routed reviews. Existing graded
      // receipts keep their original values; ordinary polls never fetch this model.
      const completedWeeks = Array.from({length: Math.max(0, Math.min(week - 1, 17))}, (_, i) => i + 1);
      const [players, prior, current, market, availability, results, experts, currentWeekStats, nfl] = await Promise.all([
        get('https://api.sleeper.app/v1/players/nfl'),
        get(`https://api.sleeper.app/v1/stats/nfl/regular/${season - 1}`),
        get(`https://api.sleeper.app/v1/stats/nfl/regular/${season}`),
        get(`https://api.sleeper.app/projections/nfl/${season}?season_type=regular&order_by=adp_ppr&position[]=QB&position[]=RB&position[]=WR&position[]=TE`),
        get(`https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=regular`),
        Promise.all(completedWeeks.map(w => get(`https://api.sleeper.app/stats/nfl/${season}/${w}?season_type=regular`))),
        get('https://raw.githubusercontent.com/CGrant10/dfl-hq/main/data/expert-ros-ppr.json').catch(() => null),
        get(`https://api.sleeper.app/stats/nfl/${season}/${week}?season_type=regular`).catch(()=>[]),
        get(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${week}`).catch(()=>null),
      ]);
      if (!players || Array.isArray(players) || !prior || !current || !Array.isArray(market) || !market.length
        || !Array.isArray(availability) || !availability.length || results.some(r => !Array.isArray(r))) throw Error('Incomplete trade inputs');
      const owners = new Map((users || []).map((u: any) => [String(u.user_id), u]));
      const named = rosters.map((r: any) => {
        const owner: any = owners.get(String(r.owner_id));
        return {...r, id: String(r.roster_id), sleeper_user_id: r.owner_id,
          team_name: r.metadata?.team_name || owner?.metadata?.team_name || owner?.display_name || `Team ${r.roster_id}`,
          ownerName: owner?.display_name || owner?.username || '', playerIds: r.players || []};
      });
      const now = Date.now(), signals = {fetchedAt: now, stale: false};
      let finished:any[]=[];
      try{finished=completedCurrentGames(currentWeekStats,nflWeekStatuses(nfl,season,week),season,week)}catch{/* Unknown NFL status never creates a completed sample. */}
      const formWeeks=finished.length?[...results,finished]:results;
      const pool = buildPlayerPool({rosters: named, players, previousStats: prior, currentStats: current,
        projections: market, weeklyProjections: availability, recentStats: formWeeks.slice(-4), seasonWeeklyStats: formWeeks,
        scoringSettings: league.scoring_settings, currentWeek: week, scoringFormat: 'ppr',
        expertRankings: assessExpertRankings(experts, {season, scoring: 'ppr', now} as any),
        dataSignals: {projections: signals, production: signals, availability: signals, weeklyResults: signals}} as any);
      return {state: 'ready', teams: named, pool};
    },
    notifyTradeAlert: async (alert: any, database: any) => {
      const response = await fetch(`${url}/functions/v1/send-notification`, {
        method: 'POST', headers: {'Content-Type': 'application/json', 'x-dfl-cron-token': cronToken},
        body: JSON.stringify({action: 'send', ...scheduledTradeNotification(alert), category: 'trades', audience: 'all',
          sourceKey: `trade:${alert.sleeper_transaction_id}`, targetUrl: `#/trade?tx=${encodeURIComponent(alert.sleeper_transaction_id)}`}),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.messageId) throw Error(data.error || `Trade alert ${response.status}`);
      const saved = await database.from('trade_alerts').update({notification_message_id: data.messageId, notified_at: new Date().toISOString()})
        .eq('sleeper_transaction_id', alert.sleeper_transaction_id).is('notification_message_id', null);
      if (saved.error) throw saved.error;
    },
  } as any);
}
