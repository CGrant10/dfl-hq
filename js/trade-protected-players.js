const key=(member,season,team)=>`dfl.trade.protected.v1.${member||'guest'}.${season}.${team?.id}`;

export function protectedPlayerIds(value,team){
 const owned=new Set((team?.playerIds||[]).map(String));
 return [...new Set((Array.isArray(value)||value instanceof Set?[...value]:[]).map(String))].filter(id=>owned.has(id));
}
export function readProtectedPlayers(member,season,team,storage){
 try{return protectedPlayerIds(JSON.parse((storage||globalThis.localStorage).getItem(key(member,season,team))||'[]'),team)}catch{return []}
}
export function writeProtectedPlayers(member,season,team,ids,storage){
 try{(storage||globalThis.localStorage).setItem(key(member,season,team),JSON.stringify(protectedPlayerIds(ids,team)));return true}catch{return false}
}
export function setProtectedPlayers(shop,ids,team){
 shop.excludedSendIds=protectedPlayerIds(ids,team);
 const blocked=new Set(shop.excludedSendIds);
 shop.sendAnchors=(shop.sendAnchors||[]).filter(id=>!blocked.has(String(id)));
}
export function tradeSendAllowed(ids,excluded){
 const blocked=excluded instanceof Set?excluded:new Set((excluded||[]).map(String));
 return (ids||[]).every(id=>!blocked.has(String(id)));
}
