// Isolated data service for the production intentions controller and Trade page.
export function installTradeIntentionsReview(){
 window.reviewLeave();
 const data=window.reviewData;
 data.league={sleeper_league_id:'123456'};
 data.teams.forEach((t,i)=>t.sleeper_user_id='user'+(i+1));
 window.reviewMember={id:1,sleeper_user_id:'user1'};
 window.reviewIntentionRows=[{member_id:1,season:2026,league_id:'123456',roster_id:1,players:{'1-4':'listening'},needs:['WR'],revision:1,updated_at:new Date().toISOString()},
  {member_id:2,season:2026,league_id:'123456',roster_id:2,players:{'2-6':'available','2-3':'keeping'},needs:['RB'],revision:1,updated_at:new Date().toISOString()}];
 window.reviewIntentionCalls=[];window.reviewIntentionLocked=false;window.reviewIntentionFailure=null;
 window.reviewIntentionsApi={
  async list(){if(window.reviewIntentionListDelay)await new Promise(resolve=>setTimeout(resolve,window.reviewIntentionListDelay));return structuredClone(window.reviewIntentionRows);},
  async unlock(pin){if(pin!=='1234')throw Error('Wrong profile PIN');window.reviewIntentionLocked=false;},
  async save(input){
   window.reviewIntentionCalls.push(structuredClone(input));
   if(window.reviewIntentionDelay)await new Promise(resolve=>setTimeout(resolve,window.reviewIntentionDelay));
   if(window.reviewIntentionLocked)throw {code:'42501',message:'Unlock your profile to open trade offers.'};
   if(window.reviewIntentionFailure){const error=window.reviewIntentionFailure;window.reviewIntentionFailure=null;throw error;}
   const old=window.reviewIntentionRows[0];if(old.revision!==input.revision)throw {code:'40001',message:'Your intentions changed on another device. Reload before saving.'};
   const row={...old,...input,revision:old.revision+1,updated_at:new Date().toISOString()};window.reviewIntentionRows[0]=row;return structuredClone(row);
  },
 };
 window.renderReview();window.scrollTo(0,0);
}
