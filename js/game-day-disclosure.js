import { readPageChoice, savePageChoice } from './page-disclosure.js';

// Follow the active NFL week when the league's saved score slate is behind.
export function gameDayOpeningWeek(week, state) {
  const current = Number(state?.currentWeek);
  return Number(state?.season) === Number(week.season) && Number.isInteger(current)
    && current > Number(week.week) && current <= 18 ? current : Number(week.week);
}

// A Thursday final still means the week has started on Friday and Saturday.
// Scheduled kickoff also handles the brief delay before live status arrives.
export function gameDayWeekStarted(nfl, { completed = false, now = Date.now() } = {}) {
  if (completed) return true;
  const events = nfl?.payload?.events;
  if (!Array.isArray(events) || !events.length) return null;
  if (events.some(event => {
    const type = event.status?.type || {};
    const kickoff = Date.parse(event.date);
    return type.completed === true || ['in', 'post'].includes(type.state)
      || Number.isFinite(kickoff) && kickoff <= now;
  })) return true;
  return events.some(event => event.status?.type?.state === 'pre'
    || Number.isFinite(Date.parse(event.date))) ? false : null;
}

export function mountGameDayDisclosure(section) {
  // This disclosure owns phase-specific preferences instead of the global key.
  section.dataset.pageDetailWired = '1';
  let weekKey = '', key = '', schedule = null, started = false;
  let last = section.open, loadingChoice = null;
  const toggle = () => {
    if (section.open === last) return;
    last = section.open;
    if (key) savePageChoice(key, last ? 'open' : 'closed');
    else loadingChoice = last;
  };
  section.addEventListener('toggle', toggle);
  return {
    update({ leagueId, season, week, nfl = null, completed = false, now = Date.now() }) {
      const nextWeek = `${leagueId}.${season}.${week}`;
      if (nextWeek !== weekKey) {
        weekKey = nextWeek; key = ''; schedule = null; started = false;
      }
      if (Array.isArray(nfl?.payload?.events) && nfl.payload.events.length) schedule = nfl;
      if (gameDayWeekStarted(schedule, { completed, now }) === true) started = true;
      const nextKey = `gameday-live.${weekKey}.${started ? 'started' : 'pregame'}`;
      if (key === nextKey) return;
      key = nextKey;
      const fallback = loadingChoice == null ? started : loadingChoice;
      last = readPageChoice(key, ['open', 'closed'], fallback ? 'open' : 'closed') === 'open';
      section.open = last;
      if (loadingChoice != null) savePageChoice(key, last ? 'open' : 'closed');
      loadingChoice = null;
    },
    stop() { section.removeEventListener('toggle', toggle); },
  };
}
