import {readFileSync} from 'node:fs';
import {dirname,resolve,relative} from 'node:path';
import {it,expect} from 'vitest';

it('can start and import core clubhouse routes offline after a fresh installation',()=>{
  const root=resolve(import.meta.dirname,'..');
  const worker=readFileSync(resolve(root,'sw.js'),'utf8');
  const shell=new Set([...worker.slice(worker.indexOf('const APP_SHELL'),worker.indexOf('const SHELL_URLS')).matchAll(/"([^"\n]+)"/g)].map(match=>match[1]));
  const visited=new Set();
  const walk=file=>{
    if(visited.has(file))return;visited.add(file);
    expect(shell.has('./'+relative(root,file)),`Missing offline module ${relative(root,file)}`).toBe(true);
    const source=readFileSync(file,'utf8');
    for(const [,ref] of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)){
      if(ref.startsWith('.'))walk(resolve(dirname(file),ref));
      else if(ref.startsWith('https://cdn.jsdelivr.net/'))expect(shell.has(ref),`Missing startup CDN module ${ref}`).toBe(true);
    }
  };
  for(const entry of ['js/app.js','js/collapse.js','js/pages/home.js','js/pages/wall.js','js/pages/sportsbook.js'])walk(resolve(root,entry));
});
