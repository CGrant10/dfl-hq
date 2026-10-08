import { headToHead } from './home-slides.js';

const finite = value => value !== null && value !== undefined && Number.isFinite(Number(value));
const pick = (lines, seed) => lines[seed % lines.length];
const seedFor = value => [...value].reduce((seed, char) => ((seed * 31 + char.charCodeAt(0)) >>> 0), 7);

// DFL's voice, never a quote or a post attributed to a member. Results only
// earn a final roast once the selected week is complete; live leads can change.
export function matchupChirp({ left, right, season, week, id = '', completed = false, live = false, history = [] }) {
  if (!left || !right) return null;
  const seed = seedFor(`${season}:${week}:${id}`);
  const past = history.filter(game =>
    (Number(game.season) < Number(season) || Number(game.season) === Number(season) && Number(game.week) < Number(week))
    && finite(game.score1) && finite(game.score2));
  const h2h = headToHead({ matchups: past, meSleeperId: left.uid, oppSleeperId: right.uid });
  const scored = finite(left.score) && finite(right.score);
  const margin = scored ? Math.abs(Number(left.score) - Number(right.score)) : null;
  const leader = scored && margin ? Number(left.score) > Number(right.score) ? left : right : null;
  const trailer = leader === left ? right : left;
  let kind = 'pregame', receipt, roast;

  if (completed && scored) {
    kind = 'final';
    if (!leader) {
      receipt = `${left.name} and ${right.name} tied at ${Number(left.score).toFixed(2)}.`;
      roast = pick(['All that shit talk for a draw. Nobody gets the last word.', 'Two lineups. One shared excuse. Settle this shit in the rematch.'], seed);
    } else {
      receipt = `${leader.name} beat ${trailer.name} by ${margin.toFixed(2)}.`;
      roast = margin >= 30
        ? pick([`${trailer.name}, that was a fucking eviction.`, `${trailer.name} brought a lineup to a demolition. Holy shit.`, `${trailer.name}, delete the excuses. The scoreboard already posted the receipt.`], seed)
        : margin < 3
          ? pick([`${trailer.name}, a loss that small is going to live rent-free all week.`, `${leader.name} gets the win. ${trailer.name} gets seven days of "what if" bullshit.`], seed)
          : pick([`${trailer.name}, the scoreboard says sit your ass down.`, `${leader.name} brought points. ${trailer.name} can bring the excuses.`, `${trailer.name}, talk all the shit you want. This receipt isn't going anywhere.`], seed);
    }
  } else if (live && leader && margin >= 15) {
    kind = 'live';
    receipt = `${leader.name} leads by ${margin.toFixed(2)} · still playing.`;
    roast = pick([`${trailer.name}, your lineup is getting its ass kicked. Still time to answer.`, `${leader.name} has the lead. Don't start a victory lap and jinx this shit.`], seed);
  } else if (h2h?.streak?.count >= 2) {
    const holder = h2h.streak.holder === 'me' ? left : right;
    const challenger = holder === left ? right : left;
    receipt = `${holder.name} has taken the last ${h2h.streak.count}.`;
    roast = pick([`${challenger.name}, at this point you're paying rent in somebody else's win column.`, `${challenger.name}, same opponent, same bullshit. Bring a different ending.`, `${challenger.name}, this is a rematch. Try not to make it a fucking rerun.`], seed);
  } else if (h2h?.meetings) {
    receipt = `${left.name} vs ${right.name} · ${h2h.wins}-${h2h.losses}${h2h.ties ? `-${h2h.ties}` : ''} from ${left.name}'s side.`;
    roast = pick(['The history is on file. Bring points, not bullshit.', 'The group chat remembers. Win first, run your mouth second.', 'Same league. New week. Somebody has to back this shit up.'], seed);
  } else {
    receipt = `${left.name} vs ${right.name} · Week ${week}.`;
    roast = pick(['Fresh week, fresh bragging rights. Bring points, not bullshit.', 'Two confident managers. One of these lineups is full of shit.', 'Talk your shit. The scoreboard keeps receipts.', 'Somebody gets bragging rights. Somebody gets told to shut the fuck up.'], seed);
  }
  return { kind, receipt, roast };
}

export function matchupBanter(model, history = []) {
  return model.games.map(game => {
    const chirp = matchupChirp({ left: game.sides[0], right: game.sides[1], season: model.season,
      week: model.week, id: game.id, completed: model.completed, live: model.live, history });
    return { id: game.id, isMine: game.isMine, title: `${game.sides[0].name} vs ${game.sides[1].name}`,
      ...chirp, text: `${chirp.receipt} ${chirp.roast}` };
  }).sort((a, b) => Number(b.isMine) - Number(a.isMine));
}
