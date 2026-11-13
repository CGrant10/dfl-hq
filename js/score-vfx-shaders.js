// GPU fields stay outside the glyphs: heat, sparse embers and a frosted bevel.
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
uniform float u_medicine;
uniform float u_opacity;
uniform float u_pulse;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03+7.1)*.28+noise(p*4.01-3.7)*.15;}
float mask(vec2 p){return texture2D(u_mask,clamp(p/u_size,vec2(0.),vec2(1.))).a;}
void main(){
 vec2 p=v_uv*u_size;
 float glyph=mask(p),near=0.,far=0.,inside=1.;
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a));near=max(near,mask(p+d*.85));inside=min(inside,mask(p+d*.7));far=max(far,mask(p+d*2.6));}
 float edge=max(0.,near-glyph),halo=max(0.,far-glyph);
 float innerRim=max(0.,glyph-inside);
 vec3 color;float alpha;
 if(u_cold<.5){
  float t=u_time;
  float height=clamp((u_glyph.y+u_glyph.w*.8-p.y)/(u_glyph.w*1.65),0.,1.);
  // Two rising flow scales curl the flame and break its tips independently.
  vec2 field=vec2(p.x*.11,p.y*.095+t*.95);
  vec2 curl=vec2(fbm(field*.65+vec2(t*.18,0.)),fbm(field*.65+19.7));
  float flow=fbm(field+(curl-.5)*2.4);
  float detail=noise(field*2.15+vec2(flow*2.,t*.6));
  float sway=(flow-.5)*(3.+height*8.)+(detail-.5)*height*2.;
  vec4 emission=texture2D(u_mask,vec2(clamp((p.x+sway)/u_size.x,0.,1.),.5));
  float top=emission.g*u_size.y;
  float rise=clamp((top-p.y)/(u_glyph.w*.70),0.,1.);
  // Adjacent tongues stretch and recede at different rates within the same bounds.
  float stretch=.62+.30*noise(vec2(p.x*.16,t*.65));
  float localRise=clamp(rise/stretch,0.,1.);
  float fuel=emission.r*pow(1.-localRise,.9);
  float plume=smoothstep(.25,.76,fuel+(flow-.5)*.64+(detail-.5)*.18)*emission.r;
  plume*=1.-smoothstep(.8,1.,localRise);
  plume*=1.-smoothstep(top-1.,top+7.,p.y);
  float flicker=.86+.14*noise(vec2(p.x*.09,t*1.1));
  // Sample the actual strokes below this pixel: flame roots follow curves,
  // counters and decimal points instead of forming a backdrop behind the text.
  float reach=clamp(u_glyph.w*.24,3.,9.);
  float contour=0.;
  for(int i=1;i<=4;i++){
   float lift=float(i)*reach*.25;
   float root=mask(p+vec2(sway*lift/reach*.48,lift));
   float tongue=smoothstep(.28,.72,flow+root*.34-float(i)*.095);
   contour=max(contour,root*tongue*(1.-float(i)*.13));
  }
  float fire=max(edge*(.6+flow*.25),max(contour*.62,plume*flicker*.42))*(1.-glyph);
  // Dense fuel near the digits burns pale; thin, cooling tips remain deep orange.
  float heat=clamp(plume*.78+(1.-rise)*.22+edge*.18,0.,1.);
  color=mix(vec3(.88,.075,.008),vec3(1.,.43,.035),smoothstep(.18,.65,heat));
  color=mix(color,vec3(1.,.78,.25),smoothstep(.58,.88,heat));
  color=mix(color,vec3(1.,.97,.78),smoothstep(.86,1.,heat)*.9);
  if(u_medicine>.5){
   color=mix(vec3(.78,.06,.18),vec3(.94,.79,.30),smoothstep(.18,.85,heat));
   color=mix(color,vec3(.97,.95,.90),smoothstep(.86,1.,heat)*.9);
  }
  // Keep the DOM score ink sharp; light catches only the outer contour.
  float rimSoftening=mix(1.,1.-edge*.50,u_light);
  alpha=fire*.70*rimSoftening+halo*mix(.055,.012,u_light);
  float sparks=0.;
  for(int i=0;i<3;i++){
   float id=float(i),seed=hash(vec2(id,3.));float life=fract(t*(.24+seed*.18)+seed);
   vec2 q=vec2(u_glyph.x+hash(vec2(id,8.))*u_glyph.z+sin(t*1.3+id)*life*7.,u_glyph.y+u_glyph.w*.7-life*(u_glyph.w*.7+12.));
   vec2 delta=(p-q)*vec2(1.,.7);float r=.32+seed*.24;
   sparks+=exp(-dot(delta,delta)/(r*r*2.))*(sin(life*3.14159))*.45;
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
  float ice=edge*(.26+crystal*.17)*mix(1.,.42,u_light)
    +halo*(.025+facets*.045)*mix(1.,.16,u_light);
  float wispY=u_glyph.y+u_glyph.w*.8+sin(p.x*.08+u_time*.45)*1.8;
  float mist=exp(-pow((p.y-wispY)/4.,2.))*exp(-abs(p.x-u_glyph.x-u_glyph.z*.5)/(u_glyph.z*.5))
    *(.035+glint*.035)*mix(1.,.35,u_light);
  float snow=0.;
  for(int i=0;i<2;i++){
   float id=float(i),seed=hash(vec2(id,9.));float life=fract(u_time*(.15+seed*.12)+seed);
   vec2 q=vec2(u_glyph.x-10.+seed*(u_glyph.z+20.)+sin(u_time*.7+id)*4.,u_glyph.y-14.+life*(u_glyph.w+30.));
   vec2 d=p-q;float r=.3+hash(vec2(id,5.))*.25;float flake=exp(-dot(d,d)/(r*r*1.6));
   snow+=flake*sin(life*3.14159)*.42;
  }
  vec4 frozenColumn=texture2D(u_mask,vec2(p.x/u_size.x,.5));
  float bottom=frozenColumn.b*u_size.y;
  float spikeSeed=hash(vec2(floor(p.x/5.),31.));
  float spikeLength=1.5+spikeSeed*2.5;
  float below=max(0.,p.y-bottom);
  float spikeWidth=(1.-below/spikeLength)*.85;
  float spikeAxis=abs(fract(p.x/5.)-.5)*5.;
  float icicle=(1.-smoothstep(spikeWidth,spikeWidth+.7,spikeAxis))
    *(1.-smoothstep(spikeLength-1.,spikeLength,below))*step(bottom,p.y)*frozenColumn.r;
  float sheen=clamp(facets*.6+innerRim*.45+glint*.25+icicle*.5,0.,1.);
  color=mix(vec3(.25,.62,.9),vec3(.9,.99,1.),sheen);
  if(u_medicine>.5)color=mix(vec3(.55,.54,.49),vec3(.97,.95,.90),sheen);
  // Keep the score counters open, with smaller ice dust beyond the outline.
  alpha=ice+icicle*.36+mist+snow*mix(.6,.3,u_light);
 }
 color=mix(color,color*.75,u_light*.45);
 alpha*=1.+u_pulse*.65;
 float fade=smoothstep(0.,7.,p.x)*smoothstep(0.,7.,u_size.x-p.x)*smoothstep(0.,6.,p.y)*smoothstep(0.,6.,u_size.y-p.y);
 gl_FragColor=vec4(color,clamp(alpha*fade,0.,.82)*(1.-smoothstep(.1,.8,glyph))*u_opacity);
}`;
