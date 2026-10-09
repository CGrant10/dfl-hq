// Current trading tools follow Sleeper. Historical/profile names stay stored.
export const DFL_STARTING_SLOTS=['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'];
const clean=value=>String(value??'').trim();
export function currentAnalyzerLeague(stored,live){
 if(!live||String(live.league_id)!==String(stored?.sleeper_league_id)||Number(live.season)!==Number(stored?.season))return stored;
 return {...stored,scoring_settings:live.scoring_settings||stored.scoring_settings,
  roster_positions:Array.isArray(live.roster_positions)?live.roster_positions:stored.roster_positions,
  total_rosters:live.total_rosters};
}
export function currentAnalyzerRoster(roster,member,users=[]){
 const user=users.find(u=>String(u.user_id)===String(roster.sleeper_user_id));
 const teamName=clean(user?.metadata?.team_name)||clean(user?.display_name)
  ||clean(roster.team_name)||clean(member?.team_name)||clean(member?.display_name)||clean(roster.display_name)||`Team ${roster.roster_id}`;
 return {...roster,identity:member?{...member,team_name:teamName}:null,
  ownerName:clean(member?.display_name)||clean(user?.display_name)||clean(roster.display_name)||'Unassigned owner',team_name:teamName};
}
export function matchesDflStartingSlots(positions){
 const slots=(positions||DFL_STARTING_SLOTS).filter(p=>p!=='BN').slice().sort();
 return JSON.stringify(slots)===JSON.stringify([...DFL_STARTING_SLOTS].sort());
}
