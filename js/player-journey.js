export function playerJourneyLinks(model){
 const p=model?.player;if(!p?.id||!Number.isInteger(model.season)||!Number.isInteger(model.week))return {};
 const base=`#/clubhouse?season=${model.season}&week=${model.week}`;
 return {highlights:`${base}&tab=highlights&player=${encodeURIComponent(p.id)}&query=${encodeURIComponent(p.name||'')}`,
  matchup:model.owner?.id?`${base}&tab=matchups&roster=${encodeURIComponent(model.owner.id)}`:null};
}
