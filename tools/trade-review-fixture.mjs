import {analyzeLeague} from '../js/team-analyzer.js';
export function tradeReviewFixture(){
 const pool=new Map(),names=['Bastards of the Realm','Klutch Sports Group','The Bayou Bombers','The Bear Jew'];
 const playerNames=['Patrick Mahomes','Bijan Robinson','Kenneth Walker III','Justin Jefferson','Amon-Ra St. Brown','Travis Kelce','Jayden Reed','Tony Pollard','Brian Robinson Jr.','Michael Pittman Jr.','T.J. Hockenson'];
 const positions=['QB','RB','RB','WR','WR','TE','WR','RB','RB','WR','TE'];
 const rosters=names.map((team_name,t)=>({id:String(t+1),roster_id:t+1,team_name,players:positions.map((position,i)=>{const id=`${t+1}-${i}`,points=[310,290,210,280,225,170,195,160,125,130,115][i]+t*8;pool.set(id,{id,name:`${playerNames[i]}${t?' '+['','II','III','IV'][t]:''}`,position,nflTeam:['KC','ATL','SEA','MIN','DET','KC','GB','TEN','WSH','IND','MIN'][i],tradeValue:[65,78,45,80,57,38,43,32,22,24,21][i]+t,expectedPoints:points,expectedPerGame:points/17,injuryStatus:i===9?'Questionable':'',projectionConfidence:'medium'});return id;})}));
 const teams=analyzeLeague({rosters,pool});teams.sort((a,b)=>Number(a.id)-Number(b.id));
 return {teams,pool,projectionSeason:2026,projectionUpdatedAt:'2026-10-07T12:00:00Z',productionUpdatedAt:'2026-10-07T12:00:00Z',liveSignalsUpdatedAt:'2026-10-07T12:00:00Z'};
}
