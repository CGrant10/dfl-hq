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
 float glyph=mask(p),near=0.,far=0.;
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a));near=max(near,mask(p+d*1.7));far=max(far,mask(p+d*4.2));}
 float edge=max(0.,near-glyph),halo=max(0.,far-glyph);
 vec3 color;float alpha;
 if(u_cold<.5){
  float t=u_time;
  float height=clamp((u_glyph.y+u_glyph.w*.8-p.y)/(u_glyph.w*1.65),0.,1.);
  float flow=fbm(vec2(p.x*.075,p.y*.07+t*1.45));
  float sway=(flow-.5)*(5.+height*15.);
  vec4 emission=texture2D(u_mask,vec2(clamp((p.x+sway)/u_size.x,0.,1.),.5));
  float top=emission.g*u_size.y;
  float rise=clamp((top-p.y)/(u_glyph.w*1.5),0.,1.);
  float fuel=emission.r*(1.-rise*.74);
  float plume=smoothstep(.24,.62,fuel+(flow-.5)*.72)*emission.r;
  plume*=1.-smoothstep(top-1.,top+7.,p.y);
  float flicker=.82+.18*noise(vec2(p.x*.09,t*1.1));
  float fire=max(edge*.86,plume*flicker)*(1.-glyph);
  float heat=clamp(fire*.9+(1.-height)*.2,0.,1.);
  color=mix(vec3(.95,.12,.015),vec3(1.,.68,.12),heat);
  color=mix(color,vec3(1.,.96,.68),pow(heat,4.)*.85);
  alpha=fire*.86+halo*.14;
  float sparks=0.;
  for(int i=0;i<12;i++){
   float id=float(i),seed=hash(vec2(id,3.));float life=fract(t*(.24+seed*.18)+seed);
   vec2 q=vec2(u_glyph.x+hash(vec2(id,8.))*u_glyph.z+sin(t*1.3+id)*life*7.,u_glyph.y+u_glyph.w*.7-life*(u_glyph.w+28.));
   vec2 delta=(p-q)*vec2(1.,.7);float r=.65+seed*.65;
   sparks+=exp(-dot(delta,delta)/(r*r*2.))*(sin(life*3.14159))*.7;
  }
  color=mix(color,vec3(1.,.72,.25),clamp(sparks,0.,1.));alpha=max(alpha,sparks)*(1.-glyph);
 }else{
  float crystal=fbm(p*.2);
  vec2 cell=p*.19;float ridge=1.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
   vec2 site=floor(cell)+vec2(float(x),float(y));vec2 delta=site+vec2(hash(site),hash(site+12.))-cell;
   ridge=min(ridge,length(delta));
  }
  float facets=smoothstep(.24,.35,ridge)*(1.-smoothstep(.4,.49,ridge));
  float ice=edge*(.55+crystal*.4)+halo*(.2+facets*.6);
  float mist=exp(-abs(p.y-u_glyph.y-u_glyph.w*.55)*.12)*exp(-abs(p.x-u_glyph.x-u_glyph.z*.5)/(u_glyph.z*.55))*.12;
  float snow=0.;
  for(int i=0;i<10;i++){
   float id=float(i),seed=hash(vec2(id,9.));float life=fract(u_time*(.15+seed*.12)+seed);
   vec2 q=vec2(u_glyph.x-10.+seed*(u_glyph.z+20.)+sin(u_time*.7+id)*4.,u_glyph.y-14.+life*(u_glyph.w+30.));
   vec2 d=p-q;float r=.65+hash(vec2(id,5.));float flake=exp(-dot(d,d)/(r*r*1.6));
   snow+=flake*sin(life*3.14159)*.65;
  }
  color=mix(vec3(.16,.55,.95),vec3(.79,.96,1.),clamp(edge+facets*.65+snow,0.,1.));
  alpha=(ice+mist+snow)*(1.-glyph);
 }
 color=mix(color,color*.75,u_light*.45);
 float fade=smoothstep(0.,7.,p.x)*smoothstep(0.,7.,u_size.x-p.x)*smoothstep(0.,6.,p.y)*smoothstep(0.,6.,u_size.y-p.y);
 gl_FragColor=vec4(color,clamp(alpha*fade,0.,.92));
}`;
