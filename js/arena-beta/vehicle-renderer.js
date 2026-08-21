// DFL Arena Beta production-style 2D vehicle renderer.
// Isolated from the live Arena renderer by design.

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

export const BETA_VEHICLES=[
  {id:"kart",label:"Arcade Kart",wheelbase:[132,402],body:"kart",flag:[244,82],accessory:[286,92]},
  {id:"stock",label:"Mini Stock",wheelbase:[126,404],body:"stock",flag:[232,72],accessory:[292,84]},
  {id:"golf",label:"Golf Cart",wheelbase:[138,398],body:"golf",flag:[226,60],accessory:[270,74]},
  {id:"pickup",label:"Tiny Pickup",wheelbase:[124,410],body:"pickup",flag:[220,68],accessory:[286,78]},
  {id:"open",label:"Open Wheel",wheelbase:[112,420],body:"open",flag:[224,84],accessory:[278,88]},
  {id:"beater",label:"Box Beater",wheelbase:[124,410],body:"beater",flag:[222,70],accessory:[286,80]},
];

const PAINT={
  "DFL Red":["#f13b2f","#9e1713","#5b0a08"],
  "Burnt Orange":["#ff8f2d","#b84a0d","#652208"],
  "Track Yellow":["#ffd43b","#c58908","#694700"],
  "Pit Green":["#4bbf5f","#17772a","#0b4518"],
  Teal:["#35c9c3","#147a7b","#0d4548"],
  "Royal Blue":["#4a7dff","#2347a7","#10245b"],
  Black:["#444851","#20232a","#090a0d"],
  White:["#f4f2ec","#b9bcc4","#686b72"],
  "Championship Gold":["#ffd75a","#c78b14","#6d4305"],
};

function wheelSvg(cx,cy,type="Slicks",gold=false){
  const chunky=/Chunky|Offroad/.test(type), white=/Whitewalls/.test(type), small=/Smalliez/.test(type);
  const r=small?28:chunky?39:36;
  const tread=chunky?`<circle cx="${cx}" cy="${cy}" r="${r+3}" fill="none" stroke="#050608" stroke-width="9" stroke-dasharray="7 5"/>`:"";
  const rim=gold||/Gold/.test(type)?"#d6a52a":"#7f858e";
  return `<g>${tread}<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0a0b0d" stroke="#181a1f" stroke-width="7"/>${white?`<circle cx="${cx}" cy="${cy}" r="${r-8}" fill="none" stroke="#e7e3d8" stroke-width="7"/>`:""}<circle cx="${cx}" cy="${cy}" r="${r-13}" fill="#252a31" stroke="${rim}" stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="8" fill="#090a0d" stroke="${rim}" stroke-width="4"/><path d="M${cx-18} ${cy}h36M${cx} ${cy-18}v36M${cx-13} ${cy-13}l26 26M${cx+13} ${cy-13}l-26 26" stroke="${rim}" stroke-width="3" opacity=".9"/></g>`;
}

function bodyPath(kind){
  if(kind==="stock")return "M82 214 C102 180 145 160 202 154 L338 151 C388 152 426 173 458 213 L470 248 L77 248 Z";
  if(kind==="golf")return "M98 224 L122 188 L166 183 L191 124 L337 124 L370 184 L441 193 L462 225 L454 248 L88 248 Z";
  if(kind==="pickup")return "M76 221 L104 181 L184 170 L221 125 L330 125 L355 171 L432 181 L468 220 L459 248 L73 248 Z";
  if(kind==="open")return "M62 226 L104 209 L181 198 L244 169 L323 180 L383 206 L469 219 L459 248 L64 248 Z";
  if(kind==="beater")return "M78 218 L103 178 L170 165 L206 124 L335 124 L373 167 L438 181 L470 217 L459 248 L74 248 Z";
  return "M68 226 L104 197 L169 192 L216 155 L327 158 L374 190 L445 205 L470 226 L459 248 L68 248 Z";
}

function cabin(kind){
  if(kind==="open"||kind==="kart")return `<path d="M210 188 Q236 119 286 126 Q321 132 333 181" fill="#181b21" stroke="#060708" stroke-width="7"/><path d="M233 168 Q246 133 279 136 Q303 138 313 168" fill="#11151a" stroke="#4f5965" stroke-width="4"/>`;
  if(kind==="golf")return `<path d="M178 186 L196 106 H352 L373 187" fill="none" stroke="#171a20" stroke-width="11"/><path d="M188 111 H360" stroke="#20242a" stroke-width="11"/><path d="M214 127h107v48H202z" fill="#111820" stroke="#5c6570" stroke-width="4"/>`;
  return `<path d="M175 166 L207 111 H337 L372 166 Z" fill="#111820" stroke="#07080a" stroke-width="7"/><path d="M220 124h96l29 39H196z" fill="#1e2d3a" stroke="#627182" stroke-width="4" opacity=".95"/>`;
}

function driver(){return `<g transform="translate(257 126)"><path d="M-28 58 Q-22 15 0 4 Q28 13 34 58" fill="#16191f" stroke="#07080a" stroke-width="6"/><circle cx="4" cy="5" r="31" fill="#15181d" stroke="#050607" stroke-width="6"/><path d="M-16 -2 Q5 -18 26 -2 L20 14 H-18Z" fill="#242a31"/><path d="M-12 0 Q4 -8 21 0 L16 11 H-10Z" fill="#07090c" stroke="#727984" stroke-width="3"/><path d="M-3 35 q22 9 34 30" fill="none" stroke="#e2372b" stroke-width="12" stroke-linecap="round"/></g>`}

function antenna(x,y,flag="DFL"){
  return `<g><path d="M${x} ${y} Q${x-10} ${y-80} ${x-4} ${y-158}" fill="none" stroke="#c9ccd1" stroke-width="4"/><circle cx="${x-4}" cy="${y-158}" r="5" fill="#0b0c0e" stroke="#ddd" stroke-width="2"/><g transform="translate(${x-2} ${y-151}) skewY(4)"><path d="M0 0 Q42 -8 88 4 L84 54 Q42 43 0 50Z" fill="#efe9dc" stroke="#17191d" stroke-width="4"/><text x="43" y="32" text-anchor="middle" font-size="17" font-weight="900" font-family="Arial,sans-serif" fill="#111">${esc(flag||"DFL")}</text></g></g>`;
}

function accessory(name,x,y){
  if(name==="Commissioner Beacon")return `<g transform="translate(${x} ${y})"><rect x="-16" y="-8" width="32" height="9" rx="3" fill="#17191d"/><path d="M-12 -8 Q-10 -34 0 -36 Q10 -34 12 -8Z" fill="#ef2929" stroke="#7b0909" stroke-width="4"/><ellipse cx="0" cy="-20" rx="17" ry="24" fill="#ff3333" opacity=".18"/></g>`;
  if(name==="Championship Trophy")return `<g transform="translate(${x} ${y})" fill="#d5a72b" stroke="#6c4a05" stroke-width="3"><path d="M-10 -34h20v17q0 14-10 18q-10-4-10-18z"/><path d="M-10 -29h-12q0 17 14 18M10 -29h12q0 17-14 18" fill="none"/><path d="M0 1v12M-13 16h26"/></g>`;
  if(name==="Crown")return `<path d="M${x-20} ${y-18}l8-22l14 16l14-18l12 24z" fill="#e0ae25" stroke="#6b4804" stroke-width="3"/>`;
  if(name==="Garbage Exhaust")return `<g transform="translate(${x+58} ${y+88})"><path d="M0 0l35 10" stroke="#444a51" stroke-width="13" stroke-linecap="round"/><path d="M34 10q22-21 37 4q-23 3-13 25q-26-1-24-29z" fill="#78906d" opacity=".8"/></g>`;
  if(name==="Beer Cooler")return `<g transform="translate(${x+12} ${y+20})"><rect x="-21" y="-13" width="42" height="29" rx="5" fill="#2b83b9" stroke="#0b3148" stroke-width="4"/><rect x="-23" y="-17" width="46" height="8" rx="4" fill="#eee"/><rect x="-8" y="-32" width="8" height="17" fill="#cf3c2c"/><rect x="5" y="-31" width="8" height="16" fill="#d5dbe2"/></g>`;
  if(name==="Dice")return `<g transform="translate(${x} ${y-15})"><rect x="-16" y="-16" width="32" height="32" rx="7" fill="#f0eee8" stroke="#17191d" stroke-width="4"/><circle cx="-7" cy="-7" r="3"/><circle cx="7" cy="7" r="3"/><circle cx="0" cy="0" r="3"/></g>`;
  return "";
}

export function renderBetaVehicle({vehicle="kart",wheels="Slicks",paint="DFL Red",accessory:accessoryName="None",flag="DFL",number=12}={}){
  const spec=BETA_VEHICLES.find(v=>v.id===vehicle)||BETA_VEHICLES[0];
  const colors=PAINT[paint]||PAINT["DFL Red"];
  const gold=paint==="Championship Gold"||wheels==="Gold Rims";
  const [rear,front]=spec.wheelbase;
  const grad=`betaPaint-${spec.id}-${Math.random().toString(36).slice(2,8)}`;
  const shine=`betaShine-${Math.random().toString(36).slice(2,8)}`;
  return `<svg class="ab-vehicle-svg" viewBox="0 0 540 330" role="img" aria-label="${esc(spec.label)} preview" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${grad}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colors[0]}"/><stop offset=".55" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient><linearGradient id="${shine}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".32" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#000" stop-opacity=".24"/></linearGradient></defs>
    <ellipse cx="272" cy="275" rx="215" ry="23" fill="#000" opacity=".42"/>
    ${antenna(spec.flag[0],spec.flag[1]+145,flag)}
    ${cabin(spec.body)}${driver()}
    <path d="${bodyPath(spec.body)}" fill="url(#${grad})" stroke="#07080a" stroke-width="8" stroke-linejoin="round"/>
    <path d="${bodyPath(spec.body)}" fill="url(#${shine})" opacity=".7"/>
    <path d="M92 218 Q184 194 256 196 T447 215" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="5"/>
    <path d="M95 238 H454" stroke="#08090b" stroke-width="9" opacity=".8"/>
    <g transform="translate(302 213) skewX(-8)"><text x="0" y="0" text-anchor="middle" font-size="32" font-style="italic" font-weight="900" font-family="Arial,sans-serif" fill="#f5f2e9" stroke="#111" stroke-width="2" paint-order="stroke">DFL</text></g>
    <text x="188" y="230" text-anchor="middle" font-size="46" font-weight="900" font-family="Arial,sans-serif" fill="#f6f2e8" stroke="#101114" stroke-width="4" paint-order="stroke">${clamp(Number(number)||12,0,99)}</text>
    ${accessory(accessoryName,spec.accessory[0],spec.accessory[1]+115)}
    ${wheelSvg(rear,247,wheels,gold)}${wheelSvg(front,247,wheels,gold)}
  </svg>`;
}
