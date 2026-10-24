export type BeatEvent={time:number;strength:number};
export type BeatMap={duration:number;bpm:number;beats:BeatEvent[];seed:number;source:'analysis'|'fallback'};
export type LevelObstacle={x:number;type:'spike'|'double'|'block'|'orb';w:number;h:number;passed:boolean};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function hashSeed(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export async function analyzeAudio(buffer:ArrayBuffer,seed:number):Promise<BeatMap>{
 const context=new OfflineAudioContext(1,44100,44100);
 let decoded:AudioBuffer;
 decoded=await context.decodeAudioData(buffer.slice(0));
 const rate=decoded.sampleRate,hop=512,window=1024;
 const channels=decoded.numberOfChannels;
 const samples=decoded.getChannelData(0);
 const second=channels>1?decoded.getChannelData(1):undefined;
 const count=Math.floor((samples.length-window)/hop);
 if(count<16)throw Error('Şarkı çok kısa.');
 const envelope=new Float32Array(count);
 let prev=0;
 for(let i=0;i<count;i++){
  let sum=0;const start=i*hop;
  for(let j=0;j<window;j+=4){const v=(samples[start+j]+(second?.[start+j]??samples[start+j]))*.5;sum+=v*v;}
  const rms=Math.sqrt(sum/(window/4));
  envelope[i]=Math.max(0,rms-prev*.85);prev=rms;
 }
 const smooth=new Float32Array(count);
 for(let i=0;i<count;i++){let sum=0,n=0;for(let j=Math.max(0,i-20);j<=Math.min(count-1,i+20);j++){sum+=envelope[j];n++;}smooth[i]=sum/n;}
 const candidates:BeatEvent[]=[];
 let lastTime=-1;
 for(let i=2;i<count-2;i++){
  const value=envelope[i],time=i*hop/rate;
  if(value>smooth[i]*1.55&&value>envelope[i-1]&&value>=envelope[i+1]&&time-lastTime>.19){
   candidates.push({time,strength:clamp(value/(smooth[i]*4+.0001),.1,1)});lastTime=time;
  }
 }
 let bpm=120,best=-Infinity;
 for(let b=75;b<=175;b++){
  const period=60/b;
  let quality=0;
  for(let i=1;i<candidates.length;i++){
   const delta=candidates[i].time-candidates[i-1].time;
   for(let k=1;k<=4;k++){const diff=Math.abs(delta-k*period);if(diff<.075)quality+=(1-diff/.075)*candidates[i].strength/k;}
  }
  if(quality>best){best=quality;bpm=b;}
 }
 const duration=decoded.duration;
 const step=60/bpm;
 // Quantized beat grid gives a stable, repeatable obstacle timeline.
 let phase=0,bestPhase=-1;
 for(let p=0;p<20;p++){const offset=p*step/20;let q=0;for(const c of candidates){const delta=Math.abs(((c.time-offset+step/2)%step+step)%step-step/2);if(delta<.085)q+=c.strength*(1-delta/.085);}if(q>bestPhase){bestPhase=q;phase=offset;}}
 const beats:BeatEvent[]=[];
 for(let t=phase;t<duration-.4;t+=step){let strength=.18;for(const c of candidates){const diff=Math.abs(c.time-t);if(diff<.12)strength=Math.max(strength,c.strength*(1-diff/.2));}beats.push({time:t,strength});}
 return {duration,bpm,beats,seed,source:'analysis'};
}
export function fallbackBeatMap(seed:number,duration=95):BeatMap{
 const random=rng(seed),bpm=100+Math.floor(random()*55),step=60/bpm,beats:BeatEvent[]=[];
 for(let time=0;time<duration;time+=step)beats.push({time,strength:.3+random()*.65});
 return {duration,bpm,beats,seed,source:'fallback'};
}
export function generateLevel(map:BeatMap,speed=330):LevelObstacle[]{
 const random=rng(map.seed),result:LevelObstacle[]=[];
 let last=-1000;
 // At 330px/s, a full jump lasts ~0.82s, covering ~270px.
 // Use a conservative 1.15s minimum interval for fair, isolated obstacles.
 for(let i=0;i<map.beats.length;i++){
  const beat=map.beats[i],time=beat.time;
  if(time<2.4||time>map.duration-1.5||time-last<1.15)continue;
  if(beat.strength<.28&&random()>.35)continue;
  const choice=random();
  const type:LevelObstacle['type']=choice<.52?'spike':choice<.78?'double':choice<.92?'block':'orb';
  const w=type==='double'?82:type==='block'?53:42;
  const h=type==='block'?62:42;
  result.push({x:time*speed+420,type,w,h,passed:false});
  last=time;
 }
 return result;
}
