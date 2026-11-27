const field='dflRouteVisit';
export function createRouteHistory({history=globalThis.history,location=globalThis.location,makeId=()=>crypto.randomUUID(),navigationType=()=>globalThis.performance?.getEntriesByType?.('navigation')?.[0]?.type}={}){
 let current=null;
 history.scrollRestoration='manual';
 return {visit({fresh=false,refresh=false}={}){
  const hash=location.hash||'#/home',saved=history.state?.[field];
  const valid=saved&&typeof saved.id==='string'&&Number.isInteger(saved.index)&&saved.index>=0;
  let entry,kind;
  if(fresh&&current){entry={id:makeId(),index:current.index,hash};kind='reselect';}
  else if(!current){entry=valid?{...saved,hash}:{id:makeId(),index:0,hash};kind=valid&&['reload','back_forward'].includes(navigationType())?'resume':'initial';}
  else if(refresh&&valid&&saved.id===current.id){entry={...saved,hash};kind='refresh';}
  else if(valid&&saved.id!==current.id&&saved.index!==current.index){entry={...saved,hash};kind=saved.index<current.index?'back':'forward';}
  else if(valid&&saved.id===current.id&&hash===current.hash){entry={...saved,hash};kind='refresh';}
  else{entry={id:makeId(),index:current.index+1,hash};kind='push';}
  history.replaceState({...history.state,[field]:entry},'',location.href);
  current=entry;return {...entry,kind};
 }};
}
