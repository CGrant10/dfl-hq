import {loadNflGameSummary} from './nfl-game-center-data.js';
import {nflGameId} from './nfl-game-center-model.js';
export async function replayGameContext(clip,context,loadSummary=loadNflGameSummary){
 if(!context?.season||!context.week||!nflGameId(clip?.game_id))throw Error('Game context unavailable');
 if((context.events||context.nflPayload?.events||[]).some(event=>String(event.id)===String(clip.game_id)))return context;
 const {summary}=await loadSummary({id:String(clip.game_id),state:'in'},context.season);
 const week=Number(summary?.header?.week),season=Number(summary?.header?.season?.year);
 if(String(summary?.header?.id)!==String(clip.game_id)||season!==Number(context.season)||!Number.isInteger(week)||week<1||week>18)throw Error('Game week unavailable');
 return {...context,season,week};
}
