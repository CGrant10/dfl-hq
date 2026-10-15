import {it,expect} from 'vitest';
import {createRouteHistory} from './route-history.js';
it('distinguishes ordinary visits, Back, Forward, refresh and a new branch',()=>{
 const location={hash:'#/home',href:'https://dfl.test/#/home'},history={state:{other:'kept'},replaceState(value){this.state=value}};let id=0;
 const routes=createRouteHistory({history,location,makeId:()=>String(++id)});
 const first=routes.visit();const home=history.state;
 expect(first.kind).toBe('initial');expect(history.state.other).toBe('kept');expect(history.scrollRestoration).toBe('manual');
 location.hash='#/trade';history.state=null;expect(routes.visit().kind).toBe('push');const trade=history.state;
 expect(routes.visit().kind).toBe('refresh');
 history.state=home;location.hash='#/home';expect(routes.visit()).toMatchObject({id:first.id,kind:'back'});
 history.state=trade;location.hash='#/trade';expect(routes.visit().kind).toBe('forward');
 history.state=home;location.hash='#/home';routes.visit();
 history.state=home;location.hash='#/analyzer';expect(routes.visit().kind).toBe('push');
 expect(history.state.dflRouteVisit.id).not.toBe(first.id);
 const reload=createRouteHistory({history,location});expect(reload.visit().kind).toBe('initial');
});
