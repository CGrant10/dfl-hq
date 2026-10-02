import { it, expect } from 'vitest';
import { corePropStat, selectCoreProps } from './sportsbook-core-props.js';
const prop=(id,stat,line,extra={})=>({id,title:`Josh Allen · ${stat}`,category:'Player Props',provider_event_id:'game',provider_line:line,...extra});
it('keeps requested markets and scoring TDs only at 0.5',()=>{
 const rows=[prop(1,'Passing yards',260.5),prop(2,'Passing TDs',1.5),prop(3,'Rushing yards',36.5),prop(4,'Receptions',.5),prop(5,'Touchdowns',.5),prop(6,'Touchdowns',1.5),prop(7,'Passing attempts',32.5),prop(8,'Fantasy points',24.5),prop(9,'Receiving yards',10.5),prop(10,'Receiving Longest Reception',20.5)];
 expect(selectCoreProps(rows).map(row=>row.id)).toEqual([1,2,3,4,5]);
 expect(corePropStat('rushing_touchdowns',.5)).toBe('rushing_touchdowns');
 expect(corePropStat('receiving_touchdowns',1.5)).toBe('');
});
it('collapses aliases, alternate lines and legacy copies within a game',()=>{
 const rows=[prop(1,'Receptions',4.5,{lore_note:'Book consensus 4.5 · 2 books',provider_updated_at:'2026-10-02T10:00:00Z'}),prop(2,'Receiving Receptions',5.5,{lore_note:'Book consensus 5.5 · 6 books',provider_updated_at:'2026-10-02T10:00:01Z'}),prop(3,'Receptions',6.5,{provider_updated_at:'2026-10-02T09:00:00Z'}),prop(4,'Receptions',3.5,{provider_event_id:'other-game'})];
 expect(selectCoreProps(rows).map(row=>row.id)).toEqual([2,4]);
 expect(selectCoreProps([...rows].reverse()).map(row=>row.id).sort()).toEqual([2,4]);
});
it('prefers anytime scoring TDs and reads lazy index lines without outcomes',()=>{
 const rows=[prop(1,'Rushing Touchdowns',.5),prop(2,'Touchdowns',undefined,{lore_note:'AAA @ BBB · Book consensus 0.5 · 6 books'}),prop(3,'Passing TDs',1.5)];
 expect(selectCoreProps(rows).map(row=>row.id)).toEqual([2,3]);
 expect(selectCoreProps([prop(4,'Touchdowns',null,{lore_note:'No valid line'})])).toEqual([]);
});
