import {describe,it,expect} from 'vitest';
import {assertReleaseVersions,checkReleaseVersion} from './check-release-version.mjs';

describe('installed-app release discovery',()=>{
 it('checks the real release marker against the deployed shell and worker',()=>{
  expect(checkReleaseVersion()).toMatch(/^\d+\.\d+\.\d+$/);
 });
 it('rejects a forgotten release marker even when every app asset has a newer version',()=>{
  expect(()=>assertReleaseVersions('1.381.0',{'version.txt':'1.373.0','index.html':'1.381.0','js/config.js':'1.381.0','sw.js':'1.381.0'})).toThrow('version.txt');
 });
 it.each(['index.html','js/config.js','sw.js'])('rejects an inconsistent %s release',file=>{
  expect(()=>assertReleaseVersions('1.381.0',{[file]:'1.379.0'})).toThrow(file);
 });
 it('fails when a release identifier is missing or invalid',()=>{
  expect(()=>assertReleaseVersions('1.381.0',{'version.txt':undefined})).toThrow('missing');
  expect(()=>assertReleaseVersions('unknown',{})).toThrow('valid release');
 });
});
