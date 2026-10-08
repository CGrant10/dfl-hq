const finite = v => v !== null && v !== undefined && Number.isFinite(Number(v));
export function rivalryStory({ history = [], left, right, season, week, completed = false, calls = [], members = [] }) {
  if (!left?.uid || !right?.uid) return null;
  const samePair = g => [String(g.user1), String(g.user2)].includes(String(left.uid)) && [String(g.user1), String(g.user2)].includes(String(right.uid));
  const previous = history.filter(g => samePair(g) && (Number(g.season) < season || Number(g.season) === season && Number(g.week) < week) && finite(g.score1) && finite(g.score2) && (Number(g.score1) !== 0 || Number(g.score2) !== 0)).map(g => ({ season: Number(g.season), week: Number(g.week), mine: Number(String(g.user1) === String(left.uid) ? g.score1 : g.score2), theirs: Number(String(g.user1) === String(left.uid) ? g.score2 : g.score1) })).sort((a, b) => a.season - b.season || a.week - b.week);
  const final = completed && finite(left.score) && finite(right.score);
  const current = final ? { season, week, mine: Number(left.score), theirs: Number(right.score) } : null;
  const all = [...previous, ...(current ? [current] : [])];
  const wins = all.filter(g => g.mine > g.theirs).length, losses = all.filter(g => g.mine < g.theirs).length, ties = all.filter(g => g.mine === g.theirs).length;
  const record = wins === losses ? `Series tied ${wins}–${losses}` : `${wins > losses ? left.name : right.name} leads ${Math.max(wins, losses)}–${Math.min(wins, losses)}`;
  const last = previous.at(-1);
  const receipts = calls.filter(c => c.kind === 'winner' && [Number(left.roster), Number(right.roster)].includes(Number(c.roster_id))).map(c => {
    const pickedLeft = Number(c.roster_id) === Number(left.roster);
    const picked = pickedLeft ? left : right;
    const correct = !final || current.mine === current.theirs ? null : pickedLeft === (current.mine > current.theirs);
    return { member: members.find(m => String(m.id) === String(c.member_id))?.display_name || 'Member', pick: picked.name, grade: !final ? 'Called' : current.mine === current.theirs ? 'Tie' : correct ? 'Called it' : 'Missed it' };
  });
  const outcome = !final ? 'The next chapter is still being written.' : current.mine === current.theirs ? 'A draw. Neither side gets the last word.' : `${current.mine > current.theirs ? left.name : right.name} takes this chapter by ${Math.abs(current.mine - current.theirs).toFixed(2)}.`;
  const streakWinner = all.at(-1)?.mine > all.at(-1)?.theirs ? 'left' : all.at(-1)?.mine < all.at(-1)?.theirs ? 'right' : '';
  let streak = 0;
  if (streakWinner) for (const g of [...all].reverse()) { if ((streakWinner === 'left' ? g.mine > g.theirs : g.mine < g.theirs)) streak++; else break; }
  const banter = final ? streak >= 2 ? `${streakWinner === 'left' ? left.name : right.name} has taken ${streak} straight. Bring a response next time.` : 'Receipt filed. Save the excuses for the rematch.' : previous.length ? `Meeting ${previous.length + 1}. The group chat remembers the last one.` : 'First recorded meeting. Someone starts the story this week.';
  return { record: record + (ties ? ` · ${ties} tie${ties === 1 ? '' : 's'}` : ''), meetings: all.length, pointsFor: all.reduce((total,g)=>total+g.mine,0), pointsAgainst: all.reduce((total,g)=>total+g.theirs,0), previous: previous.slice(-3).reverse(), last, receipts, outcome, banter, final, current };
}

export function rivalryShareFact(input) {
  const story = rivalryStory(input);
  if (!story?.meetings) return null;
  const last = story.current || story.last;
  return { kicker: 'DFL RIVALRY', ask: 'TALE OF THE TAPE', headline: story.record,
    detail: `${input.left.name} vs ${input.right.name}. ${story.meetings} recorded meeting${story.meetings === 1 ? '' : 's'} through ${input.season} Week ${input.week}. Total points: ${input.left.name} ${story.pointsFor.toFixed(2)}–${story.pointsAgainst.toFixed(2)} ${input.right.name}. Last final: ${last.mine.toFixed(2)}–${last.theirs.toFixed(2)}, ${last.season} Week ${last.week}. ${story.banter}`,
    season: input.season };
}

export function rivalryLedgerFact({left,right,series}) {
  if (!series?.meetings) return null;
  const record=series.wins===series.losses ? `Series tied ${series.wins}–${series.losses}` : `${series.wins>series.losses?left:right} leads ${Math.max(series.wins,series.losses)}–${Math.min(series.wins,series.losses)}`;
  const last=series.last;
  return {kicker:'DFL RIVALRY',ask:'TALE OF THE TAPE',headline:record+(series.ties?` · ${series.ties} tie${series.ties===1?'':'s'}`:''),
    detail:`${left} vs ${right}. ${series.meetings} recorded meetings. Total points: ${left} ${series.pf.toFixed(2)}–${series.pa.toFixed(2)} ${right}. Average point edge for ${left}: ${series.averageMargin>0?'+':''}${series.averageMargin.toFixed(2)} per game.${last?` Last: ${last.mine.toFixed(2)}–${last.theirs.toFixed(2)}, ${last.season} Week ${last.week}.`:''}`};
}
