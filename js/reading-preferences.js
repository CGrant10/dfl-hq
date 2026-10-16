const KEY='dfl.readability';
export function readableText(storage){try{return (storage??globalThis.localStorage).getItem(KEY)==='comfortable'}catch{return false}}
export function applyReadableText(on=readableText(),root=globalThis.document?.documentElement){if(root)root.dataset.readability=on?'comfortable':'compact';globalThis.document?.querySelectorAll?.('[data-readable-text]').forEach(input=>{input.checked=!!on})}
export function setReadableText(on,storage){try{(storage??globalThis.localStorage).setItem(KEY,on?'comfortable':'compact')}catch{}applyReadableText(!!on);globalThis.dispatchEvent?.(new Event('dfl:readability-change'))}
export function startReadingPreferences(){
 applyReadableText();globalThis.addEventListener('storage',event=>{if(event.key===KEY||event.key===null)applyReadableText()});
}
