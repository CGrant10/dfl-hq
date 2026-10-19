// Short, synthesized stadium cues. Audio starts only after the Sound button.
export function createStadiumFeedback(){
 let context=null,enabled=false,stopped=false,last=-Infinity;const voices=new Set();
 const silence=()=>{for(const voice of voices){try{voice.stop()}catch{}}voices.clear()};
 const visibility=()=>{if(document.hidden){silence();void context?.suspend()}};
 document.addEventListener('visibilitychange',visibility);
 return {async enable(value){
  if(stopped)return false;enabled=!!value;if(!enabled){silence();void context?.suspend();return false}
  try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio){enabled=false;return false}context??=new Audio();await context.resume();if(stopped){if(context.state!=='closed')void context.close();return false}enabled=context.state==='running';return enabled}catch{enabled=false;return false}
 },cue(kind){
  if(stopped||!enabled||document.hidden||context?.state!=='running'||performance.now()-last<120)return;
  last=performance.now();const start=context.currentTime,finish=kind==='finish',duration=finish?.8:kind==='launch'?.35:.09;
  const gain=context.createGain();gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(finish?.045:.025,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);gain.connect(context.destination);
  const voice=context.createOscillator();voice.type='sine';voice.frequency.setValueAtTime(finish?392:kind==='launch'?196:110,start);if(finish)voice.frequency.exponentialRampToValueAtTime(587,start+.3);voice.connect(gain);voices.add(voice);voice.onended=()=>{voices.delete(voice);voice.disconnect();gain.disconnect()};voice.start(start);voice.stop(start+duration);
  if(finish||kind==='launch'){
   const noise=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=noise.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){previous=(previous+Math.random()*.14-.07)*.97;data[i]=previous}
   const crowd=context.createBufferSource();crowd.buffer=noise;crowd.connect(gain);voices.add(crowd);crowd.onended=()=>{voices.delete(crowd);crowd.disconnect()};crowd.start(start);crowd.stop(start+duration);
  }
 },stop(){if(stopped)return;stopped=true;enabled=false;silence();if(context&&context.state!=='closed')void context.close();document.removeEventListener('visibilitychange',visibility)}};
}
