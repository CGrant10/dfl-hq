const field='dflRouteVisit';
export function createRouteHistory({history=globalThis.history,location=globalThis.location,makeId=()=>crypto.randomUUID()}={}){
 let current=null;
 history.scrollRestoration='manual';
 return {visit(){
  const hash=location.hash||'#/home',saved=history.state?.[field];
  const valid=saved&&typeof saved.id==='string'&&Number.isInteger(saved.index)&&saved.index>=0;
  let entry,kind;
  if(!current){entry=valid?{...saved,hash}:{id:makeId(),index:0,hash};kind='initial';}
  else if(valid&&saved.id!==current.id&&saved.index!==current.index){entry={...saved,hash};kind=saved.index<current.index?'back':'forward';}
  else if(valid&&saved.id===current.id&&hash===current.hash){entry={...saved,hash};kind='refresh';}
  else{entry={id:makeId(),index:current.index+1,hash};kind='push';}
  history.replaceState({...history.state,[field]:entry},'',location.href);
  current=entry;return {...entry,kind};
 }};
}
