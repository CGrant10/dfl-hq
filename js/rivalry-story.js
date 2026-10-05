import { esc } from './ui.js';
import { rivalryStory } from './rivalry-story-model.js';
import { db } from './supabase.js';
const cache = new Map();
export function loadRivalryCalls(season, week) {
  const key = `${season}:${week}`, hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60000) return hit.value;
  const value = Promise.resolve(db().from('dfl_weekly_calls').select('member_id,matchup_id,roster_id,kind').eq('season', season).eq('week', week)).then(({ data, error }) => { if (error) throw error; return data || []; }).catch(error => { cache.delete(key); throw error; });
  cache.set(key, { at: Date.now(), value }); return value;
}
export function rivalryStoryHtml(input, { callsAvailable = true } = {}) {
  const story = rivalryStory(input);
  if (!story) return '<p class="muted">Rivalry history unavailable.</p>';
  return `<details class="rivalry-details rivalry-story"><summary><span>Rivalry story</span><strong>${esc(story.record)}</strong></summary><div class="rivalry-story-body"><section><small>PREVIOUS CHAPTERS</small>${story.previous.length ? `<ol>${story.previous.map(g => `<li><span>${g.season} · Week ${g.week}</span><b>${g.mine.toFixed(2)}–${g.theirs.toFixed(2)}</b><small>${g.mine === g.theirs ? 'Tie' : esc(g.mine > g.theirs ? input.left.name : input.right.name) + ' won'}</small></li>`).join('')}</ol>` : '<p>First recorded meeting.</p>'}</section><section><small>WEEK ${input.week} · THE CALLS</small>${story.receipts.length ? `<ul>${story.receipts.map(r => `<li><span><strong>${esc(r.member)}</strong><small>${esc(r.pick)}</small></span><b>${esc(r.grade)}</b></li>`).join('')}</ul>` : `<p>${callsAvailable ? 'No matchup calls recorded.' : 'Calls temporarily unavailable.'}</p>`}</section><section class="rivalry-story-outcome"><small>${story.final ? 'FINAL RECEIPT' : 'THIS CHAPTER'}</small><strong>${esc(story.outcome)}</strong><p>${esc(story.banter)}</p></section></div></details>`;
}
