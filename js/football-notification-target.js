// Preserve the member, fantasy matchup, NFL play and optional video as one
// checked target. Shared with the sender's independent database checks.
export function footballNotificationTarget(source,url,members){
 const key=String(source||'').match(/^weekly:play:(\d{4}):(\d{1,2}):([1-9]\d*):(\d{1,24}):(\d{1,24})$/);
 const route=String(url||'').match(/^#\/clubhouse\?season=(\d{4})&week=(\d{1,2})&tab=(matchups|highlights)&matchup=([1-9]\d*)(?:&moment=(nfl:(\d{1,24}):(\d{1,24}):([1-9]\d*)))?(?:&nflGame=(\d{1,24})&clip=(\d{1,24}))?$/);
 if(!key||!route||key[1]!==route[1]||key[2]!==route[2]||Number(key[2])<1||Number(key[2])>18||members?.length!==1||String(members[0])!==key[3])return null;
 if(route[5]&&(route[6]!==key[4]||route[7]!==key[5]))return null;
 if((route[3]==='highlights')!==!!route[10]||route[10]&&(!route[5]||route[9]!==key[4]))return null;
 return {season:Number(key[1]),week:Number(key[2]),member:key[3],game:key[4],play:key[5],matchup:Number(route[4]),moment:route[5]||null,clip:route[10]||null};
}
