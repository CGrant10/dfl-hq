// Per-history-entry choices: a fresh navigation starts fresh, Back resumes.
// Only callers' non-sensitive display filters belong here; never roster writes.
export function readJourneyChoice(root,key,{history=globalThis.history}={}){
 if(!root?.closest?.('[data-route-returning="true"]'))return null;
 const value=history?.state?.dflChoices?.[key];
 return value&&typeof value==='object'&&!Array.isArray(value)?value:null;
}
export function writeJourneyChoice(key,value,{history=globalThis.history}={}){
 try{history.replaceState({...history.state,dflChoices:{...history.state?.dflChoices,[key]:value}},'')}catch{/* Private browsing can restrict history state. */}
}
