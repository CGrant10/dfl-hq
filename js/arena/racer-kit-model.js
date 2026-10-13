export const SKIN_TONES=[['Porcelain','#f2d1b6'],['Light','#dfb08a'],['Tan','#bd855c'],['Brown','#925d3e'],['Deep brown','#67412e'],['Dark','#422c24']];
export const HELMETS=[['classic','Classic'],['speed','Speed'],['visor','Visor']];
export const DEFAULT_KIT=Object.freeze({version:1,skin:'#bd855c',helmet:'#28303b',helmetStyle:'classic',jersey:'#bb2038',pants:'#262b33',trim:'#eae2cf',number:0,preset:'dfl'});
const NFL=[['ARI','Cardinals','#97233f','#ffb612'],['ATL','Falcons','#a71930','#a5acaf'],['BAL','Ravens','#241773','#9e7c0c'],['BUF','Bills','#00338d','#c60c30'],['CAR','Panthers','#0085ca','#101820'],['CHI','Bears','#0b162a','#c83803'],['CIN','Bengals','#fb4f14','#101820'],['CLE','Browns','#ff3c00','#311d00'],['DAL','Cowboys','#041e42','#869397'],['DEN','Broncos','#fb4f14','#002244'],['DET','Lions','#0076b6','#b0b7bc'],['GB','Packers','#203731','#ffb612'],['HOU','Texans','#03202f','#a71930'],['IND','Colts','#002c5f','#a2aaad'],['JAX','Jaguars','#006778','#d7a22a'],['KC','Chiefs','#e31837','#ffb81c'],['LV','Raiders','#101820','#a5acaf'],['LAC','Chargers','#0080c6','#ffc20e'],['LAR','Rams','#003594','#ffa300'],['MIA','Dolphins','#008e97','#fc4c02'],['MIN','Vikings','#4f2683','#ffc62f'],['NE','Patriots','#002244','#c60c30'],['NO','Saints','#101820','#d3bc8d'],['NYG','Giants','#0b2265','#a71930'],['NYJ','Jets','#125740','#ffffff'],['PHI','Eagles','#004c54','#a5acaf'],['PIT','Steelers','#101820','#ffb612'],['SF','49ers','#aa0000','#b3995d'],['SEA','Seahawks','#002244','#69be28'],['TB','Buccaneers','#d50a0a','#b1babf'],['TEN','Titans','#4b92db','#0c2340'],['WAS','Commanders','#5a1414','#ffb612']];
const FAN=[
 ['pokemon:pikachu','Pikachu','Pokémon','#f5ca28','#322722','#ed493b','bolt'],['pokemon:charizard','Charizard','Pokémon','#dc6229','#226d79','#f2d68b','flame'],['pokemon:gengar','Gengar','Pokémon','#593782','#252032','#d65973','ghost'],['pokemon:lucario','Lucario','Pokémon','#2882b4','#192b3e','#e6d7aa','star'],['pokemon:blastoise','Blastoise','Pokémon','#2f77a4','#4e5148','#c5b98b','wave'],['pokemon:rayquaza','Rayquaza','Pokémon','#278861','#252b33','#e8c64e','dragon'],['pokemon:greninja','Greninja','Pokémon','#263c80','#242936','#d8758b','blade'],['pokemon:mewtwo','Mewtwo','Pokémon','#b9afcb','#5c4081','#8e66b4','star'],
 ['anime:naruto','Naruto','Anime','#e86b24','#242b33','#b63d3e','spiral'],['anime:goku','Goku','Anime','#e97524','#214a9a','#f0c949','star'],['anime:vegeta','Vegeta','Anime','#244b9d','#eee6cf','#d9b967','star'],['anime:luffy','Luffy','Anime','#c53736','#346896','#e5c575','wave'],['anime:zoro','Zoro','Anime','#368769','#202b27','#ad343c','blade'],['anime:ichigo','Ichigo','Anime','#20242e','#141821','#e97937','blade'],['anime:tanjiro','Tanjiro','Anime','#287b68','#1c2529','#973e46','check'],['anime:gojo','Gojo','Anime','#393550','#171a27','#8bccdc','star']
];
const NFL_HELMETS={ARI:'#ffffff',BUF:'#ffffff',CAR:'#a5acaf',DAL:'#869397',DEN:'#002244',DET:'#b0b7bc',GB:'#ffb612',IND:'#ffffff',LV:'#a5acaf',LAC:'#ffffff',MIA:'#ffffff',NE:'#a5acaf',NO:'#d3bc8d',SF:'#b3995d',TB:'#8a8c7e',TEN:'#0c2340'};
export const KIT_PRESETS=[{id:'dfl',name:'DFL Original',group:'DFL',...DEFAULT_KIT},...NFL.map(([code,name,primary,secondary])=>({id:`nfl:${code}`,name,group:'NFL',jersey:primary,helmet:NFL_HELMETS[code]||primary,pants:['GB','PIT','NO','SF','DAL','DET','LV','CAR'].includes(code)?secondary:'#eae7df',trim:secondary,helmetStyle:'speed',symbol:'team'})),...FAN.map(([id,name,group,jersey,pants,trim,symbol])=>({id,name,group,jersey,pants,trim,helmet:jersey,helmetStyle:'visor',symbol}))];
const color=value=>/^#[0-9a-f]{6}$/i.test(String(value||''));
export function normalizeKit(value,{number=0}={}){
 const v=value&&typeof value==='object'?value:{};const kit={...DEFAULT_KIT,number};
 for(const key of ['skin','helmet','jersey','pants','trim'])if(color(v[key]))kit[key]=v[key].toLowerCase();
 if(HELMETS.some(([id])=>id===v.helmetStyle))kit.helmetStyle=v.helmetStyle;
 if(Number.isInteger(v.number)&&v.number>=0&&v.number<=99)kit.number=v.number;
 if(KIT_PRESETS.some(p=>p.id===v.preset)||v.preset==='custom')kit.preset=v.preset;
 return kit;
}
export function applyKitPreset(kit,id){const preset=KIT_PRESETS.find(p=>p.id===id);if(!preset)return normalizeKit(kit);return normalizeKit({...kit,...preset,skin:kit.skin,number:kit.number,preset:id});}
export const kitSymbol=kit=>KIT_PRESETS.find(p=>p.id===kit.preset)?.symbol||'dfl';
export const kitKey=kit=>JSON.stringify(normalizeKit(kit));
export function kitInk(background,preferred=null){
 const luminance=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 const bg=luminance(background),contrast=hex=>{const l=luminance(hex);return (Math.max(bg,l)+.05)/(Math.min(bg,l)+.05);};
 if(preferred&&contrast(preferred)>=3.5)return preferred;return contrast('#f5f0e7')>contrast('#0b1019')?'#f5f0e7':'#0b1019';
}
export function footballYardNumber(index){return index>=1&&index<=9?String(Math.min(index,10-index)*10):'';}
export function footballSpot(progress){const yards=Math.max(0,Math.min(100,Math.round(progress*100)));return yards>=100?'TOUCHDOWN':yards===50?'THE 50':`${yards<50?'OWN':'OPP'} ${yards<50?yards:100-yards}`;}
export function finishMargin(results){if(results.length<2)return null;const sorted=[...results].sort((a,b)=>a.place-b.place),ms=Number(sorted[1].finish_ms)-Number(sorted[0].finish_ms);return Number.isFinite(ms)&&ms>=0?ms:null;}
