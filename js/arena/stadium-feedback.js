// Short, synthesized stadium cues. Audio starts only after the Sound button.
export function createStadiumFeedback(){
 let context=null,enabled=false,stopped=false,last=-Infinity,lastSurge=-Infinity,revision=0;const voices=new Set();
 const silence=()=>{for(const voice of voices){try{voice.stop()}catch{}}voices.clear()};
 const visibility=()=>{if(document.hidden){revision++;silence();void context?.suspend()}};
 document.addEventListener('visibilitychange',visibility);
 return {async enable(value){
  if(stopped)return false;const own=++revision;enabled=!!value;if(!enabled){silence();void context?.suspend();return false}
  try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio){enabled=false;return false}context??=new Audio();await context.resume();if(stopped||own!==revision||document.hidden)return false;enabled=context.state==='running';return enabled}catch{if(own===revision)enabled=false;return false}
 },quiet:silence,cue(kind){
  if(stopped||!enabled||document.hidden||context?.state!=='running'||performance.now()-last<120)return;
  const surge=kind==='overtake',final=kind==='final';
  if(surge&&performance.now()-lastSurge<3200)return;
  if(surge)lastSurge=performance.now();
  last=performance.now();const start=context.currentTime,finish=kind==='finish',duration=finish?1.8:final?3:surge?1.2:kind==='launch'?.55:.09;
  const gain=context.createGain();gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(finish?.045:.025,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);gain.connect(context.destination);
  if(surge||final||finish||kind==='launch'){
   // A finite, filtered crowd swell follows an actual race moment. No
   // background loop or extra timer keeps playing after leaving the Arena.
   const noise=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=noise.getChannelData(0);let previous=0;
   for(let i=0;i<data.length;i++){previous=(previous+(Math.random()-.5)*.65)*.8;const t=i/data.length;data[i]=previous*(.45+.55*Math.sin(Math.PI*t))*(.75+.25*Math.sin(i/context.sampleRate*19));}
   gain.gain.cancelScheduledValues(start);gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(finish?.14:final?.085:.09,start+duration*.4);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
   const filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1050;filter.Q.value=.45;
   const crowd=context.createBufferSource();crowd.buffer=noise;crowd.connect(filter);filter.connect(gain);voices.add(crowd);crowd.onended=()=>{voices.delete(crowd);crowd.disconnect();filter.disconnect();gain.disconnect()};crowd.start(start);crowd.stop(start+duration);
  }else{
   const voice=context.createOscillator();voice.type='sine';voice.frequency.setValueAtTime(150,start);voice.frequency.exponentialRampToValueAtTime(100,start+duration);voice.connect(gain);voices.add(voice);voice.onended=()=>{voices.delete(voice);voice.disconnect();gain.disconnect()};voice.start(start);voice.stop(start+duration);
  }
  if(kind==='launch'||finish){
   // A brief whistle and three-note finish signature sit under the crowd.
   const notes=finish?[523.25,659.25,783.99]:[2100];
   notes.forEach((frequency,i)=>{
    const at=start+i*.12,end=at+(finish?.55:.22),voice=context.createOscillator(),level=context.createGain();
    voice.type='sine';voice.frequency.setValueAtTime(frequency,at);if(!finish)voice.frequency.linearRampToValueAtTime(1750,end);
    level.gain.setValueAtTime(.0001,at);level.gain.linearRampToValueAtTime(finish?.025:.018,at+.025);level.gain.exponentialRampToValueAtTime(.0001,end);
    voice.connect(level);level.connect(context.destination);voices.add(voice);voice.onended=()=>{voices.delete(voice);voice.disconnect();level.disconnect()};voice.start(at);voice.stop(end);
   });
  }
 },stop(){if(stopped)return;stopped=true;revision++;enabled=false;silence();if(context&&context.state!=='closed')void context.close();document.removeEventListener('visibilitychange',visibility)}};
}
