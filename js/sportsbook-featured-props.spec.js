import { it, expect } from 'vitest';
import { selectFeaturedProps, groupPropPlayers } from './sportsbook-featured-props.js';
import { propMarketMeta } from './sportsbook-props.js';
let id=0;
const player=(name,pos,team,volume,game='game')=>{
 const stats=pos==='QB'?[['Passing yards',volume],['Passing TDs',1.5],['Rushing yards',30.5]]:pos==='RB'?[['Rushing yards',volume],['Touchdowns',.5],['Receptions',3.5]]:[['Receptions',volume],['Touchdowns',.5],['Rushing yards',5.5]];
 return stats.map(([stat,line])=>({id:++id,category:'Player Props',title:`${name} · ${stat}`,provider_event_id:game,provider_line:line,lore_note:`AAA @ BBB · POS ${pos} · TEAM ${team}`}));
};
it('keeps main offensive players per team with no more than two actual lines each',()=>{
 const rows=['AAA','BBB'].flatMap(team=>['QB','RB','WR','TE'].flatMap(pos=>[1,2,3,4].flatMap(n=>player(`${team} ${pos} ${n}`,pos,team,100/n))));
 rows.push(...player('Defender','LB','AAA',999));
 const selected=selectFeaturedProps(rows),players=groupPropPlayers(selected.map(market=>({market,meta:propMarketMeta(market)})));
 expect(players).toHaveLength(10);expect(selected).toHaveLength(20);
 expect(players.every(p=>p.rows.length===2)).toBe(true);
 expect(players.some(p=>p.meta.player==='Defender')).toBe(false);
 expect(players.some(p=>p.meta.player==='AAA WR 2')).toBe(true);
 expect(players.some(p=>p.meta.player==='AAA WR 3')).toBe(false);
 expect(players.find(p=>p.meta.player==='AAA QB 1').rows.map(r=>r.meta.stat)).toEqual(['Passing yards','Passing TDs']);
 expect(players.find(p=>p.meta.player==='AAA RB 1').rows.map(r=>r.meta.stat)).toEqual(['Rushing yards','Touchdowns']);
 expect(selectFeaturedProps([...rows].reverse()).map(m=>m.id)).toEqual(selected.map(m=>m.id));
 expect(selected.every(m=>rows.includes(m))).toBe(true);
});
it('caps games independently, handles missing positions and never promotes TD-only bench players',()=>{
 const rows=[...player('Starter','QB','AAA',250,'one'),...player('Starter','QB','AAA',250,'two')];
 const unknown=player('Runner','RB','',70,'one').map(m=>({...m,lore_note:'AAA @ BBB'}));
 const td={id:999,category:'Player Props',title:'Backup · Touchdowns',provider_line:.5,provider_event_id:'one',lore_note:'POS WR · TEAM AAA'};
 const selected=selectFeaturedProps([...rows,...unknown,td]);
 expect(selected.filter(m=>m.provider_event_id==='two')).toHaveLength(2);
 expect(selected.some(m=>m.id===999)).toBe(false);
 expect(selected.filter(m=>m.title.startsWith('Runner'))).toHaveLength(2);
});
