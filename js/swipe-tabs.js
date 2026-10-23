import { animateUi, cancelUiMotion } from './ui-motion.js';
import { mountHorizontalSwipe } from './horizontal-swipe.js';

export function tabGlideOffset(distance, width, hasNeighbor) {
  return hasNeighbor ? Math.max(-width, Math.min(width, distance)) : 32 * Math.tanh(distance / 160);
}
export function tabGlideStep(offset, distance, origin = 0) {
  // Continuing an unfinished arrival first lands the already selected page.
  if (origin && Math.sign(offset) === Math.sign(origin) && Math.sign(distance) !== Math.sign(origin)) return 0;
  return offset < 0 ? 1 : offset > 0 ? -1 : 0;
}
const properties=['transform','height','min-height','box-sizing'];
const savedStyle=node=>properties.map(key=>[key,node.style.getPropertyValue(key),node.style.getPropertyPriority(key)]);
const restoreStyle=(node,values)=>values.forEach(([key,value,priority])=>value?node.style.setProperty(key,value,priority):node.style.removeProperty(key));
const translate=value=>`translateX(${value}px)`;

// Preview copies are visual only. Actual panels and form controls stay in place.
function previewOf(node, scene) {
  const copy=node.cloneNode(true);
  for(const child of [copy,...copy.querySelectorAll('*')]) {
    for(const attribute of [...child.attributes]) if(attribute.name==='id'||attribute.name.startsWith('data-'))child.removeAttribute(attribute.name);
  }
  copy.hidden=false;copy.inert=true;copy.setAttribute('aria-hidden','true');copy.classList.add('dfl-tab-preview');
  Object.assign(copy.style,{position:'absolute',left:`${scene.left}px`,top:`${scene.top}px`,width:`${scene.width}px`,height:'auto',minHeight:'0',boxSizing:'border-box',margin:'0',zIndex:'2'});
  scene.parent.append(copy);return copy;
}

export function mountSwipeTabs(surface, tabs, { getButtons = () => [...tabs.querySelectorAll('[role="tab"]')], getPanel = null, getPanelForButton = null, accepts = (_target) => true, exclude = 'a,button,input,select,textarea,summary,[contenteditable]', selected = button => button.getAttribute('aria-selected') === 'true', activate = button => button.click() } = {}) {
  if (!surface) return () => {};
  const paneFor=getPanelForButton||((button)=>{
    const id=button?.getAttribute('aria-controls');
    return id&&surface.querySelector?.(`#${CSS.escape(id)}`);
  });
  const panel=getPanel||(()=>paneFor(getButtons().find(selected)));
  const reduced=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  const canMove=()=>typeof document!=='undefined'&&document.visibilityState==='visible'
    &&document.documentElement.dataset.uiMotion!=='off'&&!reduced?.matches;
  let scene=null,frame=0,stopped=false,interrupted=false,committing=false,origin=0;
  const clean=(keepGap=null)=>{
    if(frame)cancelAnimationFrame(frame);frame=0;
    if(!scene)return;
    const old=scene;scene=null;
    if(old.gap){cancelUiMotion(old.gap);if(old.gap!==keepGap)old.gap.remove();}
    for(const node of old.copies.values()){cancelUiMotion(node);node.remove();}
    for(const [node,values] of old.styles){cancelUiMotion(node);restoreStyle(node,values);delete node.dataset.uiSwipeSettling;}
    old.hostFlag===null?old.parent.removeAttribute('data-ui-swipe-host'):old.parent.setAttribute('data-ui-swipe-host',old.hostFlag);
    restoreStyle(old.parent,old.parentStyles);
  };
  const begin=(node,offset=0,height=null)=>{
    if(!node?.isConnected||!node.parentElement||!canMove())return;
    const parent=node.parentElement,bounds=node.getBoundingClientRect(),host=parent.getBoundingClientRect(),rendered=new DOMMatrixReadOnly(getComputedStyle(node).transform).m41;
    const next={node,parent,width:bounds.width,height:height??bounds.height,left:bounds.left-host.left-rendered-parent.clientLeft+parent.scrollLeft,top:bounds.top-host.top-parent.clientTop+parent.scrollTop,
      hostFlag:parent.getAttribute('data-ui-swipe-host'),parentStyles:['position','overflow-x','overflow-y'].map(key=>[key,parent.style.getPropertyValue(key),parent.style.getPropertyPriority(key)]),styles:new Map([[node,savedStyle(node)]]),copies:new Map(),offset,painted:offset,neighbor:null,phase:'drag'};
    if(getComputedStyle(parent).position==='static')parent.style.position='relative';
    parent.style.overflow='clip';parent.setAttribute('data-ui-swipe-host','');cancelUiMotion(node);scene=next;
    node.dataset.uiSwipeSettling='true';node.style.transform=translate(offset);
    Object.assign(node.style,{height:`${next.height}px`,minHeight:'0',boxSizing:'border-box'});
  };
  const neighborFor=offset=>{
    const list=getButtons(),index=list.findIndex(selected),step=offset<0?1:-1;
    const button=list[index+step],node=button?paneFor(button):null;return node&&node!==scene?.node?node:null;
  };
  const paint=()=>{
    frame=0;if(!scene||!scene.node.isConnected){clean();return;}
    scene.painted=scene.offset;scene.node.style.transform=translate(scene.painted);
    for(const [node,copy] of scene.copies){
      copy.hidden=node!==scene.neighbor;
      if(!copy.hidden)copy.style.transform=translate(scene.painted+(scene.painted<0?scene.width:-scene.width));
    }
    if(scene.gap){scene.gap.hidden=!scene.neighbor;scene.gap.style.transform=translate(scene.painted+(scene.painted<0?scene.width:-scene.width));}
  };
  const showNeighbor=offset=>{
    if(!scene)return;
    scene.neighbor=neighborFor(offset);
    if(scene.neighbor&&!scene.copies.has(scene.neighbor))scene.copies.set(scene.neighbor,previewOf(scene.neighbor,scene));
    if(scene.neighbor&&!scene.gap){
      scene.gap=document.createElement('div');scene.gap.className='dfl-tab-grab';scene.gap.setAttribute('aria-hidden','true');
      Object.assign(scene.gap.style,{position:'absolute',left:`${scene.left}px`,top:`${scene.top}px`,width:`${scene.width}px`,height:`${scene.height}px`,zIndex:'3'});scene.parent.append(scene.gap);
    }
  };
  const settle=(step=0)=>{
    if(!scene)return;
    const current=scene,from=current.painted,node=current.node,list=getButtons(),index=list.findIndex(selected),button=list[index+step];
    if(step&&button){
      const incoming=paneFor(button);
      if(!incoming||incoming===node){clean();activate(button);return;}
      const outgoing=previewOf(node,current);current.copies.set(node,outgoing);
      outgoing.style.transform=translate(from);
      for(const [source,copy] of current.copies)if(source!==node){copy.remove();current.copies.delete(source);}
      current.styles.set(incoming,savedStyle(incoming));incoming.dataset.uiSwipeSettling='true';
      committing=true;try{activate(button);}finally{committing=false;}
      if(!incoming.isConnected||panel()!==incoming){clean();return;}
      cancelUiMotion(incoming);
      const naturalHeight=incoming.getBoundingClientRect().height;
      Object.assign(incoming.style,{minHeight:'0',boxSizing:'border-box'});
      current.node=incoming;current.phase='settle';
      const start=from+(step>0?current.width:-current.width);
      const end=step>0?-current.width:current.width;
      outgoing.style.transform=translate(end);
      animateUi(outgoing,[{transform:translate(from)},{transform:translate(end)}],{duration:280,fill:'both'});
      if(current.gap){current.gap.style.transform=translate(end);animateUi(current.gap,[{transform:translate(from)},{transform:translate(end)}],{duration:280,fill:'both'});}
      const animation=animateUi(incoming,[{transform:translate(start),height:`${current.height}px`},{transform:current.styles.get(incoming).find(([key])=>key==='transform')[1]||'none',height:`${naturalHeight}px`}],{duration:280,fill:'both'});
      const finish=()=>{if(scene===current)clean();};
      if(animation)animation.finished.then(finish,finish);else finish();
    }else{
      current.phase='return';
      // Measure the natural destination without painting an intermediate size.
      const values=current.styles.get(node);restoreStyle(node,values);
      const naturalHeight=node.getBoundingClientRect().height;
      Object.assign(node.style,{minHeight:'0',boxSizing:'border-box'});
      const animation=animateUi(node,[{transform:translate(from),height:`${current.height}px`},{transform:values.find(([key])=>key==='transform')[1]||'none',height:`${naturalHeight}px`}],{duration:220,fill:'both'});
      for(const [source,copy] of current.copies)if(source===current.neighbor){
        const sign=from<0?1:-1;copy.style.transform=translate(sign*current.width);
        animateUi(copy,[{transform:translate(from+sign*current.width)},{transform:translate(sign*current.width)}],{duration:220,fill:'both'});
        if(current.gap){current.gap.style.transform=translate(sign*current.width);animateUi(current.gap,[{transform:translate(from+sign*current.width)},{transform:translate(sign*current.width)}],{duration:220,fill:'both'});}
      }
      const finish=()=>{if(scene===current)clean();};if(animation)animation.finished.then(finish,finish);else finish();
    }
  };
  const swipe=mountHorizontalSwipe(surface,{
    accepts,exclude,
    onStart(){
      origin=0;
      if(scene){
        const node=panel(),same=node===scene.node;
        const matrix=same?new DOMMatrixReadOnly(getComputedStyle(node).transform):null;
        const height=same?node.getBoundingClientRect().height:null;
        const gap=same&&canMove()?scene.gap:null;
        origin=matrix?.m41||0;clean(gap);
        if(same&&canMove()){
          begin(node,origin,height);
          // Keep the pointerdown target connected until direction capture.
          if(scene&&gap){scene.gap=gap;Object.assign(gap.style,{left:`${scene.left}px`,top:`${scene.top}px`,width:`${scene.width}px`,height:`${scene.height}px`});}
          else gap?.remove();
          showNeighbor(origin);paint();
        }
      }
    },
    onMove({dx}){
      if(!canMove()){clean();return;}
      const node=panel();
      if(scene&&scene.node!==node)clean();
      if(!scene)begin(node,origin);
      if(!scene)return;
      const distance=origin+dx;showNeighbor(distance);
      // Groups with a shared async content slot retain their native tab path.
      scene.offset=tabGlideOffset(distance,scene.width,!!scene.neighbor);
      if(!frame)frame=requestAnimationFrame(paint);
    },
    onEnd({dx,valid}){
      if(interrupted||stopped){clean();return;}
      if(scene){
        if(!scene.node.isConnected||panel()!==scene.node){clean();return;}
        if(frame){cancelAnimationFrame(frame);frame=0;} // settle from the last painted frame
        settle(valid?tabGlideStep(scene.painted,dx,origin):0);
      }else if(valid){const list=getButtons(),index=list.findIndex(selected),button=list[index+(dx<0?1:-1)];if(button)activate(button);}
    },
  });
  const interrupt=()=>{interrupted=true;swipe.cancel();clean();interrupted=false;};
  const tabClick=event=>{const button=event.target.closest?.('button');if(!committing&&scene&&button&&(getButtons().includes(button)||button.closest('[role="tablist"],.home-position-tabs')))interrupt();};
  const tabKey=event=>{if(['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(event.key))tabClick(event);};
  surface.addEventListener('click',tabClick,true);surface.addEventListener('keydown',tabKey,true);
  reduced?.addEventListener('change',interrupt);
  if(typeof window!=='undefined'){
    window.addEventListener('dfl:ui-motion-change',interrupt);window.addEventListener('resize',interrupt);
  }
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',interrupt);
  return()=>{
    stopped=true;swipe.stop();clean();surface.removeEventListener('click',tabClick,true);surface.removeEventListener('keydown',tabKey,true);reduced?.removeEventListener('change',interrupt);
    if(typeof window!=='undefined'){window.removeEventListener('dfl:ui-motion-change',interrupt);window.removeEventListener('resize',interrupt);}
    if(typeof document!=='undefined')document.removeEventListener('visibilitychange',interrupt);
  };
}
