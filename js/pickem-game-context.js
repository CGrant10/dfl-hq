const number=value=>value==null||typeof value==='boolean'||String(value).trim()===''?null:Number.isFinite(Number(String(value).replace('−','-')))?Number(String(value).replace('−','-')):null;
const code=value=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[String(value||'').toUpperCase()]||String(value||'').toUpperCase());
const text=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,100);
const spread=value=>{const n=number(value);return n!=null&&Math.abs(n)<=99?n:null;};
const money=value=>{const n=number(value);return Number.isInteger(n)&&Math.abs(n)>=100&&Math.abs(n)<=100000?n:null;};
const signed=value=>value<0?'−'+Math.abs(value):value>0?'+'+value:'0';
const probability=value=>value<0?-value/(-value+100):100/(value+100);

// Store only public decision context from the already-fetched NFL scoreboard.
// This never changes straight-up pick grading, locks, odds or wager outcomes.
export function buildPickemGameContext(event,{now=Date.now()}={}){
 const competition=event?.competitions?.[0],sides=competition?.competitors||[];
 const away=sides.find(s=>s.homeAway==='away'),home=sides.find(s=>s.homeAway==='home');
 if(!/^\d+$/.test(String(event?.id||''))||!away?.team?.abbreviation||!home?.team?.abbreviation)return {};
 const awayTeam=code(away.team.abbreviation),homeTeam=code(home.team.abbreviation);
 const quote=[...(competition.odds||[])].sort((a,b)=>(number(a.provider?.priority)??999)-(number(b.provider?.priority)??999))[0];
 let awaySpread=spread(quote?.pointSpread?.away?.close?.line),homeSpread=spread(quote?.pointSpread?.home?.close?.line);
 if(awaySpread==null&&homeSpread==null){
  const detail=text(quote?.details).match(/^([A-Za-z]{2,3})\s*([−+-]?\d+(?:\.\d+)?)(?:\s|$)/);
  if(detail&&[awayTeam,homeTeam].includes(code(detail[1]))){const n=spread(detail[2]);if(n!=null){awaySpread=code(detail[1])===awayTeam?n:-n;homeSpread=-awaySpread;}}
  else if(number(quote?.spread)===0)awaySpread=homeSpread=0;
  else if((quote?.awayTeamOdds?.favorite===true)!==(quote?.homeTeamOdds?.favorite===true)){
   const n=spread(quote?.spread);if(n!=null){awaySpread=quote.awayTeamOdds?.favorite?-Math.abs(n):Math.abs(n);homeSpread=-awaySpread;}
  }
 }
 if(awaySpread==null&&homeSpread!=null)awaySpread=-homeSpread;
 if(homeSpread==null&&awaySpread!=null)homeSpread=-awaySpread;
 if(awaySpread!=null&&homeSpread!=null&&Math.abs(awaySpread+homeSpread)>.001)awaySpread=homeSpread=null;
 const awayMoneyline=money(quote?.moneyline?.away?.close?.odds??quote?.awayTeamOdds?.moneyLine),homeMoneyline=money(quote?.moneyline?.home?.close?.odds??quote?.homeTeamOdds?.moneyLine);
 const rawWeather=event.weather||competition.weather||{},indoor=competition.venue?.indoor===true;
 const temperature=number(rawWeather.temperature),conditions=text(rawWeather.displayValue);
 return {eventId:String(event.id),awayTeam,homeTeam,checkedAt:new Date(now).toISOString(),source:'ESPN',
  lines:awaySpread!=null||homeSpread!=null||awayMoneyline!=null||homeMoneyline!=null?{awaySpread,homeSpread,awayMoneyline,homeMoneyline,provider:text(quote?.provider?.displayName||quote?.provider?.name||'ESPN')}:null,
  weather:indoor?{indoor:true}:temperature!=null&&temperature>=-100&&temperature<=150||conditions?{indoor:false,temperatureF:temperature!=null&&temperature>=-100&&temperature<=150?temperature:null,conditions}:null};
}

export function pickemGameContext(game){
 const context=game?.game_context;
 return context&&context.source==='ESPN'&&`espn:${context.eventId}`===String(game.provider_event_id)&&code(game.away_team_id)===context.awayTeam&&code(game.home_team_id)===context.homeTeam?context:null;
}
export function pickemSideLine(game,side){
 const lines=pickemGameContext(game)?.lines;if(!lines)return null;
 const point=spread(lines[side+'Spread']),ml=money(lines[side+'Moneyline']),other=money(lines[(side==='away'?'home':'away')+'Moneyline']);
 let tag=point===0?'Even':point!=null?point<0?'Fav':'Dog':ml!=null&&other!=null?probability(ml)===probability(other)?'Even':probability(ml)>probability(other)?'Fav':'Dog':'';
 if(point==null&&ml==null)return null;
 return {tag,spread:point==null||point===0?'':signed(point),moneyline:ml==null?'':signed(ml),provider:text(lines.provider)};
}
export function pickemWeather(game){
 const weather=pickemGameContext(game)?.weather;if(!weather)return 'Forecast unavailable';
 if(weather.indoor===true)return 'Indoor venue';
 const temp=number(weather.temperatureF),pieces=[temp!=null&&temp>=-100&&temp<=150?`${Math.round(temp)}°F`:null,text(weather.conditions)].filter(Boolean);
 return pieces.length?pieces.join(' · '):'Forecast unavailable';
}
export const pickemTeamCode=code;
