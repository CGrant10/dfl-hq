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
it('reselects replace the current visit without adding a phantom Back step',()=>{
 const location={hash:'#/home',href:'https://dfl.test/#/home'},history={state:null,replaceState(value){this.state=value}};let id=0;
 const routes=createRouteHistory({history,location,makeId:()=>String(++id)}),home=routes.visit(),savedHome=history.state;
 location.hash='#/trade';history.state=null;const first=routes.visit(),selected=routes.visit({fresh:true});
 expect(selected.kind).toBe('reselect');expect(selected.id).not.toBe(first.id);expect(selected.index).toBe(first.index);
 history.state=savedHome;location.hash='#/home';expect(routes.visit()).toMatchObject({kind:'back',id:home.id});
});
it('resumes an existing entry on reload or document Back restoration, but fresh launches start normally',()=>{
 const location={hash:'#/clubhouse',href:'https://dfl.test/#/clubhouse'},saved={dflRouteVisit:{id:'kept',index:3,hash:'#/clubhouse'}};
 for(const type of ['reload','back_forward','navigate']){
  const history={state:saved,replaceState(value){this.state=value}},routes=createRouteHistory({history,location,navigationType:()=>type});
  expect(routes.visit()).toMatchObject({id:'kept',kind:type==='navigate'?'initial':'resume'});
 }
 const history={state:null,replaceState(value){this.state=value}};
 expect(createRouteHistory({history,location,navigationType:()=> 'reload',makeId:()=> 'new'}).visit().kind).toBe('initial');
});
it('keeps an internally refreshed query selection in its existing visit',()=>{
 const location={hash:'#/clubhouse',href:'https://dfl.test/#/clubhouse'},history={state:null,replaceState(value){this.state=value}};let id=0;
 const routes=createRouteHistory({history,location,makeId:()=>String(++id)}),first=routes.visit();
 location.hash='#/clubhouse?tab=leaders';expect(routes.visit({refresh:true})).toMatchObject({id:first.id,index:first.index,kind:'refresh',hash:location.hash});
 location.hash='#/home';history.state=null;expect(routes.visit({refresh:true})).toMatchObject({kind:'push',index:first.index+1});
});
