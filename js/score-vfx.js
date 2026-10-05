import {vertexShader,fragmentShader} from './score-vfx-shaders.js';

// One GPU surface per card/dialog, shared across visible score emitters.
// No timers, layout reads, or texture uploads in the animation loop.
export function mountScoreVfx(root){
 const canvas=document.createElement('canvas');canvas.className='gd-vfx-canvas';canvas.setAttribute('aria-hidden','true');root.append(canvas);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let gl=null,program=null,buffer=null,locations={},targets=[],visible=new Set(),raf=0,layoutFrame=0,lastFrame=0,stopped=false,lost=false,dirty=true,rootVisible=false;
 const enabled=()=>!stopped&&!lost&&rootVisible&&!reduced.matches&&root.dataset.motion!=='off'&&document.visibilityState==='visible'&&(!root.matches('dialog')||root.open);
 const clear=()=>{if(gl&&!lost)gl.clear(gl.COLOR_BUFFER_BIT)};
 const pause=()=>{cancelAnimationFrame(raf);raf=0;lastFrame=0;clear();canvas.dataset.running='false'};
 const release=()=>{if(gl&&!lost){for(const target of targets)gl.deleteTexture(target.texture)}targets=[]};
 const init=()=>{
  try{
   gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power',preserveDrawingBuffer:false});if(!gl){canvas.dataset.renderer='unavailable';return false;}
   const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('Score VFX shader failed')}return shader};
   const vertex=compile(gl.VERTEX_SHADER,vertexShader),fragment=compile(gl.FRAGMENT_SHADER,fragmentShader);
   program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Score VFX program failed');
   gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const position=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
   for(const name of ['mask','size','glyph','time','cold','light'])locations[name]=gl.getUniformLocation(program,`u_${name}`);
   gl.uniform1i(locations.mask,0);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
   canvas.dataset.renderer='webgl';return true;
  }catch{canvas.dataset.renderer='unavailable';return false}
 };
 const render=time=>{
  raf=0;if(!enabled()){pause();return}
  if(time-lastFrame>=1000/30-1){
   lastFrame=time-((time-lastFrame)%(1000/30));gl.disable(gl.SCISSOR_TEST);clear();gl.enable(gl.SCISSOR_TEST);
   gl.uniform1f(locations.time,(time%120000)/1000);
   for(const target of targets){
    if(!visible.has(target.element))continue;
    const {x,y,width,height,scale,glyph,texture,cold,light}=target;
    gl.viewport(x,y,width,height);gl.scissor(x,y,width,height);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.uniform2f(locations.size,width/scale,height/scale);gl.uniform4f(locations.glyph,...glyph);gl.uniform1f(locations.cold,cold?1:0);gl.uniform1f(locations.light,light?1:0);gl.drawArrays(gl.TRIANGLES,0,6);
   }
   gl.disable(gl.SCISSOR_TEST);if(canvas.dataset.running!=='true')canvas.dataset.running='true';
  }
  raf=requestAnimationFrame(render);
 };
 const resume=()=>{if(enabled()&&targets.some(t=>visible.has(t.element))){if(!raf)raf=requestAnimationFrame(render)}else pause()};
 const intersection=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting)visible.add(e.target);else visible.delete(e.target)}resume()});
 const rebuild=()=>{
  layoutFrame=0;if(stopped)return;dirty=true;pause();if(!enabled())return;
  const emitters=[...root.querySelectorAll('[data-score-temperature="hot"], [data-score-temperature="cold"]')].filter(element=>element.closest('dialog')===(root.matches('dialog')?root:null));
  if(!emitters.length){release();intersection.disconnect();visible.clear();dirty=false;return}
  if(!gl&&!init())return;
  release();intersection.disconnect();visible.clear();
  const box=root.getBoundingClientRect();if(box.width<=0||box.height<=0)return;
  // Match phone density while bounding the shared surface for long scoreboards.
  const pixelBudgetScale=Math.sqrt(6000000/Math.max(1,root.clientWidth*root.clientHeight));
  const scale=Math.min(devicePixelRatio||1,3,pixelBudgetScale,Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))/Math.max(box.width,box.height));
  canvas.width=Math.ceil(root.clientWidth*scale);canvas.height=Math.ceil(root.clientHeight*scale);
  // Keep the GPU surface inside the padding box, including scrollable dialogs.
  canvas.style.width=`${root.clientWidth}px`;canvas.style.height=`${root.clientHeight}px`;canvas.style.left=`${root.scrollLeft}px`;canvas.style.top=`${root.scrollTop}px`;
  const light=getComputedStyle(root).getPropertyValue('--gd-hot-ink').trim()==='#9c3900';
  const pinnedBottom=root.querySelector('.gd-watch-dashboard')?.getBoundingClientRect().bottom;
  for(const element of emitters){
   // A nested player dialog has its own GPU surface.
   if(element.closest('dialog')!==(root.matches('dialog')?root:null))continue;
   const value=element.querySelector('.gd-thermal-value'),rect=value?.getBoundingClientRect();if(!rect||!rect.width||!rect.height||!element.getClientRects().length)continue;
   if(pinnedBottom&&!element.closest('.gd-watch-dashboard')&&rect.top<pinnedBottom)continue;
   if(root.matches('dialog')&&(rect.bottom<box.top-30||rect.top>box.bottom+30))continue;
   const style=getComputedStyle(value),padX=10,padTop=element.closest('.gameday-player-score')?14:Math.min(26,rect.height),padBottom=10,width=Math.ceil(rect.width+padX*2),height=Math.ceil(rect.height+padTop+padBottom);
   const mask=document.createElement('canvas');mask.width=Math.ceil(width*scale);mask.height=Math.ceil(height*scale);const context=mask.getContext('2d');if(!context)continue;
   context.scale(scale,scale);context.font=style.font||`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;context.fillStyle='#fff';context.textBaseline='alphabetic';
   if('letterSpacing' in context)context.letterSpacing=style.letterSpacing;
   const text=value.textContent,metrics=context.measureText(text),baseline=padTop+(rect.height+metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2;context.fillText(text,padX,baseline);
   const strokeWidth=parseFloat(style.webkitTextStrokeWidth)||0;if(strokeWidth){context.lineWidth=strokeWidth;context.strokeStyle='#fff';context.strokeText(text,padX,baseline)}
   // Pack emission, top and bottom contours into RGB; alpha keeps
   // the exact score silhouette. Typed pixels preserve RGB in transparent areas.
   const pixels=context.getImageData(0,0,mask.width,mask.height).data,columns=[];
   for(let x=0;x<mask.width;x++){
    let intensity=0,top=padTop*scale,bottom=padTop*scale;
    for(let y=0;y<mask.height;y++){const alpha=pixels[(y*mask.width+x)*4+3];if(alpha>32){if(intensity===0)top=y;bottom=y}intensity=Math.max(intensity,alpha/255)}
    columns.push({intensity,top,bottom});
   }
   for(let x=0;x<mask.width;x++){
    let intensity=0,top=0,bottom=0,weight=0;
    for(let offset=-2;offset<=2;offset++){const column=columns[Math.max(0,Math.min(mask.width-1,x+offset))],w=3-Math.abs(offset);intensity+=column.intensity*w;top+=column.top*column.intensity*w;bottom+=column.bottom*column.intensity*w;weight+=column.intensity*w}
    intensity/=9;top=weight?top/weight:padTop*scale;bottom=weight?bottom/weight:padTop*scale;
    for(let y=0;y<mask.height;y++){const index=(y*mask.width+x)*4;pixels[index]=Math.round(intensity*255);pixels[index+1]=Math.round(top/mask.height*255);pixels[index+2]=Math.round(bottom/mask.height*255)}
   }
   const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,mask.width,mask.height,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   targets.push({element,texture,x:Math.round((rect.left-box.left-root.clientLeft-padX)*scale),y:canvas.height-Math.round((rect.top-box.top-root.clientTop+rect.height+padBottom)*scale),width:mask.width,height:mask.height,scale,glyph:[padX,padTop,rect.width,rect.height],cold:element.dataset.scoreTemperature==='cold',light});
   intersection.observe(element);
  }
  dirty=false;resume();
 };
 const schedule=()=>{if(!layoutFrame&&!stopped)layoutFrame=requestAnimationFrame(rebuild)};
 const sync=()=>{if(!enabled())pause();else if(dirty)schedule();else resume()};
 const rootIntersection=new IntersectionObserver(entries=>{rootVisible=entries.some(e=>e.isIntersecting);sync()});rootIntersection.observe(root);
 const mutations=new MutationObserver(records=>{if(records.some(r=>r.target!==canvas&&!canvas.contains(r.target))){dirty=true;schedule()}});mutations.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-motion','data-score-temperature','open','class']});
 const resize=new ResizeObserver(schedule);resize.observe(root);
 const theme=new MutationObserver(schedule);theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-mode','data-palette','class','style']});
 const contextLost=event=>{event.preventDefault();lost=true;pause();targets=[];gl=null;dirty=true;canvas.dataset.renderer='lost'};
 const contextRestored=()=>{lost=false;gl=null;schedule()};
 canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
 const motionChange=()=>{dirty=true;sync()};
 document.addEventListener('visibilitychange',sync);root.addEventListener('close',sync);root.addEventListener('toggle',schedule);root.addEventListener('scroll',schedule,{passive:true});reduced.addEventListener('change',motionChange);
 schedule();document.fonts?.ready.then(()=>{if(!stopped)schedule()});
 return{refresh:schedule,stop(){stopped=true;pause();cancelAnimationFrame(layoutFrame);mutations.disconnect();resize.disconnect();theme.disconnect();intersection.disconnect();rootIntersection.disconnect();document.removeEventListener('visibilitychange',sync);root.removeEventListener('close',sync);root.removeEventListener('toggle',schedule);root.removeEventListener('scroll',schedule);reduced.removeEventListener('change',motionChange);release();canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);if(gl&&!lost){gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext()}canvas.remove()}};
}
