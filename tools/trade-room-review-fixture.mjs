// Browser-only isolated negotiation service; production SQL is tested separately.
export function installTradeRoomReview(){
 window.reviewLeave();
 const clone=value=>structuredClone(value),now=()=>new Date().toISOString();
 const data=window.reviewData;data.league={sleeper_league_id:'123456'};
 data.members=data.teams.map((t,i)=>({id:i+1,sleeper_user_id:'user'+(i+1),team_name:t.team_name,display_name:'Manager '+(i+1)}));
 data.teams.forEach((t,i)=>t.sleeper_user_id='user'+(i+1));
 window.reviewMember=data.members[0];
 const proposal={teamIds:['1','2'],sends:[['1-4'],['2-6']],destinations:{'1-4':'2','2-6':'1'}};
 const multi={teamIds:['1','2','3'],sends:[['1-3'],['2-3'],['3-3']],destinations:{'1-3':'3','2-3':'1','3-3':'2'}};
 const room=(id,p,status='pending')=>({id,season:2026,league_id:'123456',owner_id:2,member_ids:p.teamIds.map(Number),sender_id:2,proposal:p,status,accepted_ids:status==='agreed'?p.teamIds.map(Number):[2],revision:1,created_at:now(),updated_at:now(),events:[{room_id:id,revision:1,actor_id:2,action:'send',proposal:clone(p),created_at:now()}]});
 window.reviewRooms=[room(1,proposal),room(2,multi),{...room(3,proposal,'draft'),owner_id:1,sender_id:1,accepted_ids:[]},room(4,proposal,'agreed')];
 window.reviewRoomCommands=[];window.reviewRoomLocked=false;
 const api=window.reviewRoomApi={
  needsPin:async()=>window.reviewRoomLocked,
  async unlock(value){if(value!=='1234')throw Error('Wrong profile PIN');window.reviewRoomLocked=false;},
  async list(){if(window.reviewRoomLocked)throw {message:'Unlock your profile to open trade offers.',code:'42501'};return clone(window.reviewRooms.filter(r=>r.member_ids.includes(Number(window.reviewMember.id))&&(r.status!=='draft'||r.owner_id===Number(window.reviewMember.id))).map(({events,...r})=>r));},
  async read(id){return clone(window.reviewRooms.find(r=>String(r.id)===String(id)));},
  async command(action,{room:r,proposal:p,requestId}){
   if(window.reviewRoomFailure){const e=window.reviewRoomFailure;window.reviewRoomFailure=null;throw e;}
   const me=Number(window.reviewMember.id);let row=r&&window.reviewRooms.find(t=>t.id===r.id);
   if(row&&row.revision!==r.revision)throw {message:'This offer changed. Refresh before responding.',code:'40001'};
   window.reviewRoomCommands.push({action,room:clone(r),proposal:clone(p),requestId});
   if(action==='remove'){window.reviewRooms=window.reviewRooms.filter(t=>t.id!==r.id);return {removed:r.id};}
   if(!row){row={...room(window.reviewRooms.length+10,p),owner_id:me,revision:0,events:[]};window.reviewRooms.unshift(row);}
   if(action==='save'||action==='send'||action==='counter'){row.proposal=p;row.sender_id=me;row.status=action==='save'?'draft':'pending';row.accepted_ids=action==='save'?[]:[me];}
   if(action==='accept'){row.accepted_ids.push(me);if(row.member_ids.every(id=>row.accepted_ids.includes(id)))row.status='agreed';}
   if(action==='decline')row.status='declined';if(action==='withdraw')row.status='withdrawn';
   row.revision++;row.updated_at=now();row.events.unshift({room_id:row.id,revision:row.revision,actor_id:me,action,proposal:p,created_at:now()});return clone(row);
  },
 };
 location.hash='#/trade?room=1';window.renderReview();
 return api;
}
