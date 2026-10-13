// Visual cadence only. The shared race frame remains the position authority.
export function runnerCadence(elapsed,speed,index=0,moving=true){
 const pace=Math.max(.65,Math.min(1.65,Number(speed)||.85));
 const phase=Math.max(0,elapsed)/110*pace+index;
 return {stride:moving?Math.floor(phase)%6:1,bob:moving?Math.sin(phase*Math.PI)*.8:0,lean:moving?Math.max(0,Math.min(.065,(pace-.9)*.09)):0,burst:moving&&pace>1.15,phase};
}
