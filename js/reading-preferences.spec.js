import {it,expect} from 'vitest';
import {readableText,applyReadableText} from './reading-preferences.js';
it('keeps compact as the default, including unavailable storage and invalid preferences',()=>{
 for(const storage of [{getItem:()=>null},{getItem:()=>{throw Error('blocked')}},{getItem:()=> 'bogus'}])expect(readableText(storage)).toBe(false);
});
it('restores an explicitly chosen readable mode without changing the theme',()=>{
 const root={dataset:{mode:'dark'}};applyReadableText(readableText({getItem:()=> 'comfortable'}),root);expect(root.dataset).toEqual({mode:'dark',readability:'comfortable'});applyReadableText(false,root);expect(root.dataset.mode).toBe('dark');expect(root.dataset.readability).toBe('compact');
});
it('does not block app startup when accessing browser storage itself is denied',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('SecurityError')}});
 try{expect(readableText()).toBe(false)}finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage}
});
