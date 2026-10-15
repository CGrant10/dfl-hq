import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runInNewContext} from 'node:vm';
import {parseAst} from 'vite';

export function checkAppBundle(root=fileURLToPath(new URL('../',import.meta.url))){
 const read=path=>readFileSync(resolve(root,path),'utf8');
 const version=JSON.parse(read('package.json')).version,folder=`js/bundle/${version}`,base=resolve(root,folder);
 const html=read('index.html'),worker=read('sw.js');
 if(!html.includes(`await import("./${folder}/app.js")`)||!html.includes(`data-dfl-bundle="${version}"`)||!html.includes(`${folder}/pages/`))throw Error('App entry or route preload does not match this bundle release');
 if(!worker.includes(`importScripts('./${folder}/precache.js')`))throw Error('Worker bundle manifest does not match this release');
 const manifest={};runInNewContext(read(`${folder}/precache.js`),{self:manifest});
 if(manifest.DFL_BUNDLE_RELEASE!==version)throw Error('Bundle cache release mismatch');
 const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
 const scripts=files(base).filter(f=>f.endsWith('.js')&&!f.endsWith('/precache.js'));
 const cached=new Set(manifest.DFL_BUNDLE_SHELL.map(p=>resolve(root,p)));
 if(cached.size!==scripts.length||scripts.some(f=>!cached.has(f)))throw Error('Offline manifest does not cover exactly the current application');
 const graph=new Map();
 for(const file of scripts){
  const source=parseAst(readFileSync(file,'utf8')),refs=[];
  function visit(node){
   if(!node||typeof node!=='object')return;
   if((node.type==='ImportDeclaration'||node.type==='ExportNamedDeclaration'||node.type==='ExportAllDeclaration')&&typeof node.source?.value==='string')refs.push({path:node.source.value,static:true});
   if(node.type==='ImportExpression'&&typeof node.source?.value==='string')refs.push({path:node.source.value,static:false});
   for(const child of Object.values(node))if(Array.isArray(child))child.forEach(visit);else if(child&&typeof child==='object')visit(child);
  }visit(source);
  for(const ref of refs){
   if(/^https:\/\//.test(ref.path))continue;
   const target=resolve(dirname(file),ref.path.split('?')[0]);
   if(!target.startsWith(base+'/')||!cached.has(target)||!existsSync(target))throw Error(`Broken bundled import: ${file} → ${ref.path}`);
  }
  graph.set(file,refs.filter(r=>r.static&&r.path.startsWith('.')).map(r=>resolve(dirname(file),r.path)));
 }
 for(const [,page] of read('js/router.js').matchAll(/import\("\.\/pages\/([^"?]+)\.js"\)/g))if(!cached.has(resolve(base,'pages',page+'.js')))throw Error(`Missing retryable route: ${page}`);
 const closure=(file,seen=new Set())=>{if(seen.has(file))return seen;seen.add(file);for(const ref of graph.get(file)||[])closure(ref,seen);return seen};
 const startup=closure(resolve(base,'app.js')),home=closure(resolve(base,'pages/home.js'));
 if(startup.size>4||home.size>6)throw Error(`Startup module budget exceeded: app ${startup.size}, Home ${home.size}`);
 const cores=scripts.filter(f=>/\/app-core-[^/]+\.js$/.test(f));if(cores.length!==1)throw Error('Pages must share one app state module');
 return {release:version,modules:scripts.length,startupModules:startup.size,homeModules:home.size};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)console.log('App bundle verified:',checkAppBundle());
