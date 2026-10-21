import {normalizeKit,SKIN_TONES,HELMETS} from './racer-kit-model.js';

// Appearance is stable per member, independent of lane, seed and race result.
const hash=value=>{let h=2166136261;for(const c of String(value)){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;};
const colors=['#cf263b','#c8a147','#ece5d9','#36465c','#a73549','#d3b16e','#ae3b23','#4e6484','#d06238','#c16a91','#8a7c5d','#677781'];
const builds=[{name:'Speedster',shoulders:18,waist:10,limb:6,helmet:17,stride:1.12,tempo:1.13,bounce:1.5,lean:.11},
 {name:'Powerhouse',shoulders:25,waist:15,limb:8.5,helmet:19,stride:.84,tempo:.86,bounce:.55,lean:.04},
 {name:'Playmaker',shoulders:21,waist:12,limb:7,helmet:18,stride:1,tempo:1,bounce:1,lean:.07},
 {name:'Showboat',shoulders:20,waist:11,limb:6.5,helmet:18,stride:1.04,tempo:1.04,bounce:2,lean:.02}];
export function racerCharacter(identity,kit={}){
 const h=hash(identity??kit.number??0),build=builds[h%builds.length];
 return {...build,index:h%builds.length,accessory:(h>>>6)%4,pattern:(h>>>10)%3,phase:(h>>>16)%24/24};
}
export function defaultRacerKit(identity,{number=0,jersey=null}={}){
 const h=hash(identity),light=['#eae2cf','#dbc180','#869397'];
 jersey=/^#[0-9a-f]{6}$/i.test(jersey||'')?jersey:colors[h%colors.length];
 return normalizeKit({number,jersey,skin:SKIN_TONES[(h>>>4)%SKIN_TONES.length][1],helmet:(h>>>8)%2?jersey:'#202735',helmetStyle:HELMETS[(h>>>12)%HELMETS.length][0],pants:(h>>>7)%2?light[(h>>>10)%3]:'#202735',trim:light[(h>>>15)%3]});
}
export function characterPose(character,cycle=0,moving=true){
 const a=(moving?cycle:0)*Math.PI*2,s=Math.sin(a),c=Math.cos(a),stride=character.stride;
 return {frontHip:s*.78*stride,backHip:-s*.78*stride,frontKnee:.25+Math.max(0,-c)*1.3,backKnee:.25+Math.max(0,c)*1.3,
  frontArm:-s*(character.index===3?.95:.7),backArm:s*(character.index===1?.5:.7),bob:moving?Math.abs(c)*character.bounce:0,lean:moving?character.lean:0,
  towel:moving?Math.sin(a+.8)*6:0};
}
