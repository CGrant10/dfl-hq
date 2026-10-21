// The badge remains in screen pixels even when the field scales down. Names
// live in the adjacent roster, keeping twelve lanes free from tiny text.
export function stadiumRacerLabel({x,y,laneHeight,width,bodyScale}){
 const height=Math.max(10,Math.min(22,laneHeight-1)),font=Math.max(11,Math.min(14,height-3)),labelWidth=height>=20?27:22;
 return {x:Math.max(5,Math.min(width-labelWidth-5,x-26*bodyScale-4-labelWidth)),y:y-height/2,width:labelWidth,height,font};
}
