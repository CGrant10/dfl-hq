import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function assertReleaseVersions(expected,versions){
 if(!/^\d+\.\d+\.\d+$/.test(expected))throw Error('package.json must specify a valid release version');
 for(const [file,version] of Object.entries(versions)){
  if(version!==expected)throw Error(`${file}: release ${version||'missing'} does not match package.json ${expected}`);
 }
}

export function checkReleaseVersion(root=new URL('../',import.meta.url)){
 const read=file=>readFileSync(new URL(file,root),'utf8');
 const expected=JSON.parse(read('package.json')).version;
 assertReleaseVersions(expected,{
  'version.txt':read('version.txt').trim(),
  'index.html':read('index.html').match(/name="dfl-app-version" content="([^"]+)"/)?.[1],
  'js/config.js':read('js/config.js').match(/const RELEASE_FLOOR = "([^"]+)"/)?.[1],
  'sw.js':read('sw.js').match(/const CACHE_NAME = "dfl-hq-v([^"]+)"/)?.[1],
 });
 return expected;
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 console.log(`Release versions agree: ${checkReleaseVersion()}`);
}
