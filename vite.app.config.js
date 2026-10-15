import {defineConfig} from 'vite';
import {readFileSync} from 'node:fs';
import {dirname,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const version=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version;
const router=readFileSync(resolve(root,'js/router.js'),'utf8');
const pages=[...new Set([...router.matchAll(/import\("\.\/pages\/([^"?]+)\.js"\)/g)].map(m=>m[1]))];
const input={app:resolve(root,'js/app.js'),collapse:resolve(root,'js/collapse.js'),...Object.fromEntries(pages.map(name=>['pages/'+name,resolve(root,'js/pages/'+name+'.js')]))};
function staticGraph(entry,seen=new Set()){
 const id=resolve(root,entry);if(seen.has(id))return seen;seen.add(id);
 const source=readFileSync(id,'utf8');
 for(const [,ref] of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g))if(ref.startsWith('.'))staticGraph(relative(root,resolve(dirname(id),ref.split('?')[0])),seen);
 return seen;
}
const core=staticGraph('js/app.js');core.delete(resolve(root,'js/app.js'));
const home=staticGraph('js/pages/home.js');home.delete(resolve(root,'js/pages/home.js'));
export default defineConfig({
 publicDir:false,
 plugins:[{
  name:'dfl-existing-assets',enforce:'pre',
  transform(code,id){
   if(!id.startsWith(resolve(root,'js')+'/')||!id.endsWith('.js'))return;
   // Keep existing asset/worker URLs and cache identities after module relocation.
   return code.replace(/new URL\(\s*(['"])([^'"\n]+)\1\s*,\s*import\.meta\.url\s*\)/g,(_m,_q,path)=>`new URL(${JSON.stringify(relative(root,resolve(dirname(id),path)).replaceAll('\\','/'))},document.baseURI)`);
  },
 }],
 build:{
  outDir:`js/bundle/${version}`,emptyOutDir:true,target:'es2022',minify:'oxc',sourcemap:false,
  modulePreload:false,
  rolldownOptions:{input,external:id=>/^https?:/.test(id),output:{entryFileNames:'[name].js',chunkFileNames:'[name]-[hash].js',codeSplitting:{groups:[{name:'app-core',test:id=>core.has(id),priority:2},{name:'home-core',test:id=>home.has(id)&&!core.has(id),priority:1}]}}},
 },
});
