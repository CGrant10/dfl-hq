export function sportsbookTicketRoute(hash=''){
 const query=new URLSearchParams(String(hash).split('?')[1]||''),raw=query.get('ticket');
 const ticket=/^[1-9]\d{0,17}$/.test(raw||'')?raw:null;
 return {ticket,tickets:!!ticket||query.get('view')==='tickets'};
}
export function revealSportsbookTicket(root,{hash=globalThis.location?.hash||'',scroll=true}={}){
 const route=sportsbookTicketRoute(hash);if(!route.tickets)return false;
 root.querySelector('[data-sb-product="book"]')?.click();root.querySelector('[data-sb-tab="tickets"]')?.click();
 if(!route.ticket)return true;
 const target=root.querySelector('[data-ticket-id="'+route.ticket+'"]');
 if(!target){const panel=root.querySelector('#sb-tickets');if(panel&&!panel.querySelector('[data-ticket-unavailable]')){const status=document.createElement('p');status.dataset.ticketUnavailable='';status.className='sb-empty';status.setAttribute('role','status');status.textContent='This ticket is outside your recent history.';panel.prepend(status)}return false}
 for(let node=target.parentElement;node&&node!==root;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
 target.dataset.ticketFocus='true';target.tabIndex=-1;
 if(scroll)requestAnimationFrame(()=>{if(!target.isConnected)return;target.scrollIntoView({block:'center',behavior:'instant'});target.focus({preventScroll:true})});
 return true;
}
