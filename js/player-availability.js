const club=value=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[String(value||'').toUpperCase()]||String(value||'').toUpperCase());
const key=(name,team,position)=>[String(name||'').toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b/g,'').replace(/[^a-z0-9]/g,''),club(team),String(position||'').toUpperCase()].join(':');
// This model covers the same 18-week NFL regular season as the analyzer.
export function regularSeasonEnd(season){
 if(!Number.isInteger(Number(season))||Number(season)<2000)return NaN;
 const laborDay=new Date(Date.UTC(Number(season),8,1));laborDay.setUTCDate(1+(8-laborDay.getUTCDay())%7);
 return laborDay.getTime()+126*86400000;
}
export function injuryAvailabilityIndex(payload,{season,now=Date.now()}={}){
 const index=new Map(),floor=Date.UTC(Number(season),3,1);
 if(!Array.isArray(payload?.injuries))return index;
 for(const team of payload.injuries)for(const row of Array.isArray(team?.injuries)?team.injuries:[]){
  const athlete=row.athlete||{},name=athlete.displayName||[athlete.firstName,athlete.lastName].filter(Boolean).join(' '),position=athlete.position?.abbreviation,teamCode=athlete.team?.abbreviation;
  const updatedAt=Date.parse(row.date);if(!name||!position||!teamCode||!Number.isFinite(updatedAt)||updatedAt<floor||updatedAt>now+300000)continue;
  const id=key(name,teamCode,position),before=index.get(id);
  if(!before||before.updatedAt<updatedAt)index.set(id,{...row,updatedAt});
 }
 return index;
}
const reserveStatus=value=>/^(?:IR|IR-R|PUP|injured[ -]?reserve|physically unable(?: to perform)?)$/i.test(String(value||'').trim());
function definitiveSeasonEnd(text){
 const statement=String(text||'').split(/(?<=[.!?])\s/)[0];
 if(/\b(?:could|might|may|potential\w*|fear\w*|concern\w*|avoid\w*|not|no|denied|unlikely)\b/i.test(statement))return false;
 return /\bseason[- ]ending\b|\b(?:out|done|ruled out) for (?:the |this )?season\b|\bmiss (?:the )?(?:rest|remainder|entirety) of (?:the |this )?season\b/i.test(statement);
}
export function playerAvailability(player,{index=new Map(),season,now=Date.now()}={}){
 const report=index.get(key(player.name,player.nflTeam,player.position));
 const reserve=reserveStatus(player.injuryStatus)||reserveStatus(player.playerStatus)||reserveStatus(report?.status);
 const explicitHealthy=report&&/^(active|healthy|normal)$/i.test(report.status||'');
 const returnAt=Date.parse(report?.details?.returnDate||player.expectedReturnDate||''),end=regularSeasonEnd(season);
 const direct=!explicitHealthy&&(player.outForSeason===true||player.season_ending===true||reserve&&definitiveSeasonEnd(player.injuryNotes||'')||definitiveSeasonEnd(player.injuryStatus||''));
 const reported=!explicitHealthy&&!!report&&(definitiveSeasonEnd(report.shortComment)||definitiveSeasonEnd(report.longComment));
 const outForSeason=!!(direct||reported||!explicitHealthy&&reserve&&Number.isFinite(returnAt)&&Number.isFinite(end)&&returnAt>=end);
 // IR return estimates are not clearance to play. Automatic offers wait for
 // the player to leave reserve; manual trade checks retain the injury context.
 const automaticTradeEligible=!outForSeason&&!reserve&&!/inactive|retir|suspend/i.test(player.playerStatus||'');
 return {outForSeason,automaticTradeEligible,expectedReturnDate:Number.isFinite(returnAt)?new Date(returnAt).toISOString().slice(0,10):null,
  availabilitySource:report?'ESPN':'Sleeper',availabilityUpdatedAt:report?.updatedAt||0};
}
export function automaticTradePlayer(player){
 return !!player&&player.automaticTradeEligible!==false&&!player.outForSeason&&!reserveStatus(player.injuryStatus)&&!reserveStatus(player.playerStatus)&&!/inactive|retir|suspend/i.test(player.playerStatus||'');
}
