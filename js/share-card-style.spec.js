import {describe,it,expect} from 'vitest';
import {wrapShareText} from './share-card-style.js';
const context={font:'',measureText:text=>({width:[...text].length*10})};
describe('shared card text flow',()=>{
 it('preserves a complete long description and keeps each line within its width',()=>{
  const text='Nico Collins upgrades the starting lineup. Kenneth Walker fills the running back slot without sacrificing depth.';
  const lines=wrapShareText(context,text,220);
  expect(lines.join(' ')).toBe(text);expect(lines.length).toBeGreaterThan(3);expect(lines.every(line=>context.measureText(line).width<=220)).toBe(true);
 });
 it('wraps an unbroken name without losing Unicode characters or overflowing',()=>{
  const text='🏈GrantsTweakingWithAnExtremelyLongName';
  const lines=wrapShareText(context,text,100);
  expect(lines.join('')).toBe(text);expect(lines.every(line=>context.measureText(line).width<=100)).toBe(true);
  expect(wrapShareText(context,'',100)).toEqual([]);
 });
});
