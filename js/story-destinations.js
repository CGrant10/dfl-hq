// Story destinations carry identity, rather than relying on a remembered tab.
export function matchupStoryHref({season,week,matchup,owner,roster,player}={}){
 const query=new URLSearchParams({season:String(season),week:String(week),tab:'matchups'});
 for(const [key,value] of Object.entries({matchup,owner,roster,player}))if(value!=null&&String(value)!=='')query.set(key,String(value));
 return '#/clubhouse?'+query;
}
export const historyMomentKey=moment=>JSON.stringify([moment.kind,moment.headline,moment.detail||'',moment.figure??null]);
export const historyMomentHref=moment=>'#/history?'+new URLSearchParams({tab:'moments',moment:historyMomentKey(moment)});
export function requestedMatchup(games,params){
 const id=params.get('matchup'),roster=params.get('roster'),owner=params.get('owner');
 return games.find(g=>id&&String(g.id)===id)?.id
  ||games.find(g=>g.sides.some(s=>roster&&String(s.roster)===roster||owner&&String(s.uid)===owner))?.id;
}
export function markStoryTarget(node){
 if(!node)return false;
 node.setAttribute('data-route-focus','');node.tabIndex=-1;
 return true;
}
