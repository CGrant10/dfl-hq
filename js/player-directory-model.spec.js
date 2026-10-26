import {it,expect} from 'vitest';
import {compactPlayers,validPlayerDirectory} from './player-directory-model.js';
const rows=()=>Object.fromEntries(Array.from({length:1000},(_,i)=>[String(i+1),{n:'Player '+i,p:['QB','RB','WR','TE','K'][i%5],fp:['WR'],t:'BUF',i:null,s:'Active',pp:null,is:null,nu:123}]));
it('keeps every consumed player field, including injury freshness and fantasy eligibility',()=>{
 const raw={'1':{first_name:'A',last_name:'Player',position:'TE',fantasy_positions:['TE','WR'],team:'NO',injury_status:'Questionable',status:'Active',practice_participation:'Limited',injury_start_date:'2026-10-26',news_updated:123,unused_biography:'large'},BUF:{full_name:'Buffalo Bills',position:'DEF'}};
 expect(compactPlayers(raw)).toEqual({'1':{n:'A Player',p:'TE',fp:['TE','WR'],t:'NO',i:'Questionable',s:'Active',pp:'Limited',is:'2026-10-26',nu:123},BUF:{n:'Buffalo Bills',p:'DEF',fp:[],t:'FA',i:null,s:null,pp:null,is:null,nu:null}});
 expect(raw['1']).toHaveProperty('unused_biography');
});
it('round-trips compact metadata and guards against empty, partial or malformed catalogs',()=>{
 const full=rows();expect(compactPlayers(full)).toEqual(full);expect(validPlayerDirectory(full)).toBe(true);
 for(const bad of [null,[],{},Object.fromEntries(Object.entries(full).slice(0,999)),{...full,'1':{n:'Broken'}},{...full,'1':{...full['1'],fp:null}}])expect(validPlayerDirectory(bad)).toBe(false);
 expect(validPlayerDirectory(Object.fromEntries(Object.entries(full).map(([id,p])=>[id,{...p,p:'WR'}])))).toBe(false);
});
