import {db} from './supabase.js';
import {getMemberId} from './members.js';
const credentials=memberId=>{
 if(!memberId)throw Error('Choose your member first.');
 const key=`dfl.player-watchlist.${memberId}`,stored=localStorage.getItem(key);
 if(stored){const saved=JSON.parse(stored);if(/^[a-f0-9]{64}$/.test(saved.secret)&&/^[a-f0-9-]{36}$/.test(saved.device))return saved;throw Error('Watchlist key unavailable on this device.');}
 const saved={device:crypto.randomUUID(),secret:Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')};
 localStorage.setItem(key,JSON.stringify(saved));return saved;
};
export async function readPlayerWatchlist({action='read',player=null,memberId=getMemberId()}={}){
 if(String(getMemberId())!==String(memberId))throw Error('Your selected member changed. Reopen the watchlist.');
 const {data,error}=await db().rpc('my_player_watchlist',{...credentials(memberId),action,player});
 if(error)throw Error(error.message||'Watchlist unavailable.');
 if(String(getMemberId())!==String(memberId))throw Error('Your selected member changed. Reopen the watchlist.');
 if(!Array.isArray(data))throw Error('Watchlist unavailable.');
 if(action!=='read')globalThis.dispatchEvent(new CustomEvent('dfl:watchlist-change',{detail:{memberId:String(memberId)}}));
 return data;
}
