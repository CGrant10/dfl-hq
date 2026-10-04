// GPU fields: glyph-shaped fire, advected turbulence, embers, and crystalline ice.
export const vertexShader=`
attribute vec2 a_position;
varying vec2 v_uv;
void main(){v_uv=vec2(a_position.x*.5+.5,.5-a_position.y*.5);gl_Position=vec4(a_position,0.,1.);}`;
export const fragmentShader=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;
uniform sampler2D u_mask;
uniform vec2 u_size;
uniform vec4 u_glyph;
uniform float u_time;
uniform float u_cold;
uniform float u_light;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03+7.1)*.28+noise(p*4.01-3.7)*.15;}
float mask(vec2 p){return texture2D(u_mask,clamp(p/u_size,vec2(0.),vec2(1.))).a;}
void main(){
 vec2 p=v_uv*u_size;
 float glyph=mask(p),near=0.,far=0.,inside=1.;
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a));near=max(near,mask(p+d*1.7));inside=min(inside,mask(p+d*1.15));far=max(far,mask(p+d*4.2));}
 float edge=max(0.,near-glyph),halo=max(0.,far-glyph);
 float innerRim=max(0.,glyph-inside);
 vec3 color;float alpha;
 if(u_cold<.5){
  float t=u_time;
  float height=clamp((u_glyph.y+u_glyph.w*.8-p.y)/(u_glyph.w*1.65),0.,1.);
  // Two rising flow scales curl the flame and break its tips independently.
  vec2 field=vec2(p.x*.11,p.y*.095+t*1.35);
  vec2 curl=vec2(fbm(field*.65+vec2(t*.18,0.)),fbm(field*.65+19.7));
  float flow=fbm(field+(curl-.5)*2.4);
  float detail=noise(field*2.15+vec2(flow*2.,t*.6));
  float sway=(flow-.5)*(3.+height*8.)+(detail-.5)*height*2.;
  vec4 emission=texture2D(u_mask,vec2(clamp((p.x+sway)/u_size.x,0.,1.),.5));
  float top=emission.g*u_size.y;
  float rise=clamp((top-p.y)/(u_glyph.w*.92),0.,1.);
  // Adjacent tongues stretch and recede at different rates within the same bounds.
  float stretch=.72+.28*noise(vec2(p.x*.16,t*.85));
  float localRise=clamp(rise/stretch,0.,1.);
  float fuel=emission.r*pow(1.-localRise,.9);
  float plume=smoothstep(.25,.76,fuel+(flow-.5)*.64+(detail-.5)*.18)*emission.r;
  plume*=1.-smoothstep(.8,1.,localRise);
  plume*=1.-smoothstep(top-1.,top+7.,p.y);
  float flicker=.86+.14*noise(vec2(p.x*.09,t*1.1));
  // Sample the actual strokes below this pixel: flame roots follow curves,
  // counters and decimal points instead of forming a backdrop behind the text.
  float reach=clamp(u_glyph.w*.32,4.,12.);
  float contour=0.;
  for(int i=1;i<=4;i++){
   float lift=float(i)*reach*.25;
   float root=mask(p+vec2(sway*lift/reach*.48,lift));
   float tongue=smoothstep(.28,.72,flow+root*.34-float(i)*.095);
   contour=max(contour,root*tongue*(1.-float(i)*.13));
  }
  float fire=max(edge*(.6+flow*.25),max(contour*.88,plume*flicker*.62))*(1.-glyph);
  // Dense fuel near the digits burns pale; thin, cooling tips remain deep orange.
  float heat=clamp(plume*.78+(1.-rise)*.22+edge*.18,0.,1.);
  color=mix(vec3(.88,.075,.008),vec3(1.,.43,.035),smoothstep(.18,.65,heat));
  color=mix(color,vec3(1.,.78,.25),smoothstep(.58,.88,heat));
  color=mix(color,vec3(1.,.97,.78),smoothstep(.86,1.,heat)*.9);
  // A low-opacity heat glaze and bright, animated inner rim fuse the fire
  // with the digits. The DOM text stays intact beneath the GPU surface.
  float shimmer=smoothstep(.3,.76,fbm(p*.14+vec2(-t*.2,t*.75)));
  float surface=glyph*(.065+shimmer*.065)+innerRim*(.24+shimmer*.16);
  surface*=mix(1.,.3,u_light);
  vec3 ember=mix(vec3(1.,.38,.04),vec3(1.,.91,.58),shimmer*.65+innerRim*.35);
  color=mix(color,ember,glyph);
  // On white surfaces, retain the hot stroke but soften the detached rim.
  float rimSoftening=mix(1.,1.-edge*.62,u_light);
  alpha=fire*.74*rimSoftening+halo*mix(.07,.015,u_light)+surface;
  float sparks=0.;
  for(int i=0;i<8;i++){
   float id=float(i),seed=hash(vec2(id,3.));float life=fract(t*(.24+seed*.18)+seed);
   vec2 q=vec2(u_glyph.x+hash(vec2(id,8.))*u_glyph.z+sin(t*1.3+id)*life*7.,u_glyph.y+u_glyph.w*.7-life*(u_glyph.w*.7+12.));
   vec2 delta=(p-q)*vec2(1.,.7);float r=.45+seed*.4;
   sparks+=exp(-dot(delta,delta)/(r*r*2.))*(sin(life*3.14159))*.7;
  }
  color=mix(color,vec3(1.,.72,.25),clamp(sparks,0.,1.));alpha=max(alpha,sparks*(1.-glyph));
 }else{
  float crystal=fbm(p*.2);
  vec2 cell=p*.19;float ridge=1.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
   vec2 site=floor(cell)+vec2(float(x),float(y));vec2 delta=site+vec2(hash(site),hash(site+12.))-cell;
   ridge=min(ridge,length(delta));
  }
  float facets=smoothstep(.24,.35,ridge)*(1.-smoothstep(.4,.49,ridge));
  // Frost lives on the stroke: stable facets with a slow, moving light catch.
  float glint=smoothstep(.48,.82,fbm(p*.075+vec2(u_time*.12,-u_time*.17)));
  float grain=smoothstep(.35,.76,crystal);
  float surface=glyph*(.045+grain*.065+facets*.06)+innerRim*(.16+glint*.16);
  surface*=mix(1.,.26,u_light);
  float ice=edge*(.3+crystal*.2)*mix(1.,.42,u_light)
    +halo*(.03+facets*.1)*mix(1.,.16,u_light);
  float mist=exp(-abs(p.y-u_glyph.y-u_glyph.w*.55)*.12)*exp(-abs(p.x-u_glyph.x-u_glyph.z*.5)/(u_glyph.z*.55))*.045*mix(1.,.35,u_light);
  float snow=0.;
  for(int i=0;i<6;i++){
   float id=float(i),seed=hash(vec2(id,9.));float life=fract(u_time*(.15+seed*.12)+seed);
   vec2 q=vec2(u_glyph.x-10.+seed*(u_glyph.z+20.)+sin(u_time*.7+id)*4.,u_glyph.y-14.+life*(u_glyph.w+30.));
   vec2 d=p-q;float r=.45+hash(vec2(id,5.))*.45;float flake=exp(-dot(d,d)/(r*r*1.6));
   snow+=flake*sin(life*3.14159)*.42;
  }
  color=mix(vec3(.12,.46,.78),vec3(.82,.96,1.),clamp(facets*.5+innerRim*.45+glint*.25,0.,1.));
  // Keep the score counters open, with smaller ice dust beyond the outline.
  alpha=(ice+mist+snow*mix(1.,.5,u_light))*(1.-glyph)+surface;
 }
 color=mix(color,color*.75,u_light*.45);
 float fade=smoothstep(0.,7.,p.x)*smoothstep(0.,7.,u_size.x-p.x)*smoothstep(0.,6.,p.y)*smoothstep(0.,6.,u_size.y-p.y);
 gl_FragColor=vec4(color,clamp(alpha*fade,0.,.92));
}`;
