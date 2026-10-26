import {matchupFinish} from './matchup-finish-model.js';
const known=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
export function matchupStory(model,game,items=[]){
 const result=matchupFinish(model,game);if(!result)return null;
 const mvp=game.sides.flatMap(t=>(t.starters||t.lineup||[]).filter(p=>!p.empty&&known(p.points)).map(p=>({...p,points:Number(p.points),owner:t.name}))).sort((a,b)=>b.points-a.points||String(a.name).localeCompare(String(b.name)))[0]||null;
 const lastLead=items.filter(m=>m.matchupId===String(game.id)&&m.kind==='lead'&&Number.isFinite(m.at)&&m.recap?.sides?.length===2).sort((a,b)=>b.at-a.at||Number(b.key)-Number(a.key))[0];
 const winner=result.winner===null?null:game.sides[result.winner];
 const turningPoint=winner&&lastLead&&lastLead.roster===String(winner.roster)?lastLead:null;
 return {...result,mvp,turningPoint};
}
