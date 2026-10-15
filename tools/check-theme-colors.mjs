import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url);
// Historical UI accents only. NFL/member identity colors and authored media
// are data, so this guard deliberately checks authored CSS rather than images.
const oldAccent=/#(?:003396|7098e6|e67582|e5011b|b8001b)\b|rgba?\(\s*(?:0\s*,\s*51\s*,\s*150|112\s*,\s*152\s*,\s*230|229\s*,\s*1\s*,\s*27)\s*[,)]/i;
const failures=[];
for(const name of readdirSync(new URL('css/',root)).filter(n=>n.endsWith('.css')&&n!=='app-shared.css')){
 const source=readFileSync(new URL('css/'+name,root),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 for(const line of source.split('\n'))if(oldAccent.test(line))failures.push(`${name}: retired UI accent ${line.match(oldAccent)[0]}`);
}
if(failures.length)throw Error(failures.join('\n'));
console.log('Theme colors: no retired crest accents in authored CSS');
