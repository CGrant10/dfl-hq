import {afterEach,it,expect,vi} from 'vitest';
import {enterBookVisit,saveBookVisit,writeBookState,readBookState} from './sportsbook-view-state.js';
const storage=()=>{const values=new Map();return{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}};
afterEach(()=>vi.unstubAllGlobals());
it('resets fresh page presentation while preserving exact Book visits for Back and resume',()=>{
 vi.stubGlobal('localStorage',storage());vi.stubGlobal('sessionStorage',storage());
 const a={dataset:{routeVisitId:'a',routeReturning:'false'}};enterBookVisit(a,'me');
 writeBookState('me',{product:'pickem',tab:'tickets',scroll:620,filters:{search:'Chase'},favorites:true});saveBookVisit(a,'me');
 enterBookVisit(a,'me');expect(readBookState('me')).toMatchObject({product:'pickem',scroll:620});
 const b={dataset:{routeVisitId:'b',routeReturning:'false'}};enterBookVisit(b,'me');
 expect(readBookState('me')).toMatchObject({product:'book',tab:'markets',scroll:0,favorites:false,filters:{search:''}});
 writeBookState('me',{tab:'tickets',scroll:150});saveBookVisit(b,'me');
 enterBookVisit({dataset:{routeVisitId:'a',routeReturning:'true'}},'me');
 expect(readBookState('me')).toMatchObject({product:'pickem',scroll:620,favorites:true,filters:{search:'Chase'}});
 enterBookVisit({dataset:{routeVisitId:'b',routeReturning:'true'}},'me');expect(readBookState('me')).toMatchObject({tab:'tickets',scroll:150});
 enterBookVisit({dataset:{routeVisitId:'a',routeReturning:'true'}},'other');expect(readBookState('other').scroll).toBe(0);
});
