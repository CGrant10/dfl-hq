import { db } from "../supabase.js";
import { errorBox } from "../ui.js";
import { loadWall, updateWall, wireWall, hydrateWallMembers } from "../member-wall.js";
import {mountWallLive} from '../wall-live.js';
let stopCurrent=null;
export function leave(){stopCurrent?.();stopCurrent=null;}

export async function render(view) {
  leave();
  view.innerHTML = `<div class="wall-page"><header class="page-head"><div><span class="eyebrow">LEAGUE FEED</span><h1>The Wall</h1><p>Talk your shit. Bring receipts.</p></div><a class="btn ghost small" href="#/home">← Home</a></header><div data-wall-page-slot><div class="card state"><span class="state-title">Loading the Wall…</span></div></div></div>`;
  const slot = view.querySelector("[data-wall-page-slot]");
  let stopped=false,request=0,firstDraw=true;
  const active=()=>!stopped&&view.isConnected;
  const redraw = async (options={}) => {
    const mine=++request;
    try {
      const rows=await loadWall(30);
      const postId=Number(new URLSearchParams(location.hash.split("?")[1]||"").get("post"));
      if(postId&&rows&&!rows.some(row=>Number(row.id)===postId)){
        const {data,error}=await db().from("member_wall_posts").select("*,members!member_wall_posts_member_id_fkey(display_name,profile_image)").eq("id",postId).maybeSingle();
        if(error)throw error;
        if(data){await hydrateWallMembers([data]);const counts=await db().from("member_wall_reply_counts").select("reply_count").eq("post_id",postId).maybeSingle();data.reply_count=counts.data?.reply_count||0;rows.unshift(data);}
      }
      if(!active()||mine!==request)return false;
      updateWall(slot,rows,{heading:false,...options});
      if(postId&&firstDraw){const post=slot.querySelector(`[data-wall-post="${postId}"]`);if(post){post.setAttribute("data-wall-focus","");post.querySelector("[data-wall-thread]").open=true}else slot.insertAdjacentHTML("afterbegin",'<p role="status" class="card">That post is no longer available.</p>');}
      wireWall(slot, redraw);
      firstDraw=false;
      return true;
    } catch (error) {
      if(active()&&mine===request&&!slot.querySelector('.wall'))slot.innerHTML = errorBox(error);
      return false;
    }
  };
  await redraw();
  if(!active())return;
  const stopLive=mountWallLive(slot,redraw,{active});
  stopCurrent=()=>{stopped=true;stopLive();slot._wallController?.abort();slot._wallReactionController?.abort();};
}
